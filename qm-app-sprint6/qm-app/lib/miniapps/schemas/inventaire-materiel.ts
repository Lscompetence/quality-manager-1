import type { MiniAppSchema } from "../schema-types";

const ETAT_OPTIONS = [
  { value: "neuf", label: "✨ Neuf" },
  { value: "bon", label: "✓ Bon état" },
  { value: "usage", label: "⚠ Usage" },
  { value: "obsolete", label: "❌ Obsolète" },
];

const PROPRIETE_OPTIONS = [
  { value: "propriete", label: "🏢 Propriété" },
  { value: "location", label: "📅 Location" },
  { value: "leasing", label: "💼 Leasing" },
  { value: "pret", label: "🤝 Prêt / mise à dispo" },
];

const ACCESSIBILITE_OPTIONS = [
  { value: "tous", label: "👥 Tous" },
  { value: "formateurs", label: "🎓 Formateurs" },
  { value: "apprenants", label: "📚 Apprenants" },
  { value: "admin", label: "👔 Admin" },
];

export const inventaireMaterielSchema: MiniAppSchema = {
  key: "inventaire-materiel",
  name: "Inventaire matériel & équipements",
  shortName: "Inventaire matériel",
  description:
    "Inventaire détaillé des moyens techniques mobilisés : matériel informatique, pédagogique, studio FOAD et équipements CFA. L'auditeur le demande systématiquement.",
  indicators: ["I17"],
  critere: 4,
  tabs: [
    { id: "info", label: "Informatique", tableIds: ["info"] },
    { id: "pedago", label: "Pédagogique", tableIds: ["pedago"] },
    { id: "foad", label: "Studio FOAD", tableIds: ["foad"] },
    { id: "cfa", label: "Équipements CFA", tableIds: ["cfa"] },
  ],
  tables: [
    {
      id: "info",
      label: "Matériel informatique",
      toastLabel: "Équipement ajouté",
      rowLabel: (row) => String(row.designation ?? "Matériel info"),
      columns: [
        { id: "designation", type: "text", label: "Désignation", width: "200px" },
        { id: "quantite", type: "number", label: "Qté", width: "70px" },
        { id: "marque", type: "text", label: "Marque / modèle", width: "180px" },
        { id: "etat", type: "select", label: "État", options: ETAT_OPTIONS, width: "120px" },
        { id: "propriete", type: "select", label: "Propriété", options: PROPRIETE_OPTIONS, width: "150px" },
        { id: "accessibilite", type: "select", label: "Accessible à", options: ACCESSIBILITE_OPTIONS, width: "140px" },
        { id: "notes", type: "textarea", label: "Notes" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
    {
      id: "pedago",
      label: "Matériel pédagogique",
      toastLabel: "Équipement ajouté",
      rowLabel: (row) => String(row.designation ?? "Matériel pédago"),
      columns: [
        { id: "designation", type: "text", label: "Désignation", width: "220px" },
        { id: "quantite", type: "number", label: "Qté", width: "70px" },
        { id: "salle", type: "text", label: "Localisation", width: "150px" },
        { id: "etat", type: "select", label: "État", options: ETAT_OPTIONS, width: "120px" },
        { id: "accessibilite", type: "select", label: "Accessible à", options: ACCESSIBILITE_OPTIONS, width: "140px" },
        { id: "notes", type: "textarea", label: "Notes" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
    {
      id: "foad",
      label: "Studio FOAD / Visio",
      toastLabel: "Équipement ajouté",
      rowLabel: (row) => String(row.designation ?? "Équipement FOAD"),
      columns: [
        { id: "designation", type: "text", label: "Désignation", width: "200px" },
        { id: "marque", type: "text", label: "Marque / modèle", width: "180px" },
        { id: "quantite", type: "number", label: "Qté", width: "70px" },
        { id: "etat", type: "select", label: "État", options: ETAT_OPTIONS, width: "120px" },
        { id: "usage", type: "textarea", label: "Usage typique" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
    {
      id: "cfa",
      label: "Équipements CFA / plateaux techniques",
      toastLabel: "Équipement ajouté",
      rowLabel: (row) => String(row.designation ?? "Équipement CFA"),
      columns: [
        { id: "designation", type: "text", label: "Désignation", width: "220px" },
        { id: "salle", type: "text", label: "Plateau / atelier", width: "180px" },
        { id: "quantite", type: "number", label: "Qté", width: "70px" },
        { id: "etat", type: "select", label: "État", options: ETAT_OPTIONS, width: "120px" },
        { id: "controle", type: "date", label: "Dernier contrôle", width: "150px" },
        { id: "notes", type: "textarea", label: "Notes" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
  ],
};
