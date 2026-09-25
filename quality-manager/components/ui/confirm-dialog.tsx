"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

/**
 * Fenêtre de confirmation de l'application, à la place du `confirm()` du
 * navigateur (boîte grise « localhost:3000 », hors charte, identique en mode
 * jour et nuit). Même fond opaque que les autres fenêtres.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  tone = "danger",
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** « danger » : action destructive (bouton rouge) ; « default » : bouton violet. */
  tone?: "danger" | "default";
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent hideClose className="max-w-[420px]">
        <div className="flex items-start gap-3.5">
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
              tone === "danger"
                ? "bg-[rgba(217,54,54,0.12)] text-[#d93636]"
                : "bg-[var(--amethyst-soft-2)] text-[var(--amethyst-br)]",
            )}
          >
            <AlertTriangle className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 pt-0.5">
            <DialogTitle className="font-sans text-[17px] font-medium leading-snug">{title}</DialogTitle>
            {description && (
              <DialogDescription className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-mute)]">
                {description}
              </DialogDescription>
            )}
          </div>
        </div>

        <div className="mt-2 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="h-10 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 text-[13px] font-medium transition-colors hover:bg-[var(--surface-2)] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            autoFocus
            className={cn(
              "inline-flex h-10 min-w-[110px] items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60",
              tone === "danger" ? "bg-[#d93636]" : "bg-[var(--amethyst-br)]",
            )}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
