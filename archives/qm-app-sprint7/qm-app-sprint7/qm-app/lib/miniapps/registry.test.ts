import { describe, it, expect } from "vitest";
import { getMiniAppSchema, listMiniAppKeys, listMiniAppSchemas } from "./registry";
import type { Column, MiniAppSchema, Row } from "./schema-types";

// Ces tests protègent le contrat du moteur générique. Ils tournent sur les 37
// schémas d'un coup : une erreur de schéma est détectée ici, pas en production.

const schemas = listMiniAppSchemas();
const generic = schemas.filter((s) => (s.kind ?? "generic") === "generic");

/** Toutes les colonnes de tous les registres d'un schéma. */
function allColumns(schema: MiniAppSchema): Column[] {
  return (schema.tables ?? []).flatMap((t) => t.columns);
}

describe("Registry — intégrité", () => {
  it("expose 37 mini-apps", () => {
    expect(listMiniAppKeys()).toHaveLength(37);
  });

  it("getMiniAppSchema retourne null sur une clé inconnue", () => {
    expect(getMiniAppSchema("nexiste-pas")).toBeNull();
  });

  it("la clé du registre correspond au champ key du schéma", () => {
    for (const key of listMiniAppKeys()) {
      expect(getMiniAppSchema(key)?.key).toBe(key);
    }
  });

  it("chaque mini-app a un nom, un nom court et une description", () => {
    for (const s of schemas) {
      expect(s.name.length, s.key).toBeGreaterThan(0);
      expect(s.shortName.length, s.key).toBeGreaterThan(0);
      expect(s.description.length, s.key).toBeGreaterThan(20);
    }
  });

  it("chaque mini-app générique déclare au moins un registre", () => {
    for (const s of generic) {
      expect(s.tables?.length ?? 0, s.key).toBeGreaterThan(0);
    }
  });
});

describe("Registry — schémas de tables", () => {
  it("les identifiants de table sont uniques dans une mini-app", () => {
    for (const s of generic) {
      const ids = (s.tables ?? []).map((t) => t.id);
      expect(new Set(ids).size, s.key).toBe(ids.length);
    }
  });

  it("les identifiants de colonne sont uniques dans une table", () => {
    for (const s of generic) {
      for (const t of s.tables ?? []) {
        const ids = t.columns.map((c) => c.id);
        expect(new Set(ids).size, `${s.key}/${t.id}`).toBe(ids.length);
      }
    }
  });

  it("chaque onglet ne référence que des tables existantes", () => {
    for (const s of generic) {
      const tableIds = new Set((s.tables ?? []).map((t) => t.id));
      for (const tab of s.tabs ?? []) {
        for (const tid of tab.tableIds) {
          expect(tableIds.has(tid), `${s.key} → onglet ${tab.id} → ${tid}`).toBe(true);
        }
      }
    }
  });

  it("chaque table est atteignable depuis au moins un onglet", () => {
    for (const s of generic) {
      if (!s.tabs || s.tabs.length === 0) continue; // onglets auto-générés
      const reachable = new Set(s.tabs.flatMap((t) => t.tableIds));
      for (const t of s.tables ?? []) {
        expect(reachable.has(t.id), `${s.key} → table ${t.id} orpheline`).toBe(true);
      }
    }
  });

  it("les colonnes select déclarent des options non vides et uniques", () => {
    for (const s of generic) {
      for (const col of allColumns(s)) {
        if (col.type !== "select") continue;
        expect(col.options.length, `${s.key}/${col.id}`).toBeGreaterThan(0);
        const values = col.options.map((o) => o.value);
        expect(new Set(values).size, `${s.key}/${col.id}`).toBe(values.length);
      }
    }
  });
});

describe("Moteur v2 — colonnes calculées", () => {
  it("aucune formule ne lève sur une ligne vide", () => {
    for (const s of generic) {
      for (const t of s.tables ?? []) {
        const emptyRow: Row = {};
        for (const col of t.columns) {
          if (col.type !== "computed") continue;
          const run = () =>
            col.compute({ row: emptyRow, rows: [emptyRow], rowIndex: 0, tables: {} });
          expect(run, `${s.key}/${t.id}/${col.id}`).not.toThrow();
        }
      }
    }
  });

  it("toute formule retourne un texte non vide sur une ligne vide", () => {
    for (const s of generic) {
      for (const t of s.tables ?? []) {
        const emptyRow: Row = {};
        for (const col of t.columns) {
          if (col.type !== "computed") continue;
          const r = col.compute({
            row: emptyRow,
            rows: [emptyRow],
            rowIndex: 0,
            tables: {},
          });
          const text = typeof r === "string" ? r : r.text;
          expect(text.length, `${s.key}/${t.id}/${col.id}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("aucune synthèse ne lève sur une table vide ou sur une ligne vide", () => {
    for (const s of generic) {
      for (const t of s.tables ?? []) {
        if (!t.summary) continue;
        const onEmpty = () => t.summary!({ rows: [], tables: {} });
        const onBlankRow = () => t.summary!({ rows: [{}], tables: { [t.id]: [{}] } });
        expect(onEmpty, `${s.key}/${t.id} (table vide)`).not.toThrow();
        expect(onBlankRow, `${s.key}/${t.id} (ligne vide)`).not.toThrow();
      }
    }
  });

  it("aucun bandeau de contrôles ne lève sur des tables vides", () => {
    for (const s of generic) {
      if (!s.controls) continue;
      const emptyTables = Object.fromEntries(
        (s.tables ?? []).map((t) => [t.id, [] as Row[]]),
      );
      const run = () => s.controls!(emptyTables);
      expect(run, s.key).not.toThrow();
      expect(s.controls!(emptyTables), s.key).toEqual([]);
    }
  });

  it("les alertes émises portent une tonalité valide et un message", () => {
    for (const s of generic) {
      if (!s.controls) continue;
      const oneEmptyRow = Object.fromEntries(
        (s.tables ?? []).map((t) => [t.id, [{}] as Row[]]),
      );
      for (const alert of s.controls(oneEmptyRow)) {
        expect(["ok", "warn", "danger"], s.key).toContain(alert.tone);
        expect(alert.message.length, s.key).toBeGreaterThan(0);
      }
    }
  });
});

describe("Sprint 7 — mini-apps issues de la base documentaire", () => {
  const sprint7 = schemas.filter((s) => Boolean(s.docRef));

  it("18 mini-apps portent une référence de base documentaire", () => {
    // Les 18 classeurs de la refonte ; les 19 mini-apps d'origine n'en portent pas encore.
    expect(sprint7.length).toBeGreaterThanOrEqual(18);
  });

  it("chacune expose des contrôles automatiques", () => {
    for (const s of sprint7) {
      expect(typeof s.controls, s.key).toBe("function");
    }
  });

  it("chacune expose au moins une colonne calculée", () => {
    for (const s of sprint7) {
      const computed = allColumns(s).filter((c) => c.type === "computed");
      expect(computed.length, s.key).toBeGreaterThan(0);
    }
  });

  it("chacune expose au moins une bande de synthèse", () => {
    for (const s of sprint7) {
      const withSummary = (s.tables ?? []).filter((t) => Boolean(t.summary));
      expect(withSummary.length, s.key).toBeGreaterThan(0);
    }
  });

  it("chacune permet d'attacher des preuves", () => {
    for (const s of sprint7) {
      const pj = allColumns(s).filter((c) => c.type === "attachments");
      expect(pj.length, s.key).toBeGreaterThan(0);
    }
  });
});
