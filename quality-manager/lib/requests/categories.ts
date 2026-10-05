import type { RequestKind } from "@/lib/auth/permissions";

// =============================================================================
// Catégories de demandes adressées à LS Compétences.
//
// Le type stocké (`kind`) ne distingue pas une demande de changement de plan
// d'une demande d'aide : elle est enregistrée en `support` avec un objet fixe
// (voir `updatePlan`). On la reconnaît ici pour lui donner sa propre catégorie.
// =============================================================================

export type RequestCategory =
  "reclamation" | "abonnement" | "ouverture_compte" | "suggestion" | "support" | "autre";

/** Ordre d'affichage : du plus urgent au moins urgent. */
export const REQUEST_CATEGORIES: RequestCategory[] = [
  "reclamation",
  "abonnement",
  "ouverture_compte",
  "support",
  "suggestion",
  "autre",
];

export const REQUEST_CATEGORY_LABEL: Record<RequestCategory, string> = {
  reclamation: "Réclamation",
  abonnement: "Changement d’abonnement",
  ouverture_compte: "Ouverture de compte",
  support: "Demande d’aide",
  suggestion: "Suggestion",
  autre: "Autre",
};

/** Préfixe de l'objet d'une demande de changement de plan (`updatePlan`). */
export const PLAN_REQUEST_PREFIX = "Changement d’abonnement : ";

export function requestCategory(request: { kind: RequestKind; subject: string }): RequestCategory {
  if (request.subject.startsWith(PLAN_REQUEST_PREFIX)) return "abonnement";
  return request.kind;
}

export type PlanTier = "essentiel" | "pro" | "reseau";
export type Cycle = "monthly" | "annual";

const PLAN_BY_LABEL: Record<string, PlanTier> = {
  essentiel: "essentiel",
  pro: "pro",
  réseau: "reseau",
  reseau: "reseau",
};

/**
 * Plan et facturation demandés, lus dans l'objet écrit par `updatePlan` :
 * « Changement d’abonnement : Pro (mensuel) ». null si l'objet ne suit pas ce format.
 */
export function parsePlanRequest(subject: string): { plan: PlanTier; cycle: Cycle } | null {
  if (!subject.startsWith(PLAN_REQUEST_PREFIX)) return null;
  const match = subject.slice(PLAN_REQUEST_PREFIX.length).match(/^(\S+) \((annuel|mensuel)\)$/i);
  if (!match) return null;
  const plan = PLAN_BY_LABEL[match[1]!.toLowerCase()];
  if (!plan) return null;
  return { plan, cycle: match[2]!.toLowerCase() === "annuel" ? "annual" : "monthly" };
}
