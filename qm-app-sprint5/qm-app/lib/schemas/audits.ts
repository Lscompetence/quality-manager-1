import { z } from "zod";

export const categorySchema = z.enum(["AF", "BC", "VAE", "CFA"]);
export type CategoryEnum = z.infer<typeof categorySchema>;

export const auditTypeSchema = z.enum(["initial", "surveillance", "renouvellement"]);
export const auditStatusSchema = z.enum(["en_cours", "cloture", "archive"]);

export const createAuditSchema = z.object({
  name: z.string().min(2, "Nom requis (2 caractères min)").max(120),
  audit_type: auditTypeSchema,
  categories: z.array(categorySchema).min(1, "Au moins une catégorie"),
  audit_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date au format AAAA-MM-JJ")
    .optional()
    .or(z.literal("")),
  certificateur: z.string().max(120).optional().or(z.literal("")),
});

export type CreateAuditInput = z.infer<typeof createAuditSchema>;

export const updateAuditSchema = createAuditSchema.partial().extend({
  id: z.string().uuid(),
  status: auditStatusSchema.optional(),
});

export type UpdateAuditInput = z.infer<typeof updateAuditSchema>;
