import type { MiniAppSchema } from "../schema-types";

const SITUATION_N6_OPTIONS = [
  { value: "cdi", label: "✓ CDI" },
  { value: "cdd", label: "📅 CDD" },
  { value: "interim", label: "🔄 Intérim" },
  { value: "creation", label: "🚀 Création d'entreprise" },
  { value: "poursuite", label: "📚 Poursuite études" },
  { value: "recherche", label: "🔍 En recherche" },
  { value: "inactif", label: "⏸ Inactif" },
  { value: "injoignable", label: "❓ Injoignable" },
];

const LIEN_FORMATION_OPTIONS = [
  { value: "metier_meme", label: "🎯 Métier visé exact" },
  { value: "metier_proche", label: "↗ Métier proche" },
  { value: "autre", label: "↘ Autre métier" },
  { value: "na", label: "—" },
];

const MOIS_CONTACT_OPTIONS = [
  { value: "N6", label: "N+6 mois" },
  { value: "N12", label: "N+12 mois" },
  { value: "N18", label: "N+18 mois" },
  { value: "N24", label: "N+24 mois" },
];

export const suiviInsertionsSchema: MiniAppSchema = {
  key: "suivi-insertions",
  name: "Suivi des insertions CFA",
  shortName: "Suivi insertions",
  description:
    "Suivi de l'insertion professionnelle des sortants d'apprentissage (N+6, N+12, N+18, N+24 mois). Base obligatoire pour le calcul du taux d'insertion attendu en audit.",
  indicators: ["I29"],
  critere: 6,
  tables: [
    {
      id: "insertions",
      label: "Registre des suivis d'insertion",
      toastLabel: "Suivi ajouté",
      rowLabel: (row) => String(row.apprenti ?? "Sortant"),
      columns: [
        { id: "apprenti", type: "text", label: "Apprenti", width: "180px" },
        { id: "certification", type: "text", label: "Certification obtenue", width: "180px" },
        { id: "date_sortie", type: "date", label: "Date de sortie", width: "130px" },
        { id: "mois_contact", type: "select", label: "Échéance", options: MOIS_CONTACT_OPTIONS, width: "110px" },
        { id: "date_contact", type: "date", label: "Date contact", width: "130px" },
        { id: "situation", type: "select", label: "Situation", options: SITUATION_N6_OPTIONS, width: "150px" },
        { id: "employeur", type: "text", label: "Employeur / structure" },
        { id: "lien_formation", type: "select", label: "Lien formation", options: LIEN_FORMATION_OPTIONS, width: "160px" },
        { id: "salaire_brut", type: "text", label: "Salaire brut (€/mois)", width: "140px" },
        { id: "notes", type: "textarea", label: "Notes" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
  ],
};
