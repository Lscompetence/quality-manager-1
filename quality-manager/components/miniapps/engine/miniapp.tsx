"use client";

import * as React from "react";
import { useTransition } from "react";
import { AlertTriangle, CheckCircle2, Info, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { saveMiniAppData } from "@/lib/actions/miniapps";
import { getMiniAppSchema } from "@/lib/miniapps/registry";
import type {
  ControlAlert,
  MiniAppData,
  MiniAppSchema,
  Row,
  SummaryStat,
  TableSchema,
} from "@/lib/miniapps/schema-types";
import { MiniAppCell } from "./cell";
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

const SAVE_DEBOUNCE_MS = 800;

const ALERT_STYLES: Record<ControlAlert["tone"], string> = {
  ok: "border-c2/30 bg-c2/[0.07] text-c2",
  warn: "border-c3/30 bg-c3/[0.07] text-c3",
  danger: "border-destructive/30 bg-destructive/[0.07] text-destructive",
};

/**
 * Moteur générique des mini-apps, dans le cadre commun des maquettes
 * (Prototype/Mini app/miniapp_*.html) : panneau par registre, bouton
 * « Ajouter », tableau éditable, cartes de chiffres clés.
 *
 * IMPORTANT — le composant reçoit `schemaKey`, pas `schema`.
 * Les schémas contiennent des fonctions (`compute`, `summary`, `controls`,
 * `rowLabel`) : Next.js refuse de sérialiser des fonctions à travers la
 * frontière Server Component → Client Component. Le moteur résout donc
 * lui-même le schéma via le registry, côté client.
 *
 * `readOnly` : consultation seule (espace client) — pas d'ajout, pas de
 * suppression, pas de saisie, aucune sauvegarde.
 */
export function MiniApp({
  schemaKey,
  auditId,
  initialData,
  attachments,
  readOnly = false,
}: {
  schemaKey: string;
  auditId: string;
  initialData: MiniAppData | null;
  attachments: AttachmentRow[];
  readOnly?: boolean;
}) {
  const schema = React.useMemo(() => getMiniAppSchema(schemaKey), [schemaKey]);

  // État initial : données enregistrées, sinon exemple du schéma. En lecture
  // seule, jamais d'exemple : le client ne voit que ce qui a été saisi.
  const [tables, setTables] = React.useState<Record<string, Row[]>>(() => {
    if (initialData?.tables) return initialData.tables;
    if (schema?.seed && !readOnly) return structuredClone(schema.seed);
    return Object.fromEntries((schema?.tables ?? []).map((t) => [t.id, []]));
  });

  // Index PJ par context_path
  const attachmentsByPath = React.useMemo(() => {
    const map = new Map<string, AttachmentRow[]>();
    for (const att of attachments) {
      const path = (att as AttachmentRow & { context_path?: string }).context_path ?? "";
      if (!map.has(path)) map.set(path, []);
      map.get(path)!.push(att);
    }
    return map;
  }, [attachments]);

  // Onglets : ceux du schema OU 1 par table
  const tabs = React.useMemo(() => {
    if (schema?.tabs && schema.tabs.length > 0) return schema.tabs;
    return (schema?.tables ?? []).map((t) => ({ id: t.id, label: t.label, tableIds: [t.id] }));
  }, [schema]);

  const [activeTab, setActiveTab] = React.useState(tabs[0]?.id ?? "");
  const [, startTransition] = useTransition();
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sauvegarde avec debounce
  const queueSave = React.useCallback(
    (nextTables: Record<string, Row[]>) => {
      if (readOnly) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        startTransition(async () => {
          const result = await saveMiniAppData({
            audit_id: auditId,
            miniapp_key: schemaKey,
            data: { tables: nextTables, schemaVersion: 2 },
          });
          if (!result.ok) toast.error("Sauvegarde échouée : " + result.error);
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [auditId, schemaKey, readOnly],
  );

  const updateCell = (tableId: string, rowIndex: number, colId: string, value: unknown) => {
    if (readOnly) return;
    setTables((prev) => {
      const next = { ...prev };
      const rows = [...(next[tableId] ?? [])];
      const current = rows[rowIndex];
      if (!current) return prev;
      rows[rowIndex] = { ...current, [colId]: value };
      next[tableId] = rows;
      queueSave(next);
      return next;
    });
  };

  const addRow = (tableId: string) => {
    if (readOnly) return;
    setTables((prev) => {
      const next = { ...prev };
      const schemaTable = (schema?.tables ?? []).find((t) => t.id === tableId);
      const newRow: Row = {};
      if (schemaTable) {
        for (const col of schemaTable.columns) {
          // Les colonnes calculées ne sont jamais persistées.
          if (col.type === "computed") continue;
          if (col.type === "date") newRow[col.id] = new Date().toISOString().slice(0, 10);
          else if (col.type === "attachments") newRow[col.id] = [];
          else newRow[col.id] = "";
        }
      }
      const rows = [newRow, ...(next[tableId] ?? [])];
      next[tableId] = rows;
      queueSave(next);
      toast.success(schemaTable?.toastLabel ?? "Ligne ajoutée");
      return next;
    });
  };

  const deleteRow = (tableId: string, rowIndex: number) => {
    if (readOnly) return;
    setTables((prev) => {
      const next = { ...prev };
      const rows = [...(next[tableId] ?? [])];
      rows.splice(rowIndex, 1);
      next[tableId] = rows;
      queueSave(next);
      toast.success("Ligne supprimée");
      return next;
    });
  };

  // Compteur par onglet
  const tabCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of tabs) {
      counts[tab.id] = tab.tableIds.reduce((s, tid) => s + (tables[tid]?.length ?? 0), 0);
    }
    return counts;
  }, [tabs, tables]);

  // Contrôles automatiques transverses
  const alerts = React.useMemo<ControlAlert[]>(() => {
    if (!schema?.controls) return [];
    try {
      return schema.controls(tables);
    } catch {
      return [];
    }
  }, [schema, tables]);

  const hasAnyRow = React.useMemo(
    () => Object.values(tables).some((rows) => (rows?.length ?? 0) > 0),
    [tables],
  );

  if (!schema) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Mini-app inconnue : {schemaKey}</p>;
  }

  const content = (tab: { id: string; label: string; tableIds: string[] }) => (
    <SingleTabContent
      tab={tab}
      schema={schema}
      tables={tables}
      auditId={auditId}
      attachmentsByPath={attachmentsByPath}
      readOnly={readOnly}
      onAddRow={addRow}
      onDeleteRow={deleteRow}
      onUpdateCell={updateCell}
    />
  );

  return (
    <>
      {schema.controls && hasAnyRow && <ControlsBanner alerts={alerts} />}

      {tabs.length === 1 ? (
        content(tabs[0]!)
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
                <span className="rounded-md bg-[var(--surface-2)] px-[7px] py-px font-mono text-[10px] text-[var(--text-mute)]">
                  {tabCounts[tab.id] ?? 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id}>
              {content(tab)}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </>
  );
}

// -----------------------------------------------------------------------------
// Bandeau « contrôles automatiques »
// -----------------------------------------------------------------------------

function ControlsBanner({ alerts }: { alerts: ControlAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-c2/30 bg-c2/[0.07] px-4 py-3 text-c2">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <p className="text-sm font-medium">Contrôles automatiques : aucune anomalie détectée sur les lignes saisies.</p>
      </div>
    );
  }

  return (
    <div className="mb-5 space-y-2">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-mute)]">
        Contrôles automatiques · {alerts.length} point{alerts.length > 1 ? "s" : ""} à traiter
      </p>
      {alerts.map((alert, i) => {
        const Icon = alert.tone === "danger" ? AlertTriangle : alert.tone === "warn" ? Info : CheckCircle2;
        return (
          <div key={i} className={cn("flex items-center gap-2.5 rounded-xl border px-4 py-2.5", ALERT_STYLES[alert.tone])}>
            <Icon className="h-4 w-4 shrink-0" />
            <p className="flex-1 text-sm font-medium">{alert.message}</p>
            {alert.count !== undefined && (
              <span className="rounded-md bg-current/10 px-2 py-0.5 font-mono text-[11px] font-bold">{alert.count}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Chiffres clés d'un registre — cartes des maquettes (.kpi-card)
// -----------------------------------------------------------------------------

function SummaryStrip({ stats }: { stats: SummaryStat[] }) {
  if (stats.length === 0) return null;
  return (
    <div className="qm-kpi-grid">
      {stats.map((stat, i) => (
        <div key={i} className={cn("qm-kpi-card", stat.tone && stat.tone !== "neutral" && `tone-${stat.tone}`)} title={stat.hint}>
          <div className="qm-kpi-label">
            <span className="qm-kpi-dot" />
            {stat.label}
          </div>
          <div className="qm-kpi-value tabular-nums">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Contenu d'un onglet
// -----------------------------------------------------------------------------

function SingleTabContent({
  tab,
  schema,
  tables,
  auditId,
  attachmentsByPath,
  readOnly,
  onAddRow,
  onDeleteRow,
  onUpdateCell,
}: {
  tab: { id: string; label: string; tableIds: string[] };
  schema: MiniAppSchema;
  tables: Record<string, Row[]>;
  auditId: string;
  attachmentsByPath: Map<string, AttachmentRow[]>;
  readOnly: boolean;
  onAddRow: (tableId: string) => void;
  onDeleteRow: (tableId: string, rowIndex: number) => void;
  onUpdateCell: (tableId: string, rowIndex: number, colId: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-[18px]">
      {tab.tableIds.map((tableId) => {
        const tableSchema = (schema.tables ?? []).find((t) => t.id === tableId);
        if (!tableSchema) return null;
        return (
          <RegisterPanel
            key={tableId}
            tableSchema={tableSchema}
            tableId={tableId}
            rows={tables[tableId] ?? []}
            tables={tables}
            schemaKey={schema.key}
            auditId={auditId}
            attachmentsByPath={attachmentsByPath}
            readOnly={readOnly}
            onAddRow={onAddRow}
            onDeleteRow={onDeleteRow}
            onUpdateCell={onUpdateCell}
          />
        );
      })}
    </div>
  );
}

function RegisterPanel({
  tableSchema,
  tableId,
  rows,
  tables,
  schemaKey,
  auditId,
  attachmentsByPath,
  readOnly,
  onAddRow,
  onDeleteRow,
  onUpdateCell,
}: {
  tableSchema: TableSchema;
  tableId: string;
  rows: Row[];
  tables: Record<string, Row[]>;
  schemaKey: string;
  auditId: string;
  attachmentsByPath: Map<string, AttachmentRow[]>;
  readOnly: boolean;
  onAddRow: (tableId: string) => void;
  onDeleteRow: (tableId: string, rowIndex: number) => void;
  onUpdateCell: (tableId: string, rowIndex: number, colId: string, value: unknown) => void;
}) {
  const stats = React.useMemo<SummaryStat[]>(() => {
    if (!tableSchema.summary || rows.length === 0) return [];
    try {
      return tableSchema.summary({ rows, tables });
    } catch {
      return [];
    }
  }, [tableSchema, rows, tables]);

  return (
    <section className="qm-panel">
      <div className="qm-panel-head">
        <div className="qm-panel-title">
          {tableSchema.label}
          <span className="qm-panel-count">{rows.length}</span>
        </div>
        {!readOnly && (
          <button type="button" className="qm-btn-add" onClick={() => onAddRow(tableId)}>
            <Plus className="h-3 w-3" strokeWidth={2.5} />
            Ajouter
          </button>
        )}
      </div>

      {stats.length > 0 && (
        <div className="qm-panel-body">
          <SummaryStrip stats={stats} />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] italic text-[var(--text-mute)]">
          {readOnly
            ? "Rien n'a encore été renseigné ici par votre organisme."
            : (tableSchema.emptyLabel ?? "Aucune entrée. Cliquez sur « Ajouter ».")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="miniapp-table">
            <thead>
              <tr>
                {tableSchema.columns.map((col) => (
                  <th
                    key={col.id}
                    style={{ width: col.width }}
                    className={cn(
                      col.type === "attachments" && "text-center",
                      col.type === "computed" && "text-[var(--amethyst-br)]",
                    )}
                  >
                    {col.label}
                    {col.type === "computed" && <span className="ml-1 opacity-60">ƒ</span>}
                  </th>
                ))}
                {!readOnly && <th style={{ width: 50 }} />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {tableSchema.columns.map((col) => (
                    <td key={col.id}>
                      <MiniAppCell
                        column={col}
                        row={row}
                        rowIndex={i}
                        tableId={tableId}
                        rows={rows}
                        tables={tables}
                        onChange={(colId, value) => onUpdateCell(tableId, i, colId, value)}
                        auditId={auditId}
                        miniappKey={schemaKey}
                        attachmentsByPath={attachmentsByPath}
                        readOnly={readOnly}
                      />
                    </td>
                  ))}
                  {!readOnly && (
                    <td className="text-right">
                      <button
                        type="button"
                        className="qm-row-action"
                        onClick={() => onDeleteRow(tableId, i)}
                        title="Supprimer la ligne"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
