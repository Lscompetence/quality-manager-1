import { z } from "zod";

export const attachmentKindSchema = z.enum(["upload", "ref"]);

export const createAttachmentUploadSchema = z.object({
  audit_id: z.string().uuid("Dossier requis"),
  miniapp_key: z.string().max(100).optional(),
  context_path: z.string().max(200).optional(),
  context_label: z.string().max(200).optional(),
  kind: z.literal("upload"),
  file_name: z.string().min(1).max(200),
  file_size: z
    .number()
    .int()
    .nonnegative()
    .max(5 * 1024 * 1024, "Fichier > 5 Mo"),
  mime_type: z.string().min(1),
  storage_path: z.string().min(1),
});

export const createAttachmentRefSchema = z.object({
  audit_id: z.string().uuid("Dossier requis"),
  miniapp_key: z.string().max(100).optional(),
  context_path: z.string().max(200).optional(),
  context_label: z.string().max(200).optional(),
  kind: z.literal("ref"),
  file_name: z.string().min(1).max(200),
  // Revue de sécurité (sprint 8) : pas de javascript:, data:…
  external_url: z
    .string()
    .url("URL invalide")
    .refine((u) => /^https?:\/\//i.test(u), "Lien en http(s) uniquement"),
});

export const createAttachmentSchema = z.discriminatedUnion("kind", [
  createAttachmentUploadSchema,
  createAttachmentRefSchema,
]);

export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>;

export const deleteAttachmentSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteAttachmentInput = z.infer<typeof deleteAttachmentSchema>;
