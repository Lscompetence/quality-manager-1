import type { MiniAppSchema } from "../schema-types";

const THEMATIQUE_OPTIONS = [
  { value: "logement", label: "🏠 Logement" },
  { value: "mobilite", label: "🚗 Transport / mobilité" },
  { value: "restau", label: "🍴 Restauration" },
  { value: "sante", label: "⚕ Santé" },
  { value: "financier", label: "💰 Financier" },
  { value: "erasmus", label: "🌍 Mobilité internationale" },
  { value: "social", label: "🤝 Difficultés sociales" },
  { value: "autre", label: "Autre" },
];

const STATUT_OPTIONS = [
  { value: "resolu", label: "✓ Résolu" },
  { value: "cours", label: "⏳ En cours" },
  { value: "oriente", label: "🔄 Orienté externe" },
  { value: "sansSuite", label: "— Sans suite" },
];

export const accompagnementApprentisSchema: MiniAppSchema = {
  key: "accompagnement-apprentis",
  name: "Accompagnement social & pro apprentis",
  shortName: "Accompagnement apprentis",
  description:
    "Annuaire des aides mobilisables + registre confidentiel des accompagnements menés. Démontre en audit que le CFA oriente activement ses apprentis sur les difficultés rencontrées.",
  indicators: ["I14"],
  critere: 3,
  tabs: [
    { id: "annuaire", label: "Annuaire des aides", tableIds: ["annuaire"] },
    { id: "accomp", label: "Accompagnements menés", tableIds: ["accomp"] },
  ],
  tables: [
    {
      id: "annuaire",
      label: "Dispositifs et aides mobilisables",
      toastLabel: "Aide ajoutée",
      rowLabel: (row) => String(row.aide ?? "Aide"),
      columns: [
        { id: "thematique", type: "select", label: "Thématique", options: THEMATIQUE_OPTIONS, width: "180px" },
        { id: "aide", type: "text", label: "Aide / Dispositif", width: "200px" },
        { id: "organisme", type: "text", label: "Organisme" },
        { id: "contact", type: "text", label: "Contact / Site" },
        { id: "conditions", type: "textarea", label: "Conditions / Montant" },
      ],
    },
    {
      id: "accomp",
      label: "Registre des accompagnements (confidentiel)",
      toastLabel: "Accompagnement ajouté",
      rowLabel: (row) => `${String(row.apprenti ?? "Apprenti")} · ${String(row.thematique ?? "")}`,
      columns: [
        { id: "dateDetect", type: "date", label: "Date détection", width: "130px" },
        { id: "apprenti", type: "text", label: "Apprenti", width: "170px" },
        { id: "thematique", type: "select", label: "Thématique", options: THEMATIQUE_OPTIONS, width: "180px" },
        { id: "besoin", type: "textarea", label: "Besoin signalé" },
        { id: "action", type: "textarea", label: "Action / Partenaire mobilisé" },
        { id: "statut", type: "select", label: "Statut", options: STATUT_OPTIONS, width: "150px" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
  ],
  seed: {
    annuaire: [
      { thematique: "logement", aide: "Mobili-Jeune", organisme: "Action Logement", contact: "actionlogement.fr", conditions: "Jusqu'à 100 €/mois sur 1 an" },
      { thematique: "logement", aide: "Visale (garantie)", organisme: "Action Logement", contact: "visale.fr", conditions: "Garantie loyer + caution" },
      { thematique: "mobilite", aide: "Aide au permis", organisme: "État (apprentis)", contact: "Via CFA", conditions: "500 € apprentis majeurs" },
      { thematique: "financier", aide: "Aide premier équipement", organisme: "État / Région", contact: "Via CFA", conditions: "Forfait au démarrage" },
      { thematique: "erasmus", aide: "Erasmus+ Pro", organisme: "Agence Erasmus", contact: "agence-erasmus.fr", conditions: "Bourses séjours européens" },
    ],
  },
};
