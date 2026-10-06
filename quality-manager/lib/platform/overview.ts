import { createAdminClient } from "@/lib/supabase/admin";
import {
  requestCategory,
  type RequestCategory,
  REQUEST_CATEGORIES,
} from "@/lib/requests/categories";
import { estimateMonthlyRevenue } from "./stats";

// =============================================================================
// Statistiques de l'espace super admin : uniquement des COMPTEURS.
//
// Les règles de la base ne laissent pas le super admin lire les équipes des
// clients ; ces totaux passent donc par la service role, côté serveur, après
// vérification du rôle (requirePlatformAdmin). Aucun contenu de dossier n'est
// lu : seulement des rôles, des plans et des statuts.
// =============================================================================

export type PlatformStats = {
  clients: { total: number; active: number; suspended: number; cancelled: number };
  plans: Record<"essentiel" | "pro" | "reseau", number>;
  users: { admin: number; editor: number; reader: number; total: number };
  establishments: number;
  monthlyRevenue: number;
  requests: Record<RequestCategory, { total: number; toHandle: number }>;
};

export async function loadPlatformStats(): Promise<PlatformStats> {
  const admin = createAdminClient();
  const [{ data: orgs }, { data: users }, { count: establishments }, { data: requests }] =
    await Promise.all([
      admin.from("organizations").select("plan, billing_cycle, subscription_status"),
      admin.from("users").select("role"),
      admin.from("establishments").select("id", { count: "exact", head: true }),
      // Seulement les demandes adressées à LS (pas les messages internes des équipes)
      admin.from("client_requests").select("kind, subject, status").eq("addressed_to", "platform"),
    ]);

  const clients = orgs ?? [];
  const roles = users ?? [];
  const byCategory = Object.fromEntries(
    REQUEST_CATEGORIES.map((c) => [c, { total: 0, toHandle: 0 }]),
  ) as PlatformStats["requests"];
  for (const r of requests ?? []) {
    const c = byCategory[requestCategory(r)];
    c.total++;
    if (r.status === "a_traiter") c.toHandle++;
  }

  const countRole = (role: string) => roles.filter((u) => u.role === role).length;
  return {
    clients: {
      total: clients.length,
      active: clients.filter((c) => c.subscription_status === "active").length,
      suspended: clients.filter((c) => c.subscription_status === "suspended").length,
      cancelled: clients.filter((c) => c.subscription_status === "cancelled").length,
    },
    plans: {
      essentiel: clients.filter((c) => c.plan === "essentiel").length,
      pro: clients.filter((c) => c.plan === "pro").length,
      reseau: clients.filter((c) => c.plan === "reseau").length,
    },
    users: {
      admin: countRole("admin"),
      editor: countRole("editor"),
      reader: countRole("reader"),
      total: countRole("admin") + countRole("editor") + countRole("reader"),
    },
    establishments: establishments ?? 0,
    monthlyRevenue: estimateMonthlyRevenue(clients),
    requests: byCategory,
  };
}
