import { getApplicableIndicators, type Category, type CritereNum } from "@/lib/constants/rnq";

// =============================================================================
// Avancement d'un dossier d'audit — critère par critère, indicateur par
// indicateur. Utilisé par le tableau de bord du dossier (editor) et par la
// vue d'avancement des établissements (admin).
// =============================================================================

export type IndicatorStatus = "a_traiter" | "en_cours" | "complet" | "non_applicable";

export type CritereProgress = { total: number; done: number; inProgress: number };

export type AuditProgress = {
  byCritere: Record<CritereNum, CritereProgress>;
  /** Statut de chaque indicateur applicable (a_traiter si jamais renseigné) */
  byIndicator: { code: string; critere: CritereNum; status: IndicatorStatus }[];
  total: number;
  done: number;
  inProgress: number;
  /** Part des indicateurs complets, arrondie à l'entier */
  percent: number;
};

const CRITERES: CritereNum[] = [1, 2, 3, 4, 5, 6, 7];

export function computeAuditProgress(
  categories: Category[],
  rows: { indicator_code: string; status: IndicatorStatus }[],
): AuditProgress {
  const statusByCode = new Map(rows.map((r) => [r.indicator_code, r.status]));
  const applicable = getApplicableIndicators(categories);

  const byCritere = Object.fromEntries(
    CRITERES.map((c) => [c, { total: 0, done: 0, inProgress: 0 }]),
  ) as Record<CritereNum, CritereProgress>;

  const byIndicator = applicable.map((ind) => {
    const status = statusByCode.get(ind.code) ?? "a_traiter";
    const p = byCritere[ind.critere];
    p.total++;
    if (status === "complet") p.done++;
    if (status === "en_cours") p.inProgress++;
    return { code: ind.code, critere: ind.critere, status };
  });

  const total = applicable.length;
  const done = CRITERES.reduce((s, c) => s + byCritere[c].done, 0);
  const inProgress = CRITERES.reduce((s, c) => s + byCritere[c].inProgress, 0);

  return {
    byCritere,
    byIndicator,
    total,
    done,
    inProgress,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}

export const INDICATOR_STATUS_LABEL: Record<IndicatorStatus, string> = {
  a_traiter: "À traiter",
  en_cours: "En cours",
  complet: "Complet",
  non_applicable: "Non applicable",
};

export const AUDIT_TYPE_LABEL: Record<"initial" | "surveillance" | "renouvellement", string> = {
  initial: "Audit initial",
  surveillance: "Audit de surveillance",
  renouvellement: "Audit de renouvellement",
};
