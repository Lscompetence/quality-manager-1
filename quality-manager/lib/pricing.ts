// =============================================================================
// Tarifs Quality Manager — Cadrage § 4.3 (décision verrouillée).
//
// Un seul chiffre par plan : le prix mensuel HT. L'annuel en découle :
// « équivalent mensuel avec −2 mois offerts », soit 10 mois facturés sur 12.
// =============================================================================

export type PricedPlan = "essentiel" | "pro";

/** Prix mensuel HT, sans engagement. Le plan Réseau est sur devis. */
export const MONTHLY_PRICE_HT: Record<PricedPlan, number> = {
  essentiel: 35,
  pro: 75,
};

/** Mois offerts sur un abonnement annuel. */
export const FREE_MONTHS_ANNUAL = 2;

/** Total facturé pour une année (HT). */
export function annualTotal(plan: PricedPlan): number {
  return MONTHLY_PRICE_HT[plan] * (12 - FREE_MONTHS_ANNUAL);
}

/** Équivalent mensuel d'un abonnement annuel (HT), au centime. */
export function annualMonthlyEquivalent(plan: PricedPlan): number {
  return Math.round((annualTotal(plan) / 12) * 100) / 100;
}

/** Montant en euros à la française : « 29,17 », « 350 ». */
export function formatEuros(amount: number): string {
  return amount.toLocaleString("fr-FR", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
