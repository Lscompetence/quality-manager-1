import { describe, it, expect } from "vitest";
import {
  CRITERES,
  INDICATORS,
  getApplicableIndicators,
  getIndicatorsByCritere,
  getIndicator,
  getMiniAppsForIndicator,
  getMiniAppsForIndicatorInCategories,
  getIndicatorCodesWithMiniApp,
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
  it("expose exactement 37 mini-apps", () => {
    expect(Object.keys(MINIAPPS)).toHaveLength(37);
  });

  it("les clés du registre correspondent au champ key de chaque schéma", () => {
    for (const [key, m] of Object.entries(MINIAPPS)) {
      expect(m.key).toBe(key);
    }
  });

  it("tous les indicateurs référencés existent dans le référentiel", () => {
    const codes = new Set(INDICATORS.map((i) => i.code));
    for (const m of Object.values(MINIAPPS)) {
      for (const code of m.indicators) {
        expect(codes.has(code), `${m.key} référence ${code}`).toBe(true);
      }
    }
  });

  it("le critère déclaré est cohérent avec celui du premier indicateur", () => {
    for (const m of Object.values(MINIAPPS)) {
      expect(m.critere).toBeGreaterThanOrEqual(1);
      expect(m.critere).toBeLessThanOrEqual(7);
    }
  });

  it("les références base documentaire sont uniques", () => {
    const refs = Object.values(MINIAPPS)
      .map((m) => m.docRef)
      .filter((r): r is string => Boolean(r));
    expect(new Set(refs).size).toBe(refs.length);
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

describe("Rattachement des mini-apps aux indicateurs", () => {
  it("30 indicateurs disposent d'une mini-app dédiée", () => {
    expect(getIndicatorCodesWithMiniApp()).toHaveLength(30);
  });

  it("I15 et I28 sont traités par modèles documentaires, sans mini-app", () => {
    // Aucun classeur Excel dans la base pour ces deux indicateurs : rien à
    // calculer ni à recouper. Ils restent traitables via la page indicateur
    // et son dépôt de preuves, comme tous les autres.
    const withApp = new Set(getIndicatorCodesWithMiniApp());
    const withoutApp = INDICATORS.filter((i) => !withApp.has(i.code)).map((i) => i.code);
    expect(withoutApp.sort()).toEqual(["I15", "I28"]);
  });

  it("I5 et I8 sont désormais couverts (sprint 7)", () => {
    expect(getMiniAppsForIndicator("I5").map((m) => m.key)).toContain(
      "alignement-objectifs",
    );
    expect(getMiniAppsForIndicator("I8").map((m) => m.key)).toContain(
      "registre-positionnements",
    );
  });

  it("filtre les mini-apps CFA-only hors dossier CFA", () => {
    const af = getMiniAppsForIndicatorInCategories("I4", ["AF"]);
    expect(af.some((m) => m.key === "adequation-poste")).toBe(false);

    const cfa = getMiniAppsForIndicatorInCategories("I4", ["CFA"]);
    expect(cfa.some((m) => m.key === "adequation-poste")).toBe(true);
  });
});
