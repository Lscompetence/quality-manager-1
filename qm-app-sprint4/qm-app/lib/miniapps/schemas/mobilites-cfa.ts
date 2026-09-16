import type { MiniAppSchema } from "../schema-types";

const PROGRAMME_OPTIONS = [
  { value: "erasmus", label: "🇪🇺 Erasmus+ Pro" },
  { value: "bourse_region", label: "🏛 Bourse régionale" },
  { value: "of_propre", label: "🏢 Programme OF" },
  { value: "autre", label: "Autre" },
];

const STATUT_OPTIONS = [
  { value: "prevue", label: "📋 Prévue" },
  { value: "en_cours", label: "✈ En cours" },
  { value: "terminee", label: "✓ Terminée" },
  { value: "annulee", label: "❌ Annulée" },
];

export const mobilitesCfaSchema: MiniAppSchema = {
  key: "mobilites-cfa",
  name: "Mobilités internationales CFA",
  shortName: "Mobilités CFA",
  description:
    "Suivi des mobilités Erasmus+ et internationales des apprentis : programmation, durée, lieu, partenaire, financement et bilan.",
  indicators: ["I20"],
  critere: 4,
  tables: [
    {
      id: "mobilites",
      label: "Mobilités programmées et réalisées",
      toastLabel: "Mobilité ajoutée",
      rowLabel: (row) => String(row.apprenti ?? row.destination ?? "Mobilité"),
      columns: [
        { id: "apprenti", type: "text", label: "Apprenti", width: "180px" },
        { id: "certification", type: "text", label: "Certification visée", width: "160px" },
        { id: "destination", type: "text", label: "Destination (ville, pays)", width: "180px" },
        { id: "partenaire", type: "text", label: "Entreprise / OF d'accueil" },
        { id: "debut", type: "date", label: "Début", width: "120px" },
        { id: "fin", type: "date", label: "Fin", width: "120px" },
        { id: "programme", type: "select", label: "Programme", options: PROGRAMME_OPTIONS, width: "150px" },
        { id: "statut", type: "select", label: "Statut", options: STATUT_OPTIONS, width: "120px" },
        { id: "bilan", type: "textarea", label: "Bilan / observations" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
  ],
};
