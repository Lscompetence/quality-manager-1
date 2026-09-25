import type { MiniAppSchema, Row } from "../schema-types";
import {
  count,
  danger,
  daysUntil,
  firstMatch,
  fmtDate,
  has,
  lookupAll,
  ok,
  pct,
  pending,
  str,
  warn,
} from "../helpers";

// M18a — Matrice de correspondance référentiel de certification × contenu de la
// prestation, bloc par bloc, avec les transversales et l'alignement des évaluations.

const COUVERTURE_OPTIONS = [
  { value: "totale", label: "✓ Totale" },
  { value: "partielle", label: "◐ Partielle" },
  { value: "non", label: "✗ Non couverte" },
];

const TYPE_CERTIF_OPTIONS = [
  { value: "rncp", label: "🎓 RNCP" },
  { value: "rs", label: "📜 Répertoire spécifique" },
];

const HABILITATION_OPTIONS = [
  { value: "certificateur", label: "🏛 Certificateur direct" },
  { value: "habilite_former", label: "✍️ Habilité à former" },
  { value: "habilite_former_evaluer", label: "✍️ Habilité former + évaluer" },
  { value: "partenaire", label: "🤝 Partenaire / co-traitance" },
];

const MOMENT_OPTIONS = [
  { value: "cours_formation", label: "⏳ En cours de formation" },
  { value: "fin_module", label: "🏁 Fin de module" },
  { value: "epreuve_finale", label: "🎯 Épreuve finale" },
  { value: "jury", label: "⚖️ Devant jury" },
];

/** Une compétence est évaluée si au moins une ligne d'évaluation la référence. */
const estEvaluee = (row: Row, evaluations: Row[] | undefined) =>
  lookupAll(evaluations, "competence", row.competence).length > 0;

export const adequationCertificationSchema: MiniAppSchema = {
  key: "adequation-certification",
  name: "Matrice d'adéquation à la certification",
  shortName: "Adéquation certification",
  description:
    "Démontre bloc par bloc que le contenu de la prestation couvre le référentiel de la certification visée, que les compétences transversales sont traitées, et que chaque compétence est effectivement évaluée.",
  indicators: ["I7"],
  critere: 2,
  docRef: "M18a",
  categories: ["AF", "VAE", "CFA"],
  tabs: [
    { id: "certification", label: "Fiche certification", tableIds: ["certification"] },
    { id: "matrice", label: "Matrice de couverture", tableIds: ["matrice"] },
    { id: "transversales", label: "Transversales", tableIds: ["transversales"] },
    { id: "evaluations", label: "Alignement évaluations", tableIds: ["evaluations"] },
  ],
  tables: [
    {
      id: "certification",
      label: "Certification visée",
      toastLabel: "Certification ajoutée",
      emptyLabel: "Aucune certification. Ajoutez la ou les certifications préparées.",
      rowLabel: (row) => str(row.intitule) || "Certification",
      columns: [
        { id: "intitule", type: "text", label: "Intitulé exact" },
        { id: "type", type: "select", label: "Type", options: TYPE_CERTIF_OPTIONS, width: "175px" },
        { id: "code", type: "text", label: "Code fiche", width: "125px", placeholder: "RNCP…" },
        { id: "niveau", type: "text", label: "Niveau", width: "95px" },
        { id: "certificateur", type: "text", label: "Certificateur", width: "180px" },
        {
          id: "habilitation",
          type: "select",
          label: "Notre position",
          options: HABILITATION_OPTIONS,
          width: "215px",
        },
        { id: "date_enregistrement", type: "date", label: "Enregistrée le", width: "135px" },
        { id: "date_echeance", type: "date", label: "Échéance", width: "135px" },
        {
          id: "statut",
          type: "computed",
          label: "Statut enregistrement",
          width: "190px",
          compute: ({ row }) => {
            const d = daysUntil(row.date_echeance);
            if (d === null) return pending("Échéance à saisir");
            if (d < 0) return danger(`Expirée le ${fmtDate(row.date_echeance)}`);
            if (d <= 180) return danger(`Échéance dans ${d} j — agir`);
            if (d <= 365) return warn(`Échéance dans ${d} j`);
            return ok(`Valide · ${Math.floor(d / 30)} mois`);
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const expirees = count(rows, (r) => (daysUntil(r.date_echeance) ?? 1) < 0);
        const proches = count(rows, (r) => {
          const d = daysUntil(r.date_echeance);
          return d !== null && d >= 0 && d <= 365;
        });
        return [
          { label: "Certifications suivies", value: String(rows.length) },
          {
            label: "Échéance < 12 mois",
            value: String(proches),
            tone: proches > 0 ? "warn" : "ok",
          },
          {
            label: "Expirées",
            value: String(expirees),
            tone: expirees > 0 ? "danger" : "ok",
          },
          {
            label: "Sans habilitation tracée",
            value: String(count(rows, (r) => !has(r.habilitation))),
            tone: count(rows, (r) => !has(r.habilitation)) > 0 ? "warn" : "ok",
          },
        ];
      },
    },
    {
      id: "matrice",
      label: "Matrice de couverture bloc × contenu",
      toastLabel: "Compétence ajoutée",
      emptyLabel:
        "Aucune ligne. Reprenez le référentiel de la certification, bloc par bloc et compétence par compétence.",
      rowLabel: (row) => `${str(row.bloc) || "Bloc"} · ${str(row.competence) || "Compétence"}`,
      columns: [
        { id: "bloc", type: "text", label: "Bloc", width: "130px" },
        { id: "competence", type: "textarea", label: "Compétence du référentiel" },
        { id: "contenu", type: "textarea", label: "Contenu / séquence qui la couvre" },
        {
          id: "couverture",
          type: "select",
          label: "Couverture",
          options: COUVERTURE_OPTIONS,
          width: "145px",
        },
        { id: "volume", type: "text", label: "Volume", width: "100px", placeholder: "7 h" },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "180px",
          compute: ({ row, tables }) =>
            firstMatch([
              [!has(row.competence), pending("Compétence à saisir")],
              [!has(row.couverture), pending("Couverture à qualifier")],
              [str(row.couverture) === "non", danger("Non couverte par l'offre")],
              [!has(row.contenu), danger("Aucun contenu rattaché")],
              [!estEvaluee(row, tables.evaluations), danger("Aucune évaluation")],
              [str(row.couverture) === "partielle", warn("Partielle — à renforcer")],
            ], ok("Couverte et évaluée")),
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows, tables }) => {
        const qualifiees = rows.filter((r) => has(r.couverture));
        const totales = count(rows, (r) => str(r.couverture) === "totale");
        const nonEvaluees = count(
          rows,
          (r) => has(r.competence) && !estEvaluee(r, tables.evaluations),
        );
        const blocs = new Set(rows.map((r) => str(r.bloc)).filter(Boolean)).size;
        return [
          { label: "Blocs couverts", value: String(blocs) },
          { label: "Compétences tracées", value: String(rows.length) },
          {
            label: "Couverture totale",
            value: pct(totales, qualifiees.length),
            tone: totales === qualifiees.length && qualifiees.length > 0 ? "ok" : "warn",
          },
          {
            label: "Sans évaluation",
            value: String(nonEvaluees),
            tone: nonEvaluees > 0 ? "danger" : "ok",
          },
        ];
      },
    },
    {
      id: "transversales",
      label: "Compétences transversales",
      toastLabel: "Transversale ajoutée",
      emptyLabel:
        "Aucune transversale. Ajoutez les compétences transverses exigées par la fiche (numérique, communication, RSE…).",
      rowLabel: (row) => str(row.competence) || "Compétence transversale",
      columns: [
        { id: "competence", type: "textarea", label: "Compétence transversale" },
        { id: "integration", type: "textarea", label: "Comment elle est intégrée au parcours" },
        { id: "sequences", type: "text", label: "Séquences concernées", width: "180px" },
        { id: "preuve", type: "textarea", label: "Preuve mobilisable" },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "165px",
          compute: ({ row }) =>
            firstMatch([
              [!has(row.competence), pending("À saisir")],
              [!has(row.integration), danger("Intégration non décrite")],
              [!has(row.preuve), warn("Sans preuve identifiée")],
            ], ok("Intégrée et sourcée")),
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
    {
      id: "evaluations",
      label: "Alignement des évaluations",
      toastLabel: "Évaluation ajoutée",
      emptyLabel:
        "Aucune évaluation. Chaque compétence de la matrice doit être reliée à au moins une modalité d'évaluation.",
      rowLabel: (row) => str(row.competence) || "Évaluation",
      columns: [
        { id: "bloc", type: "text", label: "Bloc", width: "130px" },
        { id: "competence", type: "textarea", label: "Compétence évaluée" },
        { id: "modalite", type: "textarea", label: "Modalité d'évaluation" },
        { id: "moment", type: "select", label: "Moment", options: MOMENT_OPTIONS, width: "185px" },
        { id: "criteres", type: "textarea", label: "Critères et seuil de réussite" },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "175px",
          compute: ({ row, tables }) =>
            firstMatch([
              [!has(row.competence), pending("Compétence à saisir")],
              [!has(row.modalite), danger("Modalité non décrite")],
              [!has(row.criteres), warn("Critères de réussite absents")],
              [
                lookupAll(tables.matrice, "competence", row.competence).length === 0,
                warn("Compétence absente de la matrice"),
              ],
            ], ok("Évaluation alignée")),
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
  ],
  controls: (tables) => {
    const certifs = tables.certification ?? [];
    const matrice = tables.matrice ?? [];
    const evaluations = tables.evaluations ?? [];
    const transversales = tables.transversales ?? [];
    const alerts = [];

    const expirees = certifs.filter((r) => (daysUntil(r.date_echeance) ?? 1) < 0);
    if (expirees.length > 0) {
      alerts.push({
        tone: "danger" as const,
        message:
          "Certification(s) dont l'enregistrement est expiré : la prestation ne peut plus être présentée comme certifiante.",
        count: expirees.length,
      });
    }

    const bientot = certifs.filter((r) => {
      const d = daysUntil(r.date_echeance);
      return d !== null && d >= 0 && d <= 180;
    });
    if (bientot.length > 0) {
      alerts.push({
        tone: "danger" as const,
        message:
          "Échéance d'enregistrement à moins de 6 mois : instruire le renouvellement auprès du certificateur.",
        count: bientot.length,
      });
    }

    const dansUnAn = certifs.filter((r) => {
      const d = daysUntil(r.date_echeance);
      return d !== null && d > 180 && d <= 365;
    });
    if (dansUnAn.length > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Échéance d'enregistrement à moins de 12 mois : mettre le sujet en veille active.",
        count: dansUnAn.length,
      });
    }

    const sansEval = matrice.filter(
      (r) => has(r.competence) && !estEvaluee(r, evaluations),
    );
    if (sansEval.length > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Compétences du référentiel sans modalité d'évaluation rattachée.",
        count: sansEval.length,
      });
    }

    const nonCouvertes = count(matrice, (r) => str(r.couverture) === "non");
    if (nonCouvertes > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Compétences du référentiel non couvertes par le contenu de la prestation.",
        count: nonCouvertes,
      });
    }

    const partielles = count(matrice, (r) => str(r.couverture) === "partielle");
    if (partielles > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Compétences couvertes partiellement : préciser le renforcement prévu.",
        count: partielles,
      });
    }

    const transvSansIntegration = count(
      transversales,
      (r) => has(r.competence) && !has(r.integration),
    );
    if (transvSansIntegration > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Compétences transversales dont l'intégration au parcours n'est pas décrite.",
        count: transvSansIntegration,
      });
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M18a. Le lien entre la matrice et l'onglet Évaluations se fait sur le libellé exact de la compétence — reprenez-le à l'identique d'un onglet à l'autre.",
    sections: [
      {
        title: "Échéance d'enregistrement",
        content:
          "L'alerte se déclenche à 12 mois puis à 6 mois. Passé l'échéance sans renouvellement, la mention de la certification dans vos supports commerciaux devient un écart sur l'indicateur 3.",
      },
    ],
  },
};
