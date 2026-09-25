import { z } from "zod";

export const inviteClientSchema = z.object({
  auditId: z.string().uuid(),
  email: z.string().trim().email("Adresse email invalide"),
});

export type InviteClientInput = z.infer<typeof inviteClientSchema>;
