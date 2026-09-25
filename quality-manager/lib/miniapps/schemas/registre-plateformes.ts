import type { MiniAppSchema } from "../schema-types";
import {
  count,
  danger,
  daysSince,
  daysUntil,
  firstMatch,
  fmtDate,
  has,
  lookupAll,
  ok,
  pending,
  str,
  warn,
} from "../helpers";

// M33b — Outils numériques : contrat, hébergement des données, accessibilité,
// assistance, et suivi des comptes et accès.

const USAGE_OPTIONS = [
  { value: "lms", label: "🎓 LMS / plateforme de cours" },
  { value: "classe_virtuelle", label: "📹 Classe virtuelle" },
  { value: "evaluation", label: "📝 Évaluation en ligne" },
  { value: "gestion", label: "📊 Gestion administrative / CRM" },
  { value: "emargement", label: "✍️ Émargement électronique" },
  { value: "stockage", label: "📁 Stockage / partage de fichiers" },
  { value: "communication", label: "💬 Communication / messagerie" },
];

const HEBERGEMENT_OPTIONS = [
  { value: "ue", label: "🇪🇺 Union européenne" },
  { value: "france", label: "🇫🇷 France" },
  { value: "hors_ue_cct", label: "🌍 Hors UE — clauses contractuelles types" },
  { value: "hors_ue", label: "⚠️ Hors UE — sans encadrement identifié" },
  { value: "inconnu", label: "❓ Non documenté" },
];

const ACCESSIBILITE_OPTIONS = [
  { value: "rgaa_conforme", label: "✓ Conforme RGAA / WCAG AA" },
  { value: "partielle", label: "◐ Conformité partielle" },
  { value: "non_evaluee", label: "❓ Non évaluée" },
  { value: "non_conforme", label: "✗ Non conforme" },
];

const ASSISTANCE_OPTIONS = [
  { value: "24_7", label: "🕐 24/7" },
  { value: "ouvrables", label: "📅 Jours ouvrables" },
  { value: "email", label: "📧 E-mail uniquement" },
  { value: "communaute", label: "👥 Communauté / forum" },
  { value: "aucune", label: "✗ Aucune assistance" },
];

const PROFIL_OPTIONS = [
  { value: "admin", label: "🔑 Administrateur" },
  { value: "formateur", label: "🎓 Formateur" },
  { value: "gestionnaire", label: "📊 Gestionnaire" },
  { value: "apprenant", label: "👤 Apprenant" },
  { value: "externe", label: "🤝 Externe / sous-traitant" },
];

const STATUT_COMPTE_OPTIONS = [
  { value: "actif", label: "✓ Actif" },
  { value: "suspendu", label: "⏸ Suspendu" },
  { value: "desactive", label: "🔒 Désactivé" },
];

const hebergementRisque = (v: unknown) =>
  ["hors_ue", "inconnu"].includes(str(v));

export const registrePlateformesSchema: MiniAppSchema = {
  key: "registre-plateformes",
  name: "Registre des plateformes numériques",
  shortName: "Plateformes numériques",
  description:
    "Recense les outils numériques utilisés dans les prestations : contrat, hébergement des données, accessibilité, assistance disponible, et suivi des comptes et accès. Sert l'indicateur 17 et, pour les prestations à distance, l'indicateur 19.",
  indicators: ["I17", "I19"],
  critere: 4,
  docRef: "M33b",
  tabs: [
    { id: "plateformes", label: "Plateformes", tableIds: ["plateformes"] },
    { id: "comptes", label: "Comptes et accès", tableIds: ["comptes"] },
  ],
  tables: [
    {
      id: "plateformes",
      label: "Outils et plateformes",
      toastLabel: "Plateforme ajoutée",
      emptyLabel:
        "Aucune plateforme. Ajoutez chaque outil numérique intervenant dans vos prestations.",
      rowLabel: (row) => str(row.nom) || "Plateforme",
      columns: [
        { id: "nom", type: "text", label: "Plateforme", width: "175px" },
        { id: "editeur", type: "text", label: "Éditeur", width: "160px" },
        { id: "usage", type: "select", label: "Usage", options: USAGE_OPTIONS, width: "230px" },
        { id: "contrat", type: "text", label: "Réf. contrat", width: "160px" },
        { id: "date_fin_contrat", type: "date", label: "Fin de contrat", width: "150px" },
        {
          id: "hebergement",
          type: "select",
          label: "Hébergement des données",
          options: HEBERGEMENT_OPTIONS,
          width: "265px",
        },
        {
          id: "accessibilite",
          type: "select",
          label: "Accessibilité",
          options: ACCESSIBILITE_OPTIONS,
          width: "215px",
        },
        {
          id: "assistance",
          type: "select",
          label: "Assistance",
          options: ASSISTANCE_OPTIONS,
          width: "185px",
        },
        { id: "contact_support", type: "text", label: "Contact support", width: "175px" },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "215px",
          compute: ({ row }) => {
            const d = daysUntil(row.date_fin_contrat);
            return firstMatch([
              [!has(row.nom), pending("Plateforme à saisir")],
              [d !== null && d < 0, danger(`Contrat échu le ${fmtDate(row.date_fin_contrat)}`)],
              [hebergementRisque(row.hebergement), danger("Traitement non encadré")],
              [!has(row.hebergement), danger("Hébergement non documenté")],
              [!has(row.contrat), warn("Contrat non référencé")],
              [str(row.assistance) === "aucune", warn("Aucune assistance prévue")],
              [
                ["non_conforme", "non_evaluee"].includes(str(row.accessibilite)),
                warn("Accessibilité à traiter"),
              ],
              [d !== null && d <= 90, warn(`Contrat à renouveler (J-${d})`)],
            ], ok("Conforme"));
          },
        },
        {
          id: "comptes_actifs",
          type: "computed",
          label: "Comptes actifs",
          width: "165px",
          compute: ({ row, tables }) => {
            const comptes = lookupAll(tables.comptes, "plateforme", row.nom);
            if (comptes.length === 0) return pending("Aucun compte tracé");
            const actifs = comptes.filter((c) => str(c.statut) === "actif").length;
            const fantomes = comptes.filter(
              (c) => str(c.statut) === "actif" && has(c.date_depart),
            ).length;
            if (fantomes > 0) return danger(`${actifs} actifs · ${fantomes} à fermer`);
            return ok(`${actifs} actif${actifs > 1 ? "s" : ""}`);
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const echus = count(rows, (r) => (daysUntil(r.date_fin_contrat) ?? 1) < 0);
        const nonEncadres = count(rows, (r) => hebergementRisque(r.hebergement) || !has(r.hebergement));
        const sansAssistance = count(rows, (r) => str(r.assistance) === "aucune");
        const accessibiliteKo = count(rows, (r) =>
          ["non_conforme", "non_evaluee"].includes(str(r.accessibilite)),
        );
        return [
          { label: "Plateformes recensées", value: String(rows.length) },
          {
            label: "Contrats échus",
            value: String(echus),
            tone: echus > 0 ? "danger" : "ok",
          },
          {
            label: "Traitements non encadrés",
            value: String(nonEncadres),
            tone: nonEncadres > 0 ? "danger" : "ok",
            hint: "Hébergement hors UE sans clauses contractuelles types, ou non documenté",
          },
          {
            label: "Accessibilité à traiter",
            value: String(accessibiliteKo),
            tone: accessibiliteKo > 0 ? "warn" : "ok",
          },
          {
            label: "Sans assistance",
            value: String(sansAssistance),
            tone: sansAssistance > 0 ? "warn" : "ok",
          },
        ];
      },
    },
    {
      id: "comptes",
      label: "Comptes et accès",
      toastLabel: "Compte ajouté",
      emptyLabel:
        "Aucun compte. Tracez les accès nominatifs — c'est ce qui permet de détecter les comptes restés ouverts après un départ.",
      rowLabel: (row) => `${str(row.titulaire) || "Titulaire"} · ${str(row.plateforme) || ""}`.trim(),
      columns: [
        { id: "titulaire", type: "text", label: "Titulaire", width: "175px" },
        {
          id: "plateforme",
          type: "text",
          label: "Plateforme",
          width: "175px",
          placeholder: "Nom identique à l'onglet Plateformes",
        },
        { id: "profil", type: "select", label: "Profil", options: PROFIL_OPTIONS, width: "185px" },
        { id: "date_creation", type: "date", label: "Créé le", width: "130px" },
        { id: "date_depart", type: "date", label: "Départ / fin mission", width: "175px" },
        {
          id: "statut",
          type: "select",
          label: "Statut du compte",
          options: STATUT_COMPTE_OPTIONS,
          width: "175px",
        },
        { id: "date_desactivation", type: "date", label: "Désactivé le", width: "145px" },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "220px",
          compute: ({ row }) => {
            const depuisDepart = daysSince(row.date_depart);
            return firstMatch([
              [!has(row.titulaire), pending("Titulaire à saisir")],
              [
                str(row.statut) === "actif" && depuisDepart !== null && depuisDepart > 0,
                danger(`Actif ${depuisDepart} j après le départ`),
              ],
              [
                str(row.statut) === "actif" && has(row.date_depart),
                danger("Départ tracé, compte actif"),
              ],
              [
                str(row.statut) === "desactive" && !has(row.date_desactivation),
                warn("Désactivation non datée"),
              ],
              [!has(row.profil), warn("Profil non précisé")],
              [str(row.statut) === "suspendu", warn("Compte suspendu")],
              [str(row.statut) === "desactive", ok("Compte fermé")],
            ], ok("Accès légitime"));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const actifs = count(rows, (r) => str(r.statut) === "actif");
        const fantomes = count(
          rows,
          (r) => str(r.statut) === "actif" && has(r.date_depart),
        );
        const admins = count(rows, (r) => str(r.profil) === "admin" && str(r.statut) === "actif");
        const externes = count(
          rows,
          (r) => str(r.profil) === "externe" && str(r.statut) === "actif",
        );
        return [
          { label: "Comptes suivis", value: String(rows.length) },
          { label: "Actifs", value: String(actifs) },
          {
            label: "Actifs après départ",
            value: String(fantomes),
            tone: fantomes > 0 ? "danger" : "ok",
          },
          {
            label: "Admins / externes actifs",
            value: `${admins} / ${externes}`,
            tone: admins > 3 ? "warn" : "neutral",
            hint: "Un nombre élevé d'administrateurs est un point de vigilance sécurité",
          },
        ];
      },
    },
  ],
  controls: (tables) => {
    const plateformes = tables.plateformes ?? [];
    const comptes = tables.comptes ?? [];
    const alerts = [];

    const echus = count(plateformes, (r) => (daysUntil(r.date_fin_contrat) ?? 1) < 0);
    if (echus > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Contrats de plateforme échus : l'usage n'est plus couvert contractuellement.",
        count: echus,
      });
    }

    const nonEncadres = count(
      plateformes,
      (r) => has(r.nom) && (hebergementRisque(r.hebergement) || !has(r.hebergement)),
    );
    if (nonEncadres > 0) {
      alerts.push({
        tone: "danger" as const,
        message:
          "Plateformes dont l'hébergement des données n'est pas encadré : transfert hors UE sans clauses contractuelles types, ou non documenté.",
        count: nonEncadres,
      });
    }

    const fantomes = count(
      comptes,
      (r) => str(r.statut) === "actif" && has(r.date_depart),
    );
    if (fantomes > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Comptes restés actifs après le départ de leur titulaire.",
        count: fantomes,
      });
    }

    const proches = count(plateformes, (r) => {
      const d = daysUntil(r.date_fin_contrat);
      return d !== null && d >= 0 && d <= 90;
    });
    if (proches > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Contrats de plateforme arrivant à échéance dans les 3 mois.",
        count: proches,
      });
    }

    const accessibiliteKo = count(plateformes, (r) =>
      ["non_conforme", "non_evaluee"].includes(str(r.accessibilite)),
    );
    if (accessibiliteKo > 0) {
      alerts.push({
        tone: "warn" as const,
        message:
          "Plateformes dont l'accessibilité n'est pas évaluée ou est non conforme : point d'attention sur l'indicateur 26.",
        count: accessibiliteKo,
      });
    }

    const sansAssistance = count(plateformes, (r) => str(r.assistance) === "aucune");
    if (sansAssistance > 0) {
      alerts.push({
        tone: "warn" as const,
        message:
          "Plateformes sans assistance : sur une prestation à distance, l'indicateur 19 attend une modalité de support identifiée.",
        count: sansAssistance,
      });
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M33b. Le lien entre les deux onglets se fait sur le nom de la plateforme : saisissez-le à l'identique pour que la colonne « Comptes actifs » se renseigne.",
    sections: [
      {
        title: "Le contrôle des comptes fantômes",
        content:
          "Renseignez la date de départ dès qu'un formateur ou un sous-traitant quitte l'organisme. Tant que le statut du compte reste « actif », l'alerte se déclenche — c'est le meilleur filet de sécurité contre un accès oublié.",
      },
    ],
  },
};
