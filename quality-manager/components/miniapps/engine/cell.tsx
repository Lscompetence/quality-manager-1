"use client";

import * as React from "react";
import type { Column, ComputedResult, Row, Tone } from "@/lib/miniapps/schema-types";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { cn } from "@/lib/utils/cn";

type AttachmentRow = {
  id: string;
  kind: "upload" | "ref";
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string | null;
  external_url: string | null;
  created_at: string;
  context_label: string | null;
};

/** Classes de la pastille d'une cellule calculée, par tonalité. */
const TONE_CLASSES: Record<Tone, string> = {
  ok: "border-c2/30 bg-c2/10 text-c2",
  warn: "border-c3/30 bg-c3/10 text-c3",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  neutral: "border-border bg-secondary/60 text-muted-foreground",
};

export function MiniAppCell({
  column,
  row,
  rowIndex,
  tableId,
  onChange,
  // Contexte de calcul (colonnes `computed`)
  rows,
  tables,
  // Props PJ
  auditId,
  miniappKey,
  attachmentsByPath,
  readOnly = false,
}: {
  column: Column;
  row: Row;
  rowIndex: number;
  tableId: string;
  onChange: (colId: string, value: unknown) => void;
  rows: Row[];
  tables: Record<string, Row[]>;
  auditId: string;
  miniappKey: string;
  attachmentsByPath: Map<string, AttachmentRow[]>;
  /** Consultation seule (espace client) : rien n'est modifiable. */
  readOnly?: boolean;
}) {
  const value = row[column.id];

  if (column.type === "computed") {
    let result: ComputedResult;
    try {
      const raw = column.compute({ row, rows, rowIndex, tables });
      result = typeof raw === "string" ? { text: raw } : raw;
    } catch {
      // Une formule ne doit jamais casser la saisie.
      result = { text: "—", tone: "neutral" };
    }
    const tone = result.tone ?? "neutral";
    return (
      <div className="px-1 py-1.5">
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-1 font-mono text-[10.5px] font-semibold leading-tight",
            TONE_CLASSES[tone],
          )}
        >
          {result.text}
        </span>
      </div>
    );
  }

  if (column.type === "select") {
    return (
      <select
        className="cell-select"
        disabled={readOnly}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(column.id, e.target.value)}
      >
        <option value="">—</option>
        {column.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (column.type === "date") {
    return (
      <input
        type="date"
        className="cell-input"
        disabled={readOnly}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(column.id, e.target.value)}
      />
    );
  }

  if (column.type === "number") {
    return (
      <input
        type="number"
        className="cell-input"
        disabled={readOnly}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(column.id, e.target.value)}
        placeholder={column.placeholder}
      />
    );
  }

  if (column.type === "textarea") {
    return (
      <AutoResizeTextarea
        disabled={readOnly}
        value={(value as string) ?? ""}
        onChange={(v) => onChange(column.id, v)}
        placeholder={column.placeholder}
      />
    );
  }

  if (column.type === "attachments") {
    const contextPath = `miniapp:${miniappKey}:${tableId}:${rowIndex}:${column.id}`;
    const attachments = attachmentsByPath.get(contextPath) ?? [];
    return (
      <div className="flex items-center gap-1 justify-center">
        <PjButton
          auditId={auditId}
          miniappKey={miniappKey}
          contextPath={contextPath}
          contextLabel={`Ligne ${rowIndex + 1} · ${column.label}`}
          attachments={attachments}
          readOnly={readOnly}
        />
      </div>
    );
  }

  // type === "text"
  return (
    <input
      type="text"
      className="cell-input"
      disabled={readOnly}
      value={(value as string) ?? ""}
      onChange={(e) => onChange(column.id, e.target.value)}
      placeholder={column.placeholder}
    />
  );
}

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  disabled?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(34, el.scrollHeight) + "px";
  }, [value]);

  return (
    <textarea
      ref={ref}
      className="cell-textarea"
      disabled={disabled}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/**
 * Bouton compact pour ouvrir la modale PJ.
 * On réutilise AttachmentList qui contient déjà tout le mécanisme.
 */
function PjButton({
  auditId,
  miniappKey,
  contextPath,
  contextLabel,
  attachments,
  readOnly = false,
}: {
  auditId: string;
  miniappKey: string;
  contextPath: string;
  contextLabel: string;
  attachments: AttachmentRow[];
  readOnly?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] font-semibold transition-colors",
          attachments.length > 0
            ? "border-amethyst-bright/50 bg-amethyst-bright/10 text-amethyst-bright"
            : "border-border text-muted-foreground hover:border-amethyst-bright/30 hover:text-amethyst-bright",
        )}
        onClick={() => setOpen(true)}
        title={`${attachments.length} pièce(s) jointe(s)`}
      >
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
        </svg>
        {attachments.length > 0 && <span>{attachments.length}</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-md"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="qm-dialog-solid w-full max-w-lg rounded-2xl border p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium">{contextLabel}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Preuves attachées à cette ligne</p>
            </div>
            <AttachmentList
              auditId={auditId}
              miniappKey={miniappKey}
              contextPath={contextPath}
              contextLabel={contextLabel}
              attachments={attachments}
              canAdd={!readOnly}
              canDelete={!readOnly}
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
                onClick={() => setOpen(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
