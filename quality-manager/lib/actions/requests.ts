"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import {
  accountRequestSchema,
  clientRequestSchema,
  type AccountRequestInput,
  type ClientRequestInput,
} from "@/lib/schemas/access";
import { notifyUser } from "@/lib/notifications/notify";
import type { ActionResult } from "./types";

// =============================================================================
// Demandes adressées à LS Compétences : réclamations, suggestions, aide
// (utilisateurs connectés) et demandes d'ouverture de compte (visiteurs).
// Elles alimentent le KPI « à traiter / traité » et l'amélioration continue.
// =============================================================================

export async function createClientRequest(input: ClientRequestInput): Promise<ActionResult> {
  const parsed = clientRequestSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };

  const session = await getSession();
  if (session.kind !== "member") return { ok: false, error: "Non autorisé" };

  const supabase = await createClient();
  const { error } = await supabase.from("client_requests").insert({
    organization_id: session.organization.id,
    kind: parsed.data.kind,
    subject: parsed.data.subject,
    message: parsed.data.message,
    contact_name: `${session.profile.firstName} ${session.profile.lastName}`.trim(),
    contact_email: session.email,
    created_by: session.userId,
  });
  if (error) return { ok: false, error: error.message };

  // Le super admin la voit arriver en direct (temps réel sur client_requests).
  // Si l'auteur n'est pas l'admin, l'admin de l'organisme est prévenu aussi.
  if (session.profile.role !== "admin") {
    const { data: admins } = await createAdminClient()
      .from("users")
      .select("id")
      .eq("organization_id", session.organization.id)
      .eq("role", "admin");
    const author = `${session.profile.firstName} ${session.profile.lastName}`.trim();
    for (const a of admins ?? []) {
      await notifyUser(
        { id: a.id, organizationId: session.organization.id },
        {
          category: parsed.data.kind === "reclamation" ? "alerte" : "system",
          title: `${author} a contacté LS Compétences : « ${parsed.data.subject} »`,
          url: "/demandes",
        },
      );
    }
  }

  revalidatePath("/demandes");
  return { ok: true };
}

/**
 * Demande d'ouverture de compte depuis la page publique.
 * Le visiteur n'est pas connecté : écriture en service role, champs bornés
 * par le schéma, champ piège anti-robot.
 */
export async function requestAccountOpening(input: AccountRequestInput): Promise<ActionResult> {
  const parsed = accountRequestSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };

  const admin = createAdminClient();

  // Anti-doublon : une seule demande en attente par adresse
  const { data: pending } = await admin
    .from("client_requests")
    .select("id")
    .eq("kind", "ouverture_compte")
    .eq("status", "a_traiter")
    .eq("contact_email", parsed.data.contact_email)
    .limit(1);
  if (pending && pending.length > 0) return { ok: true };

  const { error } = await admin.from("client_requests").insert({
    kind: "ouverture_compte",
    subject: `Ouverture de compte — ${parsed.data.organization_name}`,
    message: parsed.data.message || null,
    organization_name: parsed.data.organization_name,
    contact_name: parsed.data.contact_name,
    contact_email: parsed.data.contact_email,
  });
  if (error)
    return { ok: false, error: "La demande n’a pas pu être enregistrée. Réessayez plus tard." };
  return { ok: true };
}
