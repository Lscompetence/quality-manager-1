import type { MiniAppSchema } from "../schema-types";

export const cockpitC7Schema: MiniAppSchema = {
  key: "cockpit-c7",
  name: "Cockpit Critère 7",
  shortName: "Cockpit C7",
  description:
    "Tableau de bord intégré pour le Critère 7 : satisfaction des bénéficiaires (I30), traitement des réclamations (I31) et plan d'amélioration continue (I32). KPI calculés automatiquement.",
  indicators: ["I30", "I31", "I32"],
  critere: 7,
  kind: "custom",
};
