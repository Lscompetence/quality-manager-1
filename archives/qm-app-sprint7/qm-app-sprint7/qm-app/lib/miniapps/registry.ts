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

// === Sprint 5 (6 complexes dont 4 custom) ===
import { checklistSiteSchema } from "./schemas/checklist-site";
import { checklistExamenSchema } from "./schemas/checklist-examen";
import { cockpitC7Schema } from "./schemas/cockpit-c7";
import { matriceCompetencesSchema } from "./schemas/matrice-competences";
import { grilleEvaluationSchema } from "./schemas/grille-evaluation";
import { suiviAssiduiteSchema } from "./schemas/suivi-assiduite";

// === Sprint 7 — refonte base documentaire (18 classeurs Excel) ===
// C2 (6)
import { adequationPosteSchema } from "./schemas/adequation-poste";
import { alignementObjectifsSchema } from "./schemas/alignement-objectifs";
import { sequencierPedagogiqueSchema } from "./schemas/sequencier-pedagogique";
import { adequationCertificationSchema } from "./schemas/adequation-certification";
import { veilleCertificationsSchema } from "./schemas/veille-certifications";
import { registrePositionnementsSchema } from "./schemas/registre-positionnements";
// C3 (8)
import { diffusionAccueilSchema } from "./schemas/diffusion-accueil";
import { registreAbandonsSchema } from "./schemas/registre-abandons";
import { registreAdaptationsSchema } from "./schemas/registre-adaptations";
import { registreEvaluationsSchema } from "./schemas/registre-evaluations";
import { evaluationsBlocsSchema } from "./schemas/evaluations-blocs";
import { maitresApprentissageSchema } from "./schemas/maitres-apprentissage";
import { registrePartenariatsSchema } from "./schemas/registre-partenariats";
import { jurysAmenagementsSchema } from "./schemas/jurys-amenagements";
// C4 (4)
import { locauxVerificationsSchema } from "./schemas/locaux-verifications";
import { registrePlateformesSchema } from "./schemas/registre-plateformes";
import { registreEpiSchema } from "./schemas/registre-epi";
import { registreSousTraitantsSchema } from "./schemas/registre-sous-traitants";

/**
 * Registre central des mini-apps.
 * Les mini-apps `kind: "generic"` (ou par défaut) sont rendues par <MiniApp />.
 * Les mini-apps `kind: "custom"` sont rendues par leur composant dédié
 * dans `components/miniapps/custom/`.
 *
 * IMPORTANT — ce module est importé côté client par le moteur : les schémas
 * contiennent des fonctions (compute / summary / controls / rowLabel) qui ne
 * peuvent pas traverser la frontière Server → Client Component.
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
  // Sprint 7 — C2
  "adequation-poste": adequationPosteSchema,
  "alignement-objectifs": alignementObjectifsSchema,
  "sequencier-pedagogique": sequencierPedagogiqueSchema,
  "adequation-certification": adequationCertificationSchema,
  "veille-certifications": veilleCertificationsSchema,
  "registre-positionnements": registrePositionnementsSchema,
  // Sprint 7 — C3
  "diffusion-accueil": diffusionAccueilSchema,
  "registre-abandons": registreAbandonsSchema,
  "registre-adaptations": registreAdaptationsSchema,
  "registre-evaluations": registreEvaluationsSchema,
  "evaluations-blocs": evaluationsBlocsSchema,
  "maitres-apprentissage": maitresApprentissageSchema,
  "registre-partenariats": registrePartenariatsSchema,
  "jurys-amenagements": jurysAmenagementsSchema,
  // Sprint 7 — C4
  "locaux-verifications": locauxVerificationsSchema,
  "registre-plateformes": registrePlateformesSchema,
  "registre-epi": registreEpiSchema,
  "registre-sous-traitants": registreSousTraitantsSchema,
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

/** Mini-apps rattachées à un indicateur RNQ donné. */
export function listMiniAppsForIndicator(code: string): MiniAppSchema[] {
  return Object.values(REGISTRY).filter((m) => m.indicators.includes(code));
}
