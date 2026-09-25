import type { MiniAppSchema, Row } from "../schema-types";
import {
  count,
  danger,
  daysBetween,
  firstMatch,
  has,
  ok,
  pct,
  pending,
  str,
  warn,
} from "../helpers";

// M29a — Trace individuelle de chaque évaluation : résultat, motivation, restitution.

const TYPE_OPTIONS = [
  { value: "diagnostique", label: "🔍 Diagnostique (entrée)" },
  { value: "formative", label: "🔄 Formative (en cours)" },
  { value: "sommative", label: "🎯 Sommative (fin)" },
  { value: "certificative", label: "🎓 Certificative" },
];

const MODALITE_OPTIONS = [
  { value: "qcm", label: "📝 QCM" },
  { value: "ecrit", label: "✍️ Écrit / dossier" },
  { value: "oral", label: "🗣 Oral / soutenance" },
  { value: "mise_situation", label: "🎯 Mise en situation" },
  { value: "production", label: "🛠 Production / livrable" },
  { value: "observation", label: "👁 Grille d'observation" },
];

const RESULTAT_OPTIONS = [
  { value: "acquis", label: "✓ Acquis" },
  { value: "en_cours", label: "◐ En cours d'acquisition" },
  { value: "non_acquis", label: "✗ Non acquis" },
];

const RESTITUTION_OPTIONS = [
  { value: "entretien", label: "🗣 Entretien individuel" },
  { value: "ecrite", label: "📄 Restitution écrite" },
  { value: "collective", label: "👥 Retour collectif" },
  { value: "plateforme", label: "💻 Via la plateforme" },
  { value: "non", label: "✗ Pas de restitution" },
];

const SIGNATURE_OPTIONS = [
  { value: "signee", label: "✍️ Signée formateur + bénéf." },
  { value: "formateur", label: "◐ Formateur seul" },
  { value: "non", label: "✗ Non signée" },
];

const nonValide = (row: Row) =>
  str(row.resultat) === "non_acquis" || str(row.resultat) === "en_cours";
const restitutionTracee = (row: Row) =>
  has(row.restitution) && str(row.restitution) !== "non";

export const registreEvaluationsSchema: MiniAppSchema = {
  key: "registre-evaluations",
  name: "Registre des évaluations des acquis",
  shortName: "Registre évaluations",
  description:
    "Trace individuelle de chaque évaluation réalisée : sa modalité, son résultat, la motivation en cas de non-validation et la restitution faite au bénéficiaire. Les trois manques classiques en audit sont détectés automatiquement.",
  indicators: ["I11"],
  critere: 3,
  docRef: "M29a",
  tables: [
    {
      id: "registre",
      label: "Registre des évaluations",
      toastLabel: "Évaluation enregistrée",
      emptyLabel:
        "Aucune évaluation. Ajoutez une ligne par évaluation réalisée, bénéficiaire par bénéficiaire.",
      rowLabel: (row) =>
        `${str(row.beneficiaire) || "Bénéficiaire"} · ${str(row.objet) || "évaluation"}`,
      columns: [
        { id: "date", type: "date", label: "Date", width: "125px" },
        { id: "beneficiaire", type: "text", label: "Bénéficiaire", width: "175px" },
        { id: "session", type: "text", label: "Session", width: "155px" },
        { id: "objet", type: "textarea", label: "Objet / compétence évaluée" },
        { id: "type", type: "select", label: "Type", options: TYPE_OPTIONS, width: "185px" },
        {
          id: "modalite",
          type: "select",
          label: "Modalité",
          options: MODALITE_OPTIONS,
          width: "175px",
        },
        { id: "evaluateur", type: "text", label: "Évaluateur", width: "150px" },
        { id: "resultat", type: "select", label: "Résultat", options: RESULTAT_OPTIONS, width: "185px" },
        { id: "motivation", type: "textarea", label: "Motivation du résultat" },
        {
          id: "signature",
          type: "select",
          label: "Grille signée",
          options: SIGNATURE_OPTIONS,
          width: "195px",
        },
        {
          id: "restitution",
          type: "select",
          label: "Restitution",
          options: RESTITUTION_OPTIONS,
          width: "180px",
        },
        { id: "date_restitution", type: "date", label: "Restituée le", width: "140px" },
        { id: "suite", type: "textarea", label: "Suite donnée (remédiation…)" },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "215px",
          compute: ({ row }) => {
            const delai = daysBetween(row.date, row.date_restitution);
            return firstMatch([
              [!has(row.beneficiaire), pending("Bénéficiaire à saisir")],
              [!has(row.resultat), pending("Résultat à saisir")],
              [str(row.signature) === "non" || !has(row.signature), danger("Grille non signée")],
              [nonValide(row) && !has(row.motivation), danger("Non-validation non motivée")],
              [!restitutionTracee(row), danger("Restitution non tracée")],
              [
                str(row.resultat) === "non_acquis" && !has(row.suite),
                danger("Non acquis sans suite donnée"),
              ],
              [str(row.signature) === "formateur", warn("Signature bénéficiaire manquante")],
              [delai !== null && delai > 30, warn(`Restitution à J+${delai}`)],
              [!has(row.motivation), warn("Résultat non motivé")],
            ], ok("Évaluation complète"));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const acquis = count(rows, (r) => str(r.resultat) === "acquis");
        const evalues = count(rows, (r) => has(r.resultat));
        const nonSignees = count(
          rows,
          (r) => has(r.beneficiaire) && (str(r.signature) === "non" || !has(r.signature)),
        );
        const nonMotivees = count(rows, (r) => nonValide(r) && !has(r.motivation));
        const sansRestitution = count(
          rows,
          (r) => has(r.resultat) && !restitutionTracee(r),
        );
        return [
          { label: "Évaluations tracées", value: String(rows.length) },
          {
            label: "Taux d'acquisition",
            value: evalues ? pct(acquis, evalues) : "—",
            tone: evalues === 0 ? "neutral" : acquis / evalues >= 0.8 ? "ok" : "warn",
          },
          {
            label: "Grilles non signées",
            value: String(nonSignees),
            tone: nonSignees > 0 ? "danger" : "ok",
          },
          {
            label: "Non-validations non motivées",
            value: String(nonMotivees),
            tone: nonMotivees > 0 ? "danger" : "ok",
          },
          {
            label: "Restitutions non tracées",
            value: String(sansRestitution),
            tone: sansRestitution > 0 ? "danger" : "ok",
          },
        ];
      },
    },
  ],
  controls: (tables) => {
    const rows = tables.registre ?? [];
    const alerts = [];

    const nonSignees = count(
      rows,
      (r) => has(r.beneficiaire) && (str(r.signature) === "non" || !has(r.signature)),
    );
    if (nonSignees > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Grilles d'évaluation non signées : la preuve n'est pas opposable en audit.",
        count: nonSignees,
      });
    }

    const nonMotivees = count(rows, (r) => nonValide(r) && !has(r.motivation));
    if (nonMotivees > 0) {
      alerts.push({
        tone: "danger" as const,
        message:
          "Résultats non acquis ou en cours d'acquisition sans motivation écrite : la décision n'est pas justifiable.",
        count: nonMotivees,
      });
    }

    const sansRestitution = count(rows, (r) => has(r.resultat) && !restitutionTracee(r));
    if (sansRestitution > 0) {
      alerts.push({
        tone: "danger" as const,
        message:
          "Évaluations dont la restitution au bénéficiaire n'est pas tracée : l'indicateur 11 exige le retour, pas seulement la note.",
        count: sansRestitution,
      });
    }

    const nonAcquisSansSuite = count(
      rows,
      (r) => str(r.resultat) === "non_acquis" && !has(r.suite),
    );
    if (nonAcquisSansSuite > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Résultats « non acquis » sans suite donnée (remédiation, nouvelle évaluation).",
        count: nonAcquisSansSuite,
      });
    }

    const signatureIncomplete = count(rows, (r) => str(r.signature) === "formateur");
    if (signatureIncomplete > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Grilles signées par le formateur seul : la contresignature du bénéficiaire manque.",
        count: signatureIncomplete,
      });
    }

    const restitutionsTardives = count(rows, (r) => {
      const d = daysBetween(r.date, r.date_restitution);
      return d !== null && d > 30;
    });
    if (restitutionsTardives > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Restitutions faites plus de 30 jours après l'évaluation.",
        count: restitutionsTardives,
      });
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M29a. Il complète la Grille d'évaluation des acquis : celle-ci porte le calcul des résultats, celui-ci porte la traçabilité individuelle et la restitution.",
    sections: [
      {
        title: "Les trois manques classiques",
        content:
          "Grille non signée, non-validation non motivée, restitution non tracée. Ce sont les trois écarts les plus fréquemment relevés sur l'indicateur 11 — d'où les trois contrôles dédiés.",
      },
    ],
  },
};
