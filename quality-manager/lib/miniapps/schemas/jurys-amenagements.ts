import type { MiniAppSchema, Row } from "../schema-types";
import {
  addMonths,
  count,
  danger,
  daysBetween,
  daysUntil,
  firstMatch,
  fmtDate,
  has,
  num,
  ok,
  pct,
  pending,
  ratio,
  str,
  warn,
} from "../helpers";

// M32d — Trois registres en un : composition des jurys, aménagements d'examen,
// archivage des productions.

const ROLE_JURY_OPTIONS = [
  { value: "professionnel", label: "🏭 Professionnel du métier" },
  { value: "formateur", label: "🎓 Formateur / enseignant" },
  { value: "certificateur", label: "🏛 Représentant certificateur" },
  { value: "president", label: "⚖️ Président de jury" },
];

const NATURE_AMENAGEMENT_OPTIONS = [
  { value: "temps", label: "⏱ Temps majoré" },
  { value: "materiel", label: "🛠 Matériel adapté" },
  { value: "secretaire", label: "✍️ Secrétaire / scribe" },
  { value: "salle", label: "🚪 Salle isolée" },
  { value: "support", label: "🔍 Support adapté (braille, gros caractères)" },
  { value: "pause", label: "☕ Pauses supplémentaires" },
  { value: "interprete", label: "🤟 Interprète LSF" },
];

const STATUT_AMENAGEMENT_OPTIONS = [
  { value: "demande", label: "📤 Demandé" },
  { value: "accorde", label: "✓ Accordé" },
  { value: "refuse", label: "✗ Refusé" },
  { value: "mis_en_oeuvre", label: "✅ Mis en œuvre le jour J" },
];

const TYPE_PRODUCTION_OPTIONS = [
  { value: "copie", label: "📄 Copies d'examen" },
  { value: "grille", label: "📋 Grilles d'évaluation" },
  { value: "pv", label: "⚖️ PV de jury" },
  { value: "dossier", label: "📁 Dossiers professionnels" },
  { value: "enregistrement", label: "🎥 Enregistrements de soutenance" },
  { value: "livrable", label: "🛠 Livrables / réalisations" },
];

const SUPPORT_OPTIONS = [
  { value: "papier", label: "📦 Papier — local sécurisé" },
  { value: "numerique", label: "💾 Numérique — serveur" },
  { value: "cloud", label: "☁️ Cloud / plateforme" },
  { value: "mixte", label: "🔀 Mixte" },
];

/** Durée de conservation par défaut, en mois (usage courant : 3 ans). */
const CONSERVATION_DEFAUT_MOIS = 36;

function echeanceArchivage(row: Row): string {
  const mois = num(row.duree_mois) || CONSERVATION_DEFAUT_MOIS;
  return addMonths(row.date_archivage, mois);
}

export const jurysAmenagementsSchema: MiniAppSchema = {
  key: "jurys-amenagements",
  name: "Jurys, aménagements et archivage",
  shortName: "Jurys & archivage",
  description:
    "Trois registres en un : composition des jurys avec contrôle de la part de professionnels, suivi des aménagements d'examen pour les candidats en situation de handicap, et archivage des productions avec échéance de conservation.",
  indicators: ["I16"],
  critere: 3,
  docRef: "M32d",
  categories: ["AF", "VAE", "CFA"],
  tabs: [
    { id: "jurys", label: "Composition des jurys", tableIds: ["jurys"] },
    { id: "amenagements", label: "Aménagements d'examen", tableIds: ["amenagements"] },
    { id: "archivage", label: "Archivage des productions", tableIds: ["archivage"] },
  ],
  tables: [
    {
      id: "jurys",
      label: "Composition des jurys",
      toastLabel: "Membre ajouté",
      emptyLabel:
        "Aucun membre. Ajoutez une ligne par membre de jury, session par session.",
      rowLabel: (row) => `${str(row.session) || "Jury"} · ${str(row.membre) || "membre"}`,
      columns: [
        { id: "session", type: "text", label: "Session de jury", width: "175px" },
        { id: "date", type: "date", label: "Date", width: "125px" },
        { id: "membre", type: "text", label: "Membre", width: "170px" },
        { id: "role", type: "select", label: "Qualité", options: ROLE_JURY_OPTIONS, width: "215px" },
        { id: "organisme", type: "text", label: "Structure d'origine", width: "175px" },
        { id: "designation", type: "text", label: "Réf. désignation", width: "160px" },
        {
          id: "part_pro",
          type: "computed",
          label: "Part de professionnels (session)",
          width: "225px",
          compute: ({ row, rows }) => {
            const session = str(row.session);
            if (!session) return pending("Session à saisir");
            const membres = rows.filter((r) => str(r.session) === session && has(r.membre));
            if (membres.length === 0) return pending("—");
            const pros = membres.filter((r) => str(r.role) === "professionnel").length;
            const part = ratio(pros, membres.length);
            const txt = `${pros}/${membres.length} · ${part.toFixed(0)} %`;
            if (part >= 50) return ok(txt);
            if (part >= 25) return warn(txt);
            return danger(txt);
          },
        },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "185px",
          compute: ({ row, rows }) => {
            const session = str(row.session);
            const membres = rows.filter((r) => str(r.session) === session && has(r.membre));
            const president = membres.some((r) => str(r.role) === "president");
            return firstMatch([
              [!has(row.membre), pending("Membre à saisir")],
              [!has(row.role), danger("Qualité non précisée")],
              [!has(row.designation), warn("Désignation non référencée")],
              [!president, warn("Aucun président désigné")],
              [membres.length < 3, warn(`Jury à ${membres.length} membre(s)`)],
            ], ok("Conforme"));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const sessions = new Set(rows.map((r) => str(r.session)).filter(Boolean));
        const pros = count(rows, (r) => str(r.role) === "professionnel");
        const sessionsSousSeuil = [...sessions].filter((s) => {
          const membres = rows.filter((r) => str(r.session) === s && has(r.membre));
          if (membres.length === 0) return false;
          const p = membres.filter((r) => str(r.role) === "professionnel").length;
          return ratio(p, membres.length) < 50;
        }).length;
        const sansPresident = [...sessions].filter(
          (s) => !rows.some((r) => str(r.session) === s && str(r.role) === "president"),
        ).length;
        return [
          { label: "Sessions · membres", value: `${sessions.size} · ${rows.length}` },
          {
            label: "Part de professionnels",
            value: pct(pros, rows.length),
            tone: ratio(pros, rows.length) >= 50 ? "ok" : "warn",
          },
          {
            label: "Sessions sous 50 % de pros",
            value: String(sessionsSousSeuil),
            tone: sessionsSousSeuil > 0 ? "danger" : "ok",
          },
          {
            label: "Sessions sans président",
            value: String(sansPresident),
            tone: sansPresident > 0 ? "warn" : "ok",
          },
        ];
      },
    },
    {
      id: "amenagements",
      label: "Aménagements d'examen",
      toastLabel: "Aménagement ajouté",
      emptyLabel:
        "Aucun aménagement. Ajoutez une ligne par demande d'aménagement d'épreuve.",
      rowLabel: (row) => `${str(row.candidat) || "Candidat"} · aménagement`,
      columns: [
        { id: "candidat", type: "text", label: "Candidat", width: "170px" },
        { id: "session", type: "text", label: "Session / épreuve", width: "175px" },
        { id: "date_demande", type: "date", label: "Demandé le", width: "135px" },
        { id: "date_epreuve", type: "date", label: "Épreuve le", width: "135px" },
        {
          id: "nature",
          type: "select",
          label: "Nature",
          options: NATURE_AMENAGEMENT_OPTIONS,
          width: "255px",
        },
        { id: "justificatif", type: "text", label: "Justificatif", width: "170px" },
        {
          id: "statut",
          type: "select",
          label: "Statut",
          options: STATUT_AMENAGEMENT_OPTIONS,
          width: "205px",
        },
        { id: "decision", type: "textarea", label: "Décision / motivation" },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "210px",
          compute: ({ row }) => {
            const delai = daysBetween(row.date_demande, row.date_epreuve);
            const avantEpreuve = daysUntil(row.date_epreuve);
            return firstMatch([
              [!has(row.candidat), pending("Candidat à saisir")],
              [!has(row.nature), danger("Nature non précisée")],
              [str(row.statut) === "refuse" && !has(row.decision), danger("Refus non motivé")],
              [!has(row.justificatif), danger("Justificatif absent")],
              [
                str(row.statut) === "accorde" &&
                  avantEpreuve !== null &&
                  avantEpreuve < 0,
                danger("Accordé mais mise en œuvre non tracée"),
              ],
              [!has(row.statut), warn("Statut non renseigné")],
              [str(row.statut) === "demande", warn("En attente de décision")],
              [delai !== null && delai < 30, warn(`Demande à J-${delai} de l'épreuve`)],
              [str(row.statut) === "mis_en_oeuvre", ok("Mis en œuvre")],
            ], ok("Accordé"));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const accordes = count(rows, (r) => str(r.statut) === "accorde");
        const misEnOeuvre = count(rows, (r) => str(r.statut) === "mis_en_oeuvre");
        const enAttente = count(rows, (r) => str(r.statut) === "demande");
        const sansJustif = count(rows, (r) => has(r.candidat) && !has(r.justificatif));
        return [
          { label: "Demandes", value: String(rows.length) },
          {
            label: "Mis en œuvre",
            value: `${misEnOeuvre} / ${accordes + misEnOeuvre}`,
            tone: accordes > 0 ? "warn" : "ok",
            hint: "Un aménagement accordé mais non mis en œuvre est un écart",
          },
          {
            label: "En attente de décision",
            value: String(enAttente),
            tone: enAttente > 0 ? "warn" : "ok",
          },
          {
            label: "Sans justificatif",
            value: String(sansJustif),
            tone: sansJustif > 0 ? "danger" : "ok",
          },
        ];
      },
    },
    {
      id: "archivage",
      label: "Archivage des productions",
      toastLabel: "Lot archivé",
      emptyLabel:
        "Aucun lot archivé. Ajoutez une ligne par lot de productions conservées après une session.",
      rowLabel: (row) => `${str(row.session) || "Session"} · ${str(row.type) || "archivage"}`,
      columns: [
        { id: "session", type: "text", label: "Session", width: "175px" },
        {
          id: "type",
          type: "select",
          label: "Type de production",
          options: TYPE_PRODUCTION_OPTIONS,
          width: "230px",
        },
        { id: "volume", type: "text", label: "Volume", width: "120px", placeholder: "24 copies" },
        { id: "date_archivage", type: "date", label: "Archivé le", width: "135px" },
        {
          id: "duree_mois",
          type: "number",
          label: "Durée (mois)",
          width: "140px",
          placeholder: String(CONSERVATION_DEFAUT_MOIS),
        },
        {
          id: "support",
          type: "select",
          label: "Support",
          options: SUPPORT_OPTIONS,
          width: "205px",
        },
        { id: "lieu", type: "text", label: "Lieu / chemin", width: "180px" },
        { id: "responsable", type: "text", label: "Responsable", width: "150px" },
        {
          id: "echeance",
          type: "computed",
          label: "Échéance de conservation",
          width: "215px",
          compute: ({ row }) => {
            if (!has(row.date_archivage)) return pending("Date d'archivage à saisir");
            const echeance = echeanceArchivage(row);
            if (!echeance) return pending("Date illisible");
            const d = daysUntil(echeance);
            if (d === null) return pending("—");
            if (d < 0) return warn(`Purgeable depuis le ${fmtDate(echeance)}`);
            if (d <= 90) return warn(`Purgeable le ${fmtDate(echeance)}`);
            return ok(`Conservé jusqu'au ${fmtDate(echeance)}`);
          },
        },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "185px",
          compute: ({ row }) =>
            firstMatch([
              [!has(row.session), pending("Session à saisir")],
              [!has(row.date_archivage), danger("Archivage non daté")],
              [!has(row.lieu), danger("Lieu de conservation absent")],
              [!has(row.responsable), warn("Responsable non identifié")],
              [!has(row.duree_mois), warn(`Durée par défaut (${CONSERVATION_DEFAUT_MOIS} mois)`)],
              [!has(row.support), warn("Support non précisé")],
            ], ok("Archivage tracé")),
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const echus = count(rows, (r) => {
          const d = daysUntil(echeanceArchivage(r));
          return d !== null && d < 0;
        });
        const proches = count(rows, (r) => {
          const d = daysUntil(echeanceArchivage(r));
          return d !== null && d >= 0 && d <= 90;
        });
        const sansLieu = count(rows, (r) => has(r.session) && !has(r.lieu));
        return [
          { label: "Lots archivés", value: String(rows.length) },
          {
            label: "Échéance dans 3 mois",
            value: String(proches),
            tone: proches > 0 ? "warn" : "ok",
          },
          {
            label: "Durée de conservation atteinte",
            value: String(echus),
            tone: echus > 0 ? "warn" : "ok",
            hint: "Ces lots peuvent être purgés — ou doivent l'être au titre du RGPD",
          },
          {
            label: "Sans lieu de conservation",
            value: String(sansLieu),
            tone: sansLieu > 0 ? "danger" : "ok",
          },
        ];
      },
    },
  ],
  controls: (tables) => {
    const jurys = tables.jurys ?? [];
    const amenagements = tables.amenagements ?? [];
    const archivage = tables.archivage ?? [];
    const alerts = [];

    const sessions = new Set(jurys.map((r) => str(r.session)).filter(Boolean));
    const sousSeuil: string[] = [];
    for (const s of sessions) {
      const membres = jurys.filter((r) => str(r.session) === s && has(r.membre));
      if (membres.length === 0) continue;
      const pros = membres.filter((r) => str(r.role) === "professionnel").length;
      if (ratio(pros, membres.length) < 50) sousSeuil.push(s);
    }
    if (sousSeuil.length > 0) {
      alerts.push({
        tone: "danger" as const,
        message: `Sessions de jury où les professionnels du métier représentent moins de la moitié des membres : ${sousSeuil.join(", ")}.`,
        count: sousSeuil.length,
      });
    }

    const refusNonMotives = count(
      amenagements,
      (r) => str(r.statut) === "refuse" && !has(r.decision),
    );
    if (refusNonMotives > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Aménagements refusés sans décision motivée.",
        count: refusNonMotives,
      });
    }

    const accordesNonSuivis = count(amenagements, (r) => {
      const d = daysUntil(r.date_epreuve);
      return str(r.statut) === "accorde" && d !== null && d < 0;
    });
    if (accordesNonSuivis > 0) {
      alerts.push({
        tone: "danger" as const,
        message:
          "Aménagements accordés dont la mise en œuvre le jour de l'épreuve n'est pas tracée.",
        count: accordesNonSuivis,
      });
    }

    const sansJustif = count(
      amenagements,
      (r) => has(r.candidat) && !has(r.justificatif),
    );
    if (sansJustif > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Demandes d'aménagement sans justificatif rattaché.",
        count: sansJustif,
      });
    }

    const enAttente = count(amenagements, (r) => {
      const d = daysUntil(r.date_epreuve);
      return str(r.statut) === "demande" && d !== null && d <= 30;
    });
    if (enAttente > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Demandes d'aménagement encore sans décision à moins de 30 jours de l'épreuve.",
        count: enAttente,
      });
    }

    const sansLieu = count(archivage, (r) => has(r.session) && !has(r.lieu));
    if (sansLieu > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Lots archivés sans lieu de conservation renseigné : productions introuvables en audit.",
        count: sansLieu,
      });
    }

    const echus = count(archivage, (r) => {
      const d = daysUntil(echeanceArchivage(r));
      return d !== null && d < 0;
    });
    if (echus > 0) {
      alerts.push({
        tone: "warn" as const,
        message:
          "Lots ayant atteint leur durée de conservation : statuer sur leur purge (obligation RGPD de minimisation).",
        count: echus,
      });
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M32d. Les trois registres sont indépendants : renseignez ceux qui vous concernent.",
    sections: [
      {
        title: "Part de professionnels au jury",
        content:
          "Le seuil de 50 % retenu ici correspond à l'exigence la plus courante des certificateurs. Vérifiez le règlement de votre certification : certains imposent un seuil différent, auquel cas ajustez votre lecture de l'alerte.",
      },
      {
        title: "Durée de conservation",
        content:
          "La durée par défaut est de 36 mois. Elle se règle lot par lot dans la colonne « Durée (mois) » selon les exigences du certificateur et votre registre de traitements RGPD.",
      },
    ],
  },
};
