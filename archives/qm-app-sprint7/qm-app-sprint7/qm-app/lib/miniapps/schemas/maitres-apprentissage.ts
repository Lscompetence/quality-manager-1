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
  num,
  ok,
  pending,
  str,
  warn,
} from "../helpers";

// M32a — Réseau d'entreprises partenaires et de leurs maîtres d'apprentissage.
// Cinq contrôles : conditions non vérifiées, lettre de mission absente,
// plafond d'apprentis dépassé, aucune visite tracée, visite de plus d'un an.

const CONDITIONS_OPTIONS = [
  { value: "verifiees", label: "✓ Vérifiées (diplôme + expérience)" },
  { value: "en_cours", label: "⏳ Vérification en cours" },
  { value: "non", label: "✗ Non vérifiées" },
];

const LETTRE_OPTIONS = [
  { value: "signee", label: "✍️ Signée" },
  { value: "envoyee", label: "📤 Envoyée, non retournée" },
  { value: "non", label: "✗ Absente" },
];

const FORMATION_MA_OPTIONS = [
  { value: "formee", label: "🎓 Formation MA suivie" },
  { value: "programmee", label: "📅 Programmée" },
  { value: "non", label: "✗ Non formé" },
  { value: "experimente", label: "⭐ Expérimenté (dispense)" },
];

const TYPE_VISITE_OPTIONS = [
  { value: "demarrage", label: "🚀 Visite de démarrage" },
  { value: "suivi", label: "🔄 Visite de suivi" },
  { value: "bilan", label: "🏁 Visite de bilan" },
  { value: "alerte", label: "⚠️ Visite déclenchée (difficulté)" },
  { value: "distance", label: "📞 Point à distance" },
];

/** Plafond légal indicatif : 2 apprentis + 1 redoublant par maître d'apprentissage. */
const PLAFOND_MA = 2;

const visitesDe = (row: Row, tables: Record<string, Row[]>) =>
  lookupAll(tables.visites, "maitre", row.maitre);

export const maitresApprentissageSchema: MiniAppSchema = {
  key: "maitres-apprentissage",
  name: "Registre des maîtres d'apprentissage",
  shortName: "Maîtres d'apprentissage",
  description:
    "Vue consolidée du réseau d'entreprises partenaires et de leurs maîtres d'apprentissage : conditions d'exercice, lettre de mission, nombre d'apprentis encadrés et visites réellement effectuées.",
  indicators: ["I13"],
  critere: 3,
  docRef: "M32a",
  categories: ["CFA"],
  tabs: [
    { id: "registre", label: "Maîtres d'apprentissage", tableIds: ["registre"] },
    { id: "visites", label: "Visites en entreprise", tableIds: ["visites"] },
  ],
  tables: [
    {
      id: "registre",
      label: "Registre des maîtres d'apprentissage",
      toastLabel: "Maître d'apprentissage ajouté",
      emptyLabel:
        "Aucun maître d'apprentissage. Ajoutez une ligne par MA du réseau d'entreprises partenaires.",
      rowLabel: (row) =>
        `${str(row.maitre) || "Maître d'apprentissage"} · ${str(row.entreprise) || ""}`.trim(),
      columns: [
        { id: "maitre", type: "text", label: "Maître d'apprentissage", width: "185px" },
        { id: "entreprise", type: "text", label: "Entreprise", width: "180px" },
        { id: "fonction", type: "text", label: "Fonction", width: "160px" },
        { id: "contact", type: "text", label: "Contact", width: "175px" },
        {
          id: "conditions",
          type: "select",
          label: "Conditions d'exercice",
          options: CONDITIONS_OPTIONS,
          width: "230px",
        },
        {
          id: "lettre_mission",
          type: "select",
          label: "Lettre de mission",
          options: LETTRE_OPTIONS,
          width: "195px",
        },
        {
          id: "formation_ma",
          type: "select",
          label: "Formation MA",
          options: FORMATION_MA_OPTIONS,
          width: "195px",
        },
        { id: "nb_apprentis", type: "number", label: "Apprentis encadrés", width: "165px" },
        {
          id: "derniere_visite",
          type: "computed",
          label: "Dernière visite",
          width: "180px",
          compute: ({ row, tables }) => {
            const visites = visitesDe(row, tables);
            if (visites.length === 0) return danger("Aucune visite tracée");
            const last = latestDate(visites, "date");
            const age = daysSince(last);
            if (age === null) return pending("Date illisible");
            if (age > 365) return danger(`Il y a ${Math.floor(age / 30)} mois`);
            if (age > 180) return warn(`${fmtDate(last)} · ${Math.floor(age / 30)} mois`);
            return ok(fmtDate(last));
          },
        },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "215px",
          compute: ({ row, tables }) => {
            const visites = visitesDe(row, tables);
            const last = latestDate(visites, "date");
            const age = daysSince(last);
            return firstMatch([
              [!has(row.maitre), pending("Maître à saisir")],
              [str(row.conditions) === "non", danger("Conditions non vérifiées")],
              [!has(row.conditions), danger("Conditions non vérifiées")],
              [str(row.lettre_mission) === "non", danger("Lettre de mission absente")],
              [!has(row.lettre_mission), danger("Lettre de mission absente")],
              [
                num(row.nb_apprentis) > PLAFOND_MA,
                danger(`Plafond dépassé (${num(row.nb_apprentis)} > ${PLAFOND_MA})`),
              ],
              [visites.length === 0, danger("Aucune visite tracée")],
              [age !== null && age > 365, danger("Dernière visite > 1 an")],
              [str(row.conditions) === "en_cours", warn("Vérification en cours")],
              [str(row.lettre_mission) === "envoyee", warn("Lettre non retournée")],
              [str(row.formation_ma) === "non", warn("MA non formé")],
              [age !== null && age > 180, warn("Visite de plus de 6 mois")],
            ], ok("Conforme"));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows, tables }) => {
        const conditionsKo = count(
          rows,
          (r) => !has(r.conditions) || str(r.conditions) === "non",
        );
        const lettresKo = count(
          rows,
          (r) => !has(r.lettre_mission) || str(r.lettre_mission) === "non",
        );
        const plafond = count(rows, (r) => num(r.nb_apprentis) > PLAFOND_MA);
        const sansVisite = count(rows, (r) => visitesDe(r, tables).length === 0);
        const visitesAgees = count(rows, (r) => {
          const age = daysSince(latestDate(visitesDe(r, tables), "date"));
          return age !== null && age > 365;
        });
        const entreprises = new Set(
          rows.map((r) => str(r.entreprise)).filter(Boolean),
        ).size;
        return [
          {
            label: "Réseau",
            value: `${rows.length} MA · ${entreprises} entreprise(s)`,
          },
          {
            label: "Conditions non vérifiées",
            value: String(conditionsKo),
            tone: conditionsKo > 0 ? "danger" : "ok",
          },
          {
            label: "Lettre de mission absente",
            value: String(lettresKo),
            tone: lettresKo > 0 ? "danger" : "ok",
          },
          {
            label: "Plafond dépassé",
            value: String(plafond),
            tone: plafond > 0 ? "danger" : "ok",
          },
          {
            label: "Sans visite / visite > 1 an",
            value: `${sansVisite} / ${visitesAgees}`,
            tone: sansVisite + visitesAgees > 0 ? "danger" : "ok",
          },
        ];
      },
    },
    {
      id: "visites",
      label: "Visites en entreprise",
      toastLabel: "Visite tracée",
      emptyLabel: "Aucune visite. Une visite non tracée est une visite qui n'a pas eu lieu.",
      rowLabel: (row) => `${fmtDate(row.date)} · ${str(row.entreprise) || "Visite"}`,
      columns: [
        { id: "date", type: "date", label: "Date", width: "125px" },
        {
          id: "maitre",
          type: "text",
          label: "Maître d'apprentissage",
          width: "185px",
          placeholder: "Nom identique à l'onglet Registre",
        },
        { id: "entreprise", type: "text", label: "Entreprise", width: "175px" },
        { id: "apprenti", type: "text", label: "Apprenti", width: "165px" },
        {
          id: "type",
          type: "select",
          label: "Type",
          options: TYPE_VISITE_OPTIONS,
          width: "215px",
        },
        { id: "visiteur", type: "text", label: "Réalisée par", width: "150px" },
        { id: "constats", type: "textarea", label: "Constats" },
        { id: "actions", type: "textarea", label: "Actions décidées" },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "185px",
          compute: ({ row, tables }) =>
            firstMatch([
              [!has(row.date), pending("Date à saisir")],
              [!has(row.maitre), warn("MA non rattaché")],
              [
                has(row.maitre) && lookupAll(tables.registre, "maitre", row.maitre).length === 0,
                warn("MA absent du registre"),
              ],
              [!has(row.constats), danger("Constats non consignés")],
              [!has(row.visiteur), warn("Visiteur non identifié")],
              [str(row.type) === "alerte" && !has(row.actions), danger("Alerte sans action")],
            ], ok("Visite documentée")),
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const last = latestDate(rows, "date");
        const alertes = count(rows, (r) => str(r.type) === "alerte");
        return [
          { label: "Visites tracées", value: String(rows.length) },
          { label: "Dernière visite", value: last ? fmtDate(last) : "—" },
          {
            label: "Visites déclenchées",
            value: String(alertes),
            tone: alertes > 0 ? "warn" : "ok",
            hint: "Visites provoquées par une difficulté signalée",
          },
          {
            label: "Sans constat consigné",
            value: String(count(rows, (r) => has(r.date) && !has(r.constats))),
            tone: count(rows, (r) => has(r.date) && !has(r.constats)) > 0 ? "danger" : "ok",
          },
        ];
      },
    },
  ],
  controls: (tables) => {
    const registre = tables.registre ?? [];
    const alerts = [];

    const conditionsKo = count(
      registre,
      (r) => has(r.maitre) && (!has(r.conditions) || str(r.conditions) === "non"),
    );
    if (conditionsKo > 0) {
      alerts.push({
        tone: "danger" as const,
        message:
          "Maîtres d'apprentissage dont les conditions d'exercice (diplôme + expérience) ne sont pas vérifiées.",
        count: conditionsKo,
      });
    }

    const lettresKo = count(
      registre,
      (r) => has(r.maitre) && (!has(r.lettre_mission) || str(r.lettre_mission) === "non"),
    );
    if (lettresKo > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Maîtres d'apprentissage sans lettre de mission.",
        count: lettresKo,
      });
    }

    const plafond = count(registre, (r) => num(r.nb_apprentis) > PLAFOND_MA);
    if (plafond > 0) {
      alerts.push({
        tone: "danger" as const,
        message: `Maîtres d'apprentissage encadrant plus de ${PLAFOND_MA} apprentis : plafond dépassé.`,
        count: plafond,
      });
    }

    const sansVisite = count(
      registre,
      (r) => has(r.maitre) && visitesDe(r, tables).length === 0,
    );
    if (sansVisite > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Maîtres d'apprentissage sans aucune visite tracée.",
        count: sansVisite,
      });
    }

    const visitesAgees = count(registre, (r) => {
      const visites = visitesDe(r, tables);
      if (visites.length === 0) return false;
      const age = daysSince(latestDate(visites, "date"));
      return age !== null && age > 365;
    });
    if (visitesAgees > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Maîtres d'apprentissage dont la dernière visite date de plus d'un an.",
        count: visitesAgees,
      });
    }

    const nonFormes = count(registre, (r) => str(r.formation_ma) === "non");
    if (nonFormes > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Maîtres d'apprentissage non formés à la fonction tutorale.",
        count: nonFormes,
      });
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M32a. Le lien entre les deux onglets se fait sur le nom du maître d'apprentissage : saisissez-le à l'identique pour que les colonnes de visite se renseignent.",
    sections: [
      {
        title: "Le plafond d'apprentis",
        content:
          "Le seuil retenu ici est de 2 apprentis simultanés par maître d'apprentissage (hors redoublant), conformément au cadre légal courant. Certaines branches prévoient des dérogations : dans ce cas, joignez la référence en pièce jointe.",
      },
      {
        title: "Rythme des visites",
        content:
          "Aucun texte n'impose de fréquence, mais l'absence de visite sur plus d'un an rend l'articulation CFA / entreprise indémontrable. Le classeur alerte à 6 mois puis à 12 mois.",
      },
    ],
  },
};
