import { describe, it, expect } from "vitest";
import {
  CRITERES,
  INDICATORS,
  getApplicableIndicators,
  getIndicatorsByCritere,
  getIndicator,
  getMiniAppsForIndicator,
  MINIAPPS,
} from "./rnq";

describe("RNQ V9 référentiel", () => {
  it("expose exactement 7 critères", () => {
    expect(Object.keys(CRITERES)).toHaveLength(7);
  });

  it("expose exactement 32 indicateurs", () => {
    expect(INDICATORS).toHaveLength(32);
  });

  it("getIndicator retrouve un indicateur par code", () => {
    const i11 = getIndicator("I11");
    expect(i11).toBeDefined();
    expect(i11?.critere).toBe(3);
  });

  it("getApplicableIndicators exclut les CFA-only si pas de CFA", () => {
    const withoutCfa = getApplicableIndicators(["AF", "BC"]);
    expect(withoutCfa.find((i) => i.code === "I13")).toBeUndefined();
    expect(withoutCfa.find((i) => i.code === "I20")).toBeUndefined();
    expect(withoutCfa.find((i) => i.code === "I29")).toBeUndefined();
  });

  it("getApplicableIndicators inclut les CFA-only si CFA dans catégories", () => {
    const withCfa = getApplicableIndicators(["AF", "CFA"]);
    expect(withCfa.find((i) => i.code === "I13")).toBeDefined();
    expect(withCfa.find((i) => i.code === "I29")).toBeDefined();
  });

  it("getIndicatorsByCritere filtre correctement", () => {
    const c7 = getIndicatorsByCritere(7, ["AF"]);
    expect(c7.length).toBeGreaterThanOrEqual(3);
    expect(c7.every((i) => i.critere === 7)).toBe(true);
  });
});

describe("MINIAPPS registry", () => {
  it("expose exactement 19 mini-apps", () => {
    expect(Object.keys(MINIAPPS)).toHaveLength(19);
  });

  it("toutes les mini-apps ont au moins 1 indicateur", () => {
    for (const m of Object.values(MINIAPPS)) {
      expect(m.indicators.length).toBeGreaterThan(0);
    }
  });

  it("getMiniAppsForIndicator I23 retourne tableau-veille", () => {
    const apps = getMiniAppsForIndicator("I23");
    expect(apps.some((a) => a.key === "tableau-veille")).toBe(true);
  });

  it("getMiniAppsForIndicator I11 retourne grille-evaluation", () => {
    const apps = getMiniAppsForIndicator("I11");
    expect(apps.some((a) => a.key === "grille-evaluation")).toBe(true);
  });
});
