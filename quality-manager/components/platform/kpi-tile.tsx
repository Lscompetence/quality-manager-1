import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils/cn";

export function KpiTile({
  label,
  value,
  hint,
  tone = "neutral",
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "neutral" | "ok" | "warn" | "danger";
  href?: string;
}) {
  const body = (
    <div
      className={cn(
        "h-full rounded-2xl border bg-card/60 p-5 transition-colors",
        tone === "ok" && "border-c2/30",
        tone === "warn" && "border-c3/40",
        tone === "danger" && "border-destructive/40",
        tone === "neutral" && "border-border",
        href && "hover:border-amethyst-bright/40",
      )}
    >
      <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "font-sans text-4xl font-light",
          tone === "ok" && "text-c2",
          tone === "warn" && "text-c3",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
  return href ? <Link href={href as Route}>{body}</Link> : body;
}
