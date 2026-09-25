import type { MiniAppSchema } from "../schema-types";

export const suiviAssiduiteSchema: MiniAppSchema = {
  key: "suivi-assiduite",
  name: "Suivi assiduité & prévention abandon",
  shortName: "Suivi assiduité",
  description:
    "Émargement par demi-journée (P/Absent justifié/Absent non justifié/Retard) avec calcul automatique du taux d'assiduité et alertes seuils (Orange < 85%, Rouge < 70%).",
  indicators: ["I12", "I19"],
  critere: 3,
  kind: "custom",
};
