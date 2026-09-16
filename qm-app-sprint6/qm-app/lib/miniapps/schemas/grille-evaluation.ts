import type { MiniAppSchema } from "../schema-types";

export const grilleEvaluationSchema: MiniAppSchema = {
  key: "grille-evaluation",
  name: "Grille d'évaluation des acquis",
  shortName: "Grille évaluation",
  description:
    "Évaluation pondérée des acquis : définition des critères et de leur pondération, puis évaluation individuelle des apprenants. Calcul automatique du score et de la mention (Excellent / Bien / Validé / Non validé).",
  indicators: ["I11", "I3"],
  critere: 3,
  kind: "custom",
};
