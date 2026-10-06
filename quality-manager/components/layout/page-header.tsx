import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * En-tête de page commun à tous les espaces (admin, editor, reader, super admin) :
 * pastille de contexte, grand titre et texte centrés, actions principales
 * en dessous, en grand format.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  /** Pastille au-dessus du titre (« Vue d'ensemble · Dossiers ») — texte ou badges */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Boutons principaux de la page (« Nouveau dossier »…) */
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col items-center py-2 text-center", className)}>
      {eyebrow &&
        (typeof eyebrow === "string" ? (
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--amethyst-soft)] bg-[var(--amethyst-soft-2)] px-3.5 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
            {eyebrow}
          </span>
        ) : (
          <div className="mb-5 flex flex-wrap items-center justify-center gap-2">{eyebrow}</div>
        ))}
      <h1 className="font-sans text-4xl font-light tracking-tight md:text-[46px] md:leading-[1.1]">
        {title}
      </h1>
      {description && (
        <div className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          {description}
        </div>
      )}
      {actions && (
        // Boutons d'action en grand format
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3 [&_button]:h-12 [&_button]:rounded-xl [&_button]:px-6 [&_button]:text-[15px]">
          {actions}
        </div>
      )}
    </header>
  );
}
