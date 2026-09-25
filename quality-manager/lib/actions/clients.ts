"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notifications/notify";
import { inviteClientSchema, type InviteClientInput } from "@/lib/schemas/clients";
import type { ActionResult } from "./types";

/**
 * Invite un client sur un dossier précis, ou lui ajoute ce dossier s'il a
 * déjà un compte client actif (cas d'un client qui suit plusieurs dossiers).
 *
 * Deux chemins possibles pour le même email :
 * - jamais vu avant → un compte est créé via l'API d'invitation Supabase,
 *   qui envoie l'email et déclenche `handle_new_user` (rôle "client",
 *   rattaché à CET organisme, sans en créer un nouveau) ;
 * - déjà client de cet organisme → on ajoute simplement une ligne
 *   `audit_access`, sans repasser par un envoi d'email.
 */
export async function inviteClientToAudit(
  input: InviteClientInput,
): Promise<ActionResult<{ mode: "invited" | "added" }>> {
  const parsed = inviteClientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }
  const { auditId, email } = parsed.data;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { data: me } = await supabase
    .from("users")
    .select("organization_id, role")
    .eq("id", userData.user.id)
    .single();
  if (!me || (me.role !== "admin" && me.role !== "editor")) {
    return { ok: false, error: "Seuls les administrateurs et éditeurs peuvent inviter un client" };
  }

  const { data: audit } = await supabase
    .from("audits")
    .select("id, name")
    .eq("id", auditId)
    .eq("organization_id", me.organization_id)
    .single();
  if (!audit) return { ok: false, error: "Dossier introuvable" };

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", me.organization_id)
    .single();

  const admin = createAdminClient();

  // Un compte existe-t-il déjà pour cet email (invitation précédente sur un
  // autre dossier, ou compte staff/client d'un autre organisme) ?
  const { data: existing } = await admin.from("users").select("id, organization_id, role").eq("email", email).maybeSingle();

  let clientUserId: string;
  let mode: "invited" | "added";

  if (existing) {
    if (existing.organization_id !== me.organization_id || existing.role !== "client") {
      return {
        ok: false,
        error: "Cet email est déjà associé à un autre compte Quality Manager.",
      };
    }
    clientUserId = existing.id;
    mode = "added";
  } else {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { invited_org_id: me.organization_id },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback?next=${encodeURIComponent("/reset-password?next=/client")}`,
    });
    if (inviteError || !invited.user) {
      return { ok: false, error: inviteError?.message ?? "Échec de l'envoi de l'invitation" };
    }
    clientUserId = invited.user.id;
    mode = "invited";
  }

  const { error: accessError } = await admin.from("audit_access").upsert(
    {
      audit_id: auditId,
      user_id: clientUserId,
      invited_email: email,
      invited_by: userData.user.id,
      organization_name: org?.name ?? "",
      status: "active",
    },
    { onConflict: "audit_id,user_id" },
  );
  if (accessError) return { ok: false, error: accessError.message };

  // Le client le trouvera dans ses notifications dès sa prochaine connexion.
  await notifyUser(
    { id: clientUserId, organizationId: me.organization_id },
    {
      category: "system",
      title: `Nouveau dossier confié : « ${audit.name} »`,
      sourceLabel: org?.name ?? undefined,
      url: `/client/dossiers/${auditId}`,
    },
  );

  revalidatePath(`/audits/${auditId}`);
  revalidatePath("/clients");
  return { ok: true, data: { mode } };
}

/** Prévient le client quand son accès à un dossier est retiré ou rendu. */
async function notifyAccessChange(accessId: string, change: "revoked" | "reactivated") {
  const { data: access } = await createAdminClient()
    .from("audit_access")
    .select("user_id, audit_id, organization_name, audit:audits(name, organization_id)")
    .eq("id", accessId)
    .single();
  if (!access?.audit) return;

  await notifyUser(
    { id: access.user_id, organizationId: access.audit.organization_id },
    {
      category: change === "revoked" ? "alerte" : "system",
      title:
        change === "revoked"
          ? `Votre accès au dossier « ${access.audit.name} » a été retiré`
          : `Votre accès au dossier « ${access.audit.name} » est rétabli`,
      sourceLabel: access.organization_name,
      url: change === "revoked" ? "/client" : `/client/dossiers/${access.audit_id}`,
    },
  );
}

/** Révoque l'accès d'un client à un dossier — le compte reste actif s'il a d'autres dossiers. */
export async function revokeClientAccess(accessId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { data: me } = await supabase.from("users").select("role").eq("id", userData.user.id).single();
  if (!me || (me.role !== "admin" && me.role !== "editor")) {
    return { ok: false, error: "Action réservée aux administrateurs et éditeurs" };
  }

  const { error } = await supabase.from("audit_access").update({ status: "revoked" }).eq("id", accessId);
  if (error) return { ok: false, error: error.message };
  await notifyAccessChange(accessId, "revoked");

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Redonne l'accès à un client précédemment révoqué, sans réinviter. */
export async function reactivateClientAccess(accessId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { data: me } = await supabase.from("users").select("role").eq("id", userData.user.id).single();
  if (!me || (me.role !== "admin" && me.role !== "editor")) {
    return { ok: false, error: "Action réservée aux administrateurs et éditeurs" };
  }

  const { error } = await supabase.from("audit_access").update({ status: "active" }).eq("id", accessId);
  if (error) return { ok: false, error: error.message };
  await notifyAccessChange(accessId, "reactivated");

  revalidatePath("/", "layout");
  return { ok: true };
}

export type ClientSessionOverview = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  lastSignInAt: string | null;
  createdAt: string;
  dossiers: {
    accessId: string;
    auditId: string;
    name: string;
    type: string;
    status: string;
    organizationName: string;
    createdAt: string;
  }[];
};

/**
 * Ré-envoie l'email d'invitation/connexion au client et retourne un lien d'accès direct si disponible.
 */
export async function resendClientAccessCredentials(
  accessId: string,
): Promise<ActionResult<{ email: string; directLink?: string }>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { data: me } = await supabase.from("users").select("role, organization_id").eq("id", userData.user.id).single();
  if (!me || (me.role !== "admin" && me.role !== "editor")) {
    return { ok: false, error: "Action réservée aux administrateurs et éditeurs" };
  }

  const { data: access } = await supabase
    .from("audit_access")
    .select("id, invited_email, user_id, audit_id, audit:audits(name)")
    .eq("id", accessId)
    .single();

  if (!access) return { ok: false, error: "Accès client introuvable" };

  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectTo = `${appUrl}/callback?next=${encodeURIComponent("/reset-password?next=/client")}`;

  // Ré-envoie l'invitation ou génère un lien magique de connexion
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(access.invited_email, {
    data: { invited_org_id: me.organization_id },
    redirectTo,
  });

  let directLink: string | undefined = undefined;

  // Si l'utilisateur est déjà inscrit, on génère un magic link direct
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: access.invited_email,
    options: { redirectTo },
  });

  if (linkData?.properties?.action_link) {
    directLink = linkData.properties.action_link;
  }

  if (inviteError && !directLink) {
    return { ok: false, error: inviteError.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, data: { email: access.invited_email, directLink } };
}

/**
 * Récupère la liste complète des clients et leurs sessions pour l'administration.
 */
export async function getClientSessionsOverview(): Promise<ActionResult<ClientSessionOverview[]>> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  const { data: me } = await supabase.from("users").select("role, organization_id").eq("id", userData.user.id).single();
  if (!me || (me.role !== "admin" && me.role !== "editor")) {
    return { ok: false, error: "Accès réservé aux administrateurs et éditeurs" };
  }

  // Tous les utilisateurs rôles client de cet organisme
  const { data: clients } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, created_at")
    .eq("organization_id", me.organization_id)
    .eq("role", "client");

  const { data: accesses } = await supabase
    .from("audit_access")
    .select("id, user_id, invited_email, status, created_at, organization_name, audit:audits(id, name, audit_type)")
    .order("created_at", { ascending: false });

  const clientMap = new Map<string, ClientSessionOverview>();

  // Pré-remplir la carte des clients
  for (const c of clients ?? []) {
    const key = c.email.toLowerCase();
    clientMap.set(key, {
      id: c.id,
      email: c.email,
      firstName: c.first_name || "",
      lastName: c.last_name || "",
      lastSignInAt: null,
      createdAt: c.created_at,
      dossiers: [],
    });
  }

  // Tenter d'enrichir avec la date de dernière connexion auth
  try {
    const admin = createAdminClient();
    const { data: authUsers } = await admin.auth.admin.listUsers();
    if (authUsers?.users) {
      for (const au of authUsers.users) {
        if (!au.email) continue;
        const entry = clientMap.get(au.email.toLowerCase());
        if (entry) {
          entry.lastSignInAt = au.last_sign_in_at || null;
        }
      }
    }
  } catch (e) {
    console.warn("Impossible de récupérer la liste des utilisateurs auth pour last_sign_in_at:", e);
  }

  // Mapper les accès aux dossiers
  for (const a of accesses ?? []) {
    if (!a.audit) continue;
    const key = a.invited_email.toLowerCase();
    let entry = clientMap.get(key);

    if (!entry) {
      entry = {
        id: a.user_id,
        email: a.invited_email,
        firstName: "",
        lastName: "",
        lastSignInAt: null,
        createdAt: a.created_at,
        dossiers: [],
      };
      clientMap.set(key, entry);
    }

    entry.dossiers.push({
      accessId: a.id,
      auditId: a.audit.id,
      name: a.audit.name,
      type: a.audit.audit_type,
      status: a.status,
      organizationName: a.organization_name,
      createdAt: a.created_at,
    });
  }

  return { ok: true, data: Array.from(clientMap.values()) };
}

