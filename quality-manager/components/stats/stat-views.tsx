import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// =============================================================================
// Statistiques — composants serveur, sans interactivité.
//
// Une tuile = un chiffre clé. Une liste de barres = une seule grandeur
// comparée entre catégories : une seule couleur (améthyste), sauf quand la
// couleur identifie une catégorie connue (types de demandes), et toujours
// accompagnée du libellé et de la valeur écrite — jamais la couleur seule.
// =============================================================================

export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "good" | "warn";
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
      <p className="mb-2 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-mute)]">
        <span
          className={cn(
            "grid h-6 w-6 place-items-center rounded-md",
            tone === "good" && "bg-c2/15 text-c2",
            tone === "warn" && "bg-c3/15 text-c3",
            tone === "default" && "bg-[var(--amethyst-soft-2)] text-[var(--amethyst-br)]",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </p>
      <p className="font-sans text-3xl font-light leading-none tracking-tight text-foreground">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-[var(--text-mute)]">{hint}</p>}
    </div>
  );
}

export type BarRow = {
  label: string;
  value: number;
  /** Texte affiché à droite de la barre (par défaut : la valeur) */
  display?: string;
  /** Couleur de la barre, seulement quand elle identifie une catégorie */
  color?: string;
  icon?: LucideIcon;
};

export function BarList({
  title,
  rows,
  max,
  empty = "Aucune donnée pour l’instant.",
}: {
  title: string;
  rows: BarRow[];
  /** Valeur de la barre pleine (par défaut : la plus grande) */
  max?: number;
  empty?: string;
}) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);

  return (
    <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5">
      <p className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-mute)]">
        {title}
      </p>
      {total === 0 && max === undefined ? (
        <p className="text-sm text-[var(--text-mute)]">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const pct = Math.max(0, Math.min(100, (r.value / top) * 100));
            const Icon = r.icon;
            return (
              <li key={r.label} title={`${r.label} : ${r.display ?? r.value}`}>
                <div className="mb-1 flex items-center justify-between gap-3 text-[13px]">
                  <span className="flex min-w-0 items-center gap-2 text-foreground">
                    {Icon && (
                      <Icon
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: r.color ?? "var(--amethyst-br)" }}
                      />
                    )}
                    <span className="truncate">{r.label}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-[var(--text-soft)]">
                    {r.display ?? r.value}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      minWidth: r.value > 0 ? "6px" : 0,
                      background: r.color ?? "var(--amethyst-br)",
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
