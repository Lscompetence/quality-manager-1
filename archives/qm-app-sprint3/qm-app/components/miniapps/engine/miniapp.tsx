"use client";

import * as React from "react";
import { useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { saveMiniAppData } from "@/lib/actions/miniapps";
import type { MiniAppSchema, MiniAppData, Row } from "@/lib/miniapps/schema-types";
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

export function MiniApp({
  schema,
  auditId,
  initialData,
  attachments,
}: {
  schema: MiniAppSchema;
  auditId: string;
  initialData: MiniAppData | null;
  attachments: AttachmentRow[];
}) {
  // État initial : data persistée OU seed du schema
  const [tables, setTables] = React.useState<Record<string, Row[]>>(() => {
    if (initialData?.tables) return initialData.tables;
    if (schema.seed) return structuredClone(schema.seed);
    // Sinon : tableaux vides
    return Object.fromEntries(schema.tables.map((t) => [t.id, []]));
  });

  // Index PJ par context_path
  const attachmentsByPath = React.useMemo(() => {
    const map = new Map<string, AttachmentRow[]>();
    for (const att of attachments) {
      // On regroupe par context_path précis ; l'AttachmentList affichera les autres si pertinent
      const path = (att as AttachmentRow & { context_path?: string }).context_path ?? "";
      if (!map.has(path)) map.set(path, []);
      map.get(path)!.push(att);
    }
    return map;
  }, [attachments]);

  // Onglets : utiliser ceux du schema OU générer 1 par table
  const tabs = React.useMemo(() => {
    if (schema.tabs && schema.tabs.length > 0) return schema.tabs;
    return schema.tables.map((t) => ({ id: t.id, label: t.label, tableIds: [t.id] }));
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
            miniapp_key: schema.key,
            data: { tables: nextTables, schemaVersion: 1 },
          });
          if (!result.ok) toast.error("Sauvegarde échouée : " + result.error);
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [auditId, schema.key],
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
      const schemaTable = schema.tables.find((t) => t.id === tableId);
      const newRow: Row = {};
      if (schemaTable) {
        for (const col of schemaTable.columns) {
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
      counts[tab.id] = tab.tableIds.reduce((sum, tid) => sum + (tables[tid]?.length ?? 0), 0);
    }
    return counts;
  }, [tabs, tables]);

  return (
    <>
      {/* Cell styles (injectés ici, scopés à la mini-app) */}
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
        const tableSchema = schema.tables.find((t) => t.id === tableId);
        if (!tableSchema) return null;
        const rows = tables[tableId] ?? [];

        return (
          <Card key={tableId}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{tableSchema.label}</CardTitle>
              <Button size="sm" onClick={() => onAddRow(tableId)}>
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Aucune entrée. Cliquez sur « Ajouter ».
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
                            className={cn(col.type === "attachments" && "text-center")}
                          >
                            {col.label}
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
                                onChange={(colId, value) => onUpdateCell(tableId, i, colId, value)}
                                auditId={auditId}
                                miniappKey={schema.key}
                                attachmentsByPath={attachmentsByPath}
                              />
                            </td>
                          ))}
                          <td className="text-right">
                            <button
                              type="button"
                              className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
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
      })}
    </div>
  );
}
