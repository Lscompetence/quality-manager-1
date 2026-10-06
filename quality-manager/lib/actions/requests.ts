"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import {
  accountRequestSchema,
  clientRequestSchema,
  handleRequestSchema,
  type AccountRequestInput,
  type ClientRequestInput,
  type HandleRequestInput,
} from "@/lib/schemas/access";
import { notifyUser } from "@/lib/notifications/notify";
import type { ActionResult } from "./types";

// =============================================================================
// Messages : chaque niveau ne parle qu'au niveau juste au-dessus.
//
//   editor / reader ──▶ admin de l'organisme ──▶ LS Compétences (super admin)
//
// - l'editor et le reader écrivent à LEUR admin (addressed_to = 'admin') ;
//   LS Compétences ne voit jamais ces messages ;
// - l'admin répond à son équipe, ou transmet un message à LS s'il ne peut pas
//   le régler lui-même ;
// - l'admin écrit à LS (addressed_to = 'platform'), comme les visiteurs qui
//   demandent l'ouverture d'un compte.
// La base applique la même règle (migration 000016).
// =============================================================================

const fullName = (p: { firstName: string; lastName: string }) =>
  `${p.firstName} ${p.lastName}`.trim();

export async function createClientRequest(input: ClientRequestInput): Promise<ActionResult> {
  const parsed = clientRequestSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };

  const session = await getSession();
  if (session.kind !== "member") return { ok: false, error: "Non autorisé" };

  const toAdmin = session.profile.role !== "admin";
  const supabase = await createClient();
  const { error } = await supabase.from("client_requests").insert({
    organization_id: session.organization.id,
    addressed_to: toAdmin ? "admin" : "platform",
    kind: parsed.data.kind,
    subject: parsed.data.subject,
    message: parsed.data.message,
    contact_name: fullName(session.profile),
    contact_email: session.email,
    created_by: session.userId,
  });
  if (error) return { ok: false, error: error.message };

  // Message d'équipe : l'admin de l'organisme est prévenu (cloche + toast).
  // Message de l'admin : LS le voit arriver en direct dans son espace.
  if (toAdmin) {
    const { data: admins } = await createAdminClient()
      .from("users")
      .select("id")
      .eq("organization_id", session.organization.id)
      .eq("role", "admin");
    for (const a of admins ?? []) {
      await notifyUser(
        { id: a.id, organizationId: session.organization.id },
        {
          category: parsed.data.kind === "reclamation" ? "alerte" : "system",
          title: `${fullName(session.profile)} vous a écrit : « ${parsed.data.subject} »`,
          url: "/demandes",
        },
      );
    }
  }

  revalidatePath("/demandes");
  return { ok: true };
}

async function requireOrgAdminAction() {
  const session = await getSession();
  if (session.kind !== "member" || session.profile.role !== "admin")
    return { error: "Réservé à l’admin de l’organisme" } as const;
  return session;
}

/** L'admin répond à un message de son équipe (ou le rouvre). L'auteur est prévenu. */
export async function handleTeamRequest(input: HandleRequestInput): Promise<ActionResult> {
  const parsed = handleRequestSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  const session = await requireOrgAdminAction();
  if ("error" in session) return { ok: false, error: session.error };

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("client_requests")
    .select("subject, created_by, status, addressed_to")
    .eq("id", parsed.data.id)
    .eq("organization_id", session.organization.id)
    .maybeSingle();
  if (!request || request.addressed_to !== "admin")
    return { ok: false, error: "Message introuvable" };

  const done = parsed.data.status === "traite";
  const { error } = await supabase
    .from("client_requests")
    .update({
      status: parsed.data.status,
      response: parsed.data.response || null,
      handled_at: done ? new Date().toISOString() : null,
      handled_by: done ? session.userId : null,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  if (done && request.status !== "traite" && request.created_by) {
    await notifyUser(
      { id: request.created_by, organizationId: session.organization.id },
      {
        category: "success",
        title: parsed.data.response
          ? `${fullName(session.profile)} a répondu à « ${request.subject} »`
          : `Votre message « ${request.subject} » est traité`,
        sourceLabel: "Votre admin",
        url: "/demandes",
      },
    );
  }

  revalidatePath("/demandes");
  return { ok: true };
}

/**
 * L'admin transmet à LS Compétences un message de son équipe qu'il ne peut pas
 * régler lui-même (bug, question sur l'application). Une nouvelle demande part
 * à LS au nom de l'admin ; le message d'origine est clos avec une réponse.
 */
export async function forwardTeamRequest(id: string): Promise<ActionResult> {
  const session = await requireOrgAdminAction();
  if ("error" in session) return { ok: false, error: session.error };

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("client_requests")
    .select("kind, subject, message, contact_name, created_by, status, addressed_to")
    .eq("id", id)
    .eq("organization_id", session.organization.id)
    .maybeSingle();
  if (!request || request.addressed_to !== "admin")
    return { ok: false, error: "Message introuvable" };
  if (request.status === "traite") return { ok: false, error: "Ce message est déjà traité." };
  if (request.kind === "ouverture_compte") return { ok: false, error: "Message invalide" };

  const { error: insertError } = await supabase.from("client_requests").insert({
    organization_id: session.organization.id,
    addressed_to: "platform",
    kind: request.kind,
    subject: request.subject,
    message: [
      request.message,
      `— Transmis par ${fullName(session.profile)} (admin) à la demande de ${request.contact_name ?? "un membre de l’équipe"}.`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    contact_name: fullName(session.profile),
    contact_email: session.email,
    created_by: session.userId,
  });
  if (insertError) return { ok: false, error: insertError.message };

  const response = "Transmis à LS Compétences. Je vous tiens informé(e) de leur réponse.";
  const { error } = await supabase
    .from("client_requests")
    .update({
      status: "traite",
      response,
      handled_at: new Date().toISOString(),
      handled_by: session.userId,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (request.created_by) {
    await notifyUser(
      { id: request.created_by, organizationId: session.organization.id },
      {
        category: "system",
        title: `Votre message « ${request.subject} » a été transmis à LS Compétences`,
        sourceLabel: "Votre admin",
        url: "/demandes",
      },
    );
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
