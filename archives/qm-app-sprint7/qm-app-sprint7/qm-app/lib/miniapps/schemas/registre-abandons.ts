import type { MiniAppSchema } from "../schema-types";
import {
  count,
  danger,
  firstMatch,
  has,
  mode,
  num,
  ok,
  optLabel,
  pct,
  pending,
  ratio,
  str,
  toneFromRateInverse,
  warn,
} from "../helpers";

// M27c — Sorties avant terme : motif réel, origine, et action corrective quand
// l'abandon est imputable à la prestation (jonction I12 → I32).

const ORIGINE_OPTIONS = [
  { value: "prestation", label: "🎓 Liée à la prestation" },
  { value: "personnelle", label: "🏠 Personnelle" },
  { value: "professionnelle", label: "💼 Professionnelle" },
  { value: "sante", label: "🏥 Santé" },
  { value: "financement", label: "💶 Financement" },
  { value: "entreprise", label: "🏭 Entreprise d'accueil" },
];

const MOTIF_OPTIONS = [
  { value: "niveau_inadapte", label: "Niveau inadapté au parcours" },
  { value: "rythme", label: "Rythme trop soutenu / trop lent" },
  { value: "contenu", label: "Contenu non conforme à l'attente" },
  { value: "pedagogie", label: "Qualité de l'animation" },
  { value: "organisation", label: "Organisation / logistique" },
  { value: "emploi_trouve", label: "Emploi ou mission trouvée" },
  { value: "demenagement", label: "Déménagement / mobilité" },
  { value: "familial", label: "Contraintes familiales" },
  { value: "maladie", label: "Maladie / accident" },
  { value: "rupture_contrat", label: "Rupture du contrat d'apprentissage" },
  { value: "perte_financement", label: "Perte du financement" },
  { value: "autre", label: "Autre" },
];

const RELANCE_OPTIONS = [
  { value: "aucune", label: "✗ Aucune relance" },
  { value: "1", label: "① Niveau 1 — contact" },
  { value: "2", label: "② Niveau 2 — entretien" },
  { value: "3", label: "③ Niveau 3 — courrier / tripartite" },
];

const STATUT_ACTION_OPTIONS = [
  { value: "aucune", label: "— Aucune action" },
  { value: "identifiee", label: "📌 Identifiée" },
  { value: "engagee", label: "⏳ Engagée" },
  { value: "realisee", label: "✓ Réalisée" },
];

const estPrestation = (v: unknown) => str(v) === "prestation";
const sansAction = (v: unknown) => !has(v) || str(v) === "aucune";

export const registreAbandonsSchema: MiniAppSchema = {
  key: "registre-abandons",
  name: "Registre des abandons",
  shortName: "Registre abandons",
  description:
    "Une ligne par sortie avant terme, avec le motif réel et son origine. Le taux d'abandon et le motif dominant se calculent seuls, et tout abandon imputable à la prestation qui ne débouche pas sur une action corrective est signalé.",
  indicators: ["I12", "I32"],
  critere: 3,
  docRef: "M27c",
  tabs: [
    { id: "effectifs", label: "Effectifs de référence", tableIds: ["effectifs"] },
    { id: "registre", label: "Registre des abandons", tableIds: ["registre"] },
  ],
  tables: [
    {
      id: "effectifs",
      label: "Effectifs par session — base de calcul du taux",
      toastLabel: "Session ajoutée",
      emptyLabel:
        "Ajoutez vos sessions et leurs effectifs entrés : c'est le dénominateur du taux d'abandon.",
      rowLabel: (row) => str(row.session) || "Session",
      columns: [
        { id: "session", type: "text", label: "Session / promotion" },
        { id: "periode", type: "text", label: "Période", width: "170px", placeholder: "2025-2026" },
        { id: "entres", type: "number", label: "Entrés", width: "110px" },
        {
          id: "taux",
          type: "computed",
          label: "Taux d'abandon",
          width: "185px",
          compute: ({ row, tables }) => {
            const entres = num(row.entres);
            if (!entres) return pending("Effectif à saisir");
            const abandons = (tables.registre ?? []).filter(
              (r) => str(r.session) === str(row.session) && has(r.beneficiaire),
            ).length;
            const taux = ratio(abandons, entres);
            const txt = `${abandons}/${entres} · ${taux.toFixed(1).replace(".", ",")} %`;
            if (taux <= 10) return ok(txt);
            if (taux <= 20) return warn(txt);
            return danger(txt);
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
    {
      id: "registre",
      label: "Registre des sorties avant terme",
      toastLabel: "Abandon enregistré",
      emptyLabel: "Aucun abandon enregistré.",
      rowLabel: (row) => str(row.beneficiaire) || "Abandon",
      columns: [
        { id: "beneficiaire", type: "text", label: "Bénéficiaire", width: "170px" },
        {
          id: "session",
          type: "text",
          label: "Session",
          width: "160px",
          placeholder: "Libellé identique à l'onglet Effectifs",
        },
        { id: "date_entree", type: "date", label: "Entrée", width: "125px" },
        { id: "date_sortie", type: "date", label: "Sortie", width: "125px" },
        { id: "origine", type: "select", label: "Origine", options: ORIGINE_OPTIONS, width: "190px" },
        { id: "motif", type: "select", label: "Motif réel", options: MOTIF_OPTIONS, width: "225px" },
        { id: "precisions", type: "textarea", label: "Précisions (mots du bénéficiaire)" },
        {
          id: "relance",
          type: "select",
          label: "Relances menées",
          options: RELANCE_OPTIONS,
          width: "195px",
        },
        { id: "action", type: "textarea", label: "Action corrective décidée" },
        {
          id: "statut_action",
          type: "select",
          label: "Statut action",
          options: STATUT_ACTION_OPTIONS,
          width: "155px",
        },
        {
          id: "controle",
          type: "computed",
          label: "Contrôle",
          width: "205px",
          compute: ({ row }) =>
            firstMatch([
              [!has(row.beneficiaire), pending("Bénéficiaire à saisir")],
              [!has(row.motif), danger("Motif réel non renseigné")],
              [!has(row.origine), warn("Origine non qualifiée")],
              [
                estPrestation(row.origine) && sansAction(row.statut_action),
                danger("Imputable — action corrective absente"),
              ],
              [
                estPrestation(row.origine) && !has(row.action),
                danger("Imputable — action non décrite"),
              ],
              [
                sansAction(row.relance) || str(row.relance) === "aucune",
                warn("Aucune relance avant la sortie"),
              ],
              [
                estPrestation(row.origine) && str(row.statut_action) === "realisee",
                ok("Imputable — traité"),
              ],
            ], ok("Sortie documentée")),
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows, tables }) => {
        const entresTotal = (tables.effectifs ?? []).reduce((s, r) => s + num(r.entres), 0);
        const taux = ratio(rows.length, entresTotal);
        const dominant = mode(rows, "motif");
        const imputables = count(rows, (r) => estPrestation(r.origine));
        const imputablesSansAction = count(
          rows,
          (r) => estPrestation(r.origine) && sansAction(r.statut_action),
        );
        const sansRelance = count(
          rows,
          (r) => !has(r.relance) || str(r.relance) === "aucune",
        );
        return [
          {
            label: "Taux d'abandon global",
            value: entresTotal ? `${taux.toFixed(1).replace(".", ",")} %` : "—",
            tone: entresTotal ? toneFromRateInverse(taux, 10, 20) : "neutral",
            hint: `${rows.length} abandon(s) sur ${entresTotal} entrée(s)`,
          },
          {
            label: "Motif dominant",
            value: dominant
              ? `${optLabel(MOTIF_OPTIONS, dominant.value)} (${dominant.n})`
              : "—",
          },
          {
            label: "Imputables à la prestation",
            value: `${imputables} · ${pct(imputables, rows.length)}`,
            tone: imputables === 0 ? "ok" : "warn",
          },
          {
            label: "Imputables sans action",
            value: String(imputablesSansAction),
            tone: imputablesSansAction > 0 ? "danger" : "ok",
          },
          {
            label: "Sorties sans relance préalable",
            value: String(sansRelance),
            tone: sansRelance > 0 ? "warn" : "ok",
          },
        ];
      },
    },
  ],
  controls: (tables) => {
    const rows = tables.registre ?? [];
    const effectifs = tables.effectifs ?? [];
    const alerts = [];

    const imputablesSansAction = count(
      rows,
      (r) => estPrestation(r.origine) && (sansAction(r.statut_action) || !has(r.action)),
    );
    if (imputablesSansAction > 0) {
      alerts.push({
        tone: "danger" as const,
        message:
          "Abandons imputables à la prestation sans action corrective : écart direct sur l'indicateur 32.",
        count: imputablesSansAction,
      });
    }

    const sansMotif = count(rows, (r) => has(r.beneficiaire) && !has(r.motif));
    if (sansMotif > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Abandons sans motif réel renseigné : l'analyse des causes est impossible.",
        count: sansMotif,
      });
    }

    const entresTotal = effectifs.reduce((s, r) => s + num(r.entres), 0);
    if (entresTotal > 0) {
      const taux = ratio(rows.length, entresTotal);
      if (taux > 20) {
        alerts.push({
          tone: "danger" as const,
          message: `Taux d'abandon global de ${taux.toFixed(1).replace(".", ",")} % : l'auditeur attendra une analyse et un plan d'action documentés.`,
        });
      } else if (taux > 10) {
        alerts.push({
          tone: "warn" as const,
          message: `Taux d'abandon global de ${taux.toFixed(1).replace(".", ",")} % : à commenter dans la revue qualité.`,
        });
      }
    } else if (rows.length > 0) {
      alerts.push({
        tone: "warn" as const,
        message:
          "Effectifs de référence non saisis : le taux d'abandon ne peut pas être calculé.",
      });
    }

    const dominant = mode(rows, "motif");
    if (dominant && rows.length >= 3 && dominant.n / rows.length >= 0.4) {
      alerts.push({
        tone: "warn" as const,
        message: `Motif dominant : « ${optLabel(MOTIF_OPTIONS, dominant.value)} » sur ${dominant.n} sorties — traiter la cause plutôt que les cas.`,
      });
    }

    const sansRelance = count(
      rows,
      (r) => has(r.beneficiaire) && (!has(r.relance) || str(r.relance) === "aucune"),
    );
    if (sansRelance > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Sorties sans aucune relance préalable tracée (protocole M27a / M27b).",
        count: sansRelance,
      });
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M27c. Le taux se calcule à partir des effectifs saisis dans le premier onglet — le libellé de session doit être identique dans les deux onglets.",
    sections: [
      {
        title: "Pourquoi distinguer l'origine",
        content:
          "Un abandon pour déménagement ne dit rien de votre qualité. Un abandon pour « niveau inadapté » pointe le positionnement (I8). L'auditeur ne vous reproche pas d'avoir des abandons : il vérifie que vous savez lesquels vous concernent.",
      },
    ],
  },
};
