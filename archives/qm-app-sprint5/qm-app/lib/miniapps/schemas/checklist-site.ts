import type { MiniAppSchema } from "../schema-types";

const STATUT_OPTIONS = [
  { value: "ok", label: "✓ OK" },
  { value: "ko", label: "❌ KO / À corriger" },
  { value: "partiel", label: "⚠ Partiel" },
  { value: "na", label: "— N/A" },
];

const RUBRIQUE_OPTIONS = [
  { value: "info_prealable", label: "📋 Info préalable (I1)" },
  { value: "resultats", label: "📊 Résultats publiés (I2)" },
  { value: "certifications", label: "🏆 Certifications RNCP/RS (I3)" },
];

const SUPPORT_OPTIONS = [
  { value: "site", label: "🌐 Site web" },
  { value: "plaquette", label: "📄 Plaquette" },
  { value: "catalogue", label: "📚 Catalogue" },
  { value: "devis", label: "💼 Devis / contrat" },
  { value: "linkedin", label: "🔗 LinkedIn" },
];

export const checklistSiteSchema: MiniAppSchema = {
  key: "checklist-site",
  name: "Check-list site web & supports",
  shortName: "Check-list site",
  description:
    "Audit interne des supports commerciaux : site, plaquettes, devis, etc. Vérification que toutes les mentions obligatoires des indicateurs I1, I2, I3 sont bien présentes.",
  indicators: ["I1", "I2", "I3"],
  critere: 1,
  tables: [
    {
      id: "checklist",
      label: "Points de vérification",
      toastLabel: "Point ajouté",
      rowLabel: (row) => String(row.point ?? "Point de vérification"),
      columns: [
        { id: "rubrique", type: "select", label: "Indicateur", options: RUBRIQUE_OPTIONS, width: "200px" },
        { id: "point", type: "text", label: "Point à vérifier", width: "300px" },
        { id: "support", type: "select", label: "Support", options: SUPPORT_OPTIONS, width: "140px" },
        { id: "url", type: "text", label: "URL / Référence" },
        { id: "statut", type: "select", label: "Statut", options: STATUT_OPTIONS, width: "150px" },
        { id: "date_verif", type: "date", label: "Vérifié le", width: "130px" },
        { id: "commentaire", type: "textarea", label: "Commentaire / action" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
  ],
  seed: {
    checklist: [
      // I1 — Info préalable
      { rubrique: "info_prealable", point: "Prérequis et public visé", support: "site", statut: "ok" },
      { rubrique: "info_prealable", point: "Objectifs de chaque formation", support: "site", statut: "ok" },
      { rubrique: "info_prealable", point: "Durée, tarif, modalités d'éval.", support: "site", statut: "ok" },
      { rubrique: "info_prealable", point: "Délais d'accès", support: "site", statut: "ok" },
      { rubrique: "info_prealable", point: "Modalités handicap (réf., contacts)", support: "site", statut: "ok" },
      { rubrique: "info_prealable", point: "Méthodes mobilisées (présentiel/FOAD/AFEST)", support: "site", statut: "ok" },
      // I2 — Résultats
      { rubrique: "resultats", point: "Taux d'obtention (apprentissage)", support: "site", statut: "ok" },
      { rubrique: "resultats", point: "Taux d'insertion", support: "site", statut: "ok" },
      { rubrique: "resultats", point: "Taux de satisfaction", support: "site", statut: "ok" },
      { rubrique: "resultats", point: "Taux de rupture (apprentissage)", support: "site", statut: "ok" },
      // I3 — Certifications
      { rubrique: "certifications", point: "Mention RNCP/RS + n° fiche", support: "site", statut: "ok" },
      { rubrique: "certifications", point: "Blocs de compétences listés", support: "site", statut: "ok" },
      { rubrique: "certifications", point: "Équivalences / passerelles", support: "site", statut: "ok" },
      { rubrique: "certifications", point: "Suites de parcours possibles", support: "site", statut: "ok" },
    ],
  },
};
