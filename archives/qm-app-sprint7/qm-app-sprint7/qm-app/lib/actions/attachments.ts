"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import {
  createAttachmentSchema,
  deleteAttachmentSchema,
  type CreateAttachmentInput,
  type DeleteAttachmentInput,
} from "@/lib/schemas/attachments";
import type { ActionResult } from "./types";

/**
 * Génère un chemin de stockage scoped par organization.
 * Format : <organization_id>/<audit_id>/<uuid>_<filename>
 */
export async function generateUploadPath(opts: {
  audit_id?: string;
  file_name: string;
}): Promise<ActionResult<{ path: string; bucket: string }>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", userData.user.id)
    .single();
  if (!profile) return { ok: false, error: "Profil introuvable" };

  const safeName = opts.file_name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const auditSegment = opts.audit_id ?? "global";
  const path = `${profile.organization_id}/${auditSegment}/${randomUUID()}_${safeName}`;

  return { ok: true, data: { path, bucket: "attachments" } };
}

/**
 * Enregistre une PJ après upload réussi côté client OU enregistre un lien externe.
 */
export async function createAttachment(input: CreateAttachmentInput): Promise<ActionResult<{ id: string }>> {
  const parsed = createAttachmentSchema.safeParse(input);
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

  const baseRow = {
    organization_id: profile.organization_id,
    audit_id: parsed.data.audit_id ?? null,
    miniapp_key: parsed.data.miniapp_key ?? null,
    context_path: parsed.data.context_path ?? null,
    context_label: parsed.data.context_label ?? null,
    kind: parsed.data.kind,
    file_name: parsed.data.file_name,
    uploaded_by: userData.user.id,
  };

  const row =
    parsed.data.kind === "upload"
      ? {
          ...baseRow,
          file_size: parsed.data.file_size,
          mime_type: parsed.data.mime_type,
          storage_path: parsed.data.storage_path,
        }
      : { ...baseRow, external_url: parsed.data.external_url };

  const { data, error } = await supabase
    .from("attachments")
    .insert(row)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  if (parsed.data.audit_id) revalidatePath(`/audits/${parsed.data.audit_id}`);
  return { ok: true, data: { id: data.id } };
}

/**
 * Supprime une PJ. Si elle a un storage_path, le fichier Storage est aussi supprimé.
 */
export async function deleteAttachment(input: DeleteAttachmentInput): Promise<ActionResult> {
  const parsed = deleteAttachmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "ID invalide" };
  }

  const supabase = await createClient();

  // Récupérer le storage_path pour suppression du fichier physique
  const { data: row } = await supabase
    .from("attachments")
    .select("storage_path, audit_id")
    .eq("id", parsed.data.id)
    .single();

  if (row?.storage_path) {
    await supabase.storage.from("attachments").remove([row.storage_path]);
  }

  const { error } = await supabase.from("attachments").delete().eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  if (row?.audit_id) revalidatePath(`/audits/${row.audit_id}`);
  return { ok: true };
}

/**
 * Génère une URL signée pour télécharger une PJ uploadée.
 */
export async function getAttachmentSignedUrl(
  storagePath: string,
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("attachments")
    .createSignedUrl(storagePath, 3600); // 1h

  if (error || !data) return { ok: false, error: error?.message ?? "Erreur signature" };
  return { ok: true, data: { url: data.signedUrl } };
}
