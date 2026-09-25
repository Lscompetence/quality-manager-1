import type { MiniAppSchema } from "../schema-types";
import {
  count,
  danger,
  daysSince,
  daysUntil,
  firstMatch,
  fmtDate,
  has,
  latestDate,
  lookupAll,
  ok,
  pending,
  str,
  warn,
} from "../helpers";

// M18b — Suivi des échéances d'enregistrement + registre des consultations de veille.

const SOURCE_OPTIONS = [
  { value: "france_competences", label: "🏛 France compétences" },
  { value: "certificateur", label: "📧 Certificateur" },
  { value: "rncp", label: "🔎 Fiche RNCP / RS" },
  { value: "jo", label: "📰 Journal officiel" },
  { value: "branche", label: "🏭 Branche professionnelle" },
  { value: "reseau", label: "🤝 Réseau / pairs" },
];

const IMPACT_OPTIONS = [
  { value: "aucun", label: "○ Aucun impact" },
  { value: "mineur", label: "◐ Impact mineur" },
  { value: "majeur", label: "● Impact majeur" },
];

const SUITE_OPTIONS = [
  { value: "aucune", label: "— Aucune suite" },
  { value: "maj_programme", label: "📝 MAJ du programme" },
  { value: "maj_supports", label: "🎨 MAJ des supports" },
  { value: "maj_evaluation", label: "🎯 MAJ des évaluations" },
  { value: "renouvellement", label: "🔄 Dossier de renouvellement" },
  { value: "arret", label: "🛑 Arrêt de la prestation" },
];

export const veilleCertificationsSchema: MiniAppSchema = {
  key: "veille-certifications",
  name: "Veille sur les référentiels de certification",
  shortName: "Veille certifications",
  description:
    "Tableau des échéances d'enregistrement des certifications préparées et registre des consultations de veille. L'alerte tombe à douze puis six mois de l'échéance.",
  indicators: ["I7"],
  critere: 2,
  docRef: "M18b",
  categories: ["AF", "VAE", "CFA"],
  tabs: [
    { id: "echeances", label: "Échéances", tableIds: ["echeances"] },
    { id: "registre", label: "Registre de veille", tableIds: ["registre"] },
  ],
  tables: [
    {
      id: "echeances",
      label: "Échéances d'enregistrement",
      toastLabel: "Certification ajoutée",
      emptyLabel: "Aucune certification suivie. Ajoutez celles que vous préparez.",
      rowLabel: (row) => str(row.intitule) || "Certification",
      columns: [
        { id: "intitule", type: "text", label: "Certification" },
        { id: "code", type: "text", label: "Code fiche", width: "125px", placeholder: "RNCP…" },
        { id: "certificateur", type: "text", label: "Certificateur", width: "175px" },
        { id: "date_echeance", type: "date", label: "Fin d'enregistrement", width: "165px" },
        {
          id: "alerte",
          type: "computed",
          label: "Alerte",
          width: "195px",
          compute: ({ row }) => {
            const d = daysUntil(row.date_echeance);
            if (d === null) return pending("Échéance à saisir");
            if (d < 0) return danger(`Expirée le ${fmtDate(row.date_echeance)}`);
            if (d <= 180) return danger(`6 mois — ${d} j restants`);
            if (d <= 365) return warn(`12 mois — ${d} j restants`);
            return ok(`${Math.floor(d / 30)} mois restants`);
          },
        },
        { id: "action", type: "textarea", label: "Action de renouvellement engagée" },
        {
          id: "derniere_veille",
          type: "computed",
          label: "Dernière veille",
          width: "175px",
          compute: ({ row, tables }) => {
            const consultations = lookupAll(tables.registre, "certification", row.intitule);
            if (consultations.length === 0) return danger("Jamais consultée");
            const last = latestDate(consultations, "date");
            const age = daysSince(last);
            if (age === null) return pending("Date illisible");
            if (age > 365) return danger(`Il y a ${Math.floor(age / 30)} mois`);
            if (age > 180) return warn(`Il y a ${Math.floor(age / 30)} mois`);
            return ok(fmtDate(last));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const expirees = count(rows, (r) => (daysUntil(r.date_echeance) ?? 1) < 0);
        const six = count(rows, (r) => {
          const d = daysUntil(r.date_echeance);
          return d !== null && d >= 0 && d <= 180;
        });
        const douze = count(rows, (r) => {
          const d = daysUntil(r.date_echeance);
          return d !== null && d > 180 && d <= 365;
        });
        return [
          { label: "Certifications suivies", value: String(rows.length) },
          { label: "Alerte 12 mois", value: String(douze), tone: douze > 0 ? "warn" : "ok" },
          { label: "Alerte 6 mois", value: String(six), tone: six > 0 ? "danger" : "ok" },
          { label: "Expirées", value: String(expirees), tone: expirees > 0 ? "danger" : "ok" },
        ];
      },
    },
    {
      id: "registre",
      label: "Registre des consultations de veille",
      toastLabel: "Consultation ajoutée",
      emptyLabel:
        "Aucune consultation tracée. Une veille non tracée est, pour l'auditeur, une veille inexistante.",
      rowLabel: (row) => `${fmtDate(row.date)} · ${str(row.certification) || "Veille"}`,
      columns: [
        { id: "date", type: "date", label: "Date", width: "125px" },
        {
          id: "certification",
          type: "text",
          label: "Certification concernée",
          width: "200px",
          placeholder: "Libellé identique à l'onglet Échéances",
        },
        { id: "source", type: "select", label: "Source", options: SOURCE_OPTIONS, width: "205px" },
        { id: "constat", type: "textarea", label: "Constat / évolution repérée" },
        { id: "impact", type: "select", label: "Impact", options: IMPACT_OPTIONS, width: "155px" },
        { id: "suite", type: "select", label: "Suite donnée", options: SUITE_OPTIONS, width: "195px" },
        { id: "responsable", type: "text", label: "Par", width: "130px" },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "180px",
          compute: ({ row }) =>
            firstMatch([
              [!has(row.date), pending("Date à saisir")],
              [!has(row.constat), warn("Constat non renseigné")],
              [!has(row.impact), warn("Impact non qualifié")],
              [
                str(row.impact) === "majeur" && (!has(row.suite) || str(row.suite) === "aucune"),
                danger("Impact majeur sans suite"),
              ],
              [
                str(row.impact) === "mineur" && !has(row.suite),
                warn("Suite non tracée"),
              ],
            ], ok("Consultation tracée")),
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const last = latestDate(rows, "date");
        const age = daysSince(last);
        const majeurs = count(rows, (r) => str(r.impact) === "majeur");
        const sansSuite = count(
          rows,
          (r) => str(r.impact) === "majeur" && (!has(r.suite) || str(r.suite) === "aucune"),
        );
        return [
          { label: "Consultations tracées", value: String(rows.length) },
          {
            label: "Dernière consultation",
            value: last ? fmtDate(last) : "—",
            tone: age === null ? "neutral" : age > 180 ? "danger" : age > 90 ? "warn" : "ok",
          },
          { label: "Impacts majeurs", value: String(majeurs) },
          {
            label: "Majeurs sans suite",
            value: String(sansSuite),
            tone: sansSuite > 0 ? "danger" : "ok",
          },
        ];
      },
    },
  ],
  controls: (tables) => {
    const echeances = tables.echeances ?? [];
    const registre = tables.registre ?? [];
    const alerts = [];

    const expirees = count(echeances, (r) => (daysUntil(r.date_echeance) ?? 1) < 0);
    if (expirees > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Certification(s) expirée(s) : retirez-les de vos supports ou renouvelez l'enregistrement.",
        count: expirees,
      });
    }

    const six = count(echeances, (r) => {
      const d = daysUntil(r.date_echeance);
      return d !== null && d >= 0 && d <= 180;
    });
    if (six > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Échéance à moins de 6 mois : le dossier de renouvellement doit être engagé.",
        count: six,
      });
    }

    const douze = count(echeances, (r) => {
      const d = daysUntil(r.date_echeance);
      return d !== null && d > 180 && d <= 365;
    });
    if (douze > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Échéance à moins de 12 mois : anticipez le renouvellement.",
        count: douze,
      });
    }

    const jamaisVeillees = count(
      echeances,
      (r) => has(r.intitule) && lookupAll(registre, "certification", r.intitule).length === 0,
    );
    if (jamaisVeillees > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Certifications suivies sans aucune consultation de veille tracée.",
        count: jamaisVeillees,
      });
    }

    const majeursSansSuite = count(
      registre,
      (r) => str(r.impact) === "majeur" && (!has(r.suite) || str(r.suite) === "aucune"),
    );
    if (majeursSansSuite > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Évolutions à impact majeur repérées mais sans suite donnée.",
        count: majeursSansSuite,
      });
    }

    if (registre.length > 0) {
      const age = daysSince(latestDate(registre, "date"));
      if (age !== null && age > 180) {
        alerts.push({
          tone: "warn" as const,
          message: `Aucune consultation de veille depuis ${Math.floor(age / 30)} mois : le rythme n'est plus démontrable.`,
        });
      }
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M18b. Le lien entre les deux onglets se fait sur le libellé de la certification : saisissez-le à l'identique pour que la colonne « Dernière veille » se renseigne.",
    sections: [
      {
        title: "Rythme attendu",
        content:
          "Aucun texte n'impose de fréquence, mais une veille sans trace sur plus de six mois est difficile à défendre. Deux à quatre consultations par an et par certification constituent un rythme tenable.",
      },
    ],
  },
};
