import type { MiniAppSchema, Row } from "../schema-types";
import {
  count,
  danger,
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

// M28a — Une ligne par adaptation, du constat à l'effet observé.
// Trois états : complète · effet non évalué · non mise en œuvre.

const LEVIER_OPTIONS = [
  { value: "rythme", label: "⏱ Rythme / durée" },
  { value: "contenu", label: "📚 Contenu ou progression" },
  { value: "methode", label: "🎯 Méthode pédagogique" },
  { value: "supports", label: "🎨 Supports adaptés" },
  { value: "groupe", label: "👥 Constitution du groupe" },
  { value: "soutien", label: "🤝 Soutien individualisé" },
  { value: "modalite", label: "💻 Modalité (présentiel / distanciel)" },
  { value: "compensation", label: "♿ Compensation handicap" },
  { value: "materiel", label: "🛠 Matériel / poste de travail" },
];

const DECLENCHEUR_OPTIONS = [
  { value: "positionnement", label: "📊 Positionnement d'entrée" },
  { value: "evaluation", label: "📝 Évaluation intermédiaire" },
  { value: "point_etape", label: "🔄 Point d'étape" },
  { value: "demande", label: "🙋 Demande du bénéficiaire" },
  { value: "observation", label: "👁 Observation du formateur" },
  { value: "assiduite", label: "📉 Baisse d'assiduité" },
  { value: "referent_handicap", label: "♿ Référent handicap" },
];

const MISE_EN_OEUVRE_OPTIONS = [
  { value: "non", label: "✗ Non mise en œuvre" },
  { value: "partielle", label: "◐ Partiellement" },
  { value: "oui", label: "✓ Mise en œuvre" },
];

const EFFET_OPTIONS = [
  { value: "positif", label: "📈 Effet positif" },
  { value: "partiel", label: "◐ Effet partiel" },
  { value: "nul", label: "➖ Sans effet" },
  { value: "negatif", label: "📉 Effet négatif" },
];

/** Les trois états du classeur. */
function etat(row: Row): "complete" | "effet_non_evalue" | "non_mise_en_oeuvre" | "incomplet" {
  if (!has(row.constat) || !has(row.adaptation)) return "incomplet";
  if (str(row.mise_en_oeuvre) === "non" || !has(row.mise_en_oeuvre))
    return "non_mise_en_oeuvre";
  if (!has(row.effet)) return "effet_non_evalue";
  return "complete";
}

export const registreAdaptationsSchema: MiniAppSchema = {
  key: "registre-adaptations",
  name: "Registre des adaptations",
  shortName: "Registre adaptations",
  description:
    "Une ligne par adaptation décidée en cours de prestation, du constat qui la déclenche jusqu'à l'effet réellement observé. La chaîne constat → adaptation → mise en œuvre → effet est contrôlée à chaque ligne.",
  indicators: ["I10"],
  critere: 3,
  docRef: "M28a",
  tables: [
    {
      id: "registre",
      label: "Registre des adaptations",
      toastLabel: "Adaptation enregistrée",
      emptyLabel:
        "Aucune adaptation. Ajoutez une ligne dès qu'un ajustement est décidé en cours de parcours.",
      rowLabel: (row) =>
        `${str(row.beneficiaire) || "Bénéficiaire"} · ${str(row.adaptation) || "adaptation"}`,
      columns: [
        { id: "date", type: "date", label: "Date", width: "125px" },
        { id: "beneficiaire", type: "text", label: "Bénéficiaire / groupe", width: "175px" },
        {
          id: "declencheur",
          type: "select",
          label: "Déclencheur",
          options: DECLENCHEUR_OPTIONS,
          width: "200px",
        },
        { id: "constat", type: "textarea", label: "Constat précis" },
        { id: "levier", type: "select", label: "Levier", options: LEVIER_OPTIONS, width: "215px" },
        { id: "adaptation", type: "textarea", label: "Adaptation décidée" },
        { id: "responsable", type: "text", label: "Par", width: "135px" },
        {
          id: "mise_en_oeuvre",
          type: "select",
          label: "Mise en œuvre",
          options: MISE_EN_OEUVRE_OPTIONS,
          width: "180px",
        },
        { id: "date_effet", type: "date", label: "Évaluée le", width: "135px" },
        { id: "effet", type: "select", label: "Effet observé", options: EFFET_OPTIONS, width: "165px" },
        { id: "effet_detail", type: "textarea", label: "Effet — description" },
        {
          id: "etat",
          type: "computed",
          label: "État",
          width: "195px",
          compute: ({ row }) => {
            const e = etat(row);
            return firstMatch([
              [e === "incomplet", pending("Constat / adaptation à saisir")],
              [e === "non_mise_en_oeuvre", danger("Non mise en œuvre")],
              [e === "effet_non_evalue", warn("Effet non évalué")],
              [str(row.effet) === "negatif", danger("Effet négatif — réajuster")],
              [str(row.effet) === "nul", warn("Sans effet — réajuster")],
              [!has(row.effet_detail), warn("Effet non décrit")],
            ], ok("Adaptation complète"));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const completes = count(rows, (r) => etat(r) === "complete");
        const nonMises = count(rows, (r) => etat(r) === "non_mise_en_oeuvre");
        const nonEvaluees = count(rows, (r) => etat(r) === "effet_non_evalue");
        const levierDominant = mode(rows, "levier");
        const positifs = count(rows, (r) => str(r.effet) === "positif");
        const evaluees = count(rows, (r) => has(r.effet));
        return [
          { label: "Adaptations tracées", value: String(rows.length) },
          {
            label: "Complètes",
            value: pct(completes, rows.length),
            tone: completes === rows.length && rows.length > 0 ? "ok" : "warn",
          },
          {
            label: "Non mises en œuvre",
            value: String(nonMises),
            tone: nonMises > 0 ? "danger" : "ok",
          },
          {
            label: "Effet non évalué",
            value: String(nonEvaluees),
            tone: nonEvaluees > 0 ? "warn" : "ok",
          },
          {
            label: "Levier le plus mobilisé",
            value: levierDominant
              ? `${optLabel(LEVIER_OPTIONS, levierDominant.value)} (${levierDominant.n})`
              : "—",
          },
          {
            label: "Effets positifs",
            value: evaluees ? pct(positifs, evaluees) : "—",
            tone: evaluees === 0 ? "neutral" : positifs / evaluees >= 0.6 ? "ok" : "warn",
            hint: "Part des adaptations évaluées dont l'effet est positif",
          },
        ];
      },
    },
  ],
  controls: (tables) => {
    const rows = tables.registre ?? [];
    const alerts = [];

    const nonMises = count(rows, (r) => etat(r) === "non_mise_en_oeuvre");
    if (nonMises > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Adaptations décidées mais non mises en œuvre : la décision reste sans effet.",
        count: nonMises,
      });
    }

    const nonEvaluees = count(rows, (r) => etat(r) === "effet_non_evalue");
    if (nonEvaluees > 0) {
      alerts.push({
        tone: "warn" as const,
        message:
          "Adaptations mises en œuvre dont l'effet n'a pas été évalué : la boucle n'est pas fermée.",
        count: nonEvaluees,
      });
    }

    const inefficaces = count(
      rows,
      (r) => str(r.effet) === "nul" || str(r.effet) === "negatif",
    );
    if (inefficaces > 0) {
      alerts.push({
        tone: "danger" as const,
        message:
          "Adaptations sans effet ou à effet négatif : un réajustement doit être tracé à la suite.",
        count: inefficaces,
      });
    }

    const sansConstat = count(rows, (r) => has(r.adaptation) && !has(r.constat));
    if (sansConstat > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Adaptations sans constat d'origine : on ne sait pas ce qui les a déclenchées.",
        count: sansConstat,
      });
    }

    const sansResponsable = count(rows, (r) => has(r.adaptation) && !has(r.responsable));
    if (sansResponsable > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Adaptations sans responsable identifié.",
        count: sansResponsable,
      });
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M28a. L'indicateur 10 ne se satisfait pas d'une procédure d'adaptation : il exige des cas réels, tracés, avec leur effet.",
    sections: [
      {
        title: "Les trois états",
        content:
          "Complète : constat, adaptation, mise en œuvre et effet renseignés. Effet non évalué : l'adaptation a eu lieu mais on ignore ce qu'elle a produit. Non mise en œuvre : décision restée lettre morte — l'état le plus pénalisant en audit.",
      },
    ],
  },
};
