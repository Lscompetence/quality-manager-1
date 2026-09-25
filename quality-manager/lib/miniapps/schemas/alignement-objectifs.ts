import type { Column, MiniAppSchema, Row } from "../schema-types";
import { count, danger, firstMatch, has, ok, pct, pending, str, warn } from "../helpers";

// M16 — Matrice d'alignement : besoin → objectif → contenu → évaluation.
// Un onglet par catégorie d'action, comme le classeur à quatre entrées.

const TAXONOMIE_OPTIONS = [
  { value: "connaitre", label: "1 · Connaître" },
  { value: "comprendre", label: "2 · Comprendre" },
  { value: "appliquer", label: "3 · Appliquer" },
  { value: "analyser", label: "4 · Analyser" },
  { value: "evaluer", label: "5 · Évaluer" },
  { value: "creer", label: "6 · Créer" },
];

const EVAL_OPTIONS = [
  { value: "qcm", label: "📝 QCM" },
  { value: "mise_situation", label: "🎯 Mise en situation" },
  { value: "etude_cas", label: "📁 Étude de cas" },
  { value: "production", label: "🛠 Production / livrable" },
  { value: "oral", label: "🗣 Soutenance orale" },
  { value: "observation", label: "👁 Grille d'observation" },
];

/** Colonne de contrôle commune : une ligne est alignée si les 4 maillons existent. */
const alignementColumn: Column = {
  id: "alignement",
  type: "computed",
  label: "Alignement",
  width: "175px",
  compute: ({ row }) =>
    firstMatch([
      [!has(row.objectif), pending("Objectif à saisir")],
      [!has(row.besoin), warn("Besoin d'origine non tracé")],
      [!has(row.contenu), danger("Objectif sans contenu")],
      [!has(row.evaluation), danger("Objectif sans évaluation")],
      [!has(row.critere), warn("Critère de réussite absent")],
    ], ok("Chaîne complète")),
};

const isComplete = (row: Row) =>
  has(row.objectif) && has(row.contenu) && has(row.evaluation);

const summaryFor = (label: string) => ({ rows }: { rows: Row[] }) => {
  const complets = count(rows, isComplete);
  const sansContenu = count(rows, (r) => has(r.objectif) && !has(r.contenu));
  const sansEval = count(rows, (r) => has(r.objectif) && !has(r.evaluation));
  return [
    { label: `Objectifs ${label}`, value: String(rows.length) },
    {
      label: "Chaînes complètes",
      value: pct(complets, rows.length),
      tone: complets === rows.length ? ("ok" as const) : ("warn" as const),
    },
    {
      label: "Sans contenu",
      value: String(sansContenu),
      tone: sansContenu > 0 ? ("danger" as const) : ("ok" as const),
    },
    {
      label: "Sans évaluation",
      value: String(sansEval),
      tone: sansEval > 0 ? ("danger" as const) : ("ok" as const),
    },
  ];
};

export const alignementObjectifsSchema: MiniAppSchema = {
  key: "alignement-objectifs",
  name: "Matrice d'alignement des objectifs",
  shortName: "Alignement objectifs",
  description:
    "Relie chaque besoin identifié à un objectif opérationnel, au contenu qui le sert et à la modalité qui l'évalue. Toute rupture dans la chaîne est signalée — c'est exactement ce que cherche l'auditeur sur l'indicateur 5.",
  indicators: ["I5"],
  critere: 2,
  docRef: "M16",
  tabs: [
    { id: "af", label: "Actions de formation", tableIds: ["af"] },
    { id: "bc", label: "Bilans de compétences", tableIds: ["bc"] },
    { id: "vae", label: "VAE", tableIds: ["vae"] },
    { id: "cfa", label: "Apprentissage", tableIds: ["cfa"] },
  ],
  tables: [
    {
      id: "af",
      label: "Alignement — Actions de formation",
      toastLabel: "Objectif ajouté",
      emptyLabel: "Aucun objectif. Ajoutez une ligne par objectif opérationnel de la formation.",
      rowLabel: (row) => str(row.objectif) || "Objectif AF",
      columns: [
        { id: "formation", type: "text", label: "Formation", width: "160px" },
        { id: "besoin", type: "textarea", label: "Besoin d'origine" },
        { id: "objectif", type: "textarea", label: "Objectif opérationnel (verbe d'action)" },
        {
          id: "taxonomie",
          type: "select",
          label: "Niveau",
          options: TAXONOMIE_OPTIONS,
          width: "140px",
        },
        { id: "contenu", type: "textarea", label: "Contenu / séquence qui le sert" },
        {
          id: "evaluation",
          type: "select",
          label: "Modalité d'évaluation",
          options: EVAL_OPTIONS,
          width: "180px",
        },
        { id: "critere", type: "textarea", label: "Critère de réussite" },
        alignementColumn,
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: summaryFor("formation"),
    },
    {
      id: "bc",
      label: "Alignement — Bilans de compétences",
      toastLabel: "Objectif ajouté",
      emptyLabel: "Aucun objectif. Les objectifs du bilan sont co-définis en phase préliminaire.",
      rowLabel: (row) => str(row.objectif) || "Objectif BC",
      columns: [
        { id: "beneficiaire", type: "text", label: "Bénéficiaire", width: "160px" },
        { id: "besoin", type: "textarea", label: "Demande initiale exprimée" },
        { id: "objectif", type: "textarea", label: "Objectif co-défini" },
        {
          id: "phase",
          type: "select",
          label: "Phase",
          options: [
            { value: "preliminaire", label: "1 · Préliminaire" },
            { value: "investigation", label: "2 · Investigation" },
            { value: "conclusion", label: "3 · Conclusion" },
          ],
          width: "150px",
        },
        { id: "contenu", type: "textarea", label: "Travaux / outils mobilisés" },
        {
          id: "evaluation",
          type: "select",
          label: "Modalité de vérification",
          options: [
            { value: "entretien", label: "🗣 Entretien de restitution" },
            { value: "synthese", label: "📄 Document de synthèse" },
            { value: "plan_action", label: "🎯 Plan d'action validé" },
            { value: "questionnaire", label: "📝 Questionnaire" },
          ],
          width: "195px",
        },
        { id: "critere", type: "textarea", label: "Critère de réussite" },
        alignementColumn,
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: summaryFor("bilan"),
    },
    {
      id: "vae",
      label: "Alignement — VAE (jalons d'accompagnement)",
      toastLabel: "Jalon ajouté",
      emptyLabel: "Aucun jalon. Ajoutez les étapes de l'accompagnement jusqu'au passage devant le jury.",
      rowLabel: (row) => str(row.objectif) || "Jalon VAE",
      columns: [
        { id: "candidat", type: "text", label: "Candidat", width: "150px" },
        { id: "besoin", type: "textarea", label: "Écart identifié vs référentiel" },
        { id: "objectif", type: "textarea", label: "Objectif du jalon" },
        { id: "jalon", type: "date", label: "Date jalon", width: "130px" },
        { id: "contenu", type: "textarea", label: "Accompagnement prévu" },
        {
          id: "evaluation",
          type: "select",
          label: "Vérification",
          options: [
            { value: "relecture", label: "📖 Relecture du dossier" },
            { value: "simulation", label: "🎭 Simulation de jury" },
            { value: "entretien", label: "🗣 Entretien d'étape" },
            { value: "livrable", label: "📄 Livrable intermédiaire" },
          ],
          width: "185px",
        },
        { id: "critere", type: "textarea", label: "Critère de réussite" },
        alignementColumn,
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: summaryFor("VAE"),
    },
    {
      id: "cfa",
      label: "Alignement — Apprentissage (par bloc RNCP)",
      toastLabel: "Objectif ajouté",
      emptyLabel: "Aucun objectif. Déclinez les blocs de compétences du diplôme en objectifs.",
      rowLabel: (row) => str(row.objectif) || "Objectif CFA",
      columns: [
        { id: "bloc", type: "text", label: "Bloc RNCP", width: "140px" },
        { id: "besoin", type: "textarea", label: "Compétence attendue du référentiel" },
        { id: "objectif", type: "textarea", label: "Objectif opérationnel" },
        {
          id: "lieu",
          type: "select",
          label: "Lieu",
          options: [
            { value: "centre", label: "🏫 CFA" },
            { value: "entreprise", label: "🏭 Entreprise" },
            { value: "mixte", label: "🔄 Les deux" },
          ],
          width: "130px",
        },
        { id: "contenu", type: "textarea", label: "Contenu / mission qui le sert" },
        {
          id: "evaluation",
          type: "select",
          label: "Modalité d'évaluation",
          options: EVAL_OPTIONS,
          width: "180px",
        },
        { id: "critere", type: "textarea", label: "Critère de réussite" },
        alignementColumn,
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: summaryFor("apprentissage"),
    },
  ],
  controls: (tables) => {
    const all = ["af", "bc", "vae", "cfa"].flatMap((k) => tables[k] ?? []);
    const alerts = [];

    const sansContenu = count(all, (r) => has(r.objectif) && !has(r.contenu));
    if (sansContenu > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Objectifs sans contenu associé : la chaîne d'alignement est rompue.",
        count: sansContenu,
      });
    }

    const sansEval = count(all, (r) => has(r.objectif) && !has(r.evaluation));
    if (sansEval > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Objectifs sans modalité d'évaluation : ils ne sont donc pas évaluables.",
        count: sansEval,
      });
    }

    const sansBesoin = count(all, (r) => has(r.objectif) && !has(r.besoin));
    if (sansBesoin > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Objectifs dont le besoin d'origine n'est pas tracé (lien I4 → I5).",
        count: sansBesoin,
      });
    }

    const sansCritere = count(all, (r) => has(r.objectif) && !has(r.critere));
    if (sansCritere > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Objectifs sans critère de réussite explicite.",
        count: sansCritere,
      });
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M16. Une ligne = un objectif. La colonne Alignement vérifie en continu que le quadruplet besoin → objectif → contenu → évaluation est complet.",
    sections: [
      {
        title: "Formuler un objectif évaluable",
        content:
          "Un verbe d'action observable, un objet, une condition. « Comprendre la TVA » n'est pas évaluable ; « Établir une déclaration de TVA CA3 à partir d'un grand livre » l'est.",
      },
    ],
  },
};
