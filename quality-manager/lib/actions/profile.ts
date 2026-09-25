"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateProfileSchema, updateNotifPrefsSchema, type UpdateProfileInput, type UpdateNotifPrefsInput } from "@/lib/schemas/profile";
import type { ActionResult } from "./types";

export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { error } = await supabase
    .from("users")
    .update({ first_name: parsed.data.first_name, last_name: parsed.data.last_name })
    .eq("id", userData.user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateNotifPreferences(input: UpdateNotifPrefsInput): Promise<ActionResult> {
  const parsed = updateNotifPrefsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Préférences invalides" };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: userData.user.id, preferences: parsed.data.preferences });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/notifications");
  revalidatePath("/client", "layout");
  return { ok: true };
}

export async function markNotificationRead(notifId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notifId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/notifications");
  revalidatePath("/client", "layout");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userData.user.id)
    .is("read_at", null);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/notifications");
  revalidatePath("/client", "layout");
  return { ok: true };
}
