import type { MiniAppSchema, Row } from "../schema-types";
import {
  addMonths,
  count,
  danger,
  daysUntil,
  firstMatch,
  fmtDate,
  has,
  lookupAll,
  num,
  ok,
  pending,
  str,
  warn,
} from "../helpers";

// M33a — Titres d'occupation des lieux et suivi des vérifications périodiques
// obligatoires. La prochaine échéance se calcule à partir de la périodicité.

const TITRE_OPTIONS = [
  { value: "propriete", label: "🏠 Propriété" },
  { value: "bail", label: "📄 Bail commercial / professionnel" },
  { value: "convention", label: "🤝 Convention de mise à disposition" },
  { value: "location", label: "🧾 Location ponctuelle (facture)" },
  { value: "domiciliation", label: "📮 Domiciliation" },
  { value: "sous_location", label: "🔁 Sous-location" },
];

const USAGE_OPTIONS = [
  { value: "salle", label: "🪑 Salle de formation" },
  { value: "plateau", label: "🛠 Plateau technique" },
  { value: "bureau", label: "💼 Bureaux / administratif" },
  { value: "accueil", label: "👋 Accueil du public" },
  { value: "mixte", label: "🔀 Usage mixte" },
];

const TYPE_VERIF_OPTIONS = [
  { value: "electrique", label: "⚡ Installations électriques" },
  { value: "incendie", label: "🧯 Extincteurs / désenfumage" },
  { value: "alarme", label: "🚨 Alarme incendie" },
  { value: "gaz", label: "🔥 Installations gaz" },
  { value: "ascenseur", label: "🛗 Ascenseur" },
  { value: "commission", label: "🏛 Commission de sécurité" },
  { value: "accessibilite", label: "♿ Accessibilité PMR" },
  { value: "air", label: "💨 Qualité de l'air / ventilation" },
];

const RESULTAT_VERIF_OPTIONS = [
  { value: "conforme", label: "✓ Conforme" },
  { value: "reserves", label: "◐ Conforme avec réserves" },
  { value: "non_conforme", label: "✗ Non conforme" },
];

const STATUT_INTERVENTION_OPTIONS = [
  { value: "a_planifier", label: "📌 À planifier" },
  { value: "planifiee", label: "📅 Planifiée" },
  { value: "realisee", label: "✓ Réalisée" },
];

/** Périodicité par défaut, en mois, par type de vérification. */
const PERIODICITE: Record<string, number> = {
  electrique: 12,
  incendie: 12,
  alarme: 6,
  gaz: 12,
  ascenseur: 6,
  commission: 36,
  accessibilite: 60,
  air: 48,
};

function prochaineEcheance(row: Row): string {
  const mois = num(row.periodicite_mois) || PERIODICITE[str(row.type)] || 12;
  return addMonths(row.date_controle, mois);
}

export const locauxVerificationsSchema: MiniAppSchema = {
  key: "locaux-verifications",
  name: "Locaux, titres d'occupation et vérifications",
  shortName: "Locaux & vérifications",
  description:
    "Justifie l'occupation de chaque lieu de formation — bail, propriété, convention, facture — et suit les vérifications périodiques obligatoires. La prochaine échéance de chaque contrôle se calcule seule.",
  indicators: ["I17"],
  critere: 4,
  docRef: "M33a",
  tabs: [
    { id: "locaux", label: "Locaux et titres", tableIds: ["locaux"] },
    { id: "verifications", label: "Vérifications périodiques", tableIds: ["verifications"] },
    { id: "interventions", label: "Levée des réserves", tableIds: ["interventions"] },
  ],
  tables: [
    {
      id: "locaux",
      label: "Locaux et titres d'occupation",
      toastLabel: "Local ajouté",
      emptyLabel: "Aucun local. Ajoutez chaque lieu où se déroule une prestation.",
      rowLabel: (row) => str(row.nom) || "Local",
      columns: [
        { id: "nom", type: "text", label: "Local", width: "175px" },
        { id: "adresse", type: "textarea", label: "Adresse" },
        { id: "usage", type: "select", label: "Usage", options: USAGE_OPTIONS, width: "195px" },
        { id: "surface", type: "text", label: "Surface", width: "110px", placeholder: "45 m²" },
        { id: "capacite", type: "number", label: "Capacité", width: "115px" },
        { id: "titre", type: "select", label: "Titre d'occupation", options: TITRE_OPTIONS, width: "245px" },
        { id: "reference", type: "text", label: "Référence du titre", width: "175px" },
        { id: "date_fin_titre", type: "date", label: "Fin du titre", width: "135px" },
        { id: "erp", type: "text", label: "Catégorie ERP", width: "140px" },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "205px",
          compute: ({ row, tables }) => {
            const d = daysUntil(row.date_fin_titre);
            const verifs = lookupAll(tables.verifications, "local", row.nom);
            return firstMatch([
              [!has(row.nom), pending("Local à saisir")],
              [!has(row.titre), danger("Titre d'occupation absent")],
              [!has(row.reference), danger("Justificatif non référencé")],
              [d !== null && d < 0, danger(`Titre expiré le ${fmtDate(row.date_fin_titre)}`)],
              [verifs.length === 0, danger("Aucune vérification tracée")],
              [d !== null && d <= 90, warn(`Titre à renouveler (J-${d})`)],
              [!has(row.adresse), warn("Adresse non renseignée")],
            ], ok("Occupation justifiée"));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows, tables }) => {
        const sansTitre = count(rows, (r) => has(r.nom) && !has(r.titre));
        const expires = count(rows, (r) => (daysUntil(r.date_fin_titre) ?? 1) < 0);
        const sansVerif = count(
          rows,
          (r) => has(r.nom) && lookupAll(tables.verifications, "local", r.nom).length === 0,
        );
        return [
          { label: "Locaux déclarés", value: String(rows.length) },
          {
            label: "Sans titre justifié",
            value: String(sansTitre),
            tone: sansTitre > 0 ? "danger" : "ok",
          },
          {
            label: "Titres expirés",
            value: String(expires),
            tone: expires > 0 ? "danger" : "ok",
          },
          {
            label: "Sans vérification tracée",
            value: String(sansVerif),
            tone: sansVerif > 0 ? "danger" : "ok",
          },
        ];
      },
    },
    {
      id: "verifications",
      label: "Vérifications périodiques obligatoires",
      toastLabel: "Vérification enregistrée",
      emptyLabel:
        "Aucune vérification. Ajoutez les contrôles réglementaires réalisés sur vos locaux.",
      rowLabel: (row) => `${str(row.local) || "Local"} · ${str(row.type) || "vérification"}`,
      columns: [
        {
          id: "local",
          type: "text",
          label: "Local",
          width: "175px",
          placeholder: "Nom identique à l'onglet Locaux",
        },
        { id: "type", type: "select", label: "Type de contrôle", options: TYPE_VERIF_OPTIONS, width: "235px" },
        { id: "organisme", type: "text", label: "Organisme de contrôle", width: "185px" },
        { id: "date_controle", type: "date", label: "Contrôlé le", width: "135px" },
        {
          id: "periodicite_mois",
          type: "number",
          label: "Périodicité (mois)",
          width: "160px",
          placeholder: "auto",
        },
        {
          id: "prochaine",
          type: "computed",
          label: "Prochaine échéance",
          width: "210px",
          compute: ({ row }) => {
            if (!has(row.date_controle)) return pending("Date de contrôle à saisir");
            const e = prochaineEcheance(row);
            if (!e) return pending("Date illisible");
            const d = daysUntil(e);
            if (d === null) return pending("—");
            if (d < 0) return danger(`Échu depuis ${Math.abs(d)} j · ${fmtDate(e)}`);
            if (d <= 60) return warn(`Dans ${d} j · ${fmtDate(e)}`);
            return ok(fmtDate(e));
          },
        },
        {
          id: "resultat",
          type: "select",
          label: "Résultat",
          options: RESULTAT_VERIF_OPTIONS,
          width: "205px",
        },
        { id: "reserves", type: "textarea", label: "Réserves / observations" },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "200px",
          compute: ({ row, tables }) => {
            const levees = lookupAll(tables.interventions, "reference", row.type).filter(
              (i) => str(i.local) === str(row.local) && str(i.statut) === "realisee",
            );
            return firstMatch([
              [!has(row.date_controle), pending("Date à saisir")],
              [!has(row.resultat), warn("Résultat non renseigné")],
              [
                str(row.resultat) === "non_conforme" && levees.length === 0,
                danger("Non conforme — non levé"),
              ],
              [
                str(row.resultat) === "reserves" && levees.length === 0,
                warn("Réserves non levées"),
              ],
              [!has(row.organisme), warn("Organisme non identifié")],
              [(daysUntil(prochaineEcheance(row)) ?? 1) < 0, danger("Contrôle échu")],
            ], ok("À jour"));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const echus = count(rows, (r) => (daysUntil(prochaineEcheance(r)) ?? 1) < 0);
        const proches = count(rows, (r) => {
          const d = daysUntil(prochaineEcheance(r));
          return d !== null && d >= 0 && d <= 60;
        });
        const nonConformes = count(rows, (r) => str(r.resultat) === "non_conforme");
        const reserves = count(rows, (r) => str(r.resultat) === "reserves");
        return [
          { label: "Contrôles suivis", value: String(rows.length) },
          {
            label: "Échus",
            value: String(echus),
            tone: echus > 0 ? "danger" : "ok",
          },
          {
            label: "Échéance < 2 mois",
            value: String(proches),
            tone: proches > 0 ? "warn" : "ok",
          },
          {
            label: "Non conformes / réserves",
            value: `${nonConformes} / ${reserves}`,
            tone: nonConformes > 0 ? "danger" : reserves > 0 ? "warn" : "ok",
          },
        ];
      },
    },
    {
      id: "interventions",
      label: "Levée des réserves et interventions",
      toastLabel: "Intervention ajoutée",
      emptyLabel: "Aucune intervention. Tracez ici la levée des réserves constatées.",
      rowLabel: (row) => `${str(row.local) || "Local"} · ${str(row.objet) || "intervention"}`,
      columns: [
        { id: "local", type: "text", label: "Local", width: "175px" },
        {
          id: "reference",
          type: "select",
          label: "Contrôle concerné",
          options: TYPE_VERIF_OPTIONS,
          width: "235px",
        },
        { id: "objet", type: "textarea", label: "Réserve à lever" },
        { id: "intervenant", type: "text", label: "Intervenant", width: "165px" },
        { id: "date_prevue", type: "date", label: "Prévue le", width: "130px" },
        { id: "date_realisee", type: "date", label: "Réalisée le", width: "135px" },
        {
          id: "statut",
          type: "select",
          label: "Statut",
          options: STATUT_INTERVENTION_OPTIONS,
          width: "165px",
        },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "190px",
          compute: ({ row }) => {
            const retard = daysUntil(row.date_prevue);
            return firstMatch([
              [!has(row.objet), pending("Objet à saisir")],
              [
                str(row.statut) === "realisee" && !has(row.date_realisee),
                warn("Réalisée sans date"),
              ],
              [str(row.statut) === "realisee", ok("Réserve levée")],
              [
                str(row.statut) !== "realisee" && retard !== null && retard < 0,
                danger(`En retard de ${Math.abs(retard ?? 0)} j`),
              ],
              [str(row.statut) === "a_planifier", warn("À planifier")],
            ], ok("Planifiée"));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
  ],
  controls: (tables) => {
    const locaux = tables.locaux ?? [];
    const verifications = tables.verifications ?? [];
    const interventions = tables.interventions ?? [];
    const alerts = [];

    const sansTitre = count(locaux, (r) => has(r.nom) && !has(r.titre));
    if (sansTitre > 0) {
      alerts.push({
        tone: "danger" as const,
        message:
          "Locaux sans titre d'occupation : bail, acte de propriété, convention ou facture de location.",
        count: sansTitre,
      });
    }

    const titresExpires = count(locaux, (r) => (daysUntil(r.date_fin_titre) ?? 1) < 0);
    if (titresExpires > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Titres d'occupation expirés.",
        count: titresExpires,
      });
    }

    const controlesEchus = count(
      verifications,
      (r) => (daysUntil(prochaineEcheance(r)) ?? 1) < 0,
    );
    if (controlesEchus > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Vérifications périodiques échues : le contrôle doit être renouvelé.",
        count: controlesEchus,
      });
    }

    const nonConformesNonLevees = count(verifications, (r) => {
      if (str(r.resultat) !== "non_conforme") return false;
      return !interventions.some(
        (i) =>
          str(i.local) === str(r.local) &&
          str(i.reference) === str(r.type) &&
          str(i.statut) === "realisee",
      );
    });
    if (nonConformesNonLevees > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Contrôles non conformes sans intervention de mise en conformité réalisée.",
        count: nonConformesNonLevees,
      });
    }

    const sansVerif = count(
      locaux,
      (r) => has(r.nom) && lookupAll(verifications, "local", r.nom).length === 0,
    );
    if (sansVerif > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Locaux sans aucune vérification périodique tracée.",
        count: sansVerif,
      });
    }

    const proches = count(verifications, (r) => {
      const d = daysUntil(prochaineEcheance(r));
      return d !== null && d >= 0 && d <= 60;
    });
    if (proches > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Vérifications à renouveler dans les 2 mois.",
        count: proches,
      });
    }

    const interventionsRetard = count(interventions, (r) => {
      const d = daysUntil(r.date_prevue);
      return str(r.statut) !== "realisee" && d !== null && d < 0;
    });
    if (interventionsRetard > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Interventions de levée de réserves en retard.",
        count: interventionsRetard,
      });
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M33a. Laissez la périodicité vide pour utiliser la valeur réglementaire courante du type de contrôle ; renseignez-la pour l'ajuster à votre situation.",
    sections: [
      {
        title: "Périodicités appliquées par défaut",
        content:
          "Électricité 12 mois · Extincteurs 12 mois · Alarme 6 mois · Gaz 12 mois · Ascenseur 6 mois · Commission de sécurité 36 mois · Accessibilité 60 mois · Qualité de l'air 48 mois. Ces valeurs sont indicatives : votre catégorie ERP et votre arrêté d'ouverture font foi.",
      },
      {
        title: "Le cas des salles louées ponctuellement",
        content:
          "Vous n'êtes pas tenu de produire les vérifications périodiques d'un lieu que vous louez à la journée : la facture ou la convention suffit à justifier l'occupation, et c'est le loueur qui porte les obligations de sécurité.",
      },
    ],
  },
};
