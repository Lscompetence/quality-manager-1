import { createAdminClient } from "@/lib/supabase/admin";
import { displayName } from "@/lib/utils/display-name";
import type { Database } from "@/types/database";

/**
 * Notifications croisées admin ↔ client.
 *
 * Chaque action de l'un prévient l'autre : un dépôt du client prévient le
 * staff du dossier, une mise à jour du staff prévient le ou les clients à qui
 * le dossier est confié. L'écriture passe par la clé de service : un client
 * n'a pas le droit d'écrire dans les notifications du staff, et inversement.
 * Ce module n'est appelé que depuis des actions serveur, après vérification
 * des droits de l'utilisateur.
 *
 * Une notification qui échoue ne doit jamais faire échouer l'action
 * principale : les erreurs sont journalisées, pas propagées.
 */

type Category = Database["public"]["Tables"]["notifications"]["Row"]["category"];

type NotifyPayload = {
  category: Category;
  title: string;
  sourceLabel?: string;
  /** Lien pour le staff (espace admin) */
  staffUrl?: string;
  /** Lien pour le client (espace client) */
  clientUrl?: string;
};

export type Actor = {
  id: string;
  role: string;
  organizationId: string;
  name: string;
};

/** Qui agit : son rôle, son organisme, et un nom lisible pour le message. */
export async function getActor(userId: string): Promise<Actor | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id, role, organization_id, first_name, last_name, email")
    .eq("id", userId)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    role: data.role,
    organizationId: data.organization_id,
    name: displayName(data.first_name, data.last_name, data.email),
  };
}

/** Prévient le staff (admin et editor) de l'organisme, sauf l'auteur de l'action. */
export async function notifyStaff(organizationId: string, payload: NotifyPayload, exceptUserId?: string) {
  try {
    const admin = createAdminClient();
    const { data: staff } = await admin
      .from("users")
      .select("id")
      .eq("organization_id", organizationId)
      .in("role", ["admin", "editor"]);

    const rows = (staff ?? [])
      .filter((u) => u.id !== exceptUserId)
      .map((u) => ({
        organization_id: organizationId,
        user_id: u.id,
        category: payload.category,
        title: payload.title,
        source_label: payload.sourceLabel ?? null,
        source_url: payload.staffUrl ?? null,
      }));

    if (rows.length > 0) {
      const { error } = await admin.from("notifications").insert(rows);
      if (error) console.error("notifyStaff:", error.message);
    }
  } catch (e) {
    console.error("notifyStaff:", e);
  }
}

/** Prévient les clients à qui ce dossier est confié, sauf l'auteur de l'action. */
export async function notifyAuditClients(auditId: string, payload: NotifyPayload, exceptUserId?: string) {
  try {
    const admin = createAdminClient();
    const { data: accesses } = await admin
      .from("audit_access")
      .select("user_id, audit:audits(organization_id)")
      .eq("audit_id", auditId)
      .eq("status", "active");

    const rows = (accesses ?? [])
      .filter((a) => a.user_id !== exceptUserId && a.audit)
      .map((a) => ({
        organization_id: a.audit!.organization_id,
        user_id: a.user_id,
        category: payload.category,
        title: payload.title,
        source_label: payload.sourceLabel ?? null,
        source_url: payload.clientUrl ?? null,
      }));

    if (rows.length > 0) {
      const { error } = await admin.from("notifications").insert(rows);
      if (error) console.error("notifyAuditClients:", error.message);
    }
  } catch (e) {
    console.error("notifyAuditClients:", e);
  }
}

/** Prévient un utilisateur précis (ex. : le client à qui on confie un dossier). */
export async function notifyUser(
  user: { id: string; organizationId: string },
  payload: Omit<NotifyPayload, "staffUrl" | "clientUrl"> & { url?: string },
) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("notifications").insert({
      organization_id: user.organizationId,
      user_id: user.id,
      category: payload.category,
      title: payload.title,
      source_label: payload.sourceLabel ?? null,
      source_url: payload.url ?? null,
    });
    if (error) console.error("notifyUser:", error.message);
  } catch (e) {
    console.error("notifyUser:", e);
  }
}

/**
 * Prévient « l'autre côté » d'une action sur un dossier : le staff si c'est un
 * client qui agit, les clients du dossier si c'est le staff.
 */
export async function notifyOtherSide(
  actor: Actor,
  audit: { id: string; name: string; organizationId: string },
  payload: Omit<NotifyPayload, "sourceLabel">,
) {
  const withLabel = { ...payload, sourceLabel: audit.name };
  if (actor.role === "client") {
    await notifyStaff(audit.organizationId, withLabel, actor.id);
  } else {
    await notifyAuditClients(audit.id, withLabel, actor.id);
    // Les autres membres du staff sont aussi prévenus de l'activité d'équipe.
    await notifyStaff(audit.organizationId, { ...withLabel, category: "equipe" }, actor.id);
  }
}
