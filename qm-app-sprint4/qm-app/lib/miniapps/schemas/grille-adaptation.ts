import type { MiniAppSchema } from "../schema-types";

const PROFIL_TYPE_OPTIONS = [
  { value: "individuel", label: "👤 Bénéficiaire individuel" },
  { value: "groupe", label: "👥 Groupe / promo" },
  { value: "entreprise", label: "🏢 Public entreprise" },
];

const AXE_OPTIONS = [
  { value: "contenu", label: "📚 Contenu" },
  { value: "rythme", label: "⏱ Rythme / durée" },
  { value: "modalite", label: "💻 Modalité (FOAD/présentiel)" },
  { value: "evaluation", label: "📝 Évaluation" },
  { value: "support", label: "🛠 Support pédagogique" },
  { value: "accessibilite", label: "♿ Accessibilité (PSH)" },
];

const STATUT_OPTIONS = [
  { value: "identifie", label: "👁 Identifié" },
  { value: "decide", label: "✓ Décidé" },
  { value: "mis_en_oeuvre", label: "✓ Mis en œuvre" },
  { value: "evalue", label: "✓ Évalué" },
];

export const grilleAdaptationSchema: MiniAppSchema = {
  key: "grille-adaptation",
  name: "Grille d'adaptation au profil",
  shortName: "Grille adaptation",
  description:
    "Trace l'adaptation pédagogique aux bénéficiaires : positionnement, profils particuliers, adaptations décidées (contenu, rythme, support, accessibilité), évaluation de l'efficacité.",
  indicators: ["I6", "I10", "I26"],
  critere: 2,
  tabs: [
    { id: "profils", label: "Profils & positionnement", tableIds: ["profils"] },
    { id: "adaptations", label: "Adaptations décidées", tableIds: ["adaptations"] },
  ],
  tables: [
    {
      id: "profils",
      label: "Positionnement & profils",
      toastLabel: "Profil ajouté",
      rowLabel: (row) => String(row.beneficiaire ?? "Profil"),
      columns: [
        { id: "beneficiaire", type: "text", label: "Bénéficiaire / Groupe", width: "200px" },
        { id: "type_profil", type: "select", label: "Type", options: PROFIL_TYPE_OPTIONS, width: "180px" },
        { id: "date_position", type: "date", label: "Date positionnement", width: "150px" },
        { id: "prerequis", type: "textarea", label: "Niveau / prérequis identifiés" },
        { id: "specificites", type: "textarea", label: "Spécificités (PSH, niveau, etc.)" },
        { id: "objectifs_perso", type: "textarea", label: "Objectifs personnalisés" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
    {
      id: "adaptations",
      label: "Adaptations décidées et mises en œuvre",
      toastLabel: "Adaptation ajoutée",
      rowLabel: (row) => `${String(row.beneficiaire ?? "Bénéficiaire")} — ${String(row.axe ?? "")}`,
      columns: [
        { id: "beneficiaire", type: "text", label: "Bénéficiaire", width: "180px" },
        { id: "axe", type: "select", label: "Axe", options: AXE_OPTIONS, width: "180px" },
        { id: "besoin", type: "textarea", label: "Besoin identifié" },
        { id: "adaptation", type: "textarea", label: "Adaptation mise en œuvre" },
        { id: "responsable", type: "text", label: "Responsable", width: "150px" },
        { id: "date_mise_oeuvre", type: "date", label: "Date mise en œuvre", width: "150px" },
        { id: "efficacite", type: "textarea", label: "Évaluation de l'efficacité" },
        { id: "statut", type: "select", label: "Statut", options: STATUT_OPTIONS, width: "150px" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
  ],
};
