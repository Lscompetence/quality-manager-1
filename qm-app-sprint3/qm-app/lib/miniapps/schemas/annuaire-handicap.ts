import type { MiniAppSchema } from "../schema-types";

const ROLE_OPTIONS = [
  { value: "ressource", label: "📚 Ressource handicap" },
  { value: "specialise", label: "🎯 Centre spécialisé" },
  { value: "medical", label: "⚕ Médical / paramédical" },
  { value: "psychologue", label: "🧠 Psychologue" },
  { value: "logement", label: "🏠 Logement" },
  { value: "transport", label: "🚐 Transport adapté" },
  { value: "interprete", label: "🤟 Interprète LSF" },
  { value: "autre", label: "Autre" },
];

const MESURE_TYPE_OPTIONS = [
  { value: "amenagement_temps", label: "⏱ Aménagement temps" },
  { value: "amenagement_locaux", label: "🏗 Aménagement locaux" },
  { value: "materiel", label: "💻 Matériel adapté" },
  { value: "humain", label: "👥 Accompagnement humain" },
  { value: "evaluation", label: "📝 Adaptation évaluation" },
  { value: "autre", label: "Autre" },
];

export const annuaireHandicapSchema: MiniAppSchema = {
  key: "annuaire-handicap",
  name: "Annuaire réseau handicap",
  shortName: "Annuaire handicap",
  description:
    "Référents et partenaires mobilisables pour l'accueil et l'accompagnement des bénéficiaires en situation de handicap (PSH), avec catalogue des mesures d'adaptation disponibles.",
  indicators: ["I26"],
  critere: 6,
  tabs: [
    { id: "reseau", label: "Réseau & partenaires", tableIds: ["partenaires"] },
    { id: "mesures", label: "Mesures d'adaptation", tableIds: ["mesures"] },
  ],
  tables: [
    {
      id: "partenaires",
      label: "Partenaires mobilisables",
      toastLabel: "Partenaire ajouté",
      rowLabel: (row) => String(row.nom ?? "Partenaire"),
      columns: [
        { id: "nom", type: "text", label: "Nom / Structure", width: "200px" },
        { id: "role", type: "select", label: "Rôle", options: ROLE_OPTIONS, width: "190px" },
        { id: "contact", type: "text", label: "Contact (mail / tél)" },
        { id: "territoire", type: "text", label: "Territoire couvert", width: "160px" },
        { id: "notes", type: "textarea", label: "Notes" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
    {
      id: "mesures",
      label: "Catalogue des mesures",
      toastLabel: "Mesure ajoutée",
      rowLabel: (row) => String(row.intitule ?? "Mesure"),
      columns: [
        { id: "intitule", type: "text", label: "Intitulé", width: "220px" },
        { id: "type", type: "select", label: "Type", options: MESURE_TYPE_OPTIONS, width: "190px" },
        { id: "description", type: "textarea", label: "Description" },
        { id: "conditions", type: "textarea", label: "Conditions de mise en œuvre" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
  ],
  seed: {
    partenaires: [
      {
        nom: "AGEFIPH",
        role: "ressource",
        contact: "info@agefiph.fr · 0800 11 10 09",
        territoire: "National",
        notes: "Aides financières et accompagnement OF accueillant PSH",
      },
      {
        nom: "Cap Emploi 33",
        role: "ressource",
        contact: "contact@cap-emploi-33.fr",
        territoire: "Gironde",
        notes: "Référent insertion PSH",
      },
    ],
    mesures: [
      {
        intitule: "Tiers temps en évaluation",
        type: "amenagement_temps",
        description: "Majoration de 1/3 du temps imparti aux évaluations écrites",
        conditions: "Sur présentation d'un certificat médical ou avis MDPH",
      },
    ],
  },
};
