import { describe, expect, it } from "vitest";
import { annualMonthlyEquivalent, annualTotal, formatEuros, MONTHLY_PRICE_HT } from "./pricing";

describe("tarifs (cadrage § 4.3)", () => {
  it("reprend les prix mensuels du cadrage", () => {
    expect(MONTHLY_PRICE_HT.essentiel).toBe(35);
    expect(MONTHLY_PRICE_HT.pro).toBe(75);
  });

  it("offre deux mois sur l'annuel", () => {
    expect(annualTotal("essentiel")).toBe(350);
    expect(annualTotal("pro")).toBe(750);
  });

  it("donne l'équivalent mensuel de l'annuel au centime", () => {
    expect(annualMonthlyEquivalent("essentiel")).toBe(29.17);
    expect(annualMonthlyEquivalent("pro")).toBe(62.5);
  });

  it("formate les montants à la française", () => {
    expect(formatEuros(29.17)).toBe("29,17");
    expect(formatEuros(62.5)).toBe("62,50");
    expect(formatEuros(350)).toBe("350");
  });
});
