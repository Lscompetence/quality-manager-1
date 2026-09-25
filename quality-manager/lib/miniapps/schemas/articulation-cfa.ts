import type { MiniAppSchema } from "../schema-types";

const TYPE_ECHANGE_OPTIONS = [
  { value: "visite", label: "🏢 Visite en entreprise" },
  { value: "fiche_navette", label: "🔄 Fiche navette" },
  { value: "rdv_tripartite", label: "🤝 RDV tripartite" },
  { value: "telephone", label: "📞 Échange téléphonique" },
  { value: "mail", label: "📧 Échange mail" },
  { value: "incident", label: "⚠ Gestion incident" },
];

const STATUT_VISITE_OPTIONS = [
  { value: "prevue", label: "📅 Prévue" },
  { value: "realisee", label: "✓ Réalisée" },
  { value: "annulee", label: "✗ Annulée" },
  { value: "reportee", label: "🔄 Reportée" },
];

const SATISFACTION_OPTIONS = [
  { value: "tres_bien", label: "✓ Très bien" },
  { value: "bien", label: "✓ Bien" },
  { value: "moyen", label: "⚠ Moyen" },
  { value: "alerte", label: "🔴 Alerte" },
];

export const articulationCfaSchema: MiniAppSchema = {
  key: "articulation-cfa",
  name: "Articulation CFA / entreprise",
  shortName: "Articulation CFA",
  description:
    "Suivi rigoureux des échanges entre le CFA, l'apprenti et l'entreprise d'accueil : planning alternance, visites obligatoires, fiches navettes, RDV tripartites.",
  indicators: ["I13"],
  critere: 3,
  tabs: [
    { id: "planning", label: "Planning alternance", tableIds: ["planning"] },
    { id: "echanges", label: "Échanges CFA / entreprise", tableIds: ["echanges"] },
  ],
  tables: [
    {
      id: "planning",
      label: "Planning d'alternance par apprenti",
      toastLabel: "Planning ajouté",
      rowLabel: (row) => String(row.apprenti ?? "Apprenti"),
      columns: [
        { id: "apprenti", type: "text", label: "Apprenti", width: "180px" },
        { id: "entreprise", type: "text", label: "Entreprise d'accueil", width: "180px" },
        { id: "tuteur", type: "text", label: "Tuteur entreprise", width: "180px" },
        { id: "maitre_apprentissage", type: "text", label: "Maître d'apprentissage", width: "180px" },
        { id: "rythme", type: "text", label: "Rythme alternance", placeholder: "Ex: 3 sem. entreprise / 1 sem. CFA" },
        { id: "debut", type: "date", label: "Début contrat", width: "130px" },
        { id: "fin", type: "date", label: "Fin contrat", width: "130px" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
    {
      id: "echanges",
      label: "Registre des échanges et visites",
      toastLabel: "Échange ajouté",
      rowLabel: (row) => `${String(row.apprenti ?? "")} — ${String(row.type ?? "Échange")}`,
      columns: [
        { id: "date", type: "date", label: "Date", width: "130px" },
        { id: "apprenti", type: "text", label: "Apprenti", width: "180px" },
        { id: "type", type: "select", label: "Type", options: TYPE_ECHANGE_OPTIONS, width: "180px" },
        { id: "interlocuteur", type: "text", label: "Interlocuteur entreprise" },
        { id: "objet", type: "textarea", label: "Objet / contenu" },
        { id: "satisfaction", type: "select", label: "Évaluation", options: SATISFACTION_OPTIONS, width: "130px" },
        { id: "statut", type: "select", label: "Statut", options: STATUT_VISITE_OPTIONS, width: "130px" },
        { id: "actions", type: "textarea", label: "Actions décidées" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
  ],
};
