"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateOrgSchema, updatePlanSchema, type UpdateOrgInput, type UpdatePlanInput } from "@/lib/schemas/organization";
import type { ActionResult } from "./types";

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
  // Normaliser les "" en null pour les champs optionnels
  const patch = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v]),
  );

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

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ plan: parsed.data.plan, billing_cycle: parsed.data.billing_cycle })
    .eq("id", auth.orgId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  revalidatePath("/", "layout"); // pour rafraichir partout (sidebar, etc.)
  return { ok: true };
}
