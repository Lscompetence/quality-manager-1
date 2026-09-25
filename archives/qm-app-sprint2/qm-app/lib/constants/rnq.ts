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
  /**
   * Mini-app(s) associée(s) — key utilisée dans miniapp_data.miniapp_key.
   * Vide si l'indicateur n'a pas de mini-app dédiée.
   */
  miniappKeys?: string[];
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
    colorVar: "c1",
  },
  2: {
    num: 2,
    title: "Conception de l'offre",
    subtitle: "Identification des objectifs et adaptation",
    colorVar: "c2",
  },
  3: {
    num: 3,
    title: "Mise en œuvre",
    subtitle: "Accueil, suivi et accompagnement des bénéficiaires",
    colorVar: "c3",
  },
  4: {
    num: 4,
    title: "Moyens pédagogiques",
    subtitle: "Adéquation des moyens techniques, humains, encadrants",
    colorVar: "c4",
  },
  5: {
    num: 5,
    title: "Compétences équipe",
    subtitle: "Qualification et développement des connaissances",
    colorVar: "c5",
  },
  6: {
    num: 6,
    title: "Environnement",
    subtitle: "Veille et inscription dans l'environnement professionnel",
    colorVar: "c6",
  },
  7: {
    num: 7,
    title: "Amélioration continue",
    subtitle: "Recueil des appréciations et traitement des dysfonctionnements",
    colorVar: "c7",
  },
};

export const INDICATORS: IndicatorMeta[] = [
  // === C1 ===
  { code: "I1",  num: 1,  critere: 1, title: "L'information préalable du public",
    miniappKeys: ["checklist-site"] },
  { code: "I2",  num: 2,  critere: 1, title: "Diffusion des indicateurs de résultats",
    miniappKeys: ["checklist-site"] },
  { code: "I3",  num: 3,  critere: 1, title: "Information sur la certification (RNCP/RS)",
    miniappKeys: ["checklist-site", "grille-evaluation"] },

  // === C2 ===
  { code: "I4",  num: 4,  critere: 2, title: "Analyse du besoin du bénéficiaire", v9Update: true,
    miniappKeys: ["analyse-besoin"] },
  { code: "I5",  num: 5,  critere: 2, title: "Objectifs opérationnels et évaluables" },
  { code: "I6",  num: 6,  critere: 2, title: "Contenus adaptés aux objectifs et publics",
    miniappKeys: ["grille-adaptation"] },
  { code: "I7",  num: 7,  critere: 2, title: "Adéquation au référentiel RNCP/RS", v9Update: true,
    miniappKeys: ["correspondance-rncp"] },
  { code: "I8",  num: 8,  critere: 2, title: "Positionnement et évaluation à l'entrée" },

  // === C3 ===
  { code: "I9",  num: 9,  critere: 3, title: "Conditions d'accueil et de déroulement",
    miniappKeys: ["checklist-session"] },
  { code: "I10", num: 10, critere: 3, title: "Adaptation aux bénéficiaires",
    miniappKeys: ["grille-adaptation"] },
  { code: "I11", num: 11, critere: 3, title: "Évaluation des acquis", v9Update: true,
    miniappKeys: ["grille-evaluation"] },
  { code: "I12", num: 12, critere: 3, title: "Suivi et prévention des abandons",
    miniappKeys: ["suivi-assiduite"] },
  { code: "I13", num: 13, critere: 3, title: "Articulation CFA / entreprise", cfaOnly: true,
    miniappKeys: ["articulation-cfa"] },
  { code: "I14", num: 14, critere: 3, title: "Accompagnement social & pro apprentis", cfaOnly: true,
    miniappKeys: ["accompagnement-apprentis"] },
  { code: "I15", num: 15, critere: 3, title: "Maître d'apprentissage", cfaOnly: true },
  { code: "I16", num: 16, critere: 3, title: "Conditions d'examen et certification",
    miniappKeys: ["checklist-examen"] },

  // === C4 ===
  { code: "I17", num: 17, critere: 4, title: "Moyens humains, techniques et environnement",
    miniappKeys: ["inventaire-materiel", "checklist-session"] },
  { code: "I18", num: 18, critere: 4, title: "Coordination de l'équipe pédagogique",
    miniappKeys: ["cr-reunions"] },
  { code: "I19", num: 19, critere: 4, title: "Modalités FOAD et présentielles",
    miniappKeys: ["checklist-session", "suivi-assiduite"] },
  { code: "I20", num: 20, critere: 4, title: "Mobilités internationales", cfaOnly: true,
    miniappKeys: ["mobilites-cfa"] },

  // === C5 ===
  { code: "I21", num: 21, critere: 5, title: "Compétences et qualifications de l'équipe", v9Update: true,
    miniappKeys: ["matrice-competences"] },
  { code: "I22", num: 22, critere: 5, title: "Formation continue des intervenants",
    miniappKeys: ["pdc-entretiens"] },

  // === C6 ===
  { code: "I23", num: 23, critere: 6, title: "Veille légale et réglementaire",
    miniappKeys: ["tableau-veille"] },
  { code: "I24", num: 24, critere: 6, title: "Veille sur les compétences, métiers, emplois",
    miniappKeys: ["tableau-veille"] },
  { code: "I25", num: 25, critere: 6, title: "Veille pédagogique et innovations",
    miniappKeys: ["tableau-veille"] },
  { code: "I26", num: 26, critere: 6, title: "Handicap : réseau + mesures d'accueil",
    miniappKeys: ["annuaire-handicap", "grille-adaptation", "checklist-session"] },
  { code: "I27", num: 27, critere: 6, title: "Sous-traitance / portage salarial",
    miniappKeys: ["matrice-competences"] },
  { code: "I28", num: 28, critere: 6, title: "AFEST" },
  { code: "I29", num: 29, critere: 6, title: "Insertions des apprentis", cfaOnly: true,
    miniappKeys: ["suivi-insertions"] },

  // === C7 ===
  { code: "I30", num: 30, critere: 7, title: "Recueil des appréciations des bénéficiaires",
    miniappKeys: ["cockpit-c7"] },
  { code: "I31", num: 31, critere: 7, title: "Traitement des réclamations",
    miniappKeys: ["cockpit-c7"] },
  { code: "I32", num: 32, critere: 7, title: "Démarche d'amélioration continue",
    miniappKeys: ["cockpit-c7"] },
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
// Mini-apps — métadonnées (utilisées pour la Vue Documents et le routing)
// =============================================================================

export type MiniAppMeta = {
  key: string;
  name: string;
  shortName: string;
  description: string;
  indicators: string[];   // codes ex: ["I23","I24","I25"]
  critere: CritereNum;
};

export const MINIAPPS: Record<string, MiniAppMeta> = {
  "tableau-veille": {
    key: "tableau-veille",
    name: "Tableau de veille tri-thématique",
    shortName: "Tableau de veille",
    description: "Veille légale, métiers et pédagogique consolidée",
    indicators: ["I23", "I24", "I25"],
    critere: 6,
  },
  "annuaire-handicap": {
    key: "annuaire-handicap",
    name: "Annuaire réseau handicap",
    shortName: "Annuaire handicap",
    description: "Référents handicap, partenaires, dispositifs et mesures",
    indicators: ["I26"],
    critere: 6,
  },
  "mobilites-cfa": {
    key: "mobilites-cfa",
    name: "Mobilités internationales CFA",
    shortName: "Mobilités CFA",
    description: "Suivi des mobilités Erasmus+ et internationales",
    indicators: ["I20"],
    critere: 4,
  },
  "checklist-session": {
    key: "checklist-session",
    name: "Check-list de session",
    shortName: "Check-list session",
    description: "Contrôle préparation et déroulement de session",
    indicators: ["I9", "I17", "I19", "I26"],
    critere: 3,
  },
  "cockpit-c7": {
    key: "cockpit-c7",
    name: "Cockpit Critère 7",
    shortName: "Cockpit C7",
    description: "Satisfaction, réclamations et plan d'amélioration",
    indicators: ["I30", "I31", "I32"],
    critere: 7,
  },
  "correspondance-rncp": {
    key: "correspondance-rncp",
    name: "Correspondance RNCP / programme",
    shortName: "Correspondance RNCP",
    description: "Mapping blocs RNCP ↔ modules et évaluations",
    indicators: ["I7"],
    critere: 2,
  },
  "grille-adaptation": {
    key: "grille-adaptation",
    name: "Grille d'adaptation profil",
    shortName: "Grille adaptation",
    description: "Adaptation des contenus aux profils des bénéficiaires",
    indicators: ["I6", "I10", "I26"],
    critere: 2,
  },
  "analyse-besoin": {
    key: "analyse-besoin",
    name: "Analyse du besoin",
    shortName: "Analyse besoin",
    description: "Analyse besoin individuel ou entreprise par catégorie",
    indicators: ["I4"],
    critere: 2,
  },
  "suivi-insertions": {
    key: "suivi-insertions",
    name: "Suivi des insertions CFA",
    shortName: "Suivi insertions",
    description: "Insertion N+6, N+12 des sortants apprentissage",
    indicators: ["I29"],
    critere: 6,
  },
  "checklist-site": {
    key: "checklist-site",
    name: "Check-list site web & supports",
    shortName: "Check-list site",
    description: "Audit interne site et supports commerciaux",
    indicators: ["I1", "I2", "I3"],
    critere: 1,
  },
  "cr-reunions": {
    key: "cr-reunions",
    name: "Registre des CR de réunions",
    shortName: "CR réunions",
    description: "Conseils de perfectionnement, réunions équipe",
    indicators: ["I18"],
    critere: 4,
  },
  "inventaire-materiel": {
    key: "inventaire-materiel",
    name: "Inventaire matériel & équipements",
    shortName: "Inventaire matériel",
    description: "Informatique, pédagogique, studio FOAD, CFA",
    indicators: ["I17"],
    critere: 4,
  },
  "pdc-entretiens": {
    key: "pdc-entretiens",
    name: "Plan de compétences + entretiens pro",
    shortName: "PDC + entretiens",
    description: "Formation continue + entretiens professionnels",
    indicators: ["I22"],
    critere: 5,
  },
  "matrice-competences": {
    key: "matrice-competences",
    name: "Matrice de compétences intervenants",
    shortName: "Matrice compétences",
    description: "Intervenants × modules + statuts (interne / sous-traitant)",
    indicators: ["I21", "I27"],
    critere: 5,
  },
  "grille-evaluation": {
    key: "grille-evaluation",
    name: "Grille d'évaluation des acquis",
    shortName: "Grille évaluation",
    description: "Évaluation des acquis + décision certificative",
    indicators: ["I11", "I3"],
    critere: 3,
  },
  "suivi-assiduite": {
    key: "suivi-assiduite",
    name: "Suivi assiduité & abandon",
    shortName: "Suivi assiduité",
    description: "Émargements demi-journées + alertes niveau",
    indicators: ["I12", "I19"],
    critere: 3,
  },
  "articulation-cfa": {
    key: "articulation-cfa",
    name: "Articulation CFA / entreprise",
    shortName: "Articulation CFA",
    description: "Planning alternance, visites, fiches navettes",
    indicators: ["I13"],
    critere: 3,
  },
  "accompagnement-apprentis": {
    key: "accompagnement-apprentis",
    name: "Accompagnement social & pro apprentis",
    shortName: "Accompagnement apprentis",
    description: "Annuaire aides + registre accompagnements",
    indicators: ["I14"],
    critere: 3,
  },
  "checklist-examen": {
    key: "checklist-examen",
    name: "Check-list examen & certification",
    shortName: "Check-list examen",
    description: "Préparation session de certification (29 points)",
    indicators: ["I16"],
    critere: 3,
  },
};

/** Mini-apps pour un indicateur donné */
export function getMiniAppsForIndicator(code: string): MiniAppMeta[] {
  const ind = getIndicator(code);
  if (!ind?.miniappKeys) return [];
  return ind.miniappKeys
    .map((k) => MINIAPPS[k])
    .filter((m): m is MiniAppMeta => Boolean(m));
}
