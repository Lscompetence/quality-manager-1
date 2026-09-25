import type { MiniAppSchema, Row } from "../schema-types";
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
  pct,
  pending,
  str,
  sum,
  toneFromRate,
  warn,
} from "../helpers";

// M34b — Intervenants externes et leurs évaluations annuelles sur neuf critères.
// La dernière note remonte automatiquement dans le registre.

const NATURE_OPTIONS = [
  { value: "formateur", label: "🎓 Formateur indépendant" },
  { value: "organisme", label: "🏢 Organisme sous-traitant" },
  { value: "portage", label: "📦 Portage salarial" },
  { value: "cotraitance", label: "🤝 Co-traitance" },
  { value: "expert", label: "⭐ Expert / intervenant ponctuel" },
];

const CERTIF_OPTIONS = [
  { value: "qualiopi", label: "✓ Certifié Qualiopi" },
  { value: "dispense", label: "📄 Dispensé (attestation M41a)" },
  { value: "non_requis", label: "— Non requis (hors champ)" },
  { value: "non", label: "✗ Non certifié, non dispensé" },
];

const CONVENTION_OPTIONS = [
  { value: "signee", label: "✍️ Convention signée" },
  { value: "en_cours", label: "⏳ En cours de signature" },
  { value: "non", label: "✗ Absente" },
];

/** Les neuf critères d'évaluation annuelle du classeur. */
const CRITERES_EVAL = [
  { id: "c_pedagogie", label: "Qualité pédagogique" },
  { id: "c_expertise", label: "Expertise métier" },
  { id: "c_supports", label: "Qualité des supports" },
  { id: "c_ponctualite", label: "Ponctualité / fiabilité" },
  { id: "c_admin", label: "Rigueur administrative" },
  { id: "c_satisfaction", label: "Satisfaction bénéficiaires" },
  { id: "c_adaptation", label: "Capacité d'adaptation" },
  { id: "c_reporting", label: "Qualité du reporting" },
  { id: "c_conformite", label: "Respect du cadre qualité" },
] as const;

const NOTE_OPTIONS = [
  { value: "4", label: "4 — Excellent" },
  { value: "3", label: "3 — Satisfaisant" },
  { value: "2", label: "2 — À améliorer" },
  { value: "1", label: "1 — Insuffisant" },
  { value: "na", label: "— Sans objet" },
];

const SUITE_OPTIONS = [
  { value: "reconduit", label: "✓ Reconduit" },
  { value: "reconduit_reserve", label: "◐ Reconduit sous réserve" },
  { value: "plan_progres", label: "📈 Plan de progrès" },
  { value: "non_reconduit", label: "✗ Non reconduit" },
];

/** Note moyenne sur 4, calculée sur les critères notés (hors « sans objet »). */
function moyenne(row: Row): number | null {
  const notes = CRITERES_EVAL.map((c) => str(row[c.id]))
    .filter((v) => v && v !== "na")
    .map(Number)
    .filter((n) => Number.isFinite(n));
  if (notes.length === 0) return null;
  return notes.reduce((a, b) => a + b, 0) / notes.length;
}

const evaluationsDe = (row: Row, tables: Record<string, Row[]>) =>
  lookupAll(tables.evaluations, "sous_traitant", row.nom);

/** Dernière évaluation d'un sous-traitant (la plus récente par date). */
function derniereEval(row: Row, tables: Record<string, Row[]>): Row | null {
  const evals = evaluationsDe(row, tables);
  if (evals.length === 0) return null;
  const last = latestDate(evals, "date");
  return evals.find((e) => str(e.date) === last) ?? evals[0] ?? null;
}

const certificationKo = (v: unknown) => !has(v) || str(v) === "non";

export const registreSousTraitantsSchema: MiniAppSchema = {
  key: "registre-sous-traitants",
  name: "Registre des sous-traitants",
  shortName: "Sous-traitants",
  description:
    "Recense les intervenants externes — convention, certification, assurance — et porte leur évaluation annuelle sur neuf critères. La dernière note remonte automatiquement dans le registre.",
  indicators: ["I18", "I27"],
  critere: 4,
  docRef: "M34b",
  tabs: [
    { id: "sous_traitants", label: "Sous-traitants", tableIds: ["sous_traitants"] },
    { id: "evaluations", label: "Évaluations annuelles", tableIds: ["evaluations"] },
  ],
  tables: [
    {
      id: "sous_traitants",
      label: "Registre des intervenants externes",
      toastLabel: "Sous-traitant ajouté",
      emptyLabel:
        "Aucun sous-traitant. Ajoutez chaque intervenant externe mobilisé sur vos prestations.",
      rowLabel: (row) => str(row.nom) || "Sous-traitant",
      columns: [
        { id: "nom", type: "text", label: "Sous-traitant", width: "185px" },
        { id: "nature", type: "select", label: "Nature", options: NATURE_OPTIONS, width: "230px" },
        { id: "siret", type: "text", label: "SIRET / NDA", width: "165px" },
        { id: "prestations", type: "textarea", label: "Prestations confiées" },
        {
          id: "convention",
          type: "select",
          label: "Convention",
          options: CONVENTION_OPTIONS,
          width: "195px",
        },
        { id: "date_fin_convention", type: "date", label: "Fin convention", width: "150px" },
        {
          id: "certification",
          type: "select",
          label: "Certification qualité",
          options: CERTIF_OPTIONS,
          width: "230px",
        },
        { id: "assurance", type: "date", label: "RC pro valide jusqu'au", width: "185px" },
        {
          id: "derniere_note",
          type: "computed",
          label: "Dernière évaluation",
          width: "200px",
          compute: ({ row, tables }) => {
            const last = derniereEval(row, tables);
            if (!last) return danger("Jamais évalué");
            const m = moyenne(last);
            const age = daysSince(last.date);
            if (m === null) return warn("Évaluation vide");
            const txt = `${m.toFixed(1).replace(".", ",")}/4 · ${fmtDate(last.date)}`;
            if (age !== null && age > 548) return danger(`${txt} — obsolète`);
            if (m < 2) return danger(txt);
            if (m < 2.5) return warn(txt);
            if (age !== null && age > 365) return warn(`${txt} — à renouveler`);
            return ok(txt);
          },
        },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "225px",
          compute: ({ row, tables }) => {
            const last = derniereEval(row, tables);
            const m = last ? moyenne(last) : null;
            const dConv = daysUntil(row.date_fin_convention);
            const dAss = daysUntil(row.assurance);
            return firstMatch([
              [!has(row.nom), pending("Sous-traitant à saisir")],
              [str(row.convention) === "non" || !has(row.convention), danger("Convention absente")],
              [dConv !== null && dConv < 0, danger("Convention expirée")],
              [certificationKo(row.certification), danger("Certification non justifiée")],
              [dAss !== null && dAss < 0, danger("Assurance RC pro expirée")],
              [!has(row.assurance), danger("Assurance non justifiée")],
              [!last, danger("Jamais évalué")],
              [m !== null && m < 2, danger("Évaluation insuffisante")],
              [str(row.convention) === "en_cours", warn("Convention non signée")],
              [dConv !== null && dConv <= 60, warn(`Convention à renouveler (J-${dConv})`)],
              [dAss !== null && dAss <= 60, warn(`Assurance à renouveler (J-${dAss})`)],
              [m !== null && m < 2.5, warn("Évaluation à surveiller")],
            ], ok("Conforme"));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows, tables }) => {
        const conventionsKo = count(
          rows,
          (r) =>
            has(r.nom) &&
            (str(r.convention) === "non" ||
              !has(r.convention) ||
              (daysUntil(r.date_fin_convention) ?? 1) < 0),
        );
        const certifKo = count(rows, (r) => has(r.nom) && certificationKo(r.certification));
        const assuranceKo = count(
          rows,
          (r) => has(r.nom) && (!has(r.assurance) || (daysUntil(r.assurance) ?? 1) < 0),
        );
        const jamaisEvalues = count(rows, (r) => has(r.nom) && !derniereEval(r, tables));
        const insuffisants = count(rows, (r) => {
          const last = derniereEval(r, tables);
          const m = last ? moyenne(last) : null;
          return m !== null && m < 2;
        });
        return [
          { label: "Intervenants externes", value: String(rows.length) },
          {
            label: "Convention absente / expirée",
            value: String(conventionsKo),
            tone: conventionsKo > 0 ? "danger" : "ok",
          },
          {
            label: "Certification non justifiée",
            value: String(certifKo),
            tone: certifKo > 0 ? "danger" : "ok",
          },
          {
            label: "Assurance KO",
            value: String(assuranceKo),
            tone: assuranceKo > 0 ? "danger" : "ok",
          },
          {
            label: "Jamais évalués / insuffisants",
            value: `${jamaisEvalues} / ${insuffisants}`,
            tone: jamaisEvalues + insuffisants > 0 ? "danger" : "ok",
          },
        ];
      },
    },
    {
      id: "evaluations",
      label: "Évaluations annuelles — 9 critères",
      toastLabel: "Évaluation ajoutée",
      emptyLabel:
        "Aucune évaluation. Ajoutez une ligne par campagne annuelle et par sous-traitant.",
      rowLabel: (row) => `${str(row.sous_traitant) || "Sous-traitant"} · ${str(row.annee) || ""}`.trim(),
      columns: [
        {
          id: "sous_traitant",
          type: "text",
          label: "Sous-traitant",
          width: "185px",
          placeholder: "Nom identique à l'onglet Registre",
        },
        { id: "annee", type: "text", label: "Exercice", width: "110px", placeholder: "2026" },
        { id: "date", type: "date", label: "Évalué le", width: "130px" },
        { id: "evaluateur", type: "text", label: "Par", width: "150px" },
        ...CRITERES_EVAL.map((c) => ({
          id: c.id,
          type: "select" as const,
          label: c.label,
          options: NOTE_OPTIONS,
          width: "175px",
        })),
        {
          id: "moyenne",
          type: "computed",
          label: "Moyenne",
          width: "165px",
          compute: ({ row }) => {
            const m = moyenne(row);
            if (m === null) return pending("Aucun critère noté");
            const notes = CRITERES_EVAL.filter(
              (c) => has(row[c.id]) && str(row[c.id]) !== "na",
            ).length;
            const txt = `${m.toFixed(2).replace(".", ",")}/4 · ${notes} crit.`;
            if (m < 2) return danger(txt);
            if (m < 2.5) return warn(txt);
            if (m >= 3.5) return ok(txt);
            return ok(txt);
          },
        },
        { id: "points_forts", type: "textarea", label: "Points forts" },
        { id: "axes_progres", type: "textarea", label: "Axes de progrès" },
        { id: "suite", type: "select", label: "Décision", options: SUITE_OPTIONS, width: "215px" },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "220px",
          compute: ({ row, tables }) => {
            const m = moyenne(row);
            const notes = CRITERES_EVAL.filter(
              (c) => has(row[c.id]) && str(row[c.id]) !== "na",
            ).length;
            return firstMatch([
              [!has(row.sous_traitant), pending("Sous-traitant à saisir")],
              [
                lookupAll(tables.sous_traitants, "nom", row.sous_traitant).length === 0,
                warn("Absent du registre"),
              ],
              [m === null, pending("Critères à noter")],
              [
                m !== null && m < 2 && !has(row.axes_progres),
                danger("Insuffisant sans axe de progrès"),
              ],
              [m !== null && m < 2 && !has(row.suite), danger("Insuffisant sans décision")],
              [m !== null && m < 2, danger("Évaluation insuffisante")],
              [!has(row.date), warn("Évaluation non datée")],
              [notes < 5, warn(`${notes} critère(s) noté(s) seulement`)],
              [!has(row.suite), warn("Décision non tracée")],
              [str(row.suite) === "non_reconduit", warn("Non reconduit")],
            ], ok("Évaluation complète"));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const notees = rows.filter((r) => moyenne(r) !== null);
        const moyGlobale = notees.length
          ? sum(notees, (r) => moyenne(r) ?? 0) / notees.length
          : 0;
        const insuffisants = count(rows, (r) => (moyenne(r) ?? 4) < 2);
        const plansProgres = count(rows, (r) => str(r.suite) === "plan_progres");
        const nonReconduits = count(rows, (r) => str(r.suite) === "non_reconduit");
        return [
          { label: "Évaluations réalisées", value: String(rows.length) },
          {
            label: "Moyenne globale",
            value: notees.length ? `${moyGlobale.toFixed(2).replace(".", ",")}/4` : "—",
            tone: notees.length ? toneFromRate((moyGlobale / 4) * 100, 75, 60) : "neutral",
          },
          {
            label: "Évaluations insuffisantes",
            value: `${insuffisants} · ${pct(insuffisants, rows.length)}`,
            tone: insuffisants > 0 ? "danger" : "ok",
          },
          {
            label: "Plans de progrès / non reconduits",
            value: `${plansProgres} / ${nonReconduits}`,
          },
        ];
      },
    },
  ],
  controls: (tables) => {
    const registre = tables.sous_traitants ?? [];
    const evaluations = tables.evaluations ?? [];
    const alerts = [];

    const conventionsKo = count(
      registre,
      (r) =>
        has(r.nom) &&
        (str(r.convention) === "non" ||
          !has(r.convention) ||
          (daysUntil(r.date_fin_convention) ?? 1) < 0),
    );
    if (conventionsKo > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Sous-traitants sans convention en vigueur.",
        count: conventionsKo,
      });
    }

    const certifKo = count(
      registre,
      (r) => has(r.nom) && certificationKo(r.certification),
    );
    if (certifKo > 0) {
      alerts.push({
        tone: "danger" as const,
        message:
          "Sous-traitants ni certifiés Qualiopi ni dispensés : la sous-traitance d'une action financée est irrégulière.",
        count: certifKo,
      });
    }

    const assuranceKo = count(
      registre,
      (r) => has(r.nom) && (!has(r.assurance) || (daysUntil(r.assurance) ?? 1) < 0),
    );
    if (assuranceKo > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Sous-traitants sans attestation d'assurance RC professionnelle valide.",
        count: assuranceKo,
      });
    }

    const jamaisEvalues = count(
      registre,
      (r) => has(r.nom) && evaluationsDe(r, tables).length === 0,
    );
    if (jamaisEvalues > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Sous-traitants jamais évalués : l'indicateur 27 exige un suivi de la qualité.",
        count: jamaisEvalues,
      });
    }

    const insuffisantsSansSuite = count(evaluations, (r) => {
      const m = moyenne(r);
      return m !== null && m < 2 && (!has(r.suite) || !has(r.axes_progres));
    });
    if (insuffisantsSansSuite > 0) {
      alerts.push({
        tone: "danger" as const,
        message:
          "Évaluations insuffisantes sans axe de progrès ni décision : le constat reste sans effet.",
        count: insuffisantsSansSuite,
      });
    }

    const evalsObsoletes = count(registre, (r) => {
      const last = derniereEval(r, tables);
      if (!last) return false;
      const age = daysSince(last.date);
      return age !== null && age > 365;
    });
    if (evalsObsoletes > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Sous-traitants dont la dernière évaluation date de plus d'un an.",
        count: evalsObsoletes,
      });
    }

    const conventionsProches = count(registre, (r) => {
      const d = daysUntil(r.date_fin_convention);
      return d !== null && d >= 0 && d <= 60;
    });
    if (conventionsProches > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Conventions arrivant à échéance dans les 2 mois.",
        count: conventionsProches,
      });
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M34b. Le lien entre les deux onglets se fait sur le nom du sous-traitant : la dernière note remonte alors automatiquement dans le registre.",
    sections: [
      {
        title: "Certification du sous-traitant",
        content:
          "Un sous-traitant qui réalise une action financée doit être certifié Qualiopi, sauf cas de dispense (formateur indépendant sans NDA propre intervenant sous votre responsabilité). Dans ce cas, l'attestation M41a doit être jointe.",
      },
      {
        title: "Les neuf critères",
        content:
          "Notés de 1 à 4, ou « sans objet » lorsque le critère ne s'applique pas. La moyenne ne porte que sur les critères effectivement notés. En dessous de 2, un axe de progrès et une décision sont exigés.",
      },
    ],
  },
};
