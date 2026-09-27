"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailErrorMessage, emailRedirectUrl } from "@/lib/supabase/email-link";
import { getSession, type MemberSession } from "@/lib/auth/session";
import { isAccessBlocked } from "@/lib/auth/permissions";
import {
  establishmentSchema,
  inviteMemberSchema,
  membershipSchema,
  updateEstablishmentSchema,
  type EstablishmentInput,
  type InviteMemberInput,
  type MembershipInput,
  type UpdateEstablishmentInput,
} from "@/lib/schemas/access";
import type { ActionResult } from "./types";

// =============================================================================
// Espace client — actions de l'admin : établissements et ouverture des accès.
// Les écritures passent par le client utilisateur (RLS) ; seule l'invitation
// d'un nouvel utilisateur utilise la service role (API admin d'Auth).
// =============================================================================

const DEFAULT_NOTIFICATION_PREFS = {
  echeance_30j: { inapp: true, email: true },
  echeance_7j: { inapp: true, email: true },
  alerte_orange: { inapp: true, email: true },
  alerte_rouge: { inapp: true, email: true },
  weekly_digest: { email: true },
};

async function requireAdminAction(): Promise<MemberSession | { error: string }> {
  const session = await getSession();
  if (session.kind !== "member") return { error: "Action réservée à l’admin de l’organisme" };
  if (isAccessBlocked(session.organization.subscriptionStatus)) return { error: "Compte suspendu" };
  if (session.profile.role !== "admin")
    return { error: "Action réservée à l’admin de l’organisme" };
  return session;
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Données invalides";
}

const emptyToNull = (v: string | undefined) => (v && v.length > 0 ? v : null);

// ---- Établissements ---------------------------------------------------------

export async function createEstablishment(
  input: EstablishmentInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = establishmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const session = await requireAdminAction();
  if ("error" in session) return { ok: false, error: session.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("establishments")
    .insert({
      organization_id: session.organization.id,
      name: parsed.data.name,
      city: emptyToNull(parsed.data.city),
      siret: emptyToNull(parsed.data.siret),
      declaration_nb: emptyToNull(parsed.data.declaration_nb),
      address: emptyToNull(parsed.data.address),
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/etablissements");
  revalidatePath("/dashboard");
  return { ok: true, data: { id: data.id } };
}

export async function updateEstablishment(input: UpdateEstablishmentInput): Promise<ActionResult> {
  const parsed = updateEstablishmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const session = await requireAdminAction();
  if ("error" in session) return { ok: false, error: session.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("establishments")
    .update({
      name: parsed.data.name,
      city: emptyToNull(parsed.data.city),
      siret: emptyToNull(parsed.data.siret),
      declaration_nb: emptyToNull(parsed.data.declaration_nb),
      address: emptyToNull(parsed.data.address),
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/etablissements/${parsed.data.id}`);
  revalidatePath("/etablissements");
  return { ok: true };
}

// ---- Accès -----------------------------------------------------------------

/**
 * Ouvre l'accès d'une personne à un établissement.
 * - Personne déjà utilisatrice du même client → simple rattachement.
 * - Nouvelle personne → invitation par email (elle choisit son mot de passe),
 *   création de son profil, rattachement.
 */
export async function inviteMember(
  input: InviteMemberInput,
): Promise<ActionResult<{ invited: boolean }>> {
  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const session = await requireAdminAction();
  if ("error" in session) return { ok: false, error: session.error };

  const supabase = await createClient();

  // L'établissement doit appartenir au client (la RLS ne renvoie que les siens)
  const { data: establishment } = await supabase
    .from("establishments")
    .select("id")
    .eq("id", parsed.data.establishment_id)
    .maybeSingle();
  if (!establishment) return { ok: false, error: "Établissement introuvable" };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("users")
    .select("id, organization_id, role")
    .eq("email", parsed.data.email)
    .maybeSingle();

  if (existing) {
    if (existing.organization_id !== session.organization.id) {
      return { ok: false, error: "Cette adresse est déjà utilisée par un autre organisme." };
    }
    if (existing.role === "admin") {
      return {
        ok: false,
        error: "Un admin voit déjà tous les établissements : inutile de le rattacher.",
      };
    }
    if (existing.role !== parsed.data.role) {
      return {
        ok: false,
        error: `Cette personne est déjà ${existing.role === "editor" ? "responsable pédagogique" : "lectrice"} dans votre organisme : un seul rôle par personne.`,
      };
    }
    const { error } = await supabase
      .from("establishment_members")
      .upsert({ establishment_id: parsed.data.establishment_id, user_id: existing.id });
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/etablissements/${parsed.data.establishment_id}`);
    return { ok: true, data: { invited: false } };
  }

  // Le lien de l'email passe par /callback puis /confirm, qui ouvre la session
  // et mène au choix du mot de passe, puis au tableau de bord.
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      redirectTo: emailRedirectUrl("/reset-password?next=/dashboard"),
      data: { first_name: parsed.data.first_name, last_name: parsed.data.last_name },
    },
  );
  if (inviteError || !invited.user) {
    return {
      ok: false,
      error: inviteError ? emailErrorMessage(inviteError.message) : "Invitation impossible",
    };
  }

  const userId = invited.user.id;
  const { error: profileError } = await admin.from("users").insert({
    id: userId,
    organization_id: session.organization.id,
    email: parsed.data.email,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    role: parsed.data.role,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: profileError.message };
  }

  await admin
    .from("notification_preferences")
    .insert({ user_id: userId, preferences: DEFAULT_NOTIFICATION_PREFS });
  const { error: memberError } = await admin
    .from("establishment_members")
    .insert({ establishment_id: parsed.data.establishment_id, user_id: userId });
  if (memberError) return { ok: false, error: memberError.message };

  revalidatePath(`/etablissements/${parsed.data.establishment_id}`);
  return { ok: true, data: { invited: true } };
}

/** Retire l'accès d'une personne à un établissement (son compte reste, sans cet accès). */
export async function removeMember(input: MembershipInput): Promise<ActionResult> {
  const parsed = membershipSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const session = await requireAdminAction();
  if ("error" in session) return { ok: false, error: session.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("establishment_members")
    .delete()
    .eq("establishment_id", parsed.data.establishment_id)
    .eq("user_id", parsed.data.user_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/etablissements/${parsed.data.establishment_id}`);
  return { ok: true };
}

/** Supprime définitivement le compte d'un editor ou d'un reader du client. */
export async function deleteMemberAccount(userId: string): Promise<ActionResult> {
  const session = await requireAdminAction();
  if ("error" in session) return { ok: false, error: session.error };
  if (userId === session.userId)
    return { ok: false, error: "Vous ne pouvez pas supprimer votre propre compte." };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("users")
    .select("organization_id, role")
    .eq("id", userId)
    .maybeSingle();
  if (!target || target.organization_id !== session.organization.id) {
    return { ok: false, error: "Utilisateur introuvable" };
  }
  if (target.role === "admin")
    return { ok: false, error: "Le compte admin est géré par LS Compétences." };

  // Supprime le compte Auth ; la ligne users et les rattachements suivent (cascade)
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/etablissements");
  revalidatePath("/settings");
  return { ok: true };
}
