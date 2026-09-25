import type { MiniAppSchema, Row } from "../schema-types";
import {
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
  sum,
  warn,
} from "../helpers";

// M33c — Dotations individuelles en équipements de protection et suivi du stock.
// Signale les remises non signées et les stocks passés sous le seuil d'alerte.

const TYPE_EPI_OPTIONS = [
  { value: "chaussures", label: "🥾 Chaussures de sécurité" },
  { value: "casque", label: "⛑ Casque" },
  { value: "lunettes", label: "🥽 Lunettes / visière" },
  { value: "gants", label: "🧤 Gants" },
  { value: "auditif", label: "🎧 Protection auditive" },
  { value: "respiratoire", label: "😷 Protection respiratoire" },
  { value: "vetement", label: "🦺 Vêtement de travail / haute visibilité" },
  { value: "harnais", label: "🪢 Harnais / antichute" },
];

const SIGNATURE_OPTIONS = [
  { value: "signee", label: "✍️ Décharge signée" },
  { value: "non", label: "✗ Non signée" },
];

const ETAT_OPTIONS = [
  { value: "neuf", label: "✨ Neuf" },
  { value: "bon", label: "✓ Bon état" },
  { value: "usage", label: "◐ Usagé — à surveiller" },
  { value: "rebut", label: "🗑 À rebuter" },
  { value: "restitue", label: "↩️ Restitué" },
];

const CONTROLE_OPTIONS = [
  { value: "conforme", label: "✓ Conforme" },
  { value: "a_remplacer", label: "🔄 À remplacer" },
  { value: "retire", label: "🚫 Retiré du service" },
];

const remiseNonSignee = (r: Row) =>
  has(r.beneficiaire) && (str(r.signature) === "non" || !has(r.signature));

export const registreEpiSchema: MiniAppSchema = {
  key: "registre-epi",
  name: "Registre des équipements de protection",
  shortName: "Registre EPI",
  description:
    "Dotations individuelles en équipements de protection et suivi du stock. Les remises non signées et les stocks passés sous le seuil d'alerte sont signalés automatiquement.",
  indicators: ["I17"],
  critere: 4,
  docRef: "M33c",
  categories: ["CFA", "AF"],
  tabs: [
    { id: "dotations", label: "Dotations individuelles", tableIds: ["dotations"] },
    { id: "stock", label: "Stock et contrôles", tableIds: ["stock"] },
  ],
  tables: [
    {
      id: "dotations",
      label: "Dotations individuelles",
      toastLabel: "Dotation enregistrée",
      emptyLabel:
        "Aucune dotation. Ajoutez une ligne par équipement remis à un apprenant ou à un formateur.",
      rowLabel: (row) =>
        `${str(row.beneficiaire) || "Bénéficiaire"} · ${str(row.type) || "EPI"}`,
      columns: [
        { id: "beneficiaire", type: "text", label: "Bénéficiaire", width: "175px" },
        { id: "groupe", type: "text", label: "Groupe / promotion", width: "165px" },
        { id: "type", type: "select", label: "Type d'EPI", options: TYPE_EPI_OPTIONS, width: "245px" },
        { id: "modele", type: "text", label: "Modèle / taille", width: "160px" },
        { id: "date_remise", type: "date", label: "Remis le", width: "130px" },
        {
          id: "signature",
          type: "select",
          label: "Décharge",
          options: SIGNATURE_OPTIONS,
          width: "175px",
        },
        { id: "etat", type: "select", label: "État", options: ETAT_OPTIONS, width: "190px" },
        { id: "date_restitution", type: "date", label: "Restitué le", width: "135px" },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "205px",
          compute: ({ row }) =>
            firstMatch([
              [!has(row.beneficiaire), pending("Bénéficiaire à saisir")],
              [!has(row.type), pending("Type à saisir")],
              [remiseNonSignee(row), danger("Remise non signée")],
              [!has(row.date_remise), danger("Remise non datée")],
              [str(row.etat) === "rebut", danger("À rebuter — remplacer")],
              [str(row.etat) === "usage", warn("Usagé — à surveiller")],
              [
                str(row.etat) === "restitue" && !has(row.date_restitution),
                warn("Restitution non datée"),
              ],
              [str(row.etat) === "restitue", ok("Restitué")],
            ], ok("Dotation conforme")),
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const nonSignees = count(rows, remiseNonSignee);
        const aRemplacer = count(rows, (r) =>
          ["rebut", "usage"].includes(str(r.etat)),
        );
        const enCirculation = count(
          rows,
          (r) => has(r.beneficiaire) && str(r.etat) !== "restitue",
        );
        const beneficiaires = new Set(
          rows.map((r) => str(r.beneficiaire)).filter(Boolean),
        ).size;
        return [
          {
            label: "Dotations · bénéficiaires",
            value: `${rows.length} · ${beneficiaires}`,
          },
          {
            label: "Remises non signées",
            value: String(nonSignees),
            tone: nonSignees > 0 ? "danger" : "ok",
          },
          {
            label: "En circulation",
            value: String(enCirculation),
          },
          {
            label: "Usagés / à rebuter",
            value: String(aRemplacer),
            tone: aRemplacer > 0 ? "warn" : "ok",
          },
        ];
      },
    },
    {
      id: "stock",
      label: "Stock et contrôles périodiques",
      toastLabel: "Référence ajoutée",
      emptyLabel:
        "Aucune référence en stock. Ajoutez une ligne par référence d'EPI détenue.",
      rowLabel: (row) => `${str(row.type) || "EPI"} · ${str(row.modele) || ""}`.trim(),
      columns: [
        { id: "type", type: "select", label: "Type d'EPI", options: TYPE_EPI_OPTIONS, width: "245px" },
        { id: "modele", type: "text", label: "Modèle / référence", width: "175px" },
        { id: "norme", type: "text", label: "Norme", width: "140px", placeholder: "EN 345" },
        { id: "quantite", type: "number", label: "Quantité", width: "115px" },
        { id: "seuil", type: "number", label: "Seuil d'alerte", width: "145px" },
        {
          id: "niveau",
          type: "computed",
          label: "Niveau de stock",
          width: "200px",
          compute: ({ row, tables }) => {
            if (!has(row.quantite)) return pending("Quantité à saisir");
            const stock = num(row.quantite);
            const seuil = num(row.seuil);
            const sorties = lookupAll(tables.dotations, "type", row.type).filter(
              (d) => str(d.modele) === str(row.modele) && str(d.etat) !== "restitue",
            ).length;
            const dispo = stock - sorties;
            const txt = `${dispo} dispo · ${sorties} sorti(s)`;
            if (dispo < 0) return danger(`Incohérent · ${txt}`);
            if (seuil && dispo <= seuil) return danger(`Sous le seuil · ${txt}`);
            if (seuil && dispo <= seuil * 1.5) return warn(txt);
            return ok(txt);
          },
        },
        { id: "date_controle", type: "date", label: "Dernier contrôle", width: "155px" },
        { id: "date_peremption", type: "date", label: "Péremption", width: "140px" },
        {
          id: "resultat_controle",
          type: "select",
          label: "Résultat",
          options: CONTROLE_OPTIONS,
          width: "185px",
        },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "200px",
          compute: ({ row }) => {
            const d = daysUntil(row.date_peremption);
            return firstMatch([
              [!has(row.type), pending("Type à saisir")],
              [d !== null && d < 0, danger(`Périmé le ${fmtDate(row.date_peremption)}`)],
              [str(row.resultat_controle) === "retire", danger("Retiré du service")],
              [str(row.resultat_controle) === "a_remplacer", danger("À remplacer")],
              [!has(row.date_controle), warn("Jamais contrôlé")],
              [d !== null && d <= 90, warn(`Péremption dans ${d} j`)],
              [!has(row.norme), warn("Norme non référencée")],
              [!has(row.seuil), warn("Seuil d'alerte non défini")],
            ], ok("Stock conforme"));
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows, tables }) => {
        const sousSeuil = count(rows, (r) => {
          const seuil = num(r.seuil);
          if (!seuil) return false;
          const sorties = lookupAll(tables.dotations, "type", r.type).filter(
            (d) => str(d.modele) === str(r.modele) && str(d.etat) !== "restitue",
          ).length;
          return num(r.quantite) - sorties <= seuil;
        });
        const perimes = count(rows, (r) => (daysUntil(r.date_peremption) ?? 1) < 0);
        const jamaisControles = count(rows, (r) => has(r.type) && !has(r.date_controle));
        return [
          { label: "Références suivies", value: String(rows.length) },
          {
            label: "Quantité totale",
            value: String(sum(rows, (r) => num(r.quantite))),
          },
          {
            label: "Sous le seuil d'alerte",
            value: String(sousSeuil),
            tone: sousSeuil > 0 ? "danger" : "ok",
          },
          {
            label: "Périmés / jamais contrôlés",
            value: `${perimes} / ${jamaisControles}`,
            tone: perimes > 0 ? "danger" : jamaisControles > 0 ? "warn" : "ok",
          },
        ];
      },
    },
  ],
  controls: (tables) => {
    const dotations = tables.dotations ?? [];
    const stock = tables.stock ?? [];
    const alerts = [];

    const nonSignees = count(dotations, remiseNonSignee);
    if (nonSignees > 0) {
      alerts.push({
        tone: "danger" as const,
        message:
          "Remises d'EPI sans décharge signée : la remise n'est pas prouvée en cas d'accident.",
        count: nonSignees,
      });
    }

    const sousSeuil = count(stock, (r) => {
      const seuil = num(r.seuil);
      if (!seuil) return false;
      const sorties = lookupAll(dotations, "type", r.type).filter(
        (d) => str(d.modele) === str(r.modele) && str(d.etat) !== "restitue",
      ).length;
      return num(r.quantite) - sorties <= seuil;
    });
    if (sousSeuil > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Références passées sous le seuil d'alerte : réapprovisionner.",
        count: sousSeuil,
      });
    }

    const perimes = count(stock, (r) => (daysUntil(r.date_peremption) ?? 1) < 0);
    if (perimes > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Équipements périmés encore en stock : les retirer du service.",
        count: perimes,
      });
    }

    const aRebuter = count(dotations, (r) => str(r.etat) === "rebut");
    if (aRebuter > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "EPI en circulation signalés à rebuter : remplacement à engager.",
        count: aRebuter,
      });
    }

    const jamaisControles = count(stock, (r) => has(r.type) && !has(r.date_controle));
    if (jamaisControles > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Références jamais contrôlées.",
        count: jamaisControles,
      });
    }

    const sansSeuil = count(stock, (r) => has(r.type) && !has(r.seuil));
    if (sansSeuil > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Références sans seuil d'alerte : l'alerte de réapprovisionnement ne peut pas jouer.",
        count: sansSeuil,
      });
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M33c. Le stock disponible se calcule en déduisant les dotations non restituées : le lien se fait sur le couple type + modèle.",
    sections: [
      {
        title: "Pourquoi la décharge signée",
        content:
          "La remise d'un EPI engage la responsabilité de l'organisme. Une dotation non signée ne prouve ni la remise, ni l'information sur les conditions d'usage — c'est le premier point vérifié sur un plateau technique.",
      },
    ],
  },
};
