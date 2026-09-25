import type { MiniAppSchema, Row } from "../schema-types";
import {
  count,
  danger,
  fmtDuration,
  has,
  minutesBetween,
  num,
  ok,
  pending,
  str,
  sum,
  toHours,
  warn,
} from "../helpers";

// M17b — Séquencier horaire du déroulé pédagogique.
// Les durées se déduisent des horaires ; le total est comparé au volume annoncé.

const MODALITE_OPTIONS = [
  { value: "presentiel", label: "🏫 Présentiel" },
  { value: "distanciel_sync", label: "💻 Distanciel synchrone" },
  { value: "distanciel_async", label: "📼 Distanciel asynchrone" },
  { value: "afest", label: "🏭 AFEST / situation de travail" },
];

const NATURE_OPTIONS = [
  { value: "apport", label: "📚 Apport théorique" },
  { value: "demonstration", label: "👁 Démonstration" },
  { value: "application", label: "🛠 Application / exercice" },
  { value: "evaluation", label: "📝 Évaluation" },
  { value: "accueil", label: "👋 Accueil / cadrage" },
  { value: "bilan", label: "🔄 Bilan / synthèse" },
];

const dureeMin = (row: Row) => minutesBetween(row.debut, row.fin) ?? 0;
const dureeValide = (row: Row) => {
  const d = minutesBetween(row.debut, row.fin);
  return d !== null && d > 0;
};

export const sequencierPedagogiqueSchema: MiniAppSchema = {
  key: "sequencier-pedagogique",
  name: "Séquencier du déroulé pédagogique",
  shortName: "Séquencier",
  description:
    "Déroulé daté et horodaté de la formation, séquence par séquence. Les durées se calculent à partir des horaires, et le total est confronté au volume annoncé au bénéficiaire.",
  indicators: ["I6"],
  critere: 2,
  docRef: "M17b",
  categories: ["AF"],
  tabs: [
    { id: "cadre", label: "Cadre de l'action", tableIds: ["cadre"] },
    { id: "sequencier", label: "Séquencier", tableIds: ["sequencier"] },
  ],
  tables: [
    {
      id: "cadre",
      label: "Cadre de l'action — volume annoncé",
      toastLabel: "Action ajoutée",
      emptyLabel:
        "Ajoutez l'action de formation et le volume horaire annoncé au public : c'est la référence à laquelle le séquencier sera comparé.",
      rowLabel: (row) => str(row.intitule) || "Action de formation",
      columns: [
        { id: "intitule", type: "text", label: "Intitulé de l'action" },
        { id: "volume_annonce", type: "number", label: "Volume annoncé (h)", width: "160px" },
        { id: "public", type: "text", label: "Public visé", width: "180px" },
        { id: "date_debut", type: "date", label: "Début", width: "125px" },
        { id: "date_fin", type: "date", label: "Fin", width: "125px" },
        {
          id: "ecart",
          type: "computed",
          label: "Séquencier vs annoncé",
          width: "195px",
          compute: ({ row, tables }) => {
            const annonce = num(row.volume_annonce);
            if (!annonce) return pending("Volume à saisir");
            const seq = (tables.sequencier ?? []).filter(dureeValide);
            if (seq.length === 0) return pending("Séquencier vide");
            const heures = toHours(sum(seq, dureeMin));
            const delta = heures - annonce;
            const rel = Math.abs(delta) / annonce;
            const txt = `${heures.toString().replace(".", ",")} h / ${annonce} h`;
            if (rel <= 0.02) return ok(txt);
            if (rel <= 0.1)
              return warn(`${txt} · écart ${delta > 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")} h`);
            return danger(`${txt} · écart ${delta > 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")} h`);
          },
        },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
    },
    {
      id: "sequencier",
      label: "Séquencier horaire",
      toastLabel: "Séquence ajoutée",
      emptyLabel: "Aucune séquence. Ajoutez les séquences dans l'ordre du déroulé.",
      rowLabel: (row) => str(row.sequence) || "Séquence",
      columns: [
        { id: "jour", type: "date", label: "Jour", width: "125px" },
        { id: "debut", type: "text", label: "Début", width: "85px", placeholder: "09:00" },
        { id: "fin", type: "text", label: "Fin", width: "85px", placeholder: "12:30" },
        {
          id: "duree",
          type: "computed",
          label: "Durée",
          width: "110px",
          compute: ({ row }) => {
            const d = minutesBetween(row.debut, row.fin);
            if (d === null) {
              return has(row.debut) || has(row.fin)
                ? danger("Format HH:MM")
                : pending("—");
            }
            if (d <= 0) return danger("Fin ≤ début");
            if (d > 480) return warn(fmtDuration(d));
            return ok(fmtDuration(d));
          },
        },
        { id: "sequence", type: "textarea", label: "Séquence / contenu" },
        { id: "objectif", type: "textarea", label: "Objectif visé" },
        { id: "nature", type: "select", label: "Nature", options: NATURE_OPTIONS, width: "170px" },
        {
          id: "modalite",
          type: "select",
          label: "Modalité",
          options: MODALITE_OPTIONS,
          width: "185px",
        },
        { id: "moyens", type: "textarea", label: "Moyens & supports" },
        { id: "intervenant", type: "text", label: "Intervenant", width: "140px" },
        { id: "pj", type: "attachments", label: "PJ", width: "70px" },
      ],
      summary: ({ rows }) => {
        const valides = rows.filter(dureeValide);
        const total = sum(valides, dureeMin);
        const parModalite = (m: string) =>
          sum(valides.filter((r) => str(r.modalite) === m), dureeMin);
        const evalMin = sum(valides.filter((r) => str(r.nature) === "evaluation"), dureeMin);
        return [
          {
            label: "Volume total séquencé",
            value: fmtDuration(total),
            tone: "neutral",
            hint: `${valides.length} séquence(s) valide(s) sur ${rows.length}`,
          },
          {
            label: "Présentiel",
            value: fmtDuration(parModalite("presentiel")),
          },
          {
            label: "Distanciel (sync + async)",
            value: fmtDuration(
              parModalite("distanciel_sync") + parModalite("distanciel_async"),
            ),
          },
          {
            label: "Temps d'évaluation",
            value: evalMin > 0 ? fmtDuration(evalMin) : "Aucun",
            tone: evalMin > 0 ? "ok" : "danger",
            hint: "L'absence de temps d'évaluation est un écart classique sur l'indicateur 11",
          },
        ];
      },
    },
  ],
  controls: (tables) => {
    const seq = tables.sequencier ?? [];
    const cadre = tables.cadre ?? [];
    const alerts = [];

    const invalides = count(
      seq,
      (r) => (has(r.debut) || has(r.fin)) && !dureeValide(r),
    );
    if (invalides > 0) {
      alerts.push({
        tone: "danger" as const,
        message: "Séquences dont les horaires sont incohérents ou mal formatés (attendu HH:MM).",
        count: invalides,
      });
    }

    const valides = seq.filter(dureeValide);
    if (valides.length > 0) {
      const evalMin = sum(valides.filter((r) => str(r.nature) === "evaluation"), dureeMin);
      if (evalMin === 0) {
        alerts.push({
          tone: "danger" as const,
          message:
            "Aucun temps d'évaluation prévu dans le déroulé : l'atteinte des objectifs ne peut pas être vérifiée.",
        });
      }

      const heures = toHours(sum(valides, dureeMin));
      for (const c of cadre) {
        const annonce = num(c.volume_annonce);
        if (!annonce) continue;
        const rel = Math.abs(heures - annonce) / annonce;
        if (rel > 0.1) {
          alerts.push({
            tone: "danger" as const,
            message: `Écart de plus de 10 % entre le séquencier (${heures.toString().replace(".", ",")} h) et le volume annoncé (${annonce} h) pour « ${str(c.intitule) || "l'action"} ».`,
          });
        } else if (rel > 0.02) {
          alerts.push({
            tone: "warn" as const,
            message: `Léger écart entre le séquencier et le volume annoncé pour « ${str(c.intitule) || "l'action"} ».`,
          });
        }
      }
    }

    const sansObjectif = count(seq, (r) => has(r.sequence) && !has(r.objectif));
    if (sansObjectif > 0) {
      alerts.push({
        tone: "warn" as const,
        message: "Séquences sans objectif rattaché.",
        count: sansObjectif,
      });
    }

    if (cadre.length === 0 && seq.length > 0) {
      alerts.push({
        tone: "warn" as const,
        message:
          "Volume annoncé non renseigné : la comparaison séquencier / annonce publique ne peut pas se faire.",
      });
    }

    return alerts;
  },
  helpText: {
    summary:
      "Reprend le classeur M17b. Saisissez les horaires au format HH:MM ; les durées, les totaux par modalité et l'écart au volume annoncé se calculent seuls.",
    sections: [
      {
        title: "Pourquoi l'écart au volume annoncé compte",
        content:
          "L'indicateur 1 exige que la durée communiquée au public soit exacte. Un séquencier qui ne totalise pas le volume annoncé est un écart croisé C1 / C2 que les auditeurs relèvent systématiquement.",
      },
    ],
  },
};
