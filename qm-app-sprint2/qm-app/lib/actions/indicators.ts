"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateIndicatorSchema, type UpdateIndicatorInput } from "@/lib/schemas/indicators";
import { getIndicator } from "@/lib/constants/rnq";
import type { ActionResult } from "./types";

/**
 * Upsert l'état d'un indicateur pour un dossier d'audit donné.
 * Crée la ligne si elle n'existe pas, sinon met à jour status/notes.
 */
export async function upsertIndicator(input: UpdateIndicatorInput): Promise<ActionResult> {
  const parsed = updateIndicatorSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const meta = getIndicator(parsed.data.indicator_code);
  if (!meta) return { ok: false, error: "Indicateur inconnu" };

  // Récupérer organization_id du user
  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", userData.user.id)
    .single();
  if (!profile) return { ok: false, error: "Profil introuvable" };

  const { error } = await supabase.from("audit_indicators").upsert(
    {
      audit_id: parsed.data.audit_id,
      organization_id: profile.organization_id,
      indicator_code: parsed.data.indicator_code,
      critere_num: meta.critere,
      status: parsed.data.status,
      notes: parsed.data.notes,
      updated_by: userData.user.id,
    },
    { onConflict: "audit_id,indicator_code" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/audits/${parsed.data.audit_id}`);
  revalidatePath(
    `/audits/${parsed.data.audit_id}/critere/${String(meta.critere).padStart(2, "0")}`,
  );
  return { ok: true };
}
