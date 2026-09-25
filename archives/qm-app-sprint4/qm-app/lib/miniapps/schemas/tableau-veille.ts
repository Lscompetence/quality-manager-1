import type { MiniAppSchema } from "../schema-types";

const SOURCE_OPTIONS = [
  { value: "loi", label: "Loi / décret" },
  { value: "circulaire", label: "Circulaire" },
  { value: "journal", label: "Presse spécialisée" },
  { value: "branche", label: "Branche pro" },
  { value: "rncp", label: "France compétences / RNCP" },
  { value: "reseau", label: "Réseau pro" },
  { value: "autre", label: "Autre" },
];

const IMPACT_OPTIONS = [
  { value: "majeur", label: "🔴 Majeur" },
  { value: "modere", label: "🟠 Modéré" },
  { value: "mineur", label: "🟢 Mineur" },
  { value: "aucun", label: "⚪ Aucun" },
];

const ACTION_OPTIONS = [
  { value: "a_faire", label: "À faire" },
  { value: "en_cours", label: "En cours" },
  { value: "faite", label: "✓ Faite" },
  { value: "sans_suite", label: "Sans suite" },
];

export const tableauVeilleSchema: MiniAppSchema = {
  key: "tableau-veille",
  name: "Tableau de veille tri-thématique",
  shortName: "Tableau de veille",
  description:
    "Tableau unique consolidant les trois veilles obligatoires (légale, métiers, pédagogique). Chaque ligne capte une information, son impact, et l'action qui en découle.",
  indicators: ["I23", "I24", "I25"],
  critere: 6,
  tabs: [
    { id: "legale", label: "Veille légale (I23)", tableIds: ["legale"] },
    { id: "metiers", label: "Veille métiers (I24)", tableIds: ["metiers"] },
    { id: "pedago", label: "Veille pédagogique (I25)", tableIds: ["pedago"] },
  ],
  tables: [
    {
      id: "legale",
      label: "Veille légale & réglementaire",
      toastLabel: "Élément de veille ajouté",
      rowLabel: (row) => String(row.info ?? row.source ?? "Élément de veille légale"),
      columns: [
        { id: "date", type: "date", label: "Date", width: "120px" },
        { id: "source", type: "select", label: "Source", options: SOURCE_OPTIONS, width: "150px" },
        { id: "info", type: "textarea", label: "Information captée", placeholder: "Loi, décret, évolution…" },
        { id: "impact", type: "select", label: "Impact", options: IMPACT_OPTIONS, width: "130px" },
        { id: "action", type: "textarea", label: "Action à mener" },
        { id: "statut", type: "select", label: "Statut", options: ACTION_OPTIONS, width: "120px" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
    {
      id: "metiers",
      label: "Veille compétences, métiers, emplois",
      toastLabel: "Élément de veille ajouté",
      rowLabel: (row) => String(row.info ?? row.source ?? "Élément de veille métiers"),
      columns: [
        { id: "date", type: "date", label: "Date", width: "120px" },
        { id: "source", type: "select", label: "Source", options: SOURCE_OPTIONS, width: "150px" },
        { id: "info", type: "textarea", label: "Information captée", placeholder: "Évolution métier, nouvelle compétence…" },
        { id: "impact", type: "select", label: "Impact", options: IMPACT_OPTIONS, width: "130px" },
        { id: "action", type: "textarea", label: "Action à mener" },
        { id: "statut", type: "select", label: "Statut", options: ACTION_OPTIONS, width: "120px" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
    {
      id: "pedago",
      label: "Veille pédagogique & innovations",
      toastLabel: "Élément de veille ajouté",
      rowLabel: (row) => String(row.info ?? row.source ?? "Élément de veille pédago"),
      columns: [
        { id: "date", type: "date", label: "Date", width: "120px" },
        { id: "source", type: "select", label: "Source", options: SOURCE_OPTIONS, width: "150px" },
        { id: "info", type: "textarea", label: "Information captée", placeholder: "Nouvelle méthode, outil pédago…" },
        { id: "impact", type: "select", label: "Impact", options: IMPACT_OPTIONS, width: "130px" },
        { id: "action", type: "textarea", label: "Action à mener" },
        { id: "statut", type: "select", label: "Statut", options: ACTION_OPTIONS, width: "120px" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
  ],
  seed: {
    legale: [
      {
        date: "2026-03-08",
        source: "loi",
        info: "RNQ V9 opposable depuis le 08/03/2024 — encadrement sous-traitance",
        impact: "majeur",
        action: "Revoir contrats sous-traitants CPF, ajouter clauses Qualiopi",
        statut: "en_cours",
      },
    ],
    metiers: [
      {
        date: "2026-01-15",
        source: "branche",
        info: "Nouveau référentiel CCN dans le secteur tertiaire",
        impact: "modere",
        action: "Mettre à jour le contenu module 3 du BTS MCO",
        statut: "a_faire",
      },
    ],
    pedago: [
      {
        date: "2026-02-20",
        source: "reseau",
        info: "Retours formateurs sur classes inversées",
        impact: "modere",
        action: "Tester sur 1 session pilote au S2",
        statut: "a_faire",
      },
    ],
  },
};
