import type { MiniAppSchema } from "../schema-types";

const STATUT_OPTIONS = [
  { value: "a_faire", label: "⏳ À faire" },
  { value: "ok", label: "✓ OK" },
  { value: "non_applicable", label: "— N/A" },
  { value: "ko", label: "❌ KO / problème" },
];

const PHASE_OPTIONS = [
  { value: "amont", label: "🔵 J-15 / Préparation" },
  { value: "veille", label: "🟠 J-1 / Veille" },
  { value: "jour", label: "🟢 J / Accueil" },
  { value: "session", label: "📚 Pendant session" },
  { value: "aval", label: "🟣 J+5 / Aval" },
];

const RESPONSABLE_OPTIONS = [
  { value: "admin", label: "👔 Admin" },
  { value: "formateur", label: "🎓 Formateur" },
  { value: "referent", label: "🎯 Référent handicap" },
  { value: "logistique", label: "🚐 Logistique" },
];

export const checklistSessionSchema: MiniAppSchema = {
  key: "checklist-session",
  name: "Check-list de session",
  shortName: "Check-list session",
  description:
    "Check-list complète préparation, déroulement et clôture d'une session de formation : du J-15 au J+5. Couvre I9 (accueil), I17 (moyens), I19 (FOAD/présentiel) et I26 (handicap).",
  indicators: ["I9", "I17", "I19", "I26"],
  critere: 3,
  tables: [
    {
      id: "checklist",
      label: "Check-list session",
      toastLabel: "Item ajouté",
      rowLabel: (row) => String(row.item ?? "Item check-list"),
      columns: [
        { id: "phase", type: "select", label: "Phase", options: PHASE_OPTIONS, width: "180px" },
        { id: "item", type: "text", label: "Action / Vérification", width: "300px" },
        { id: "responsable", type: "select", label: "Responsable", options: RESPONSABLE_OPTIONS, width: "150px" },
        { id: "deadline", type: "date", label: "Échéance", width: "130px" },
        { id: "statut", type: "select", label: "Statut", options: STATUT_OPTIONS, width: "130px" },
        { id: "commentaire", type: "textarea", label: "Commentaire" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
  ],
  seed: {
    checklist: [
      { phase: "amont", item: "Confirmation salle + équipement", responsable: "logistique", statut: "a_faire" },
      { phase: "amont", item: "Programme + planning envoyé apprenants", responsable: "admin", statut: "a_faire" },
      { phase: "amont", item: "Identifier PSH éventuels et adapter", responsable: "referent", statut: "a_faire" },
      { phase: "amont", item: "Vérifier accès FOAD / lien visio", responsable: "formateur", statut: "a_faire" },
      { phase: "veille", item: "Convocations envoyées avec rappel", responsable: "admin", statut: "a_faire" },
      { phase: "veille", item: "Vérifier matériel pédagogique disponible", responsable: "logistique", statut: "a_faire" },
      { phase: "jour", item: "Accueil + émargement matin", responsable: "formateur", statut: "a_faire" },
      { phase: "jour", item: "Présentation objectifs + planning session", responsable: "formateur", statut: "a_faire" },
      { phase: "session", item: "Émargement demi-journées (entrée/sortie)", responsable: "formateur", statut: "a_faire" },
      { phase: "session", item: "Évaluations intermédiaires", responsable: "formateur", statut: "a_faire" },
      { phase: "aval", item: "Questionnaire satisfaction fin session", responsable: "formateur", statut: "a_faire" },
      { phase: "aval", item: "Attestations + relevé acquis envoyés", responsable: "admin", statut: "a_faire" },
    ],
  },
};
