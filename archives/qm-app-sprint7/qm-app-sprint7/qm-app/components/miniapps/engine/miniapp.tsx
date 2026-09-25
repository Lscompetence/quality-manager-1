"use client";

import * as React from "react";
import { useTransition } from "react";
import { AlertTriangle, CheckCircle2, Info, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Tone,
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

const TONE_TEXT: Record<Tone, string> = {
  ok: "text-c2",
  warn: "text-c3",
  danger: "text-destructive",
  neutral: "text-foreground",
};

const ALERT_STYLES: Record<ControlAlert["tone"], string> = {
  ok: "border-c2/30 bg-c2/[0.07] text-c2",
  warn: "border-c3/30 bg-c3/[0.07] text-c3",
  danger: "border-destructive/30 bg-destructive/[0.07] text-destructive",
};

/**
 * IMPORTANT — le composant reçoit `schemaKey`, pas `schema`.
 * Les schémas contiennent des fonctions (`compute`, `summary`, `controls`,
 * `rowLabel`) : Next.js refuse de sérialiser des fonctions à travers la
 * frontière Server Component → Client Component. Le moteur résout donc
 * lui-même le schéma via le registry, côté client.
 */
export function MiniApp({
  schemaKey,
  auditId,
  initialData,
  attachments,
}: {
  schemaKey: string;
  auditId: string;
  initialData: MiniAppData | null;
  attachments: AttachmentRow[];
}) {
  const schema = React.useMemo(() => getMiniAppSchema(schemaKey), [schemaKey]);

  // État initial : data persistée OU seed du schema
  const [tables, setTables] = React.useState<Record<string, Row[]>>(() => {
    if (initialData?.tables) return initialData.tables;
    if (schema?.seed) return structuredClone(schema.seed);
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
    [auditId, schemaKey],
  );

  const updateCell = (tableId: string, rowIndex: number, colId: string, value: unknown) => {
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
    setTables((prev) => {
      const next = { ...prev };
      const rows = [...(next[tableId] ?? [])];
      rows.splice(rowIndex, 1);
      next[tableId] = rows;
      queueSave(next);
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
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Mini-app inconnue : {schemaKey}
      </p>
    );
  }

  return (
    <>
      <MiniAppStyles />

      {schema.controls && hasAnyRow && <ControlsBanner alerts={alerts} />}

      {tabs.length === 1 ? (
        <SingleTabContent
          tab={tabs[0]!}
          schema={schema}
          tables={tables}
          auditId={auditId}
          attachmentsByPath={attachmentsByPath}
          onAddRow={addRow}
          onDeleteRow={deleteRow}
          onUpdateCell={updateCell}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
                <span className="ml-1 rounded-md bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {tabCounts[tab.id] ?? 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-4">
              <SingleTabContent
                tab={tab}
                schema={schema}
                tables={tables}
                auditId={auditId}
                attachmentsByPath={attachmentsByPath}
                onAddRow={addRow}
                onDeleteRow={deleteRow}
                onUpdateCell={updateCell}
              />
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
        <p className="text-sm font-medium">
          Contrôles automatiques : aucune anomalie détectée sur les lignes saisies.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-5 space-y-2">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Contrôles automatiques · {alerts.length} point{alerts.length > 1 ? "s" : ""} à traiter
      </p>
      {alerts.map((alert, i) => {
        const Icon = alert.tone === "danger" ? AlertTriangle : alert.tone === "warn" ? Info : CheckCircle2;
        return (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-4 py-2.5",
              ALERT_STYLES[alert.tone],
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <p className="flex-1 text-sm font-medium">{alert.message}</p>
            {alert.count !== undefined && (
              <span className="rounded-md bg-current/10 px-2 py-0.5 font-mono text-[11px] font-bold">
                {alert.count}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Bande de synthèse d'un registre
// -----------------------------------------------------------------------------

function SummaryStrip({ stats }: { stats: SummaryStat[] }) {
  if (stats.length === 0) return null;
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5"
          title={stat.hint}
        >
          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {stat.label}
          </p>
          <p className={cn("mt-0.5 text-lg font-light tabular-nums", TONE_TEXT[stat.tone ?? "neutral"])}>
            {stat.value}
          </p>
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
  onAddRow,
  onDeleteRow,
  onUpdateCell,
}: {
  tab: { id: string; label: string; tableIds: string[] };
  schema: MiniAppSchema;
  tables: Record<string, Row[]>;
  auditId: string;
  attachmentsByPath: Map<string, AttachmentRow[]>;
  onAddRow: (tableId: string) => void;
  onDeleteRow: (tableId: string, rowIndex: number) => void;
  onUpdateCell: (tableId: string, rowIndex: number, colId: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-5">
      {tab.tableIds.map((tableId) => {
        const tableSchema = (schema.tables ?? []).find((t) => t.id === tableId);
        if (!tableSchema) return null;
        return (
          <RegisterCard
            key={tableId}
            tableSchema={tableSchema}
            tableId={tableId}
            rows={tables[tableId] ?? []}
            tables={tables}
            schemaKey={schema.key}
            auditId={auditId}
            attachmentsByPath={attachmentsByPath}
            onAddRow={onAddRow}
            onDeleteRow={onDeleteRow}
            onUpdateCell={onUpdateCell}
          />
        );
      })}
    </div>
  );
}

function RegisterCard({
  tableSchema,
  tableId,
  rows,
  tables,
  schemaKey,
  auditId,
  attachmentsByPath,
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{tableSchema.label}</CardTitle>
        <Button size="sm" onClick={() => onAddRow(tableId)}>
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </Button>
      </CardHeader>
      <CardContent>
        <SummaryStrip stats={stats} />

        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {tableSchema.emptyLabel ?? "Aucune entrée. Cliquez sur « Ajouter »."}
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
                        col.type === "computed" && "text-amethyst-bright/80",
                      )}
                    >
                      {col.label}
                      {col.type === "computed" && <span className="ml-1 opacity-60">ƒ</span>}
                    </th>
                  ))}
                  <th style={{ width: 50 }}></th>
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
                        />
                      </td>
                    ))}
                    <td className="text-right">
                      <button
                        type="button"
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDeleteRow(tableId, i)}
                        title="Supprimer la ligne"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Styles de cellule (scopés à la mini-app)
// -----------------------------------------------------------------------------

function MiniAppStyles() {
  return (
    <style jsx global>{`
      .cell-input,
      .cell-select,
      .cell-textarea {
        width: 100%;
        padding: 8px 11px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 7px;
        color: hsl(var(--foreground));
        font-family: inherit;
        font-size: 12.5px;
        transition: all 0.15s;
      }
      .cell-input:hover,
      .cell-select:hover,
      .cell-textarea:hover {
        background: hsl(var(--secondary));
        border-color: hsl(var(--border));
      }
      .cell-input:focus,
      .cell-select:focus,
      .cell-textarea:focus {
        outline: none;
        background: hsl(var(--secondary));
        border-color: hsl(var(--ring));
        box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
      }
      .cell-textarea {
        resize: none;
        overflow: hidden;
        line-height: 1.4;
      }
      .miniapp-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
      }
      .miniapp-table th {
        font-family: "JetBrains Mono", monospace;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: hsl(var(--muted-foreground));
        text-align: left;
        padding: 10px 12px;
        border-bottom: 1px solid hsl(var(--border));
      }
      .miniapp-table td {
        padding: 6px 6px;
        vertical-align: top;
        border-bottom: 1px solid hsl(var(--border));
      }
      .miniapp-table tr:last-child td {
        border-bottom: none;
      }
      .miniapp-table tr:hover td {
        background: hsl(var(--secondary) / 0.4);
      }
    `}</style>
  );
}
