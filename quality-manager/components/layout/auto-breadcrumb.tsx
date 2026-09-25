"use client";

import { usePathname } from "next/navigation";
import { Breadcrumb, type Crumb } from "@/components/layout/breadcrumb";
import { CRITERES, getIndicator, MINIAPPS, type CritereNum } from "@/lib/constants/rnq";

export type AuditRef = {
  id: string;
  name: string;
  audit_type: string;
  categories: string[];
};

const TYPE_LABEL: Record<string, string> = {
  initial: "initial",
  surveillance: "surveillance",
  renouvellement: "renouvellement",
};

const CATEGORY_LABEL: Record<string, string> = {
  AF: "actions de formation",
  BC: "bilans de compétences",
  VAE: "validation des acquis",
  CFA: "apprentissage",
};

/**
 * Fil d'Ariane de la barre du haut, comme dans les maquettes :
 * « accueil / surveillance · actions de formation / critère 03 · mise en œuvre ».
 * Il est déduit de l'URL, les pages n'ont donc rien à déclarer.
 */
export function AutoBreadcrumb({ audits }: { audits: AuditRef[] }) {
  const pathname = usePathname();
  const items = buildCrumbs(pathname, audits);
  if (items.length === 0) return null;
  return <Breadcrumb items={items} />;
}

function buildCrumbs(pathname: string, audits: AuditRef[]): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: Crumb[] = [{ label: "qualitymanager", href: "/dashboard" }];

  if (segments[0] === "dashboard") {
    return [...crumbs, { label: "accueil" }];
  }

  if (segments[0] === "notifications") return [...crumbs, { label: "notifications" }];
  if (segments[0] === "settings") return [...crumbs, { label: "paramètres organisme" }];
  if (segments[0] === "profile") return [...crumbs, { label: "mon profil" }];

  if (segments[0] !== "audits" || !segments[1]) return [...crumbs, { label: segments[0] ?? "" }];

  const auditId = segments[1];
  const audit = audits.find((a) => a.id === auditId);
  crumbs[0] = { label: "accueil", href: "/dashboard" };
  crumbs.push({
    label: audit ? auditLabel(audit) : "dossier",
    href: `/audits/${auditId}`,
  });

  // /audits/[id]/documents · /audits/[id]/miniapps[/key] · /audits/[id]/critere/[num][/indicateur/[code]]
  const section = segments[2];
  if (!section) return crumbs;

  if (section === "documents") return [...crumbs, { label: "documents" }];

  if (section === "miniapps") {
    const key = segments[3];
    if (!key) return [...crumbs, { label: "mini-apps" }];
    const meta = MINIAPPS[key];
    return [
      ...crumbs,
      { label: "mini-apps", href: `/audits/${auditId}/miniapps` },
      { label: meta?.shortName ?? key },
    ];
  }

  if (section === "critere" && segments[3]) {
    const num = Number(segments[3]) as CritereNum;
    const critere = CRITERES[num];
    const numStr = String(num).padStart(2, "0");
    const critereCrumb: Crumb = {
      label: critere ? `critère ${numStr} · ${critere.title}` : `critère ${numStr}`,
      href: `/audits/${auditId}/critere/${segments[3]}`,
    };

    if (segments[4] === "indicateur" && segments[5]) {
      const ind = getIndicator(segments[5]);
      return [
        ...crumbs,
        critereCrumb,
        { label: ind ? `indicateur ${ind.num} · ${ind.title}` : segments[5] },
      ];
    }

    return [...crumbs, { ...critereCrumb, href: undefined }];
  }

  return crumbs;
}

function auditLabel(audit: AuditRef): string {
  const type = TYPE_LABEL[audit.audit_type] ?? audit.audit_type;
  const cat = audit.categories[0] ? CATEGORY_LABEL[audit.categories[0]] : null;
  return cat ? `${type} · ${cat}` : type;
}
