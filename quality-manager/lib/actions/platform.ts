"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createEmailLinkClient,
  emailErrorMessage,
  emailRedirectUrl,
} from "@/lib/supabase/email-link";
import { getSession } from "@/lib/auth/session";
import { passwordPagePath } from "@/lib/auth/portals";
import {
  clientPlanSchema,
  createClientAccountSchema,
  deleteClientSchema,
  handleRequestSchema,
  recordPaymentSchema,
  subscriptionStatusSchema,
  type ClientPlanInput,
  type CreateClientAccountInput,
  type DeleteClientInput,
  type HandleRequestInput,
  type RecordPaymentInput,
  type SubscriptionStatusInput,
} from "@/lib/schemas/access";
import type { ActionResult } from "./types";

// =============================================================================
// Espace super admin — pilotage de l'activité de Quality Manager.
//
// Aucune de ces actions ne lit un dossier client. Les mises à jour de
// comptes passent par le client utilisateur (policies « Platform admins »),
// la service role ne sert qu'à l'API admin d'Auth et à la purge du stockage.
// =============================================================================

async function requirePlatformAction(): Promise<{ userId: string } | { error: string }> {
  const session = await getSession();
  if (session.kind !== "platform") return { error: "Action réservée à LS Compétences" };
  return { userId: session.userId };
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Données invalides";
}

const DEFAULT_NOTIFICATION_PREFS = {
  echeance_30j: { inapp: true, email: true },
  echeance_7j: { inapp: true, email: true },
  alerte_orange: { inapp: true, email: true },
  alerte_rouge: { inapp: true, email: true },
  weekly_digest: { email: true },
};

/** Le lien de l'email mène au choix du mot de passe, puis à l'espace admin. */
const ADMIN_WELCOME = passwordPagePath("admin");

function revalidatePlatform(orgId?: string) {
  revalidatePath("/platform");
  revalidatePath("/platform/clients");
  revalidatePath("/platform/demandes");
  if (orgId) revalidatePath(`/platform/clients/${orgId}`);
}

// ---- Création d'un compte client --------------------------------------------

export async function createClientAccount(
  input: CreateClientAccountInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createClientAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const auth = await requirePlatformAction();
  if ("error" in auth) return { ok: false, error: auth.error };

  const admin = createAdminClient();

  const { data: taken } = await admin
    .from("users")
    .select("id")
    .eq("email", parsed.data.admin_email)
    .maybeSingle();
  if (taken) return { ok: false, error: "Cette adresse est déjà utilisée par un compte client." };

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: parsed.data.organization_name,
      email: parsed.data.admin_email,
      plan: parsed.data.plan,
      billing_cycle: parsed.data.billing_cycle,
      subscription_status: "active",
      status_changed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (orgError || !org) return { ok: false, error: orgError?.message ?? "Création impossible" };

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.admin_email,
    {
      redirectTo: emailRedirectUrl(ADMIN_WELCOME),
      data: { first_name: parsed.data.admin_first_name, last_name: parsed.data.admin_last_name },
    },
  );
  if (inviteError || !invited.user) {
    await admin.from("organizations").delete().eq("id", org.id);
    return {
      ok: false,
      error: inviteError ? emailErrorMessage(inviteError.message) : "Invitation impossible",
    };
  }

  const { error: userError } = await admin.from("users").insert({
    id: invited.user.id,
    organization_id: org.id,
    email: parsed.data.admin_email,
    first_name: parsed.data.admin_first_name,
    last_name: parsed.data.admin_last_name,
    role: "admin",
  });
  if (userError) {
    await admin.auth.admin.deleteUser(invited.user.id);
    await admin.from("organizations").delete().eq("id", org.id);
    return { ok: false, error: userError.message };
  }
  await admin
    .from("notification_preferences")
    .insert({ user_id: invited.user.id, preferences: DEFAULT_NOTIFICATION_PREFS });

  if (parsed.data.request_id) {
    const supabase = await createClient();
    await supabase
      .from("client_requests")
      .update({
        status: "traite",
        organization_id: org.id,
        handled_at: new Date().toISOString(),
        handled_by: auth.userId,
        response: "Compte ouvert, invitation envoyée à l’admin.",
      })
      .eq("id", parsed.data.request_id);
  }

  revalidatePlatform(org.id);
  return { ok: true, data: { id: org.id } };
}

/**
 * Renvoie ses accès à l'admin d'un client (lien expiré, email perdu) :
 * l'invitation s'il ne l'a jamais validée, sinon un lien de nouveau mot de passe.
 */
export async function resendAdminInvite(organizationId: string): Promise<ActionResult> {
  const auth = await requirePlatformAction();
  if ("error" in auth) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { data: admins } = await supabase
    .from("users")
    .select("id, email")
    .eq("organization_id", organizationId)
    .eq("role", "admin");
  const target = admins?.[0];
  if (!target) return { ok: false, error: "Aucun admin pour ce client" };

  const admin = createAdminClient();
  const { data: authUser } = await admin.auth.admin.getUserById(target.id);
  const redirectTo = emailRedirectUrl(ADMIN_WELCOME);

  const { error } = authUser.user?.email_confirmed_at
    ? await createEmailLinkClient().auth.resetPasswordForEmail(target.email, { redirectTo })
    : await admin.auth.admin.inviteUserByEmail(target.email, { redirectTo });
  if (error) return { ok: false, error: emailErrorMessage(error.message) };
  return { ok: true };
}

// ---- Abonnement --------------------------------------------------------------

export async function setSubscriptionStatus(input: SubscriptionStatusInput): Promise<ActionResult> {
  const parsed = subscriptionStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const auth = await requirePlatformAction();
  if ("error" in auth) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      subscription_status: parsed.data.status,
      status_changed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.organization_id);
  if (error) return { ok: false, error: error.message };

  revalidatePlatform(parsed.data.organization_id);
  return { ok: true };
}

export async function recordPayment(input: RecordPaymentInput): Promise<ActionResult> {
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const auth = await requirePlatformAction();
  if ("error" in auth) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      last_payment_at: new Date(`${parsed.data.paid_at}T12:00:00Z`).toISOString(),
      next_billing_at: parsed.data.next_billing_at
        ? new Date(`${parsed.data.next_billing_at}T12:00:00Z`).toISOString()
        : null,
    })
    .eq("id", parsed.data.organization_id);
  if (error) return { ok: false, error: error.message };

  revalidatePlatform(parsed.data.organization_id);
  return { ok: true };
}

export async function setClientPlan(input: ClientPlanInput): Promise<ActionResult> {
  const parsed = clientPlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const auth = await requirePlatformAction();
  if ("error" in auth) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ plan: parsed.data.plan, billing_cycle: parsed.data.billing_cycle })
    .eq("id", parsed.data.organization_id);
  if (error) return { ok: false, error: error.message };

  revalidatePlatform(parsed.data.organization_id);
  return { ok: true };
}

// ---- Suppression définitive -------------------------------------------------

/**
 * Supprime un client et tout ce qui lui appartient : fichiers déposés,
 * comptes utilisateurs, établissements, dossiers. Irréversible.
 * La purge est faite sans lire le contenu : on liste des chemins, on supprime.
 */
export async function deleteClientAccount(input: DeleteClientInput): Promise<ActionResult> {
  const parsed = deleteClientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const auth = await requirePlatformAction();
  if ("error" in auth) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", parsed.data.organization_id)
    .maybeSingle();
  if (!org) return { ok: false, error: "Client introuvable" };
  if (org.name.trim() !== parsed.data.confirm_name) {
    return { ok: false, error: "Le nom saisi ne correspond pas au client." };
  }

  const admin = createAdminClient();

  // 1. Fichiers : <org_id>/<audit_id>/<fichier>
  const storage = admin.storage.from("attachments");
  const { data: folders, error: listError } = await storage.list(org.id, { limit: 1000 });
  if (listError) return { ok: false, error: `Stockage : ${listError.message}` };
  for (const folder of folders ?? []) {
    const prefix = `${org.id}/${folder.name}`;
    for (;;) {
      const { data: files } = await storage.list(prefix, { limit: 1000 });
      if (!files || files.length === 0) break;
      const { error: removeError } = await storage.remove(files.map((f) => `${prefix}/${f.name}`));
      if (removeError) return { ok: false, error: `Stockage : ${removeError.message}` };
      if (files.length < 1000) break;
    }
  }

  // 2. Comptes utilisateurs (Auth) — la ligne users suit par cascade
  const { data: members } = await admin.from("users").select("id").eq("organization_id", org.id);
  for (const m of members ?? []) {
    const { error } = await admin.auth.admin.deleteUser(m.id);
    if (error) return { ok: false, error: `Compte ${m.id} : ${error.message}` };
  }

  // 3. Le client — établissements, dossiers, indicateurs, mini-apps, preuves en cascade
  const { error } = await admin.from("organizations").delete().eq("id", org.id);
  if (error) return { ok: false, error: error.message };

  revalidatePlatform();
  return { ok: true };
}

// ---- Demandes ------------------------------------------------------------------

export async function handleClientRequest(input: HandleRequestInput): Promise<ActionResult> {
  const parsed = handleRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const auth = await requirePlatformAction();
  if ("error" in auth) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const done = parsed.data.status === "traite";
  const { error } = await supabase
    .from("client_requests")
    .update({
      status: parsed.data.status,
      response: parsed.data.response || null,
      handled_at: done ? new Date().toISOString() : null,
      handled_by: done ? auth.userId : null,
    })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: error.message };

  revalidatePlatform();
  revalidatePath("/demandes");
  return { ok: true };
}
