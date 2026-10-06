import {
  CRITERES,
  getApplicableIndicators,
  type Category,
  type CritereNum,
} from "@/lib/constants/rnq";
import { getApplicableMiniApps } from "@/lib/miniapps/applicable";
import type { MemberRole } from "@/lib/auth/permissions";

// =============================================================================
// Contenu de la recherche (Ctrl+K) de chaque espace, construit côté serveur
// à partir de ce que l'utilisateur a le droit de voir. Les icônes sont des
// noms (et non des composants) : la liste traverse la frontière serveur → client.
// =============================================================================

export type SearchIcon =
  | "home"
  | "building"
  | "folder"
  | "indicator"
  | "critere"
  | "miniapp"
  | "settings"
  | "bell"
  | "user"
  | "support"
  | "documents"
  | "client"
  | "inbox"
  | "activity";

export type SearchItem = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: SearchIcon;
  keywords?: string[];
};

export type SearchGroup = { heading: string; items: SearchItem[] };

type AuditLite = {
  id: string;
  name: string;
  audit_type: string;
  categories: string[];
  establishment_id?: string;
};

const TYPE_LABEL: Record<string, string> = {
  initial: "Audit initial",
  surveillance: "Audit de surveillance",
  renouvellement: "Audit de renouvellement",
};

/** Admin, editor et reader : pages, établissements, dossiers, critères, indicateurs, mini-apps. */
export function buildMemberSearch({
  role,
  establishments,
  audits,
}: {
  role: MemberRole;
  establishments: { id: string; name: string; city: string | null }[];
  audits: AuditLite[];
}): SearchGroup[] {
  const isAdmin = role === "admin";
  const estName = new Map(establishments.map((e) => [e.id, e.name]));

  const pages: SearchItem[] = [
    {
      id: "p-home",
      label: "Vue d’ensemble",
      href: "/dashboard",
      icon: "home",
      keywords: ["accueil", "tableau"],
    },
    ...(isAdmin
      ? [
          {
            id: "p-est",
            label: "Établissements",
            href: "/etablissements",
            icon: "building" as const,
            keywords: ["accès", "responsable", "lecteur"],
          },
          {
            id: "p-settings",
            label: "Paramètres de l’organisme",
            href: "/settings",
            icon: "settings" as const,
            keywords: ["abonnement", "plan", "facturation", "personnes", "profil organisme", "tva"],
          },
        ]
      : []),
    {
      id: "p-support",
      // L'editor et le reader écrivent à leur admin ; l'admin, à LS Compétences
      label: isAdmin ? "Messages (équipe et LS Compétences)" : "Contacter mon admin",
      href: "/demandes",
      icon: "support",
      keywords: ["réclamation", "suggestion", "aide", "message", "question"],
    },
    { id: "p-notif", label: "Notifications", href: "/notifications", icon: "bell" },
    {
      id: "p-profile",
      label: "Mon profil",
      href: "/profile",
      icon: "user",
      keywords: ["mot de passe", "nom"],
    },
  ];

  const groups: SearchGroup[] = [{ heading: "Pages", items: pages }];

  if (isAdmin && establishments.length > 0) {
    groups.push({
      heading: "Établissements",
      items: establishments.map((e) => ({
        id: `e-${e.id}`,
        label: e.name,
        hint: e.city ?? undefined,
        href: `/etablissements/${e.id}`,
        icon: "building",
      })),
    });
  }

  if (audits.length > 0) {
    groups.push({
      heading: "Dossiers",
      items: audits.map((a) => ({
        id: `a-${a.id}`,
        label: a.name,
        hint: [
          TYPE_LABEL[a.audit_type] ?? a.audit_type,
          a.establishment_id ? estName.get(a.establishment_id) : null,
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/audits/${a.id}`,
        icon: "folder",
        keywords: a.categories,
      })),
    });

    // Critères, indicateurs et mini-apps du dossier le plus récent
    const current = audits[0]!;
    const categories = current.categories as Category[];
    const pad = (n: number) => String(n).padStart(2, "0");

    groups.push({
      heading: `Critères · ${current.name}`,
      items: (
        Object.values(CRITERES) as { num: CritereNum; title: string; subtitle: string }[]
      ).map((c) => ({
        id: `c-${c.num}`,
        label: `Critère ${c.num} · ${c.title}`,
        hint: c.subtitle,
        href: `/audits/${current.id}/critere/${pad(c.num)}`,
        icon: "critere",
      })),
    });

    groups.push({
      heading: `Indicateurs · ${current.name}`,
      items: getApplicableIndicators(categories).map((ind) => ({
        id: `i-${ind.code}`,
        label: `${ind.code} · ${ind.title}`,
        hint: `Critère ${ind.critere}`,
        href: `/audits/${current.id}/critere/${pad(ind.critere)}/indicateur/${ind.code}`,
        icon: "indicator",
        keywords: [`indicateur ${ind.num}`],
      })),
    });

    groups.push({
      heading: `Mini-apps · ${current.name}`,
      items: getApplicableMiniApps(categories).map((m) => ({
        id: `m-${m.key}`,
        label: m.name,
        hint: [m.docRef, m.indicators.join(", ")].filter(Boolean).join(" · "),
        href: `/audits/${current.id}/miniapps/${m.key}`,
        icon: "miniapp",
        keywords: [m.shortName, ...m.indicators],
      })),
    });

    groups.push({
      heading: "Dossier",
      items: [
        {
          id: "d-docs",
          label: `Documents · ${current.name}`,
          href: `/audits/${current.id}/documents`,
          icon: "documents",
          keywords: ["preuves", "fichiers"],
        },
      ],
    });
  }

  return groups;
}

/** Super admin : pages de pilotage, clients, demandes à traiter. Aucun dossier. */
export function buildPlatformSearch({
  clients,
  pendingRequests,
}: {
  clients: { id: string; name: string; plan: string; subscription_status: string }[];
  pendingRequests: { id: string; subject: string; who: string }[];
}): SearchGroup[] {
  const groups: SearchGroup[] = [
    {
      heading: "Pages",
      items: [
        {
          id: "p-pilotage",
          label: "Pilotage",
          href: "/platform",
          icon: "home",
          keywords: ["statistiques", "kpi"],
        },
        {
          id: "p-clients",
          label: "Clients",
          href: "/platform/clients",
          icon: "client",
          keywords: ["organismes", "abonnements"],
        },
        {
          id: "p-demandes",
          label: "Demandes",
          href: "/platform/demandes",
          icon: "inbox",
          keywords: ["réclamation", "suggestion", "ouverture"],
        },
        { id: "p-qualite", label: "Qualité", href: "/platform/qualite", icon: "activity" },
      ],
    },
  ];
  if (clients.length > 0) {
    groups.push({
      heading: "Clients",
      items: clients.map((c) => ({
        id: `cl-${c.id}`,
        label: c.name,
        hint: `${c.plan} · ${c.subscription_status === "active" ? "actif" : c.subscription_status === "suspended" ? "suspendu" : "résilié"}`,
        href: `/platform/clients/${c.id}`,
        icon: "client",
      })),
    });
  }
  if (pendingRequests.length > 0) {
    groups.push({
      heading: "Demandes à traiter",
      items: pendingRequests.map((r) => ({
        id: `r-${r.id}`,
        label: r.subject,
        hint: r.who,
        href: "/platform/demandes",
        icon: "inbox",
      })),
    });
  }
  return groups;
}
