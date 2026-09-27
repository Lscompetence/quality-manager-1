import { createAdminClient } from "@/lib/supabase/admin";
import { displayName } from "@/lib/utils/display-name";
import type { Database } from "@/types/database";

/**
 * Notifications admin ↔ client.
 *
 * - Le staff n'est prévenu que d'une chose : la connexion d'un client à son
 *   espace (`kind = "client_login"`), avec son nom et l'heure, rien d'autre.
 * - Les clients sont prévenus de ce que le staff fait sur leurs dossiers.
 *
 * L'écriture passe par la clé de service : un client n'a pas le droit
 * d'écrire dans les notifications du staff, et inversement.
 * Ce module n'est appelé que depuis des actions serveur, après vérification
 * des droits de l'utilisateur.
 *
 * Une notification qui échoue ne doit jamais faire échouer l'action
 * principale : les erreurs sont journalisées, pas propagées.
 */

type Category = Database["public"]["Tables"]["notifications"]["Row"]["category"];
type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

/**
 * Insère des notifications avec leur auteur (`actor_id`) et leur nature
 * (`kind`). Tant que les migrations 000012 et 000013 ne sont pas passées,
 * ces colonnes n'existent pas : on réessaie sans elles plutôt que de perdre
 * la notification.
 */
async function insertNotifications(rows: NotificationInsert[], context: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert(rows);
  if (!error) return;
  if (error.message.includes("actor_id") || error.message.includes("kind")) {
    const { error: retry } = await admin
      .from("notifications")
      .insert(rows.map(({ actor_id: _actorId, kind: _kind, ...row }) => row));
    if (retry) console.error(`${context}:`, retry.message);
    return;
  }
  console.error(`${context}:`, error.message);
}

type NotifyPayload = {
  category: Category;
  title: string;
  sourceLabel?: string;
  /** Lien pour le staff (espace admin) */
  staffUrl?: string;
  /** Lien pour le client (espace client) */
  clientUrl?: string;
  /** Nature : `client_login` pour une connexion client, sinon activité. */
  kind?: "activity" | "client_login";
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

/** Prévient le staff (admin et editor) de l'organisme, sauf l'auteur de l'action (`exceptUserId`). */
export async function notifyStaff(
  organizationId: string,
  payload: NotifyPayload,
  exceptUserId?: string,
) {
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
        actor_id: exceptUserId ?? null,
        kind: payload.kind ?? "activity",
      }));

    if (rows.length > 0) await insertNotifications(rows, "notifyStaff");
  } catch (e) {
    console.error("notifyStaff:", e);
  }
}

/** Prévient les clients à qui ce dossier est confié, sauf l'auteur de l'action. */
export async function notifyAuditClients(
  auditId: string,
  payload: NotifyPayload,
  exceptUserId?: string,
) {
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
        actor_id: exceptUserId ?? null,
      }));

    if (rows.length > 0) await insertNotifications(rows, "notifyAuditClients");
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
    await insertNotifications(
      [
        {
          organization_id: user.organizationId,
          user_id: user.id,
          category: payload.category,
          title: payload.title,
          source_label: payload.sourceLabel ?? null,
          source_url: payload.url ?? null,
        },
      ],
      "notifyUser",
    );
  } catch (e) {
    console.error("notifyUser:", e);
  }
}

/**
 * Action du staff sur un dossier : les clients à qui il est confié sont
 * prévenus. Les actions d'un client ne notifient plus le staff : celui-ci
 * n'est averti que des connexions (voir `notifyClientSignIn`).
 */
export async function notifyOtherSide(
  actor: Actor,
  audit: { id: string; name: string; organizationId: string },
  payload: Omit<NotifyPayload, "sourceLabel">,
) {
  if (actor.role === "client") return;
  await notifyAuditClients(audit.id, { ...payload, sourceLabel: audit.name }, actor.id);
}

/**
 * Un client vient d'ouvrir une session sur son espace : le staff de son
 * organisme est prévenu. Seuls son nom et l'heure sont transmis — rien sur
 * ce qu'il consulte ou fait ensuite.
 */
export async function notifyClientSignIn(userId: string) {
  const actor = await getActor(userId);
  if (!actor || actor.role !== "client") return;
  await notifyStaff(
    actor.organizationId,
    {
      category: "system",
      kind: "client_login",
      title: `${actor.name} s'est connecté à son espace client`,
    },
    actor.id,
  );
}
