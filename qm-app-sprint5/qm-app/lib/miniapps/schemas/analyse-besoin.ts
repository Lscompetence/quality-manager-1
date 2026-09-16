import type { MiniAppSchema } from "../schema-types";

const COMMANDITAIRE_OPTIONS = [
  { value: "individuel", label: "👤 Individuel" },
  { value: "entreprise", label: "🏢 Entreprise" },
  { value: "demandeur", label: "🔎 Demandeur emploi" },
  { value: "opco", label: "🏛 OPCO" },
];

const STATUT_OPTIONS = [
  { value: "en_cours", label: "⏳ En cours" },
  { value: "valide", label: "✓ Validée" },
  { value: "convertie", label: "✓ Convertie en formation" },
  { value: "abandonnee", label: "✗ Abandonnée" },
];

export const analyseBesoinSchema: MiniAppSchema = {
  key: "analyse-besoin",
  name: "Analyse du besoin",
  shortName: "Analyse besoin",
  description:
    "Trace l'analyse préalable du besoin de chaque bénéficiaire (ou commanditaire), exigée à l'I4 de la V9 selon les 4 catégories AF/BC/VAE/CFA. Une seule mini-app, des onglets par catégorie.",
  indicators: ["I4"],
  critere: 2,
  tabs: [
    { id: "af", label: "Actions de formation", tableIds: ["af"] },
    { id: "bc", label: "Bilans de compétences", tableIds: ["bc"] },
    { id: "vae", label: "VAE", tableIds: ["vae"] },
    { id: "cfa", label: "Apprentissage", tableIds: ["cfa"] },
  ],
  tables: [
    {
      id: "af",
      label: "Analyses besoin — Actions de formation",
      toastLabel: "Analyse ajoutée",
      rowLabel: (row) => String(row.beneficiaire ?? "Analyse AF"),
      columns: [
        { id: "date", type: "date", label: "Date", width: "120px" },
        { id: "beneficiaire", type: "text", label: "Bénéficiaire / entreprise", width: "200px" },
        { id: "commanditaire", type: "select", label: "Commanditaire", options: COMMANDITAIRE_OPTIONS, width: "150px" },
        { id: "contexte", type: "textarea", label: "Contexte & demande initiale" },
        { id: "objectifs", type: "textarea", label: "Objectifs identifiés" },
        { id: "competences_visees", type: "textarea", label: "Compétences visées" },
        { id: "contraintes", type: "textarea", label: "Contraintes (durée, modalité…)" },
        { id: "statut", type: "select", label: "Statut", options: STATUT_OPTIONS, width: "180px" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
    {
      id: "bc",
      label: "Analyses besoin — Bilans de compétences",
      toastLabel: "Analyse ajoutée",
      rowLabel: (row) => String(row.beneficiaire ?? "Analyse BC"),
      columns: [
        { id: "date", type: "date", label: "Date entretien préalable", width: "150px" },
        { id: "beneficiaire", type: "text", label: "Bénéficiaire", width: "200px" },
        { id: "projet", type: "textarea", label: "Projet professionnel exprimé" },
        { id: "motivations", type: "textarea", label: "Motivations" },
        { id: "freins", type: "textarea", label: "Freins identifiés" },
        { id: "phases", type: "textarea", label: "Phases prévues (préliminaire/investigation/conclusion)" },
        { id: "statut", type: "select", label: "Statut", options: STATUT_OPTIONS, width: "180px" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
    {
      id: "vae",
      label: "Analyses besoin — VAE",
      toastLabel: "Analyse ajoutée",
      rowLabel: (row) => String(row.beneficiaire ?? "Analyse VAE"),
      columns: [
        { id: "date", type: "date", label: "Date", width: "120px" },
        { id: "beneficiaire", type: "text", label: "Candidat", width: "200px" },
        { id: "certification", type: "text", label: "Certification visée", width: "180px" },
        { id: "experience", type: "textarea", label: "Expérience(s) à valoriser" },
        { id: "ecarts", type: "textarea", label: "Écarts identifiés vs référentiel" },
        { id: "accompagnement", type: "textarea", label: "Accompagnement préconisé" },
        { id: "statut", type: "select", label: "Statut", options: STATUT_OPTIONS, width: "180px" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
    {
      id: "cfa",
      label: "Analyses besoin — Apprentissage",
      toastLabel: "Analyse ajoutée",
      rowLabel: (row) => String(row.beneficiaire ?? "Analyse CFA"),
      columns: [
        { id: "date", type: "date", label: "Date", width: "120px" },
        { id: "beneficiaire", type: "text", label: "Apprenti", width: "200px" },
        { id: "entreprise", type: "text", label: "Entreprise d'accueil", width: "180px" },
        { id: "certification", type: "text", label: "Certification visée", width: "180px" },
        { id: "positionnement", type: "textarea", label: "Positionnement / prérequis" },
        { id: "amenagement", type: "textarea", label: "Aménagements nécessaires (handicap, etc.)" },
        { id: "statut", type: "select", label: "Statut", options: STATUT_OPTIONS, width: "180px" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
  ],
};
