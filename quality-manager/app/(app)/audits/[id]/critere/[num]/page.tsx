import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { indicatorCodeOf } from "@/lib/utils/context-path";
import {
  CRITERES,
  getIndicatorsByCritere,
  type CritereNum,
  type Category,
} from "@/lib/constants/rnq";
import { StatusPill } from "@/components/indicator/status-pill";

type Params = { id: string; num: string };

export const metadata = {
  title: "Critère",
};

export default async function CriterePage({ params }: { params: Promise<Params> }) {
  const { id, num } = await params;
  const critereNum = Number(num) as CritereNum;
  const critere = CRITERES[critereNum];
  if (!critere) notFound();

  const supabase = await createClient();

  // Requêtes indépendantes lancées ensemble : une seule attente au lieu de trois.
  const [{ data: audit }, { data: states }, { data: attachments }] = await Promise.all([
    supabase.from("audits").select("id, name, categories, audit_type").eq("id", id).single(),
    supabase
      .from("audit_indicators")
      .select("indicator_code, status, updated_at")
      .eq("audit_id", id)
      .eq("critere_num", critereNum),
    // Preuves du dossier — comptées ensuite par indicateur via leur chemin de contexte
    supabase.from("attachments").select("context_path").eq("audit_id", id),
  ]);

  if (!audit) notFound();

  const categories = (audit.categories ?? []) as Category[];
  const indicators = getIndicatorsByCritere(critereNum, categories);

  const stateByCode = new Map(
    (states ?? []).map((s) => [s.indicator_code, { status: s.status, updatedAt: s.updated_at }]),
  );

  const docsByCode = new Map<string, number>();
  for (const att of attachments ?? []) {
    const code = indicatorCodeOf(att.context_path);
    if (!code) continue;
    docsByCode.set(code, (docsByCode.get(code) ?? 0) + 1);
  }

  const counts = { complet: 0, en_cours: 0, a_traiter: 0, non_applicable: 0 };
  for (const ind of indicators) {
    const status = stateByCode.get(ind.code)?.status ?? "a_traiter";
    if (status in counts) counts[status as keyof typeof counts]++;
  }
  const pct =
    indicators.length > 0 ? Math.round((counts.complet / indicators.length) * 100) : 0;

  const accent = `var(--${critere.colorVar})`;
  const numStr = String(critereNum).padStart(2, "0");

  return (
    <div style={{ ["--crit" as string]: accent }}>

      {/* En-tête du critère */}
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-8 border-b border-[var(--border-soft)] pb-[26px]">
        <div className="min-w-0 flex-1">
          <span
            className="mb-3 inline-flex items-center gap-[7px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: accent }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            Critère {numStr}
          </span>

          <div className="flex flex-wrap items-baseline gap-[22px]">
            <h1 className="font-sans text-[44px] font-light leading-[1.05] tracking-[-0.025em]">
              {critere.title}
            </h1>
            <span
              className="inline-flex items-baseline gap-0.5 font-sans text-[38px] font-light leading-none tracking-[-0.02em]"
              style={{ color: accent }}
            >
              {pct}
              <span className="text-[22px] opacity-75">%</span>
            </span>
          </div>

          <p className="mt-3 max-w-[620px] text-[14.5px] leading-[1.55] text-[var(--text-mute)]">
            {critere.subtitle} Vous déclarez le statut de chaque indicateur — c&apos;est vous qui jugez si
            vos preuves sont suffisantes pour l&apos;audit.
          </p>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="text-right font-mono text-[11px] leading-[1.7] tracking-[0.06em] text-[var(--text-mute)]">
            <div>
              <b className="font-semibold text-foreground">{counts.complet}</b> complets
            </div>
            <div>
              <b className="font-semibold text-foreground">{counts.en_cours}</b> en cours
            </div>
            <div>
              <b className="font-semibold text-foreground">{counts.a_traiter}</b> à traiter
            </div>
          </div>
          <Link
            href={`/audits/${id}/documents`}
            prefetch={true}
            className="qm-btn-3d inline-flex h-[42px] items-center gap-2 rounded-xl px-[18px] text-[13.5px] font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un document
          </Link>
        </div>
      </div>

      <div className="mb-[22px] flex items-baseline justify-between pt-6">
        <h2 className="font-sans text-2xl font-light tracking-tight">
          Les {indicators.length} indicateurs du critère
        </h2>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
          cliquez sur un indicateur pour entrer
        </span>
      </div>

      {/* Grille des indicateurs */}
      <div className="grid gap-4 lg:grid-cols-2">
        {indicators.map((ind) => {
          const state = stateByCode.get(ind.code);
          const status = state?.status ?? "a_traiter";
          const docs = docsByCode.get(ind.code) ?? 0;

          return (
            <Link
              key={ind.code}
              href={`/audits/${id}/critere/${num}/indicateur/${ind.code}`}
              prefetch={true}
              className="qm-glass qm-glass-hover group relative overflow-hidden rounded-2xl px-[22px] py-5"
            >
              <span
                className="absolute inset-x-0 top-0 h-[2px] opacity-40 transition-opacity group-hover:opacity-100"
                style={{ background: accent, boxShadow: `0 0 20px ${accent}` }}
              />

              <div className="mb-3.5 flex items-start justify-between gap-3">
                <span
                  className="font-sans text-[32px] font-extralight leading-none tracking-[-0.03em]"
                  style={{ color: accent }}
                >
                  {String(ind.num).padStart(2, "0")}
                </span>
                <StatusPill status={status} />
              </div>

              <h3 className="mb-3.5 font-sans text-[17px] font-medium leading-[1.2]">{ind.title}</h3>

              <div className="mb-3.5 flex flex-wrap gap-2">
                {ind.v9Update && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-c3/30 bg-c3/10 px-2 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-c3">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    MAJ V9
                  </span>
                )}
                {ind.cfaOnly && (
                  <span className="inline-flex items-center rounded-md border border-[var(--border-soft)] bg-[var(--surface-2)] px-2 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-mute)]">
                    CFA
                  </span>
                )}
              </div>

              {status === "complet" && docs === 0 && (
                <div className="mb-3.5 flex items-center gap-2 rounded-lg border border-c3/30 bg-c3/10 px-3 py-2.5 text-[11.5px] text-c3">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  Déclaré complet, mais aucune preuve déposée.
                </div>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-[var(--border-soft)] pt-3.5 font-mono text-[10.5px] text-[var(--text-mute)]">
                <span>
                  <b className="font-semibold text-foreground">{docs}</b> document{docs > 1 ? "s" : ""}
                </span>
                <span className="text-[var(--text-faint)]">
                  {state?.updatedAt ? `mis à jour ${timeAgo(state.updatedAt)}` : "jamais modifié"}
                </span>
                <ArrowRight className="h-3.5 w-3.5 transition-colors group-hover:text-amethyst-bright" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Les pièces jointes stockent leur rattachement sous la forme « critere/03/indicateur/I11 ». */
function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 31) return `il y a ${days} jours`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
}
