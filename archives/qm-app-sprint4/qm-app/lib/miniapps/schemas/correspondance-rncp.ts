import type { MiniAppSchema } from "../schema-types";

const TYPE_OPTIONS = [
  { value: "cours", label: "📖 Cours / théorie" },
  { value: "tp", label: "🔧 TP / pratique" },
  { value: "projet", label: "🎯 Projet" },
  { value: "evaluation", label: "📝 Évaluation" },
  { value: "stage", label: "🏢 Stage / alternance" },
];

const MODALITE_OPTIONS = [
  { value: "presentiel", label: "🏛 Présentiel" },
  { value: "foad", label: "💻 FOAD" },
  { value: "mixte", label: "🔄 Mixte" },
];

export const correspondanceRncpSchema: MiniAppSchema = {
  key: "correspondance-rncp",
  name: "Correspondance RNCP / programme",
  shortName: "Correspondance RNCP",
  description:
    "Mapping entre les blocs de compétences RNCP et les modules de formation : chaque bloc doit être couvert par au moins un module/évaluation.",
  indicators: ["I7"],
  critere: 2,
  tabs: [
    { id: "blocs", label: "Blocs RNCP", tableIds: ["blocs"] },
    { id: "modules", label: "Modules de formation", tableIds: ["modules"] },
  ],
  tables: [
    {
      id: "blocs",
      label: "Blocs de compétences (référentiel)",
      toastLabel: "Bloc ajouté",
      rowLabel: (row) => String(row.intitule ?? row.code ?? "Bloc"),
      columns: [
        { id: "code", type: "text", label: "Code bloc", width: "110px", placeholder: "RNCP38362BC01" },
        { id: "intitule", type: "text", label: "Intitulé du bloc" },
        { id: "competences", type: "textarea", label: "Compétences attendues" },
        { id: "modalite_eval", type: "textarea", label: "Modalités d'évaluation" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
    {
      id: "modules",
      label: "Modules de votre programme",
      toastLabel: "Module ajouté",
      rowLabel: (row) => String(row.nom ?? "Module"),
      columns: [
        { id: "nom", type: "text", label: "Nom du module", width: "200px" },
        { id: "type", type: "select", label: "Type", options: TYPE_OPTIONS, width: "150px" },
        { id: "modalite", type: "select", label: "Modalité", options: MODALITE_OPTIONS, width: "130px" },
        { id: "duree_h", type: "number", label: "Durée (h)", width: "110px" },
        { id: "blocs_couverts", type: "text", label: "Blocs RNCP couverts", placeholder: "BC01, BC02..." },
        { id: "objectifs", type: "textarea", label: "Objectifs pédagogiques" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
  ],
};
