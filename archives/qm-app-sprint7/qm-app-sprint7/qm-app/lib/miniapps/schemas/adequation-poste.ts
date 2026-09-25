import type { MiniAppSchema } from "../schema-types";
import {
  count,
  danger,
  firstMatch,
  has,
  lookupAll,
  ok,
  pct,
  pending,
  str,
  sum,
  toneFromRate,
  warn,
} from "../helpers";

// M12b — Adéquation du poste occupé en entreprise au référentiel du diplôme.
// Le classeur pondère : couverte = 1 pt, partielle = 0,5 pt, non couverte = 0.

const COUVERTURE_OPTIONS = [
  { value: "couverte", label: "✓ Couverte" },
  { value: "partielle", label: "◐ Partielle" },
  { value: "non", label: "✗ Non couverte" },
];

const LEVIER_OPTIONS = [
  { value: "tp_centre", label: "🔧 TP / plateau technique au centre" },
  { value: "module", label: "📚 Module complémentaire" },
  { value: "mission", label: "🏭 Mission ajoutée en entreprise" },
  { value: "tutorat", label: "👤 Tutorat renforcé" },
  { value: "periode", label: "🔄 Période chez un autre service" },
];

const STATUT_COMP_OPTIONS = [
  { value: "planifie", label: "📅 Planifié" },
  { value: "en_cours", label: "⏳ En cours" },
  { value: "realise", label: "✓ Réalisé" },
];

const POIDS: Record<string, number> = { couverte: 1, partielle: 0.5, non: 0 };

const poidsDe = (row: Record<string, unknown>) => POIDS[str(row.couverture)] ?? 0;
const evalue = (row: Record<string, unknown>) => has(row.couverture);

export const adequationPosteSchema: MiniAppSchema = {
  key: "adequation-poste",
  name: "Adéquation poste / référentiel",
  shortName: "Adéquation poste",
  description:
    "Croise chaque compétence du référentiel du diplôme avec les activités réellement confiées à l'apprenti en entreprise, et calcule un taux de couverture pondéré. Les compétences non couvertes basculent vers un plan de compensation.",
  indicators: ["I4", "I13"],
  critere: 2,
  docRef: "M12b",
  categories: ["CFA"],
  tabs: [
    { id: "grille", label: "Grille d'adéquation", tableIds: ["grille"] },
    { id: "compensation", label: "Plan de compensation", tableIds: ["compensation"] },
  ],
  tables: [
    {
      id: "grille",
      label: "Grille d'adéquation compétence × poste",
      toastLabel: "Compétence ajoutée",
      emptyLabel:
        "Aucune compétence. Ajoutez les compétences du référentiel, puis qualifiez leur couverture par le poste.",
      rowLabel: (row) => `${str(row.apprenti) || "Apprenti"} · ${str(row.competence) || "Compétence"}`,
      columns: [
        { id: "apprenti", type: "text", label: "Apprenti", width: "150px" },
        { id: "bloc", type: "text", label: "Bloc", width: "110px", placeholder: "RNCP…" },
        { id: "competence", type: "textarea", label: "Compétence du référentiel" },
        {
          id: "couverture",
          type: "select",
          label: "Couverture",
          options: COUVERTURE_OPTIONS,
          width: "145px",
        },
        { id: "activite", type: "textarea", label: "Activité réelle en entreprise" },
        {
          id: "lecture",
          type: "computed",
          label: "Lecture",
          width: "165px",
          compute: ({ row, tables }) => {
            const c = str(row.couverture);
            if (!c) return pending("À qualifier");
            if (c === "couverte") return ok("1 pt · conforme");
            const compensations = lookupAll(
              tables.compensation,
              "competence",
              row.competence,
            ).filter((r) => str(r.apprenti) === str(row.apprenti) || !has(r.apprenti));
            if (compensations.length > 0) {
              const label = c === "partielle" ? "0,5 pt · compensé" : "0 pt · compensé";
              return ok(label);
            }
            return c === "partielle"
              ? warn("0,5 pt · compensation à prévoir")
              : danger("0 pt · compensation requise");
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const evaluees = rows.filter(evalue);
        const points = sum(evaluees, poidsDe);
        const taux = evaluees.length ? (points / evaluees.length) * 100 : 0;
        const nonCouvertes = count(rows, (r) => str(r.couverture) === "non");
        const partielles = count(rows, (r) => str(r.couverture) === "partielle");
        return [
          {
            label: "Taux de couverture pondéré",
            value: pct(points, evaluees.length, 1),
            tone: evaluees.length ? toneFromRate(taux, 80, 60) : "neutral",
            hint: "Couverte 1 pt · Partielle 0,5 pt · Non couverte 0 pt",
          },
          {
            label: "Lecture du poste",
            value: !evaluees.length
              ? "—"
              : taux >= 80
                ? "Couverture solide"
                : taux >= 60
                  ? "Compensation nécessaire"
                  : "Poste à réexaminer",
            tone: evaluees.length ? toneFromRate(taux, 80, 60) : "neutral",
          },
          { label: "Compétences qualifiées", value: `${evaluees.length} / ${rows.length}` },
          {
            label: "Partielles / non couvertes",
            value: `${partielles} / ${nonCouvertes}`,
            tone: nonCouvertes > 0 ? "danger" : partielles > 0 ? "warn" : "ok",
          },
        ];
      },
    },
    {
      id: "compensation",
      label: "Plan de compensation",
      toastLabel: "Action de compensation ajoutée",
      emptyLabel: "Aucune action. Ajoutez une action pour chaque compétence non couverte par le poste.",
      rowLabel: (row) => `${str(row.competence) || "Compétence"} · compensation`,
      columns: [
        { id: "apprenti", type: "text", label: "Apprenti", width: "150px" },
        { id: "competence", type: "textarea", label: "Compétence à compenser" },
        { id: "levier", type: "select", label: "Levier", options: LEVIER_OPTIONS, width: "200px" },
        { id: "modalite", type: "textarea", label: "Modalité concrète" },
        { id: "responsable", type: "text", label: "Responsable", width: "140px" },
        { id: "echeance", type: "date", label: "Échéance", width: "130px" },
        {
          id: "statut",
          type: "select",
          label: "Statut",
          options: STATUT_COMP_OPTIONS,
          width: "130px",
        },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "160px",
          compute: ({ row }) =>
            firstMatch([
              [!has(row.competence), pending("Compétence manquante")],
              [!has(row.levier), danger("Levier non défini")],
              [!has(row.modalite), warn("Modalité non décrite")],
              [str(row.statut) === "realise", ok("Compensation réalisée")],
              [!has(row.responsable), warn("Sans responsable")],
            ], ok("Action cadrée")),
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => [
        { label: "Actions planifiées", value: String(rows.length) },
        {
          label: "Réalisées",
          value: String(count(rows, (r) => str(r.statut) === "realise")),
          tone: "ok",
        },
        {
          label: "Sans levier défini",
          value: String(count(rows, (r) => !has(r.levier))),
          tone: count(rows, (r) => !has(r.levier)) > 0 ? "danger" : "ok",
        },
      ],
    },
  ],
  controls: (tables) => {
    const grille = tables.grille ?? [];
    const compensation = tables.compensation ?? [];
    const alerts = [];

    const evaluees = grille.filter(evalue);
    const orphelines = grille.filter(
      (r) =>
        (str(r.couverture) === "non" || str(r.couverture) === "partielle") &&
        lookupAll(compensation, "competence", r.competence).length === 0,
    );
    if (orphelines.length > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Compétences non ou partiellement couvertes sans action de compensation.",
        count: orphelines.length,
      });
    }

    if (evaluees.length > 0) {
      const taux = (sum(evaluees, poidsDe) / evaluees.length) * 100;
      if (taux < 60) {
        alerts.push({
          tone: "danger" as const,
          message: `Taux de couverture pondéré à ${taux.toFixed(0)} % : le poste est à réexaminer avec l'entreprise.`,
        });
      } else if (taux < 80) {
        alerts.push({
          tone: "warn" as const,
          message: `Taux de couverture pondéré à ${taux.toFixed(0)} % : compensation nécessaire pour sécuriser la certification.`,
        });
      }
    }

    const nonQualifiees = count(grille, (r) => !has(r.couverture));
    if (nonQualifiees > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Compétences du référentiel encore non qualifiées.",
        count: nonQualifiees,
      });
    }

    const sansEcheance = count(
      compensation,
      (r) => has(r.competence) && !has(r.echeance) && str(r.statut) !== "realise",
    );
    if (sansEcheance > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Actions de compensation sans échéance.",
        count: sansEcheance,
      });
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M12b. Qualifiez chaque compétence du référentiel selon ce que le poste permet réellement de travailler ; le taux pondéré et la lecture du poste se calculent seuls.",
    sections: [
      {
        title: "Lecture du taux",
        content:
          "≥ 80 % : couverture solide. 60–80 % : compensation nécessaire. < 60 % : poste à réexaminer avec l'entreprise (avenant, changement de service, mission complémentaire).",
      },
      {
        title: "Ce que regarde l'auditeur",
        content:
          "Que l'analyse existe avant le démarrage, qu'elle soit tracée compétence par compétence, et que les écarts constatés aient donné lieu à une action concrète et datée.",
      },
    ],
  },
};
