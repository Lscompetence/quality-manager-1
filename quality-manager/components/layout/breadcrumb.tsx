import * as React from "react";
import Link from "next/link";
import type { Route } from "next";

export type Crumb = { label: string; href?: string };

/**
 * Fil d'Ariane des maquettes : monospace, séparateurs « / »,
 * dernier segment en améthyste.
 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Fil d'Ariane"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-[var(--text-mute)]"
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {item.href && !isLast ? (
              <Link href={item.href as Route} className="transition-colors hover:text-foreground">
                {item.label.toLowerCase()}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-amethyst-bright" : undefined}>
                {item.label.toLowerCase()}
              </span>
            )}
            {!isLast && <span className="text-[var(--text-faint)]">/</span>}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
