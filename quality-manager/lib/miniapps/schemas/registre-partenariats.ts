import type { MiniAppSchema, Row } from "../schema-types";
import {
  count,
  danger,
  daysSince,
  firstMatch,
  fmtDate,
  has,
  latestDate,
  lookupAll,
  ok,
  pct,
  pending,
  str,
  warn,
} from "../helpers";

// M32b — Partenaires sociaux + trace de chaque sollicitation réelle.
// Distingue : actif · dormant (> 1 an) · jamais sollicité.

const TYPE_PARTENAIRE_OPTIONS = [
  { value: "mission_locale", label: "🏛 Mission locale" },
  { value: "assistante_sociale", label: "🤝 Service social" },
  { value: "logement", label: "🏠 Logement / foyer" },
  { value: "mobilite", label: "🚌 Mobilité / transport" },
  { value: "sante", label: "🏥 Santé / psychologue" },
  { value: "handicap", label: "♿ Handicap / Agefiph-Cap emploi" },
  { value: "aide_financiere", label: "💶 Aide financière / fonds social" },
  { value: "restauration", label: "🍽 Restauration / aide alimentaire" },
  { value: "juridique", label: "⚖️ Accompagnement juridique" },
];

const FORMALISATION_OPTIONS = [
  { value: "convention", label: "📄 Convention signée" },
  { value: "accord", label: "🤝 Accord informel" },
  { value: "contact", label: "📇 Simple contact identifié" },
];

const ISSUE_OPTIONS = [
  { value: "resolu", label: "✓ Situation résolue" },
  { value: "en_cours", label: "⏳ Accompagnement en cours" },
  { value: "oriente", label: "↗️ Réorienté vers un autre acteur" },
  { value: "sans_suite", label: "✗ Sans suite" },
];

const sollicitationsDe = (row: Row, tables: Record<string, Row[]>) =>
  lookupAll(tables.sollicitations, "partenaire", row.nom);

/** Trois états du classeur. */
function etatPartenariat(row: Row, tables: Record<string, Row[]>) {
  const s = sollicitationsDe(row, tables);
  if (s.length === 0) return { code: "jamais" as const, age: null };
  const age = daysSince(latestDate(s, "date"));
  if (age === null) return { code: "actif" as const, age: null };
  return { code: age > 365 ? ("dormant" as const) : ("actif" as const), age };
}

export const registrePartenariatsSchema: MiniAppSchema = {
  key: "registre-partenariats",
  name: "Registre des partenariats sociaux",
  shortName: "Partenariats sociaux",
  description:
    "Recense les partenaires mobilisables pour l'accompagnement social des apprentis et trace chaque sollicitation réelle. Un annuaire jamais sollicité n'est pas un partenariat — c'est exactement ce que le registre met en évidence.",
  indicators: ["I14"],
  critere: 3,
  docRef: "M32b",
  categories: ["CFA"],
  tabs: [
    { id: "partenariats", label: "Partenaires", tableIds: ["partenariats"] },
    { id: "sollicitations", label: "Sollicitations", tableIds: ["sollicitations"] },
  ],
  tables: [
    {
      id: "partenariats",
      label: "Partenaires identifiés",
      toastLabel: "Partenaire ajouté",
      emptyLabel: "Aucun partenaire. Ajoutez les acteurs mobilisables sur votre territoire.",
      rowLabel: (row) => str(row.nom) || "Partenaire",
      columns: [
        { id: "nom", type: "text", label: "Partenaire", width: "195px" },
        {
          id: "type",
          type: "select",
          label: "Domaine",
          options: TYPE_PARTENAIRE_OPTIONS,
          width: "230px",
        },
        { id: "referent", type: "text", label: "Interlocuteur", width: "165px" },
        { id: "contact", type: "text", label: "Contact", width: "185px" },
        { id: "territoire", type: "text", label: "Territoire couvert", width: "160px" },
        {
          id: "formalisation",
          type: "select",
          label: "Formalisation",
          options: FORMALISATION_OPTIONS,
          width: "205px",
        },
        {
          id: "activite",
          type: "computed",
          label: "Activité",
          width: "195px",
          compute: ({ row, tables }) => {
            if (!has(row.nom)) return pending("Partenaire à saisir");
            const e = etatPartenariat(row, tables);
            const n = sollicitationsDe(row, tables).length;
            if (e.code === "jamais") return danger("Jamais sollicité");
            if (e.code === "dormant")
              return warn(`Dormant · ${Math.floor((e.age ?? 0) / 30)} mois`);
            return ok(`Actif · ${n} sollicitation${n > 1 ? "s" : ""}`);
          },
        },
        {
          id: "derniere",
          type: "computed",
          label: "Dernière sollicitation",
          width: "180px",
          compute: ({ row, tables }) => {
            const s = sollicitationsDe(row, tables);
            if (s.length === 0) return danger("—");
            const last = latestDate(s, "date");
            const age = daysSince(last);
            if (age === null) return pending("Date illisible");
            if (age > 365) return warn(fmtDate(last));
            return ok(fmtDate(last));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows, tables }) => {
        const jamais = count(rows, (r) => etatPartenariat(r, tables).code === "jamais");
        const dormants = count(rows, (r) => etatPartenariat(r, tables).code === "dormant");
        const actifs = count(rows, (r) => etatPartenariat(r, tables).code === "actif");
        const domaines = new Set(rows.map((r) => str(r.type)).filter(Boolean)).size;
        const conventions = count(rows, (r) => str(r.formalisation) === "convention");
        return [
          {
            label: "Partenaires · domaines",
            value: `${rows.length} · ${domaines}`,
          },
          {
            label: "Actifs",
            value: `${actifs} · ${pct(actifs, rows.length)}`,
            tone: actifs > 0 ? "ok" : "danger",
          },
          {
            label: "Dormants (> 1 an)",
            value: String(dormants),
            tone: dormants > 0 ? "warn" : "ok",
          },
          {
            label: "Jamais sollicités",
            value: String(jamais),
            tone: jamais > 0 ? "danger" : "ok",
          },
          {
            label: "Conventions signées",
            value: String(conventions),
            tone: conventions > 0 ? "ok" : "warn",
          },
        ];
      },
    },
    {
      id: "sollicitations",
      label: "Sollicitations réelles",
      toastLabel: "Sollicitation tracée",
      emptyLabel:
        "Aucune sollicitation. C'est cet onglet qui transforme un annuaire en partenariat démontrable.",
      rowLabel: (row) =>
        `${fmtDate(row.date)} · ${str(row.partenaire) || "Sollicitation"}`,
      columns: [
        { id: "date", type: "date", label: "Date", width: "125px" },
        {
          id: "partenaire",
          type: "text",
          label: "Partenaire sollicité",
          width: "195px",
          placeholder: "Nom identique à l'onglet Partenaires",
        },
        { id: "apprenti", type: "text", label: "Apprenti concerné", width: "170px" },
        { id: "motif", type: "textarea", label: "Motif / frein identifié" },
        { id: "demande", type: "textarea", label: "Demande formulée" },
        { id: "reponse", type: "textarea", label: "Réponse du partenaire" },
        { id: "issue", type: "select", label: "Issue", options: ISSUE_OPTIONS, width: "215px" },
        { id: "date_issue", type: "date", label: "Clôturée le", width: "140px" },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "195px",
          compute: ({ row, tables }) => {
            const age = daysSince(row.date);
            return firstMatch([
              [!has(row.date), pending("Date à saisir")],
              [!has(row.partenaire), warn("Partenaire non rattaché")],
              [
                has(row.partenaire) &&
                  lookupAll(tables.partenariats, "nom", row.partenaire).length === 0,
                warn("Partenaire absent de l'annuaire"),
              ],
              [!has(row.motif), danger("Motif non consigné")],
              [str(row.issue) === "sans_suite", danger("Sans suite — relancer")],
              [
                !has(row.issue) && age !== null && age > 60,
                danger(`Ouverte depuis ${age} j`),
              ],
              [!has(row.issue), warn("Issue non renseignée")],
              [str(row.issue) === "en_cours", warn("Accompagnement en cours")],
            ], ok("Sollicitation aboutie"));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const resolues = count(rows, (r) => str(r.issue) === "resolu");
        const cloturees = count(rows, (r) => has(r.issue));
        const sansSuite = count(rows, (r) => str(r.issue) === "sans_suite");
        const apprentis = new Set(rows.map((r) => str(r.apprenti)).filter(Boolean)).size;
        return [
          { label: "Sollicitations", value: String(rows.length) },
          { label: "Apprentis accompagnés", value: String(apprentis) },
          {
            label: "Taux de résolution",
            value: cloturees ? pct(resolues, cloturees) : "—",
            tone: cloturees === 0 ? "neutral" : resolues / cloturees >= 0.6 ? "ok" : "warn",
          },
          {
            label: "Sans suite",
            value: String(sansSuite),
            tone: sansSuite > 0 ? "danger" : "ok",
          },
        ];
      },
    },
  ],
  controls: (tables) => {
    const partenariats = tables.partenariats ?? [];
    const sollicitations = tables.sollicitations ?? [];
    const alerts = [];

    const jamais = count(
      partenariats,
      (r) => has(r.nom) && etatPartenariat(r, tables).code === "jamais",
    );
    if (jamais > 0) {
      alerts.push({
        tone: "danger" as const,
        message:
          "Partenaires jamais sollicités : un annuaire sans usage ne démontre pas l'accompagnement social.",
        count: jamais,
      });
    }

    const dormants = count(
      partenariats,
      (r) => etatPartenariat(r, tables).code === "dormant",
    );
    if (dormants > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Partenariats dormants depuis plus d'un an : à réactiver ou à retirer du réseau.",
        count: dormants,
      });
    }

    const sansSuite = count(sollicitations, (r) => str(r.issue) === "sans_suite");
    if (sansSuite > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Sollicitations restées sans suite : l'apprenti n'a pas été accompagné jusqu'au bout.",
        count: sansSuite,
      });
    }

    const ouvertesLongtemps = count(sollicitations, (r) => {
      const age = daysSince(r.date);
      return !has(r.issue) && age !== null && age > 60;
    });
    if (ouvertesLongtemps > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Sollicitations ouvertes depuis plus de 60 jours sans issue renseignée.",
        count: ouvertesLongtemps,
      });
    }

    const sansMotif = count(
      sollicitations,
      (r) => has(r.date) && !has(r.motif),
    );
    if (sansMotif > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Sollicitations sans motif consigné.",
        count: sansMotif,
      });
    }

    if (partenariats.length > 0 && sollicitations.length === 0) {
      alerts.push({
        tone: "danger" as const,
        message:
          "Aucune sollicitation tracée : l'indicateur 14 attend des cas réels, pas seulement un annuaire.",
      });
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M32b. Le lien entre les deux onglets se fait sur le nom du partenaire : saisissez-le à l'identique pour que les colonnes d'activité se renseignent.",
    sections: [
      {
        title: "Les trois états",
        content:
          "Actif : sollicité dans les douze derniers mois. Dormant : partenariat existant mais sans usage depuis plus d'un an. Jamais sollicité : présent dans l'annuaire uniquement — c'est l'état que l'auditeur repère immédiatement.",
      },
    ],
  },
};
