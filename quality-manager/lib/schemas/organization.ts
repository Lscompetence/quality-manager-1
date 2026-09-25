import { z } from "zod";

export const updateOrgSchema = z.object({
  name: z.string().min(1, "Nom requis").max(200),
  legal_form: z.string().max(60).optional().or(z.literal("")),
  siret: z.string().max(20).optional().or(z.literal("")),
  declaration_nb: z.string().max(40).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  billing_email: z.string().email().optional().or(z.literal("")),
  vat_number: z.string().max(30).optional().or(z.literal("")),
});

export type UpdateOrgInput = z.infer<typeof updateOrgSchema>;

export const updatePlanSchema = z.object({
  plan: z.enum(["essentiel", "pro", "reseau"]),
  billing_cycle: z.enum(["monthly", "annual"]),
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
