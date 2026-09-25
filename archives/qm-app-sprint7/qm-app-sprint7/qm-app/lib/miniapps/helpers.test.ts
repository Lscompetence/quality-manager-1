import { describe, it, expect } from "vitest";
import {
  addMonths,
  count,
  danger,
  daysBetween,
  daysUntil,
  firstMatch,
  fmtDate,
  fmtDuration,
  has,
  latestDate,
  lookup,
  lookupAll,
  minutesBetween,
  mode,
  num,
  numOrNull,
  ok,
  pct,
  pending,
  ratio,
  str,
  sum,
  toHours,
  toneFromDeadline,
  toneFromRate,
  toneFromRateInverse,
  warn,
} from "./helpers";

// Les helpers portent toute la logique des « contrôles automatiques » reprise
// des 18 classeurs Excel. Une régression ici fausse silencieusement des alertes
// de conformité — d'où une couverture large.

describe("valeurs", () => {
  it("str normalise et supprime les espaces de bord", () => {
    expect(str("  abc  ")).toBe("abc");
    expect(str(null)).toBe("");
    expect(str(undefined)).toBe("");
    expect(str(0)).toBe("0");
  });

  it("has distingue vide et renseigné", () => {
    expect(has("")).toBe(false);
    expect(has("   ")).toBe(false);
    expect(has(null)).toBe(false);
    expect(has("0")).toBe(true);
  });

  it("num accepte la virgule décimale et les espaces", () => {
    expect(num("12,5")).toBe(12.5);
    expect(num("1 200")).toBe(1200);
    expect(num("abc")).toBe(0);
    expect(num("")).toBe(0);
  });

  it("numOrNull distingue zéro et absence de saisie", () => {
    expect(numOrNull("0")).toBe(0);
    expect(numOrNull("")).toBeNull();
    expect(numOrNull("abc")).toBeNull();
  });
});

describe("dates", () => {
  it("daysBetween calcule un écart signé", () => {
    expect(daysBetween("2026-01-01", "2026-01-11")).toBe(10);
    expect(daysBetween("2026-01-11", "2026-01-01")).toBe(-10);
  });

  it("daysBetween retourne null sur une date invalide", () => {
    expect(daysBetween("", "2026-01-01")).toBeNull();
    expect(daysBetween("01/01/2026", "2026-01-01")).toBeNull();
  });

  it("daysBetween traverse correctement une année bissextile", () => {
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
  });

  it("addMonths gère le débordement de fin de mois", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-01-15", 12)).toBe("2027-01-15");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("", 12)).toBe("");
  });

  it("fmtDate produit le format français", () => {
    expect(fmtDate("2026-03-08")).toBe("08/03/2026");
    expect(fmtDate("")).toBe("—");
  });

  it("daysUntil est négatif pour une date passée", () => {
    expect(daysUntil("2000-01-01")!).toBeLessThan(0);
    expect(daysUntil("2099-01-01")!).toBeGreaterThan(0);
  });
});

describe("horaires", () => {
  it("minutesBetween calcule une durée de séquence", () => {
    expect(minutesBetween("09:00", "12:30")).toBe(210);
    expect(minutesBetween("14:00", "09:00")).toBe(-300);
  });

  it("minutesBetween rejette les formats invalides", () => {
    expect(minutesBetween("9h00", "12:30")).toBeNull();
    expect(minutesBetween("25:00", "26:00")).toBeNull();
    expect(minutesBetween("", "12:30")).toBeNull();
  });

  it("fmtDuration formate heures et minutes", () => {
    expect(fmtDuration(210)).toBe("3 h 30");
    expect(fmtDuration(120)).toBe("2 h");
    expect(fmtDuration(45)).toBe("45 min");
  });

  it("toHours convertit en heures décimales", () => {
    expect(toHours(210)).toBe(3.5);
    expect(toHours(455)).toBe(7.58);
  });
});

describe("agrégats", () => {
  const rows = [
    { statut: "ok", n: "3" },
    { statut: "ko", n: "2" },
    { statut: "ok", n: "5" },
    { statut: "", n: "" },
  ];

  it("count et sum parcourent les lignes", () => {
    expect(count(rows, (r) => r.statut === "ok")).toBe(2);
    expect(sum(rows, (r) => num(r.n))).toBe(10);
  });

  it("pct gère le dénominateur nul", () => {
    expect(pct(1, 4)).toBe("25 %");
    expect(pct(1, 3, 1)).toBe("33,3 %");
    expect(pct(1, 0)).toBe("—");
  });

  it("ratio retourne 0 sur dénominateur nul", () => {
    expect(ratio(1, 4)).toBe(25);
    expect(ratio(1, 0)).toBe(0);
  });

  it("mode ignore les valeurs vides", () => {
    expect(mode(rows, "statut")).toEqual({ value: "ok", n: 2 });
    expect(mode([], "statut")).toBeNull();
  });

  it("latestDate retourne la date la plus récente", () => {
    const dates = [{ d: "2026-01-01" }, { d: "2026-06-30" }, { d: "" }];
    expect(latestDate(dates, "d")).toBe("2026-06-30");
    expect(latestDate([], "d")).toBe("");
  });
});

describe("lookups inter-tables", () => {
  const partenaires = [{ nom: "Mission locale" }, { nom: "Cap emploi" }];

  it("lookup retrouve la première ligne correspondante", () => {
    expect(lookup(partenaires, "nom", "Cap emploi")).toEqual({ nom: "Cap emploi" });
    expect(lookup(partenaires, "nom", "Inconnu")).toBeNull();
    expect(lookup(undefined, "nom", "Cap emploi")).toBeNull();
  });

  it("lookup ignore une valeur de recherche vide", () => {
    expect(lookup(partenaires, "nom", "")).toBeNull();
  });

  it("lookupAll retourne toutes les correspondances", () => {
    const sollicitations = [
      { partenaire: "Cap emploi" },
      { partenaire: "Cap emploi" },
      { partenaire: "Mission locale" },
    ];
    expect(lookupAll(sollicitations, "partenaire", "Cap emploi")).toHaveLength(2);
    expect(lookupAll(undefined, "partenaire", "Cap emploi")).toHaveLength(0);
  });
});

describe("tonalités", () => {
  it("toneFromRate applique les seuils croissants", () => {
    expect(toneFromRate(90, 80, 60)).toBe("ok");
    expect(toneFromRate(70, 80, 60)).toBe("warn");
    expect(toneFromRate(50, 80, 60)).toBe("danger");
  });

  it("toneFromRateInverse applique les seuils décroissants", () => {
    expect(toneFromRateInverse(5, 10, 20)).toBe("ok");
    expect(toneFromRateInverse(15, 10, 20)).toBe("warn");
    expect(toneFromRateInverse(25, 10, 20)).toBe("danger");
  });

  it("toneFromDeadline distingue échue, proche et valide", () => {
    expect(toneFromDeadline("2000-01-01")).toBe("danger");
    expect(toneFromDeadline("2099-01-01")).toBe("ok");
    expect(toneFromDeadline("")).toBe("neutral");
  });

  it("firstMatch retourne la première règle vraie", () => {
    const r = firstMatch(
      [
        [false, danger("A")],
        [true, warn("B")],
        [true, ok("C")],
      ],
      pending(),
    );
    expect(r).toEqual({ text: "B", tone: "warn" });
  });

  it("firstMatch retombe sur le fallback si aucune règle ne matche", () => {
    expect(firstMatch([[false, danger("A")]], ok("OK"))).toEqual({
      text: "OK",
      tone: "ok",
    });
    expect(firstMatch([[false, danger("A")]])).toEqual({
      text: "À renseigner",
      tone: "neutral",
    });
  });
});
