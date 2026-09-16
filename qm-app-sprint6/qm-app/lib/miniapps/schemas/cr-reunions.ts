import type { MiniAppSchema } from "../schema-types";

const TYPE_OPTIONS = [
  { value: "conseil_perfectionnement", label: "🎓 Conseil de perfectionnement" },
  { value: "mensuelle", label: "📅 Réunion mensuelle équipe" },
  { value: "preparation_audit", label: "🔍 Préparation audit" },
  { value: "revue_direction", label: "👔 Revue de direction" },
  { value: "pedagogique", label: "📚 Réunion pédagogique" },
  { value: "autre", label: "Autre" },
];

const STATUT_OPTIONS = [
  { value: "redige_signe", label: "✓ Rédigé & signé" },
  { value: "redige", label: "📝 Rédigé non signé" },
  { value: "a_rediger", label: "⏳ À rédiger" },
];

export const crReunionsSchema: MiniAppSchema = {
  key: "cr-reunions",
  name: "Registre des CR de réunions",
  shortName: "CR réunions",
  description:
    "Compte-rendus des réunions de coordination de l'équipe pédagogique (conseils de perfectionnement, réunions équipe, revues de direction).",
  indicators: ["I18"],
  critere: 4,
  tables: [
    {
      id: "registre",
      label: "Registre des comptes-rendus",
      toastLabel: "CR ajouté",
      rowLabel: (row) => String(row.objet ?? "CR de réunion"),
      columns: [
        { id: "date", type: "date", label: "Date", width: "120px" },
        { id: "type", type: "select", label: "Type", options: TYPE_OPTIONS, width: "210px" },
        { id: "objet", type: "text", label: "Objet" },
        { id: "animateur", type: "text", label: "Animateur", width: "170px" },
        { id: "presents", type: "text", label: "Présents", width: "120px", placeholder: "Ex: 6/7" },
        { id: "decisions", type: "textarea", label: "Décisions clés" },
        { id: "statut", type: "select", label: "Statut CR", options: STATUT_OPTIONS, width: "150px" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
  ],
};
