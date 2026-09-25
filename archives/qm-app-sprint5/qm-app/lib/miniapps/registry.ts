import type { MiniAppSchema } from "./schema-types";

// === Sprint 3 (6 simples) ===
import { tableauVeilleSchema } from "./schemas/tableau-veille";
import { annuaireHandicapSchema } from "./schemas/annuaire-handicap";
import { mobilitesCfaSchema } from "./schemas/mobilites-cfa";
import { crReunionsSchema } from "./schemas/cr-reunions";
import { correspondanceRncpSchema } from "./schemas/correspondance-rncp";
import { accompagnementApprentisSchema } from "./schemas/accompagnement-apprentis";

// === Sprint 4 (7 moyennes) ===
import { inventaireMaterielSchema } from "./schemas/inventaire-materiel";
import { analyseBesoinSchema } from "./schemas/analyse-besoin";
import { suiviInsertionsSchema } from "./schemas/suivi-insertions";
import { pdcEntretiensSchema } from "./schemas/pdc-entretiens";
import { grilleAdaptationSchema } from "./schemas/grille-adaptation";
import { articulationCfaSchema } from "./schemas/articulation-cfa";
import { checklistSessionSchema } from "./schemas/checklist-session";

// === Sprint 5 (6 complexes) ===
import { checklistSiteSchema } from "./schemas/checklist-site";
import { checklistExamenSchema } from "./schemas/checklist-examen";
import { cockpitC7Schema } from "./schemas/cockpit-c7";
import { matriceCompetencesSchema } from "./schemas/matrice-competences";
import { grilleEvaluationSchema } from "./schemas/grille-evaluation";
import { suiviAssiduiteSchema } from "./schemas/suivi-assiduite";

/**
 * Registre central des mini-apps.
 * Les mini-apps `kind: "generic"` (ou par défaut) sont rendues par <MiniApp />.
 * Les mini-apps `kind: "custom"` sont rendues par leur composant dédié
 * dans `components/miniapps/custom/`.
 */
const REGISTRY: Record<string, MiniAppSchema> = {
  // Sprint 3
  "tableau-veille": tableauVeilleSchema,
  "annuaire-handicap": annuaireHandicapSchema,
  "mobilites-cfa": mobilitesCfaSchema,
  "cr-reunions": crReunionsSchema,
  "correspondance-rncp": correspondanceRncpSchema,
  "accompagnement-apprentis": accompagnementApprentisSchema,
  // Sprint 4
  "inventaire-materiel": inventaireMaterielSchema,
  "analyse-besoin": analyseBesoinSchema,
  "suivi-insertions": suiviInsertionsSchema,
  "pdc-entretiens": pdcEntretiensSchema,
  "grille-adaptation": grilleAdaptationSchema,
  "articulation-cfa": articulationCfaSchema,
  "checklist-session": checklistSessionSchema,
  // Sprint 5
  "checklist-site": checklistSiteSchema,
  "checklist-examen": checklistExamenSchema,
  "cockpit-c7": cockpitC7Schema,
  "matrice-competences": matriceCompetencesSchema,
  "grille-evaluation": grilleEvaluationSchema,
  "suivi-assiduite": suiviAssiduiteSchema,
};

export function getMiniAppSchema(key: string): MiniAppSchema | null {
  return REGISTRY[key] ?? null;
}

export function listMiniAppKeys(): string[] {
  return Object.keys(REGISTRY);
}

export function listMiniAppSchemas(): MiniAppSchema[] {
  return Object.values(REGISTRY);
}
