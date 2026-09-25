"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAuditSchema, updateAuditSchema, type CreateAuditInput, type UpdateAuditInput } from "@/lib/schemas/audits";
import { getActor, notifyStaff } from "@/lib/notifications/notify";
import type { ActionResult } from "./types";

/** Colonnes recopiées lors de la reprise des preuves d'un dossier. */
type SourceAttachment = {
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  kind: "upload" | "ref";
  miniapp_key: string | null;
  context_path: string | null;
  context_label: string | null;
};

export async function createAudit(input: CreateAuditInput): Promise<ActionResult<{ id: string }>> {
  const parsed = createAuditSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { ok: false, error: "Non authentifié" };

  // Récupérer l'organization_id du user courant
  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.user.id)
    .single();

  if (!profile) return { ok: false, error: "Profil introuvable" };

  const { data, error } = await supabase
    .from("audits")
    .insert({
      organization_id: profile.organization_id,
      name: parsed.data.name,
      audit_type: parsed.data.audit_type,
      categories: parsed.data.categories,
      audit_date: parsed.data.audit_date || null,
      certificateur: parsed.data.certificateur || null,
      status: "en_cours",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  // Reprise des preuves d'un dossier précédent : les pièces jointes sont
  // rattachées au nouveau dossier en pointant vers les mêmes fichiers stockés.
  if (parsed.data.clone_from) {
    const { data: sourceAttachments } = await supabase
      .from("attachments")
      .select(
        "file_name, file_size, mime_type, storage_path, kind, miniapp_key, context_path, context_label",
      )
      .eq("audit_id", parsed.data.clone_from);

    const rows = (sourceAttachments ?? []) as SourceAttachment[];

    if (rows.length > 0) {
      const { error: cloneError } = await supabase.from("attachments").insert(
        rows.map((att) => ({
          ...att,
          organization_id: profile.organization_id,
          audit_id: data.id,
          uploaded_by: user.user.id,
        })),
      );

      // Le dossier reste créé même si la copie échoue : on le signale sans tout annuler.
      if (cloneError) {
        revalidatePath("/dashboard");
        return {
          ok: false,
          error: `Dossier créé, mais la reprise des preuves a échoué : ${cloneError.message}`,
        };
      }
    }
  }

  const actor = await getActor(user.user.id);
  if (actor) {
    await notifyStaff(
      profile.organization_id,
      {
        category: "equipe",
        title: `${actor.name} a créé le dossier « ${parsed.data.name} »`,
        sourceLabel: parsed.data.name,
        staffUrl: `/audits/${data.id}`,
      },
      actor.id,
    );
  }

  revalidatePath("/dashboard");
  return { ok: true, data: { id: data.id } };
}

export async function updateAudit(input: UpdateAuditInput): Promise<ActionResult> {
  const parsed = updateAuditSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();
  const { id, ...patch } = parsed.data;

  const { error } = await supabase.from("audits").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath(`/audits/${id}`);
  return { ok: true };
}

export async function deleteAudit(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("audits").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function archiveAudit(id: string): Promise<ActionResult> {
  return updateAudit({ id, status: "archive" });
}

export async function createAuditAndRedirect(input: CreateAuditInput): Promise<ActionResult> {
  const result = await createAudit(input);
  if (!result.ok) return result;
  redirect(`/audits/${result.data.id}`);
}
