import Link from "next/link";
import { CRITERES, getIndicator, type CritereNum } from "@/lib/constants/rnq";
import { INDICATOR_STATUS_LABEL, type AuditProgress, type IndicatorStatus } from "@/lib/progress";
import { cn } from "@/lib/utils/cn";

// =============================================================================
// Vues d'avancement — composants serveur, sans interactivité.
// =============================================================================

const BAR: Record<string, string> = {
  c1: "bg-c1",
  c2: "bg-c2",
  c3: "bg-c3",
  c4: "bg-c4",
  c5: "bg-c5",
  c6: "bg-c6",
  c7: "bg-c7",
};

const STATUS_CHIP: Record<IndicatorStatus, string> = {
  complet: "border-c2/40 bg-c2/15 text-c2",
  en_cours: "border-c3/40 bg-c3/15 text-c3",
  a_traiter: "border-border bg-secondary/40 text-muted-foreground",
  non_applicable: "border-border bg-transparent text-muted-foreground/50 line-through",
};

/** Barre de progression globale. */
export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-secondary", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-amethyst to-amethyst-bright"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/** Sept mini-barres, une par critère. */
export function CritereBars({ progress, auditId }: { progress: AuditProgress; auditId?: string }) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {(Object.keys(CRITERES).map(Number) as CritereNum[]).map((num) => {
        const critere = CRITERES[num];
        const p = progress.byCritere[num];
        const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
        const content = (
          <>
            <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
              <span className="font-semibold">C{num}</span>
              <span>
                {p.done}/{p.total}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn("h-full rounded-full", BAR[critere.colorVar])}
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        );
        return auditId ? (
          <Link
            key={num}
            href={`/audits/${auditId}/critere/${String(num).padStart(2, "0")}`}
            title={critere.title}
            className="-m-1 rounded-md p-1 transition-colors hover:bg-secondary/50"
          >
            {content}
          </Link>
        ) : (
          <div key={num} title={critere.title}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

/** Grille de tous les indicateurs applicables, colorés par statut. */
export function IndicatorGrid({ progress, auditId }: { progress: AuditProgress; auditId: string }) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {progress.byIndicator.map((ind) => {
          const meta = getIndicator(ind.code);
          return (
            <Link
              key={ind.code}
              href={`/audits/${auditId}/critere/${String(ind.critere).padStart(2, "0")}/indicateur/${ind.code}`}
              title={`${ind.code} — ${meta?.title ?? ""} · ${INDICATOR_STATUS_LABEL[ind.status]}`}
              className={cn(
                "inline-flex min-w-[44px] justify-center rounded-md border px-1.5 py-1 font-mono text-[10.5px] font-semibold transition-opacity hover:opacity-80",
                STATUS_CHIP[ind.status],
              )}
            >
              {ind.code}
            </Link>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px] text-muted-foreground">
        {(["complet", "en_cours", "a_traiter", "non_applicable"] as IndicatorStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-sm border", STATUS_CHIP[s])} />
            {INDICATOR_STATUS_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  );
}
