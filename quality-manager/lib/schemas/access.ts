import { z } from "zod";

// =============================================================================
// Sprint 8 — établissements, accès, demandes clients, pilotage plateforme
// =============================================================================

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const personName = z.string().trim().min(1, "Requis").max(80);
const email = z.string().trim().toLowerCase().email("Email invalide");

// ---- Établissements ---------------------------------------------------------
export const establishmentSchema = z.object({
  name: z.string().trim().min(2, "Nom requis (2 caractères min)").max(160),
  city: optionalText(120),
  siret: z
    .string()
    .trim()
    .regex(/^\d{14}$/, "SIRET : 14 chiffres")
    .optional()
    .or(z.literal("")),
  declaration_nb: optionalText(40),
  address: optionalText(300),
});
export type EstablishmentInput = z.infer<typeof establishmentSchema>;

export const updateEstablishmentSchema = establishmentSchema.extend({ id: z.string().uuid() });
export type UpdateEstablishmentInput = z.infer<typeof updateEstablishmentSchema>;

// ---- Accès à un établissement (invitation par l'admin client) --------------
export const inviteMemberSchema = z.object({
  establishment_id: z.string().uuid(),
  email,
  first_name: personName,
  last_name: personName,
  role: z.enum(["editor", "reader"], { message: "Rôle : responsable pédagogique ou lecteur" }),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const membershipSchema = z.object({
  establishment_id: z.string().uuid(),
  user_id: z.string().uuid(),
});
export type MembershipInput = z.infer<typeof membershipSchema>;

// ---- Demandes clients --------------------------------------------------------
export const clientRequestSchema = z.object({
  kind: z.enum(["reclamation", "suggestion", "support", "autre"]),
  subject: z.string().trim().min(3, "Objet requis").max(160),
  message: z.string().trim().min(5, "Message requis").max(4000),
});
export type ClientRequestInput = z.infer<typeof clientRequestSchema>;

export const accountRequestSchema = z.object({
  organization_name: z.string().trim().min(2, "Nom de l’organisme requis").max(200),
  contact_name: z.string().trim().min(2, "Nom requis").max(160),
  contact_email: email,
  message: optionalText(2000),
  /** Champ piège anti-robot : doit rester vide */
  website: z.string().max(0).optional().or(z.literal("")),
});
export type AccountRequestInput = z.infer<typeof accountRequestSchema>;

// ---- Pilotage plateforme (super admin) --------------------------------------
export const createClientAccountSchema = z.object({
  organization_name: z.string().trim().min(2, "Nom de l’organisme requis").max(200),
  admin_email: email,
  admin_first_name: personName,
  admin_last_name: personName,
  plan: z.enum(["essentiel", "pro", "reseau"]),
  billing_cycle: z.enum(["monthly", "annual"]),
  /** Demande d'ouverture de compte à clôturer, le cas échéant */
  request_id: z.string().uuid().optional(),
});
export type CreateClientAccountInput = z.infer<typeof createClientAccountSchema>;

export const subscriptionStatusSchema = z.object({
  organization_id: z.string().uuid(),
  status: z.enum(["active", "suspended", "cancelled"]),
});
export type SubscriptionStatusInput = z.infer<typeof subscriptionStatusSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date au format AAAA-MM-JJ");

export const recordPaymentSchema = z.object({
  organization_id: z.string().uuid(),
  paid_at: isoDate,
  next_billing_at: isoDate.optional().or(z.literal("")),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const clientPlanSchema = z.object({
  organization_id: z.string().uuid(),
  plan: z.enum(["essentiel", "pro", "reseau"]),
  billing_cycle: z.enum(["monthly", "annual"]),
});
export type ClientPlanInput = z.infer<typeof clientPlanSchema>;

export const deleteClientSchema = z.object({
  organization_id: z.string().uuid(),
  /** L'opérateur retape le nom exact du client pour confirmer */
  confirm_name: z.string().trim().min(1, "Confirmation requise"),
});
export type DeleteClientInput = z.infer<typeof deleteClientSchema>;

export const handleRequestSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["a_traiter", "traite"]),
  response: optionalText(4000),
});
export type HandleRequestInput = z.infer<typeof handleRequestSchema>;
