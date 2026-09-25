import type { MiniAppSchema } from "../schema-types";
import {
  count,
  danger,
  daysBetween,
  firstMatch,
  has,
  mode,
  ok,
  optLabel,
  pct,
  pending,
  str,
  warn,
} from "../helpers";

// M19a — Trace du positionnement : outil utilisé, décision prise, adaptation décidée.

const OUTIL_OPTIONS = [
  { value: "questionnaire", label: "📝 Questionnaire écrit" },
  { value: "qcm", label: "✅ QCM / test en ligne" },
  { value: "entretien", label: "🗣 Entretien individuel" },
  { value: "mise_situation", label: "🎯 Mise en situation" },
  { value: "dossier", label: "📁 Analyse de dossier" },
  { value: "auto_evaluation", label: "🪞 Auto-évaluation" },
];

const DECISION_OPTIONS = [
  { value: "entree_standard", label: "✓ Entrée parcours standard" },
  { value: "entree_adaptee", label: "🔧 Entrée avec adaptation" },
  { value: "parcours_reduit", label: "✂️ Parcours réduit / dispense" },
  { value: "prerequis_manquant", label: "⏸ Prérequis à acquérir d'abord" },
  { value: "reorientation", label: "↗️ Réorientation proposée" },
  { value: "refus", label: "✗ Entrée refusée" },
];

const ADAPTATION_OPTIONS = [
  { value: "aucune", label: "— Aucune adaptation" },
  { value: "rythme", label: "⏱ Rythme aménagé" },
  { value: "contenu", label: "📚 Contenu ajusté" },
  { value: "supports", label: "🎨 Supports adaptés" },
  { value: "accompagnement", label: "🤝 Accompagnement renforcé" },
  { value: "handicap", label: "♿ Compensation handicap" },
  { value: "groupe", label: "👥 Groupe de niveau" },
];

const decisionRequiertAdaptation = (v: unknown) =>
  ["entree_adaptee", "parcours_reduit"].includes(str(v));

export const registrePositionnementsSchema: MiniAppSchema = {
  key: "registre-positionnements",
  name: "Registre des positionnements",
  shortName: "Positionnements",
  description:
    "Une ligne par bénéficiaire positionné à l'entrée : l'outil utilisé, ce qui en est ressorti, la décision prise et l'adaptation qui en découle. Les décisions manquantes et les adaptations décidées mais non décrites sont signalées.",
  indicators: ["I8"],
  critere: 2,
  docRef: "M19a",
  tables: [
    {
      id: "registre",
      label: "Registre des positionnements",
      toastLabel: "Positionnement ajouté",
      emptyLabel:
        "Aucun positionnement. Ajoutez une ligne par bénéficiaire évalué à l'entrée du parcours.",
      rowLabel: (row) => str(row.beneficiaire) || "Positionnement",
      columns: [
        { id: "date", type: "date", label: "Date", width: "125px" },
        { id: "beneficiaire", type: "text", label: "Bénéficiaire", width: "175px" },
        { id: "prestation", type: "text", label: "Prestation visée", width: "180px" },
        { id: "outil", type: "select", label: "Outil", options: OUTIL_OPTIONS, width: "180px" },
        { id: "resultat", type: "textarea", label: "Résultat / niveau constaté" },
        {
          id: "decision",
          type: "select",
          label: "Décision",
          options: DECISION_OPTIONS,
          width: "215px",
        },
        {
          id: "adaptation",
          type: "select",
          label: "Adaptation décidée",
          options: ADAPTATION_OPTIONS,
          width: "195px",
        },
        { id: "adaptation_detail", type: "textarea", label: "Adaptation — en quoi concrètement" },
        { id: "date_entree", type: "date", label: "Entrée effective", width: "150px" },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "195px",
          compute: ({ row }) => {
            const ecart = daysBetween(row.date, row.date_entree);
            return firstMatch([
              [!has(row.beneficiaire), pending("Bénéficiaire à saisir")],
              [!has(row.outil), warn("Outil non tracé")],
              [!has(row.decision), danger("Décision manquante")],
              [!has(row.resultat), warn("Résultat non consigné")],
              [
                decisionRequiertAdaptation(row.decision) &&
                  (!has(row.adaptation) || str(row.adaptation) === "aucune"),
                danger("Adaptation attendue mais absente"),
              ],
              [
                has(row.adaptation) &&
                  str(row.adaptation) !== "aucune" &&
                  !has(row.adaptation_detail),
                danger("Adaptation non décrite"),
              ],
              [ecart !== null && ecart < 0, danger("Positionné après l'entrée")],
            ], ok("Complet"));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const sansDecision = count(rows, (r) => !has(r.decision));
        const avecAdaptation = count(
          rows,
          (r) => has(r.adaptation) && str(r.adaptation) !== "aucune",
        );
        const adaptNonDecrites = count(
          rows,
          (r) =>
            has(r.adaptation) && str(r.adaptation) !== "aucune" && !has(r.adaptation_detail),
        );
        const dominante = mode(rows, "decision");
        return [
          { label: "Positionnements", value: String(rows.length) },
          {
            label: "Décision manquante",
            value: String(sansDecision),
            tone: sansDecision > 0 ? "danger" : "ok",
          },
          {
            label: "Parcours adaptés",
            value: `${avecAdaptation} · ${pct(avecAdaptation, rows.length)}`,
            hint: "Un taux nul sur un effectif significatif interroge la réalité du positionnement",
            tone: rows.length >= 5 && avecAdaptation === 0 ? "warn" : "neutral",
          },
          {
            label: "Adaptations non décrites",
            value: String(adaptNonDecrites),
            tone: adaptNonDecrites > 0 ? "danger" : "ok",
          },
          {
            label: "Décision dominante",
            value: dominante
              ? `${optLabel(DECISION_OPTIONS, dominante.value)} (${dominante.n})`
              : "—",
          },
        ];
      },
    },
  ],
  controls: (tables) => {
    const rows = tables.registre ?? [];
    const alerts = [];

    const sansDecision = count(rows, (r) => has(r.beneficiaire) && !has(r.decision));
    if (sansDecision > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Positionnements sans décision tracée : le positionnement reste sans effet.",
        count: sansDecision,
      });
    }

    const adaptNonDecrites = count(
      rows,
      (r) => has(r.adaptation) && str(r.adaptation) !== "aucune" && !has(r.adaptation_detail),
    );
    if (adaptNonDecrites > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Adaptations décidées mais non décrites : l'auditeur ne peut pas vérifier leur mise en œuvre.",
        count: adaptNonDecrites,
      });
    }

    const decisionsSansAdaptation = count(
      rows,
      (r) =>
        decisionRequiertAdaptation(r.decision) &&
        (!has(r.adaptation) || str(r.adaptation) === "aucune"),
    );
    if (decisionsSansAdaptation > 0) {
      alerts.push({
        tone: "danger" as const,
        message:
          "Décisions « entrée adaptée » ou « parcours réduit » sans adaptation renseignée : contradiction interne.",
        count: decisionsSansAdaptation,
      });
    }

    const apresEntree = count(rows, (r) => {
      const d = daysBetween(r.date, r.date_entree);
      return d !== null && d < 0;
    });
    if (apresEntree > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Positionnements réalisés après l'entrée en formation.",
        count: apresEntree,
      });
    }

    const sansOutil = count(rows, (r) => has(r.beneficiaire) && !has(r.outil));
    if (sansOutil > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Positionnements sans outil identifié.",
        count: sansOutil,
      });
    }

    const avecAdaptation = count(
      rows,
      (r) => has(r.adaptation) && str(r.adaptation) !== "aucune",
    );
    if (rows.length >= 8 && avecAdaptation === 0) {
      alerts.push({
        tone: "warn" as const,
        message:
          "Aucun parcours adapté sur l'ensemble du registre : un positionnement qui ne débouche jamais sur une adaptation est difficile à défendre.",
      });
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M19a. Le positionnement doit être daté avant l'entrée, déboucher sur une décision, et cette décision doit se traduire concrètement dans le parcours.",
    sections: [
      {
        title: "Le piège classique",
        content:
          "Un positionnement réalisé pour tout le monde, avec une décision identique pour tout le monde et aucune adaptation. L'auditeur en conclut que le positionnement est formel et non opérant.",
      },
    ],
  },
};
