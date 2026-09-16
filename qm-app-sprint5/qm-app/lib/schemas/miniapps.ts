import { z } from "zod";

export const saveMiniAppDataSchema = z.object({
  audit_id: z.string().uuid(),
  miniapp_key: z.string().min(1).max(100),
  data: z.record(z.unknown()),
});

export type SaveMiniAppDataInput = z.infer<typeof saveMiniAppDataSchema>;
