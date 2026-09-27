"use client";

import * as React from "react";
import { Eye } from "lucide-react";

/**
 * Mode lecture seule (sprint 8).
 *
 * L'admin client et le reader consultent les dossiers sans rien modifier.
 * La base refuse déjà toute écriture (RLS) : ce contexte sert à ne pas
 * proposer à l'écran des actions qui échoueraient.
 */
export const ReadOnlyContext = React.createContext(false);

export function useReadOnly(): boolean {
  return React.useContext(ReadOnlyContext);
}

export function ReadOnlyProvider({ readOnly, children }: { readOnly: boolean; children: React.ReactNode }) {
  return <ReadOnlyContext.Provider value={readOnly}>{children}</ReadOnlyContext.Provider>;
}

/** Désactive tous les champs et boutons qu'il contient quand le mode lecture seule est actif. */
export function ReadOnlyFieldset({ children, className }: { children: React.ReactNode; className?: string }) {
  const readOnly = useReadOnly();
  return (
    <fieldset disabled={readOnly} className={["m-0 min-w-0 border-0 p-0", className].filter(Boolean).join(" ")}>
      {children}
    </fieldset>
  );
}

export function ReadOnlyBanner({ reason }: { reason: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm text-muted-foreground">
      <Eye className="h-4 w-4 shrink-0" />
      <span>
        <b className="font-medium text-foreground">Consultation</b> — {reason}
      </span>
    </div>
  );
}
