"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { saveMiniAppDataSchema, type SaveMiniAppDataInput } from "@/lib/schemas/miniapps";
import type { MiniAppData } from "@/lib/miniapps/schema-types";
import type { ActionResult } from "./types";

/**
 * Lit l'état d'une mini-app pour un audit. Si pas encore d'enregistrement,
 * renvoie null (le composant client utilisera alors le seed du schema).
 */
export async function loadMiniAppData(
  auditId: string,
  miniappKey: string,
): Promise<ActionResult<{ data: MiniAppData | null }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("miniapp_data")
    .select("data, schema_version")
    .eq("audit_id", auditId)
    .eq("miniapp_key", miniappKey)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: true, data: { data: null } };

  return {
    ok: true,
    data: {
      data: {
        tables: ((data.data as Record<string, unknown>)?.tables ?? {}) as MiniAppData["tables"],
        schemaVersion: data.schema_version,
      },
    },
  };
}

/**
 * Upsert de l'état complet de la mini-app.
 * Pattern : on sauvegarde le state en entier (JSONB), c'est suffisant et simple.
 */
export async function saveMiniAppData(input: SaveMiniAppDataInput): Promise<ActionResult> {
  const parsed = saveMiniAppDataSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", userData.user.id)
    .single();
  if (!profile) return { ok: false, error: "Profil introuvable" };

  const { error } = await supabase.from("miniapp_data").upsert(
    {
      audit_id: parsed.data.audit_id,
      organization_id: profile.organization_id,
      miniapp_key: parsed.data.miniapp_key,
      data: parsed.data.data,
      updated_by: userData.user.id,
    },
    { onConflict: "audit_id,miniapp_key" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/audits/${parsed.data.audit_id}/miniapps/${parsed.data.miniapp_key}`);
  return { ok: true };
}
