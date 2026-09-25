import { cn } from "@/lib/utils/cn";

export type IndicatorStatus = "a_traiter" | "en_cours" | "complet" | "non_applicable" | string;

type PillStyle = { label: string; className: string; dot: string };

const FALLBACK: PillStyle = {
  label: "À traiter",
  className: "border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text-mute)]",
  dot: "var(--text-mute)",
};

const STYLES: Record<string, PillStyle> = {
  complet: {
    label: "Complet",
    className: "border-[rgba(88,214,154,0.32)] bg-[rgba(88,214,154,0.10)] text-[var(--status-on)]",
    dot: "var(--status-on)",
  },
  en_cours: {
    label: "En cours",
    className: "border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.10)] text-c3",
    dot: "var(--c3)",
  },
  a_traiter: {
    label: "À traiter",
    className: "border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text-mute)]",
    dot: "var(--text-mute)",
  },
  non_applicable: {
    label: "Non applicable",
    className: "border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-faint)] opacity-70",
    dot: "var(--text-faint)",
  },
};

/** Pastille de statut des maquettes (critere_03.html / indicateur_11.html) */
export function StatusPill({ status, className }: { status: IndicatorStatus; className?: string }) {
  const style = STYLES[status] ?? FALLBACK;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-[7px] rounded-full border py-[5px] pl-[9px] pr-[11px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em]",
        style.className,
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: style.dot, boxShadow: `0 0 8px ${style.dot}` }}
      />
      {style.label}
    </span>
  );
}
