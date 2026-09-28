"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  updateOrgSchema,
  updatePlanSchema,
  updateBillingSchema,
  type UpdateOrgInput,
  type UpdatePlanInput,
  type UpdateBillingInput,
} from "@/lib/schemas/organization";
import type { ActionResult } from "./types";
import type { Database } from "@/types/database";

type OrganizationUpdate = Database["public"]["Tables"]["organizations"]["Update"];

async function getOrgIdForCurrentAdmin(): Promise<{ orgId: string } | { error: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id, role")
    .eq("id", userData.user.id)
    .single();

  if (!profile) return { error: "Profil introuvable" };
  if (profile.role !== "admin") return { error: "Action réservée aux admins" };
  return { orgId: profile.organization_id };
}

export async function updateOrganization(input: UpdateOrgInput): Promise<ActionResult> {
  const parsed = updateOrgSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const auth = await getOrgIdForCurrentAdmin();
  if ("error" in auth) return { ok: false, error: auth.error };

  const supabase = await createClient();
  // Normaliser les "" en null pour les champs optionnels. `Object.fromEntries`
  // renvoie un type générique (signature d'index) que Postgrest n'accepte
  // pas pour un update ; on sait par construction que les clés proviennent
  // bien de `updateOrgSchema`, donc de colonnes valides.
  const patch = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v]),
  ) as OrganizationUpdate;

  const { error } = await supabase.from("organizations").update(patch).eq("id", auth.orgId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true };
}

export async function updatePlan(input: UpdatePlanInput): Promise<ActionResult> {
  const parsed = updatePlanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const auth = await getOrgIdForCurrentAdmin();
  if ("error" in auth) return { ok: false, error: auth.error };

  // Sprint 8 : l'abonnement est piloté par LS Compétences (la base refuse
  // qu'un client modifie son plan). L'admin en demande le changement.
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const labels = { essentiel: "Essentiel", pro: "Pro", reseau: "Réseau" } as const;
  const cycle = parsed.data.billing_cycle === "annual" ? "annuel" : "mensuel";
  const { error } = await supabase.from("client_requests").insert({
    organization_id: auth.orgId,
    kind: "support",
    subject: `Changement d’abonnement : ${labels[parsed.data.plan]} (${cycle})`,
    message: `L’admin demande le passage au plan ${labels[parsed.data.plan]}, facturation ${cycle}.`,
    contact_email: userData.user?.email ?? null,
    created_by: userData.user?.id ?? null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/demandes");
  return { ok: true };
}

/** Email de facturation et n° de TVA : les seuls champs d'abonnement que l'admin modifie. */
export async function updateBilling(input: UpdateBillingInput): Promise<ActionResult> {
  const parsed = updateBillingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const auth = await getOrgIdForCurrentAdmin();
  if ("error" in auth) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      billing_email: parsed.data.billing_email || null,
      vat_number: parsed.data.vat_number || null,
    })
    .eq("id", auth.orgId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}
