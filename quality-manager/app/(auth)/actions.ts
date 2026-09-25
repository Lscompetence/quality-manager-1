"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type SignupInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/schemas/auth";
import type { ActionResult } from "@/lib/actions/types";

/** Espace depuis lequel on se connecte : chaque rôle a sa propre page. */
export type LoginPortal = "admin" | "client";

export async function login(input: LoginInput, portal: LoginPortal = "admin"): Promise<ActionResult> {
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

  // Chaque page de connexion n'accepte que son rôle : un client ne passe pas
  // par l'entrée admin, et inversement. En cas d'erreur de porte, on referme
  // la session tout de suite plutôt que de la laisser ouverte.
  const { data: profile } = await supabase.from("users").select("role").eq("id", data.user.id).single();
  const isClient = profile?.role === "client";

  if (portal === "client" && !isClient) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: "Ce compte n'est pas un compte client. Utilisez la connexion administrateur.",
    };
  }
  if (portal === "admin" && isClient) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: "Ce compte est un compte client. Connectez-vous depuis l'espace client.",
    };
  }

  revalidatePath("/", "layout");
  redirect(isClient ? "/client" : "/dashboard");
}

export async function signup(input: SignupInput): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        organization_name: parsed.data.organizationName,
      },
    },
  });

  if (error) {
    return { ok: false, error: mapAuthError(error.message) };
  }

  return { ok: true };
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Email invalide" };
  }

  const supabase = await createClient();
  // Pour des raisons de sécurité on ne dit pas si l'email existe ou non
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback?next=/reset-password`,
  });

  return { ok: true };
}

export async function resetPassword(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, error: mapAuthError(error.message) };
  }

  return { ok: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
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
  if (message.includes("Invalid login credentials")) return "Email ou mot de passe incorrect";
  if (message.includes("Email not confirmed")) return "Veuillez confirmer votre email";
  if (message.includes("User already registered")) return "Un compte existe déjà avec cet email";
  return message;
}
