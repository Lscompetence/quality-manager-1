import { z } from "zod";

export const updateProfileSchema = z.object({
  first_name: z.string().min(1, "Prénom requis").max(60),
  last_name: z.string().min(1, "Nom requis").max(60),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateNotifPrefsSchema = z.object({
  preferences: z.record(z.record(z.boolean())),
});

export type UpdateNotifPrefsInput = z.infer<typeof updateNotifPrefsSchema>;
