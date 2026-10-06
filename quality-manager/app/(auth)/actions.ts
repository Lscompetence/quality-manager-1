"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PASSWORD_SETUP_COOKIE, canSetPassword } from "@/lib/auth/password-setup";
import { createClient } from "@/lib/supabase/server";
import {
  createEmailLinkClient,
  emailErrorMessage,
  emailRedirectUrl,
} from "@/lib/supabase/email-link";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/schemas/auth";
import type { ActionResult } from "@/lib/actions/types";
import type { Route } from "next";
import {
  PORTALS,
  passwordPagePath,
  portalOf,
  wrongPortalMessage,
  type AccountKind,
  type Portal,
} from "@/lib/auth/portals";

/** Espace depuis lequel on se connecte : chaque rôle a sa propre page. */
export type LoginPortal = Portal;

/** Qui est ce compte : super admin, rôle de son profil, ou rattaché à rien. */
async function accountKind(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<AccountKind> {
  const { data: isPlatform } = await supabase.rpc("is_platform_admin");
  if (isPlatform === true) return "platform";
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return profile?.role ?? "none";
}

export async function login(
  input: LoginInput,
  portal: LoginPortal = "admin",
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: mapAuthError(error.message) };
  }

  // Chaque page de connexion n'accepte que son rôle. En cas d'erreur de porte,
  // on referme la session tout de suite plutôt que de la laisser ouverte.
  const kind = await accountKind(supabase, data.user.id);
  if (kind === "none") {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: "Ce compte n’est rattaché à aucun organisme. Contactez l’admin de votre organisme.",
    };
  }
  if (portalOf(kind) !== portal) {
    await supabase.auth.signOut();
    return { ok: false, error: wrongPortalMessage(kind) };
  }

  revalidatePath("/", "layout");
  redirect(`${PORTALS[portal].home}?bienvenue=1` as Route);
}

export async function forgotPassword(
  input: ForgotPasswordInput,
  portal: LoginPortal = "admin",
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Email invalide" };
  }

  // Le lien ramène dans l'espace d'où la demande est partie
  const { error } = await createEmailLinkClient().auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: emailRedirectUrl(passwordPagePath(portal)),
  });
  // Supabase ne dit jamais si l'email existe : seuls les refus d'envoi
  // (trop de demandes, SMTP en panne) remontent ici.
  if (error) return { ok: false, error: emailErrorMessage(error.message) };

  return { ok: true };
}

export async function resetPassword(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();
  // Seulement pour le compte du lien reçu par email (voir lib/auth/password-setup)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  if (!user || !canSetPassword(cookieStore.get(PASSWORD_SETUP_COOKIE)?.value, user.id)) {
    return {
      ok: false,
      error: "Ce lien n’est plus valable. Demandez un nouveau lien depuis « Mot de passe oublié ».",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: mapAuthError(error.message) };
  }

  // Lien consommé : la page ne resservira pas
  cookieStore.delete(PASSWORD_SETUP_COOKIE);
  return { ok: true };
}

/** Déconnexion : chacun revient sur la page de connexion de son espace. */
export async function logout() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const portal = user ? portalOf(await accountKind(supabase, user.id)) : null;
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(PORTALS[portal ?? "admin"].login as Route);
}

/** Déconnexion depuis l'espace client : retour à la page de connexion client. */
export async function logoutClient() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/client/login");
}

// =============================================================================
// Helpers
// =============================================================================
function mapAuthError(message: string): string {
  if (message.includes("Invalid login credentials"))
    return "Email ou mot de passe incorrect. Si le navigateur a rempli le mot de passe tout seul, effacez-le et retapez-le.";
  if (message.includes("Email not confirmed")) return "Veuillez confirmer votre email";
  if (message.includes("User already registered")) return "Un compte existe déjà avec cet email";
  if (message.includes("session missing"))
    return "Votre lien a expiré. Refaites une demande « Mot de passe oublié ».";
  if (message.includes("should be different"))
    return "Le nouveau mot de passe doit être différent de l'ancien";
  return message;
}
