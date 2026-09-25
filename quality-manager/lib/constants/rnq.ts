import { listMiniAppSchemas } from "@/lib/miniapps/registry";
import type { MiniAppSchema } from "@/lib/miniapps/schema-types";

// =============================================================================
// Référentiel National Qualité (RNQ) V9
// En vigueur depuis le 08/01/2024, opposable depuis le 08/03/2024
// 7 critères / 32 indicateurs
// =============================================================================

export type CritereNum = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Category = "AF" | "BC" | "VAE" | "CFA";

export type IndicatorMeta = {
  code: string;        // ex: "I11"
  num: number;         // 11
  critere: CritereNum;
  title: string;
  v9Update?: boolean;  // mis à jour dans la V9
  cfaOnly?: boolean;   // indicateur spécifique CFA
};

export type CritereMeta = {
  num: CritereNum;
  title: string;
  subtitle: string;
  /** Couleur de marque pour le critère (Aurora palette) */
  colorVar: string;     // ex: "c1", "c2", "c3"...
};

export const CRITERES: Record<CritereNum, CritereMeta> = {
  1: {
    num: 1,
    title: "Information du public",
    subtitle: "Conditions et mise à disposition de l'information",
    colorVar: "c1"
  },
  2: {
    num: 2,
    title: "Conception de l'offre",
    subtitle: "Identification des objectifs et adaptation",
    colorVar: "c2"
  },
  3: {
    num: 3,
    title: "Mise en œuvre",
    subtitle: "Accueil, suivi et accompagnement des bénéficiaires",
    colorVar: "c3"
  },
  4: {
    num: 4,
    title: "Moyens pédagogiques",
    subtitle: "Adéquation des moyens techniques, humains, encadrants",
    colorVar: "c4"
  },
  5: {
    num: 5,
    title: "Équipe",
    subtitle: "Qualification et développement des connaissances",
    colorVar: "c5"
  },
  6: {
    num: 6,
    title: "Environnement",
    subtitle: "Veille et inscription dans l'environnement professionnel",
    colorVar: "c6"
  },
  7: {
    num: 7,
    title: "Amélioration continue",
    subtitle: "Recueil des appréciations et traitement des dysfonctionnements",
    colorVar: "c7"
  }
};

export const INDICATORS: IndicatorMeta[] = [
  // === C1 ===
  { code: "I1",  num: 1,  critere: 1, title: "L'information préalable du public" },
  { code: "I2",  num: 2,  critere: 1, title: "Diffusion des indicateurs de résultats" },
  { code: "I3",  num: 3,  critere: 1, title: "Information sur la certification (RNCP/RS)" },

  // === C2 ===
  { code: "I4",  num: 4,  critere: 2, title: "Analyse du besoin du bénéficiaire", v9Update: true },
  { code: "I5",  num: 5,  critere: 2, title: "Objectifs opérationnels et évaluables" },
  { code: "I6",  num: 6,  critere: 2, title: "Contenus adaptés aux objectifs et publics" },
  { code: "I7",  num: 7,  critere: 2, title: "Adéquation au référentiel RNCP/RS", v9Update: true },
  { code: "I8",  num: 8,  critere: 2, title: "Positionnement et évaluation à l'entrée" },

  // === C3 ===
  { code: "I9",  num: 9,  critere: 3, title: "Conditions d'accueil et de déroulement" },
  { code: "I10", num: 10, critere: 3, title: "Adaptation aux bénéficiaires" },
  { code: "I11", num: 11, critere: 3, title: "Évaluation des acquis", v9Update: true },
  { code: "I12", num: 12, critere: 3, title: "Suivi et prévention des abandons" },
  { code: "I13", num: 13, critere: 3, title: "Articulation CFA / entreprise", cfaOnly: true },
  { code: "I14", num: 14, critere: 3, title: "Accompagnement social & pro apprentis", cfaOnly: true },
  { code: "I15", num: 15, critere: 3, title: "Droits, devoirs et santé-sécurité des apprentis",
    cfaOnly: true },
  { code: "I16", num: 16, critere: 3, title: "Conditions d'examen et certification" },

  // === C4 ===
  { code: "I17", num: 17, critere: 4, title: "Moyens humains, techniques et environnement" },
  { code: "I18", num: 18, critere: 4, title: "Coordination de l'équipe pédagogique" },
  { code: "I19", num: 19, critere: 4, title: "Modalités FOAD et présentielles" },
  { code: "I20", num: 20, critere: 4, title: "Mobilités internationales", cfaOnly: true },

  // === C5 ===
  { code: "I21", num: 21, critere: 5, title: "Compétences et qualifications de l'équipe", v9Update: true },
  { code: "I22", num: 22, critere: 5, title: "Formation continue des intervenants" },

  // === C6 ===
  { code: "I23", num: 23, critere: 6, title: "Veille légale et réglementaire" },
  { code: "I24", num: 24, critere: 6, title: "Veille sur les compétences, métiers, emplois" },
  { code: "I25", num: 25, critere: 6, title: "Veille pédagogique et innovations" },
  { code: "I26", num: 26, critere: 6, title: "Handicap : réseau + mesures d'accueil" },
  { code: "I27", num: 27, critere: 6, title: "Sous-traitance / portage salarial" },
  { code: "I28", num: 28, critere: 6, title: "AFEST" },
  { code: "I29", num: 29, critere: 6, title: "Insertions des apprentis", cfaOnly: true },

  // === C7 ===
  { code: "I30", num: 30, critere: 7, title: "Recueil des appréciations des bénéficiaires" },
  { code: "I31", num: 31, critere: 7, title: "Traitement des réclamations" },
  { code: "I32", num: 32, critere: 7, title: "Démarche d'amélioration continue" },
];

/** Récupère les indicateurs applicables selon les catégories actives du dossier */
export function getApplicableIndicators(categories: Category[]): IndicatorMeta[] {
  const hasCFA = categories.includes("CFA");
  return INDICATORS.filter((ind) => {
    if (ind.cfaOnly && !hasCFA) return false;
    return true;
  });
}

export function getIndicatorsByCritere(critere: CritereNum, categories: Category[]): IndicatorMeta[] {
  return getApplicableIndicators(categories).filter((ind) => ind.critere === critere);
}

export function getIndicator(code: string): IndicatorMeta | undefined {
  return INDICATORS.find((ind) => ind.code === code);
}

// =============================================================================
// Mini-apps — métadonnées
//
// Source unique de vérité : le registry des schémas. Les métadonnées affichées
// (page indicateur, Vue Documents) sont dérivées, plus recopiées à la main —
// ajouter une mini-app se fait donc en un seul endroit.
// =============================================================================

export type MiniAppMeta = {
  key: string;
  name: string;
  shortName: string;
  description: string;
  indicators: string[];   // codes ex: ["I23","I24","I25"]
  critere: CritereNum;
  /** Référence du modèle dans la base documentaire Qualiopi (ex: "M27c") */
  docRef?: string;
  /** Catégories concernées ; absent = toutes */
  categories?: Category[];
  kind: "generic" | "custom";
};

function toMeta(schema: MiniAppSchema): MiniAppMeta {
  return {
    key: schema.key,
    name: schema.name,
    shortName: schema.shortName,
    description: schema.description,
    indicators: schema.indicators,
    critere: schema.critere as CritereNum,
    docRef: schema.docRef,
    categories: schema.categories,
    kind: schema.kind ?? "generic"
  };
}

export const MINIAPPS: Record<string, MiniAppMeta> = Object.fromEntries(
  listMiniAppSchemas().map((s) => [s.key, toMeta(s)]),
);

/** Mini-apps pour un indicateur donné */
export function getMiniAppsForIndicator(code: string): MiniAppMeta[] {
  return Object.values(MINIAPPS).filter((m) => m.indicators.includes(code));
}

/** Mini-apps pour un indicateur, filtrées sur les catégories du dossier */
export function getMiniAppsForIndicatorInCategories(
  code: string,
  categories: Category[],
): MiniAppMeta[] {
  return getMiniAppsForIndicator(code).filter((m) => {
    if (!m.categories || m.categories.length === 0) return true;
    return m.categories.some((c) => categories.includes(c));
  });
}

/**
 * Indicateurs disposant d'une mini-app dédiée.
 *
 * À ne pas lire comme un taux de couverture : tous les indicateurs sont
 * traitables dans l'app, via la page indicateur et son dépôt de preuves.
 * Une mini-app s'ajoute là où il y a quelque chose à calculer ou à recouper,
 * pas pour compléter une liste.
 */
export function getIndicatorCodesWithMiniApp(): string[] {
  const withApp = new Set<string>();
  for (const m of Object.values(MINIAPPS)) {
    for (const code of m.indicators) withApp.add(code);
  }
  return INDICATORS.filter((i) => withApp.has(i.code)).map((i) => i.code);
}
