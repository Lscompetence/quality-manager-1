import { z } from "zod";

export const indicatorStatusSchema = z.enum(["a_traiter", "en_cours", "complet", "non_applicable"]);
export type IndicatorStatusEnum = z.infer<typeof indicatorStatusSchema>;

export const updateIndicatorSchema = z.object({
  audit_id: z.string().uuid(),
  indicator_code: z.string().min(1),
  status: indicatorStatusSchema.optional(),
  notes: z.string().max(5000).optional(),
});

export type UpdateIndicatorInput = z.infer<typeof updateIndicatorSchema>;
