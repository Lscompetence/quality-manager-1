import type { MiniAppSchema, Row } from "../schema-types";
import {
  count,
  danger,
  daysUntil,
  firstMatch,
  has,
  lookup,
  lookupAll,
  ok,
  pct,
  pending,
  str,
  toneFromRate,
  warn,
} from "../helpers";

// M29b — Planning des épreuves + matrice nominative bénéficiaire × bloc.
// Alerte sur les blocs non évalués avant la session de jury.

const RESULTAT_BLOC_OPTIONS = [
  { value: "valide", label: "✓ Validé" },
  { value: "non_valide", label: "✗ Non validé" },
  { value: "rattrapage", label: "🔄 Rattrapage programmé" },
  { value: "absent", label: "⊘ Absent" },
  { value: "non_evalue", label: "⏳ Non encore évalué" },
];

const STATUT_EPREUVE_OPTIONS = [
  { value: "programmee", label: "📅 Programmée" },
  { value: "realisee", label: "✓ Réalisée" },
  { value: "reportee", label: "🔄 Reportée" },
  { value: "annulee", label: "✗ Annulée" },
];

const estValide = (r: Row) => str(r.resultat) === "valide";
const estEvalue = (r: Row) =>
  has(r.resultat) && str(r.resultat) !== "non_evalue";

export const evaluationsBlocsSchema: MiniAppSchema = {
  key: "evaluations-blocs",
  name: "Suivi des évaluations par bloc de compétences",
  shortName: "Évaluations par bloc",
  description:
    "Planning des épreuves et matrice nominative bénéficiaire × bloc. Signale les blocs non évalués avant la session de jury et calcule le taux de validation bloc par bloc.",
  indicators: ["I11", "I16"],
  critere: 3,
  docRef: "M29b",
  categories: ["AF", "VAE", "CFA"],
  tabs: [
    { id: "jury", label: "Sessions de jury", tableIds: ["jury"] },
    { id: "planning", label: "Planning des épreuves", tableIds: ["planning"] },
    { id: "suivi", label: "Suivi nominatif par bloc", tableIds: ["suivi"] },
  ],
  tables: [
    {
      id: "jury",
      label: "Sessions de jury",
      toastLabel: "Session ajoutée",
      emptyLabel:
        "Ajoutez la ou les sessions de jury : c'est la date butoir contre laquelle les blocs sont contrôlés.",
      rowLabel: (row) => str(row.session) || "Session de jury",
      columns: [
        { id: "session", type: "text", label: "Session / promotion" },
        { id: "certification", type: "text", label: "Certification", width: "200px" },
        { id: "date_jury", type: "date", label: "Date du jury", width: "140px" },
        { id: "lieu", type: "text", label: "Lieu", width: "160px" },
        {
          id: "etat",
          type: "computed",
          label: "Blocs prêts pour le jury",
          width: "215px",
          compute: ({ row, tables }) => {
            const d = daysUntil(row.date_jury);
            const lignes = lookupAll(tables.suivi, "session", row.session);
            if (lignes.length === 0) return pending("Aucun suivi rattaché");
            const nonEvalues = lignes.filter((r) => !estEvalue(r)).length;
            if (nonEvalues === 0) return ok(`${lignes.length} lignes évaluées`);
            if (d === null) return warn(`${nonEvalues} bloc(s) non évalué(s)`);
            if (d < 0) return danger(`Jury passé · ${nonEvalues} non évalué(s)`);
            if (d <= 30) return danger(`J-${d} · ${nonEvalues} non évalué(s)`);
            return warn(`J-${d} · ${nonEvalues} non évalué(s)`);
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
    {
      id: "planning",
      label: "Planning des épreuves",
      toastLabel: "Épreuve programmée",
      emptyLabel: "Aucune épreuve programmée.",
      rowLabel: (row) => `${str(row.bloc) || "Bloc"} · ${str(row.intitule) || "épreuve"}`,
      columns: [
        { id: "session", type: "text", label: "Session", width: "160px" },
        { id: "bloc", type: "text", label: "Bloc", width: "130px" },
        { id: "intitule", type: "textarea", label: "Intitulé de l'épreuve" },
        { id: "date_epreuve", type: "date", label: "Date", width: "130px" },
        { id: "duree", type: "text", label: "Durée", width: "100px", placeholder: "2 h" },
        { id: "evaluateurs", type: "text", label: "Évaluateurs", width: "175px" },
        {
          id: "statut",
          type: "select",
          label: "Statut",
          options: STATUT_EPREUVE_OPTIONS,
          width: "165px",
        },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "195px",
          compute: ({ row, tables }) => {
            const jury = lookup(tables.jury, "session", row.session);
            const dEpreuve = row.date_epreuve;
            return firstMatch([
              [!has(row.bloc), pending("Bloc à saisir")],
              [!has(row.date_epreuve), danger("Épreuve non datée")],
              [!has(row.evaluateurs), warn("Évaluateurs non désignés")],
              [str(row.statut) === "annulee", danger("Épreuve annulée")],
              [
                Boolean(jury) && (daysUntil(dEpreuve) ?? 0) > (daysUntil(jury?.date_jury) ?? 0),
                danger("Programmée après le jury"),
              ],
              [str(row.statut) === "reportee", warn("Reportée — reprogrammer")],
              [str(row.statut) === "realisee", ok("Réalisée")],
            ], ok("Programmée"));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => [
        { label: "Épreuves programmées", value: String(rows.length) },
        {
          label: "Réalisées",
          value: String(count(rows, (r) => str(r.statut) === "realisee")),
          tone: "ok",
        },
        {
          label: "Reportées / annulées",
          value: String(
            count(rows, (r) => ["reportee", "annulee"].includes(str(r.statut))),
          ),
          tone: count(rows, (r) => ["reportee", "annulee"].includes(str(r.statut))) > 0
            ? "warn"
            : "ok",
        },
        {
          label: "Sans évaluateur désigné",
          value: String(count(rows, (r) => has(r.bloc) && !has(r.evaluateurs))),
          tone: count(rows, (r) => has(r.bloc) && !has(r.evaluateurs)) > 0 ? "warn" : "ok",
        },
      ],
    },
    {
      id: "suivi",
      label: "Suivi nominatif par bloc",
      toastLabel: "Ligne de suivi ajoutée",
      emptyLabel:
        "Aucun suivi. Ajoutez une ligne par couple bénéficiaire × bloc de compétences.",
      rowLabel: (row) =>
        `${str(row.beneficiaire) || "Bénéficiaire"} · ${str(row.bloc) || "bloc"}`,
      columns: [
        { id: "beneficiaire", type: "text", label: "Bénéficiaire", width: "175px" },
        {
          id: "session",
          type: "text",
          label: "Session",
          width: "160px",
          placeholder: "Libellé identique à l'onglet Jury",
        },
        { id: "bloc", type: "text", label: "Bloc", width: "130px" },
        { id: "date_evaluation", type: "date", label: "Évalué le", width: "135px" },
        {
          id: "resultat",
          type: "select",
          label: "Résultat",
          options: RESULTAT_BLOC_OPTIONS,
          width: "195px",
        },
        { id: "note", type: "text", label: "Note / mention", width: "125px" },
        { id: "observations", type: "textarea", label: "Observations" },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "210px",
          compute: ({ row, tables }) => {
            const jury = lookup(tables.jury, "session", row.session);
            const dJury = jury ? daysUntil(jury.date_jury) : null;
            return firstMatch([
              [!has(row.beneficiaire) || !has(row.bloc), pending("Bénéficiaire / bloc à saisir")],
              [
                !estEvalue(row) && dJury !== null && dJury < 0,
                danger("Non évalué — jury passé"),
              ],
              [
                !estEvalue(row) && dJury !== null && dJury <= 30,
                danger(`Non évalué — jury dans ${dJury} j`),
              ],
              [!estEvalue(row), warn("Non encore évalué")],
              [str(row.resultat) === "absent", danger("Absent — à reprogrammer")],
              [
                str(row.resultat) === "non_valide" && !has(row.observations),
                danger("Non validé sans motivation"),
              ],
              [str(row.resultat) === "non_valide", warn("Non validé")],
              [str(row.resultat) === "rattrapage", warn("Rattrapage à programmer")],
              [!has(row.date_evaluation), warn("Date d'évaluation manquante")],
            ], ok("Bloc validé"));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const evalues = rows.filter(estEvalue);
        const valides = count(rows, estValide);
        const taux = evalues.length ? (valides / evalues.length) * 100 : 0;
        const blocs = new Set(rows.map((r) => str(r.bloc)).filter(Boolean));
        const beneficiaires = new Set(
          rows.map((r) => str(r.beneficiaire)).filter(Boolean),
        );
        const nonEvalues = rows.length - evalues.length;

        // Bloc au taux de validation le plus faible
        let pire: { bloc: string; taux: number } | null = null;
        for (const b of blocs) {
          const lignes = rows.filter((r) => str(r.bloc) === b && estEvalue(r));
          if (lignes.length === 0) continue;
          const t = (lignes.filter(estValide).length / lignes.length) * 100;
          if (!pire || t < pire.taux) pire = { bloc: b, taux: t };
        }

        return [
          {
            label: "Candidats × blocs",
            value: `${beneficiaires.size} × ${blocs.size}`,
            hint: `${rows.length} ligne(s) de suivi`,
          },
          {
            label: "Taux de validation",
            value: evalues.length ? pct(valides, evalues.length, 1) : "—",
            tone: evalues.length ? toneFromRate(taux, 85, 70) : "neutral",
          },
          {
            label: "Non encore évalués",
            value: String(nonEvalues),
            tone: nonEvalues > 0 ? "warn" : "ok",
          },
          {
            label: "Bloc le plus fragile",
            value: pire ? `${pire.bloc} · ${pire.taux.toFixed(0)} %` : "—",
            tone: pire && pire.taux < 70 ? "danger" : pire && pire.taux < 85 ? "warn" : "ok",
          },
        ];
      },
    },
  ],
  controls: (tables) => {
    const suivi = tables.suivi ?? [];
    const jurys = tables.jury ?? [];
    const planning = tables.planning ?? [];
    const alerts = [];

    for (const j of jurys) {
      const d = daysUntil(j.date_jury);
      const lignes = lookupAll(suivi, "session", j.session);
      const nonEvalues = lignes.filter((r) => !estEvalue(r)).length;
      if (nonEvalues === 0 || lignes.length === 0) continue;
      const nom = str(j.session) || "session";
      if (d !== null && d < 0) {
        alerts.push({
          tone: "danger" as const,
          message: `Jury « ${nom} » déjà passé : des blocs restent non évalués.`,
          count: nonEvalues,
        });
      } else if (d !== null && d <= 30) {
        alerts.push({
          tone: "danger" as const,
          message: `Jury « ${nom} » dans ${d} jours : blocs encore non évalués.`,
          count: nonEvalues,
        });
      } else {
        alerts.push({
          tone: "warn" as const,
          message: `Blocs non encore évalués pour la session « ${nom} ».`,
          count: nonEvalues,
        });
      }
    }

    const absents = count(suivi, (r) => str(r.resultat) === "absent");
    if (absents > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Candidats absents à une épreuve : une session de rattrapage doit être tracée.",
        count: absents,
      });
    }

    const nonValidesSansMotif = count(
      suivi,
      (r) => str(r.resultat) === "non_valide" && !has(r.observations),
    );
    if (nonValidesSansMotif > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Blocs non validés sans observation motivant la décision.",
        count: nonValidesSansMotif,
      });
    }

    const rattrapages = count(suivi, (r) => str(r.resultat) === "rattrapage");
    if (rattrapages > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Rattrapages annoncés : vérifier qu'ils sont programmés dans le planning.",
        count: rattrapages,
      });
    }

    const epreuvesSansEvaluateur = count(
      planning,
      (r) => has(r.bloc) && !has(r.evaluateurs),
    );
    if (epreuvesSansEvaluateur > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Épreuves programmées sans évaluateur désigné.",
        count: epreuvesSansEvaluateur,
      });
    }

    if (suivi.length > 0 && jurys.length === 0) {
      alerts.push({
        tone: "warn" as const,
        message:
          "Aucune session de jury renseignée : le contrôle « blocs non évalués avant jury » ne peut pas s'appliquer.",
      });
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M29b. Les trois onglets se lient par le libellé de session : reprenez-le à l'identique pour que les contrôles fonctionnent.",
    sections: [
      {
        title: "Le contrôle qui compte",
        content:
          "Un bloc non évalué au moment du jury bloque la délivrance de la certification pour ce candidat. L'alerte se durcit à 30 jours du jury, puis passe en rouge une fois la date dépassée.",
      },
    ],
  },
};
