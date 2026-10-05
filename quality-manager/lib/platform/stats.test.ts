import { describe, expect, it } from "vitest";
import { computeQualityStats, estimateMonthlyRevenue, isPaymentOverdue } from "./stats";

describe("computeQualityStats", () => {
  it("aucune demande : tout à zéro, délai inconnu", () => {
    const s = computeQualityStats([]);
    expect(s.total).toBe(0);
    expect(s.handledRate).toBe(0);
    expect(s.avgHandlingDays).toBeNull();
  });

  it("taux et délai moyen de traitement", () => {
    const s = computeQualityStats([
      {
        kind: "reclamation",
        status: "traite",
        created_at: "2026-09-01T10:00:00Z",
        handled_at: "2026-09-03T10:00:00Z",
      },
      {
        kind: "reclamation",
        status: "traite",
        created_at: "2026-09-01T10:00:00Z",
        handled_at: "2026-09-05T10:00:00Z",
      },
      {
        kind: "suggestion",
        status: "a_traiter",
        created_at: "2026-09-10T10:00:00Z",
        handled_at: null,
      },
      {
        kind: "ouverture_compte",
        status: "a_traiter",
        created_at: "2026-09-10T10:00:00Z",
        handled_at: null,
      },
    ]);
    expect(s.total).toBe(4);
    expect(s.toHandle).toBe(2);
    expect(s.handled).toBe(2);
    expect(s.handledRate).toBe(50);
    expect(s.avgHandlingDays).toBe(3);
    expect(s.byKind.reclamation).toEqual({ total: 2, toHandle: 0 });
    expect(s.byKind.suggestion).toEqual({ total: 1, toHandle: 1 });
  });
});

describe("isPaymentOverdue", () => {
  const now = new Date("2026-09-25T12:00:00Z");
  it("échéance passée sur un client actif", () => {
    expect(
      isPaymentOverdue(
        { subscription_status: "active", next_billing_at: "2026-09-01T00:00:00Z" },
        now,
      ),
    ).toBe(true);
  });
  it("pas d'alerte si l'échéance est future, absente, ou le client déjà suspendu", () => {
    expect(
      isPaymentOverdue(
        { subscription_status: "active", next_billing_at: "2026-10-01T00:00:00Z" },
        now,
      ),
    ).toBe(false);
    expect(isPaymentOverdue({ subscription_status: "active", next_billing_at: null }, now)).toBe(
      false,
    );
    expect(
      isPaymentOverdue(
        { subscription_status: "suspended", next_billing_at: "2026-09-01T00:00:00Z" },
        now,
      ),
    ).toBe(false);
  });
});

describe("revenu mensuel estimé", () => {
  it("compte les abonnements actifs, l'annuel pour son douzième, hors Réseau", () => {
    expect(
      estimateMonthlyRevenue([
        { subscription_status: "active", plan: "pro", billing_cycle: "monthly" }, // 75
        { subscription_status: "active", plan: "essentiel", billing_cycle: "annual" }, // 350 / 12
        { subscription_status: "suspended", plan: "pro", billing_cycle: "monthly" }, // exclu
        { subscription_status: "active", plan: "reseau", billing_cycle: "annual" }, // sur devis
      ]),
    ).toBe(104.17);
  });
});
