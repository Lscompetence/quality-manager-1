import type { MiniAppSchema, Row } from "../schema-types";
import {
  count,
  danger,
  daysBetween,
  has,
  ok,
  pct,
  pending,
  str,
  warn,
} from "../helpers";

// M24g — Preuve de diffusion des documents d'accueil, bénéficiaire par bénéficiaire.
// Le classeur compare la date de diffusion à la date de démarrage.

const CANAL_OPTIONS = [
  { value: "remise_main", label: "🤝 Remise en main propre" },
  { value: "email", label: "📧 E-mail" },
  { value: "plateforme", label: "💻 Plateforme LMS" },
  { value: "courrier", label: "✉️ Courrier" },
  { value: "espace_partage", label: "🔗 Espace partagé" },
];

const ACCUSE_OPTIONS = [
  { value: "emargement", label: "✍️ Bordereau émargé" },
  { value: "accuse_lecture", label: "✅ Accusé de lecture" },
  { value: "log_plateforme", label: "📊 Log plateforme" },
  { value: "aucun", label: "✗ Aucun accusé" },
];

/** Les documents d'accueil attendus, comme les colonnes du bordereau M24e. */
const DOCS = [
  { id: "livret", label: "Livret d'accueil" },
  { id: "reglement", label: "Règlement intérieur" },
  { id: "programme", label: "Programme détaillé" },
  { id: "planning", label: "Planning / convocation" },
  { id: "handicap", label: "Contact réf. handicap" },
  { id: "reclamation", label: "Procédure réclamation" },
] as const;

const OUI_NON = [
  { value: "oui", label: "✓ Oui" },
  { value: "non", label: "✗ Non" },
  { value: "na", label: "— Sans objet" },
];

const docsManquants = (row: Row) =>
  DOCS.filter((d) => str(row[d.id]) === "non" || !has(row[d.id]));

/** Statut de diffusion : conforme / tardif / après démarrage / non tracé. */
function statutDiffusion(row: Row) {
  if (!has(row.date_diffusion)) return { code: "non_trace" as const, jours: null };
  const jours = daysBetween(row.date_diffusion, row.date_demarrage);
  if (jours === null) return { code: "non_trace" as const, jours: null };
  if (jours < 0) return { code: "apres" as const, jours };
  if (jours < 7) return { code: "tardif" as const, jours };
  return { code: "conforme" as const, jours };
}

export const diffusionAccueilSchema: MiniAppSchema = {
  key: "diffusion-accueil",
  name: "Registre de diffusion des documents d'accueil",
  shortName: "Diffusion accueil",
  description:
    "Preuve nominative que chaque bénéficiaire a reçu les documents d'accueil, et quand. Le délai entre la diffusion et le démarrage est calculé automatiquement — c'est le point que l'auditeur vérifie en premier sur l'indicateur 9.",
  indicators: ["I9"],
  critere: 3,
  docRef: "M24g",
  tables: [
    {
      id: "registre",
      label: "Registre de diffusion",
      toastLabel: "Diffusion tracée",
      emptyLabel:
        "Aucune diffusion tracée. Ajoutez une ligne par bénéficiaire ayant reçu les documents d'accueil.",
      rowLabel: (row) => str(row.beneficiaire) || "Diffusion accueil",
      columns: [
        { id: "beneficiaire", type: "text", label: "Bénéficiaire", width: "175px" },
        { id: "session", type: "text", label: "Session", width: "160px" },
        { id: "date_diffusion", type: "date", label: "Diffusé le", width: "135px" },
        { id: "date_demarrage", type: "date", label: "Démarrage", width: "135px" },
        {
          id: "delai",
          type: "computed",
          label: "Délai",
          width: "190px",
          compute: ({ row }) => {
            const s = statutDiffusion(row);
            if (s.code === "non_trace") return danger("Diffusion non tracée");
            if (s.code === "apres")
              return danger(`Après démarrage (J+${Math.abs(s.jours!)})`);
            if (s.code === "tardif") return warn(`J-${s.jours} — moins de 7 j`);
            return ok(`J-${s.jours} — conforme`);
          },
        },
        { id: "canal", type: "select", label: "Canal", options: CANAL_OPTIONS, width: "195px" },
        { id: "accuse", type: "select", label: "Preuve de réception", options: ACCUSE_OPTIONS, width: "185px" },
        ...DOCS.map((d) => ({
          id: d.id,
          type: "select" as const,
          label: d.label,
          options: OUI_NON,
          width: "130px",
        })),
        {
          id: "completude",
          type: "computed",
          label: "Complétude",
          width: "180px",
          compute: ({ row }) => {
            if (!has(row.beneficiaire)) return pending("Bénéficiaire à saisir");
            const manquants = docsManquants(row);
            const total = DOCS.length;
            if (manquants.length === 0) {
              return str(row.accuse) === "aucun"
                ? warn("Complet · sans accusé")
                : ok(`${total}/${total} documents`);
            }
            if (manquants.length <= 2)
              return warn(`${total - manquants.length}/${total} · manque ${manquants[0]!.label}`);
            return danger(`${total - manquants.length}/${total} documents`);
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const conformes = count(rows, (r) => statutDiffusion(r).code === "conforme");
        const tardifs = count(rows, (r) => statutDiffusion(r).code === "tardif");
        const apres = count(rows, (r) => statutDiffusion(r).code === "apres");
        const nonTraces = count(rows, (r) => statutDiffusion(r).code === "non_trace");
        const sansAccuse = count(rows, (r) => str(r.accuse) === "aucun" || !has(r.accuse));
        return [
          {
            label: "Diffusions conformes",
            value: pct(conformes, rows.length),
            tone: conformes === rows.length ? "ok" : "warn",
            hint: "Diffusé au moins 7 jours avant le démarrage",
          },
          { label: "Moins de 7 jours", value: String(tardifs), tone: tardifs > 0 ? "warn" : "ok" },
          {
            label: "Après le démarrage",
            value: String(apres),
            tone: apres > 0 ? "danger" : "ok",
          },
          {
            label: "Non tracées / sans accusé",
            value: `${nonTraces} / ${sansAccuse}`,
            tone: nonTraces > 0 ? "danger" : sansAccuse > 0 ? "warn" : "ok",
          },
        ];
      },
    },
  ],
  controls: (tables) => {
    const rows = tables.registre ?? [];
    const alerts = [];

    const apres = count(rows, (r) => statutDiffusion(r).code === "apres");
    if (apres > 0) {
      alerts.push({
        tone: "danger" as const,
        message:
          "Documents d'accueil diffusés après le démarrage : le bénéficiaire n'était pas informé à son entrée.",
        count: apres,
      });
    }

    const nonTraces = count(
      rows,
      (r) => has(r.beneficiaire) && statutDiffusion(r).code === "non_trace",
    );
    if (nonTraces > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Bénéficiaires sans date de diffusion : aucune preuve exploitable.",
        count: nonTraces,
      });
    }

    const incomplets = count(
      rows,
      (r) => has(r.beneficiaire) && docsManquants(r).length > 2,
    );
    if (incomplets > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Dossiers d'accueil incomplets (plus de deux documents manquants).",
        count: incomplets,
      });
    }

    const tardifs = count(rows, (r) => statutDiffusion(r).code === "tardif");
    if (tardifs > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Diffusions à moins de 7 jours du démarrage : délai court à justifier.",
        count: tardifs,
      });
    }

    const sansAccuse = count(
      rows,
      (r) => has(r.beneficiaire) && (str(r.accuse) === "aucun" || !has(r.accuse)),
    );
    if (sansAccuse > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Diffusions sans preuve de réception : émargement, accusé de lecture ou log plateforme.",
        count: sansAccuse,
      });
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M24g. Le seuil de 7 jours n'est pas réglementaire : c'est le délai au-delà duquel une diffusion est considérée comme laissant un temps de lecture raisonnable.",
    sections: [
      {
        title: "Ce que vaut une preuve",
        content:
          "Un bordereau émargé (M24e) reste la preuve la plus solide. Un e-mail sans accusé de lecture prouve l'envoi, pas la réception — acceptable, mais moins robuste en audit.",
      },
    ],
  },
};
