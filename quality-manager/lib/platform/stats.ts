import type { RequestKind, RequestStatus, SubscriptionStatus } from "@/lib/auth/permissions";
import { MONTHLY_PRICE_HT, annualTotal } from "@/lib/pricing";

// =============================================================================
// Indicateurs de l'espace super admin — calculs purs, testés.
// =============================================================================

export type RequestLite = {
  kind: RequestKind;
  status: RequestStatus;
  created_at: string;
  handled_at: string | null;
};

export type QualityStats = {
  total: number;
  toHandle: number;
  handled: number;
  /** Part des demandes traitées, en % arrondi */
  handledRate: number;
  /** Délai moyen de traitement en jours (demandes traitées), null si aucune */
  avgHandlingDays: number | null;
  byKind: Record<RequestKind, { total: number; toHandle: number }>;
};

const KINDS: RequestKind[] = ["ouverture_compte", "reclamation", "suggestion", "support", "autre"];
const DAY = 24 * 60 * 60 * 1000;

export function computeQualityStats(requests: RequestLite[]): QualityStats {
  const byKind = Object.fromEntries(
    KINDS.map((k) => [k, { total: 0, toHandle: 0 }]),
  ) as QualityStats["byKind"];
  let handled = 0;
  let delaySum = 0;
  let delayCount = 0;

  for (const r of requests) {
    byKind[r.kind].total++;
    if (r.status === "a_traiter") byKind[r.kind].toHandle++;
    else {
      handled++;
      if (r.handled_at) {
        const d = (new Date(r.handled_at).getTime() - new Date(r.created_at).getTime()) / DAY;
        if (Number.isFinite(d) && d >= 0) {
          delaySum += d;
          delayCount++;
        }
      }
    }
  }

  const total = requests.length;
  return {
    total,
    toHandle: total - handled,
    handled,
    handledRate: total > 0 ? Math.round((handled / total) * 100) : 0,
    avgHandlingDays: delayCount > 0 ? Math.round((delaySum / delayCount) * 10) / 10 : null,
    byKind,
  };
}

/** Client actif dont l'échéance de paiement est dépassée : à relancer, puis à suspendre. */
export function isPaymentOverdue(
  client: { subscription_status: SubscriptionStatus; next_billing_at: string | null },
  now: Date = new Date(),
): boolean {
  if (client.subscription_status !== "active" || !client.next_billing_at) return false;
  return new Date(client.next_billing_at).getTime() < now.getTime();
}

/**
 * Revenu mensuel récurrent estimé (HT) : abonnements actifs Essentiel et Pro,
 * un annuel compté pour son douzième. Le plan Réseau, sur devis, est exclu.
 */
export function estimateMonthlyRevenue(
  clients: {
    subscription_status: SubscriptionStatus;
    plan: "essentiel" | "pro" | "reseau";
    billing_cycle: "monthly" | "annual";
  }[],
): number {
  let total = 0;
  for (const c of clients) {
    if (c.subscription_status !== "active" || c.plan === "reseau") continue;
    total += c.billing_cycle === "annual" ? annualTotal(c.plan) / 12 : MONTHLY_PRICE_HT[c.plan];
  }
  return Math.round(total * 100) / 100;
}
