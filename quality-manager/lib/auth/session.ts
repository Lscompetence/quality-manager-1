import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole, SubscriptionStatus } from "./permissions";
import { isAccessBlocked } from "./permissions";

// =============================================================================
// Contexte de session — qui est connecté, et dans quel espace il travaille.
//
//   platform  → super admin LS Compétences (table platform_admins)
//   member    → utilisateur d'un client (admin / editor / reader)
//   client    → accès à un dossier précis (rôle `client`, espace /client)
//   no_access → compte Auth sans rattachement (inscription publique, accès retiré)
//   anonymous → pas connecté
//
// `cache` : une seule résolution par requête, même si layout et page l'appellent.
// =============================================================================

export type EstablishmentSummary = { id: string; name: string; city: string | null };

export type SessionContext =
  | { kind: "anonymous" }
  | { kind: "platform"; userId: string; email: string }
  | { kind: "no_access"; userId: string; email: string }
  | { kind: "client"; userId: string; email: string }
  | {
      kind: "member";
      userId: string;
      email: string;
      profile: { firstName: string; lastName: string; role: MemberRole };
      organization: {
        id: string;
        name: string;
        siret: string | null;
        plan: "essentiel" | "pro" | "reseau";
        subscriptionStatus: SubscriptionStatus;
      };
      /** Établissements accessibles : tous ceux du client pour un admin, ses rattachements sinon. */
      establishments: EstablishmentSummary[];
    };

export type MemberSession = Extract<SessionContext, { kind: "member" }>;

export const getSession = cache(async (): Promise<SessionContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: "anonymous" };

  const email = user.email ?? "";

  const { data: isPlatform } = await supabase.rpc("is_platform_admin");
  if (isPlatform === true) return { kind: "platform", userId: user.id, email };

  const { data: profile } = await supabase
    .from("users")
    .select(
      "first_name, last_name, role, organization:organizations(id, name, siret, plan, subscription_status)",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return { kind: "no_access", userId: user.id, email };
  // Un client n'a pas accès à la fiche de l'organisme : son espace est /client
  if (profile.role === "client") return { kind: "client", userId: user.id, email };
  if (!profile.organization) return { kind: "no_access", userId: user.id, email };

  // La RLS ne renvoie que les établissements accessibles (et aucun si le compte est gelé)
  const { data: establishments } = await supabase
    .from("establishments")
    .select("id, name, city")
    .order("name", { ascending: true });

  return {
    kind: "member",
    userId: user.id,
    email,
    profile: { firstName: profile.first_name, lastName: profile.last_name, role: profile.role },
    organization: {
      id: profile.organization.id,
      name: profile.organization.name,
      siret: profile.organization.siret,
      plan: profile.organization.plan,
      subscriptionStatus: profile.organization.subscription_status,
    },
    establishments: establishments ?? [],
  };
});

/** Pour les pages de l'espace client : redirige tout ce qui n'est pas un membre actif. */
export async function requireMember(): Promise<MemberSession> {
  const session = await getSession();
  switch (session.kind) {
    case "anonymous":
      redirect("/login");
    case "platform":
      redirect("/platform");
    case "no_access":
      redirect("/acces/en-attente");
    case "client":
      redirect("/client");
    case "member":
      if (isAccessBlocked(session.organization.subscriptionStatus)) redirect("/acces/suspendu");
      return session;
  }
}

/** Pour les pages admin client uniquement. */
export async function requireOrgAdmin(): Promise<MemberSession> {
  const session = await requireMember();
  if (session.profile.role !== "admin") redirect("/dashboard");
  return session;
}

/** Pour l'espace super admin. */
export async function requirePlatformAdmin(): Promise<
  Extract<SessionContext, { kind: "platform" }>
> {
  const session = await getSession();
  if (session.kind === "anonymous") redirect("/platform/login");
  if (session.kind !== "platform") redirect("/dashboard");
  return session;
}
