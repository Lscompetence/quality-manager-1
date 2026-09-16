import type { MiniAppSchema } from "../schema-types";

export const matriceCompetencesSchema: MiniAppSchema = {
  key: "matrice-competences",
  name: "Matrice de compétences intervenants",
  shortName: "Matrice compétences",
  description:
    "Matrice intervenants × modules avec niveaux d'affectation (Principal / Secondaire / Remplaçant). Détecte automatiquement les modules mono-formateur (risque de continuité). Prise en compte sous-traitance V9.",
  indicators: ["I21", "I27"],
  critere: 5,
  kind: "custom",
};
