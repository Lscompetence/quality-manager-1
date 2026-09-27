import { describe, expect, it } from "vitest";
import { computeAuditProgress } from "./progress";

describe("computeAuditProgress", () => {
  it("dossier vide : 0 % et tous les indicateurs à traiter", () => {
    const p = computeAuditProgress(["AF"], []);
    expect(p.total).toBe(27); // 32 − 5 indicateurs réservés au CFA
    expect(p.done).toBe(0);
    expect(p.percent).toBe(0);
    expect(p.byIndicator.every((i) => i.status === "a_traiter")).toBe(true);
  });

  it("un dossier CFA porte les 32 indicateurs", () => {
    expect(computeAuditProgress(["CFA"], []).total).toBe(32);
  });

  it("compte complets et en cours par critère", () => {
    const p = computeAuditProgress(
      ["AF"],
      [
        { indicator_code: "I1", status: "complet" },
        { indicator_code: "I2", status: "complet" },
        { indicator_code: "I4", status: "en_cours" },
      ],
    );
    expect(p.byCritere[1]).toEqual({ total: 3, done: 2, inProgress: 0 });
    expect(p.byCritere[2]).toEqual({ total: 5, done: 0, inProgress: 1 });
    expect(p.done).toBe(2);
    expect(p.percent).toBe(7);
  });

  it("ignore un indicateur CFA renseigné sur un dossier non CFA", () => {
    const p = computeAuditProgress(["AF"], [{ indicator_code: "I13", status: "complet" }]);
    expect(p.done).toBe(0);
    expect(p.byIndicator.find((i) => i.code === "I13")).toBeUndefined();
  });
});
