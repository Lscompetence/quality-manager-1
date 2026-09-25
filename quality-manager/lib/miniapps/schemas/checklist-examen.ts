import type { MiniAppSchema } from "../schema-types";

const STATUT_OPTIONS = [
  { value: "ok", label: "✓ OK" },
  { value: "ko", label: "❌ À traiter" },
  { value: "en_cours", label: "⏳ En cours" },
  { value: "na", label: "— N/A" },
];

const PHASE_OPTIONS = [
  { value: "amont", label: "🔵 J-30 / Amont" },
  { value: "j_moins_7", label: "🟠 J-7 / Convocations" },
  { value: "j_moins_1", label: "🟡 J-1 / Veille" },
  { value: "jour_j", label: "🟢 Jour J" },
  { value: "post", label: "🟣 Post-examen" },
];

const RESPONSABLE_OPTIONS = [
  { value: "admin", label: "👔 Admin" },
  { value: "referent_certif", label: "🎓 Référent certification" },
  { value: "surveillant", label: "👀 Surveillant" },
  { value: "jury", label: "⚖ Jury" },
  { value: "logistique", label: "🚐 Logistique" },
];

export const checklistExamenSchema: MiniAppSchema = {
  key: "checklist-examen",
  name: "Check-list examen & certification",
  shortName: "Check-list examen",
  description:
    "Préparation rigoureuse des sessions de certification : 29 points de vérification du J-30 au post-examen. Démontre en audit que la session a été pilotée selon les exigences du certificateur.",
  indicators: ["I16"],
  critere: 3,
  tables: [
    {
      id: "examen",
      label: "Préparation et déroulement examen",
      toastLabel: "Point ajouté",
      rowLabel: (row) => String(row.point ?? "Point check-list"),
      columns: [
        { id: "phase", type: "select", label: "Phase", options: PHASE_OPTIONS, width: "170px" },
        { id: "point", type: "text", label: "Action", width: "320px" },
        { id: "responsable", type: "select", label: "Responsable", options: RESPONSABLE_OPTIONS, width: "180px" },
        { id: "deadline", type: "date", label: "Échéance", width: "130px" },
        { id: "statut", type: "select", label: "Statut", options: STATUT_OPTIONS, width: "130px" },
        { id: "commentaire", type: "textarea", label: "Commentaire" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
  ],
  seed: {
    examen: [
      // === J-30 ===
      { phase: "amont", point: "Calendrier officiel reçu du certificateur", responsable: "referent_certif", statut: "ok" },
      { phase: "amont", point: "Vérification éligibilité candidats", responsable: "admin", statut: "ok" },
      { phase: "amont", point: "Adaptations PSH déclarées", responsable: "referent_certif", statut: "ok" },
      { phase: "amont", point: "Demande tiers temps / aménagements", responsable: "referent_certif", statut: "ok" },
      { phase: "amont", point: "Sujets / supports d'examen reçus", responsable: "referent_certif", statut: "ok" },
      { phase: "amont", point: "Salles réservées (avec capacité jury)", responsable: "logistique", statut: "ok" },
      { phase: "amont", point: "Jury constitué + convoqué", responsable: "referent_certif", statut: "ok" },
      // === J-7 ===
      { phase: "j_moins_7", point: "Convocations candidats envoyées", responsable: "admin", statut: "ok" },
      { phase: "j_moins_7", point: "Convocations surveillants/jury envoyées", responsable: "admin", statut: "ok" },
      { phase: "j_moins_7", point: "Plan de salle + ordre de passage", responsable: "referent_certif", statut: "ok" },
      { phase: "j_moins_7", point: "Documents d'examen prêts (copies, sujets)", responsable: "referent_certif", statut: "ok" },
      { phase: "j_moins_7", point: "Procédures incident transmises", responsable: "referent_certif", statut: "ok" },
      // === J-1 ===
      { phase: "j_moins_1", point: "Rappel candidats", responsable: "admin", statut: "ok" },
      { phase: "j_moins_1", point: "Vérification équipements salles", responsable: "logistique", statut: "ok" },
      { phase: "j_moins_1", point: "Préparation pièces d'identité à vérifier", responsable: "surveillant", statut: "ok" },
      { phase: "j_moins_1", point: "Briefing dernier surveillants", responsable: "referent_certif", statut: "ok" },
      // === Jour J ===
      { phase: "jour_j", point: "Accueil candidats + vérification identité", responsable: "surveillant", statut: "ok" },
      { phase: "jour_j", point: "Émargement d'entrée + sortie", responsable: "surveillant", statut: "ok" },
      { phase: "jour_j", point: "Application des aménagements PSH", responsable: "surveillant", statut: "ok" },
      { phase: "jour_j", point: "Surveillance + temps respecté", responsable: "surveillant", statut: "ok" },
      { phase: "jour_j", point: "Recueil + vérification copies / supports", responsable: "surveillant", statut: "ok" },
      { phase: "jour_j", point: "PV de session signé", responsable: "referent_certif", statut: "ok" },
      // === Post ===
      { phase: "post", point: "Acheminement copies au certificateur", responsable: "admin", statut: "ok" },
      { phase: "post", point: "Délibération jury (oraux/projets)", responsable: "jury", statut: "ok" },
      { phase: "post", point: "Saisie résultats / décisions", responsable: "referent_certif", statut: "ok" },
      { phase: "post", point: "Communication résultats aux candidats", responsable: "admin", statut: "ok" },
      { phase: "post", point: "Édition + envoi diplômes / certifs", responsable: "admin", statut: "ok" },
      { phase: "post", point: "Procédures de recours documentées", responsable: "referent_certif", statut: "ok" },
      { phase: "post", point: "Bilan session + actions amélioration", responsable: "referent_certif", statut: "ok" },
    ],
  },
};
