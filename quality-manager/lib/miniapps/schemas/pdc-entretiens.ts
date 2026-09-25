import type { MiniAppSchema } from "../schema-types";

const TYPE_ACTION_OPTIONS = [
  { value: "formation_externe", label: "🎓 Formation externe" },
  { value: "formation_interne", label: "🏛 Formation interne" },
  { value: "afest", label: "🛠 AFEST" },
  { value: "vae", label: "📝 VAE" },
  { value: "certification", label: "✓ Certification (CACES, hab. élec.)" },
  { value: "tutorat", label: "👥 Tutorat / co-animation" },
];

const STATUT_ACTION_OPTIONS = [
  { value: "prevue", label: "📋 Prévue" },
  { value: "inscrite", label: "📝 Inscrite" },
  { value: "en_cours", label: "⏳ En cours" },
  { value: "realisee", label: "✓ Réalisée" },
  { value: "annulee", label: "✗ Annulée" },
];

const TYPE_ENTRETIEN_OPTIONS = [
  { value: "annuel", label: "📅 Annuel d'évaluation" },
  { value: "professionnel", label: "👔 Professionnel (tous les 2 ans)" },
  { value: "bilan_6ans", label: "🔄 Bilan 6 ans" },
];

export const pdcEntretiensSchema: MiniAppSchema = {
  key: "pdc-entretiens",
  name: "Plan de compétences + entretiens pro",
  shortName: "PDC + entretiens",
  description:
    "Le plan de développement des compétences de l'équipe + le registre des entretiens professionnels (obligatoires tous les 2 ans, avec bilan à 6 ans).",
  indicators: ["I22"],
  critere: 5,
  tabs: [
    { id: "pdc", label: "Plan de développement compétences", tableIds: ["pdc"] },
    { id: "entretiens", label: "Entretiens professionnels", tableIds: ["entretiens"] },
  ],
  tables: [
    {
      id: "pdc",
      label: "Actions de développement compétences",
      toastLabel: "Action ajoutée",
      rowLabel: (row) => `${String(row.intervenant ?? "Intervenant")} — ${String(row.action ?? "")}`,
      columns: [
        { id: "intervenant", type: "text", label: "Intervenant", width: "180px" },
        { id: "action", type: "text", label: "Action / Formation", width: "220px" },
        { id: "type", type: "select", label: "Type", options: TYPE_ACTION_OPTIONS, width: "180px" },
        { id: "objectif", type: "textarea", label: "Objectif / compétences" },
        { id: "duree_h", type: "number", label: "Durée (h)", width: "110px" },
        { id: "date_prevue", type: "date", label: "Date prévue", width: "130px" },
        { id: "date_realisee", type: "date", label: "Date réalisée", width: "130px" },
        { id: "cout", type: "text", label: "Coût HT (€)", width: "110px" },
        { id: "statut", type: "select", label: "Statut", options: STATUT_ACTION_OPTIONS, width: "140px" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
    {
      id: "entretiens",
      label: "Registre des entretiens professionnels",
      toastLabel: "Entretien ajouté",
      rowLabel: (row) => `${String(row.salarie ?? "Salarié")} — ${String(row.date ?? "")}`,
      columns: [
        { id: "salarie", type: "text", label: "Salarié", width: "180px" },
        { id: "date", type: "date", label: "Date", width: "120px" },
        { id: "type", type: "select", label: "Type", options: TYPE_ENTRETIEN_OPTIONS, width: "200px" },
        { id: "animateur", type: "text", label: "Animateur", width: "170px" },
        { id: "souhaits", type: "textarea", label: "Souhaits & projet d'évolution" },
        { id: "actions_decidees", type: "textarea", label: "Actions décidées" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
  ],
};
