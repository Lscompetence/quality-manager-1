"use client";

import * as React from "react";
import { useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { saveMiniAppData } from "@/lib/actions/miniapps";
import { cn } from "@/lib/utils/cn";
import type { MiniAppData, Row } from "@/lib/miniapps/schema-types";

const SAVE_DEBOUNCE_MS = 800;

type Critere = {
  id: string;
  intitule: string;
  bloc_rncp: string;
  ponderation: string;       // 0-100
};

type Evaluation = {
  id: string;
  apprenant: string;
  date: string;
  session: string;
  notes: Record<string, string>;   // critereId → note 0-20
  observations: string;
};

type State = {
  criteres: Critere[];
  evaluations: Evaluation[];
};

export function GrilleEvaluation({
  auditId,
  miniappKey,
  initialData,
}: {
  auditId: string;
  miniappKey: string;
  initialData: MiniAppData | null;
}) {
  const initial = initialData?.tables ?? {};
  const [criteres, setCriteres] = React.useState<Critere[]>(
    (initial.criteres as Critere[] | undefined) ?? [],
  );
  const [evaluations, setEvaluations] = React.useState<Evaluation[]>(
    (initial.evaluations as Evaluation[] | undefined) ?? [],
  );

  const [, startTransition] = useTransition();
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const queueSave = React.useCallback(
    (next: State) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        startTransition(async () => {
          const result = await saveMiniAppData({
            audit_id: auditId,
            miniapp_key: miniappKey,
            data: {
              tables: {
                criteres: next.criteres as unknown as Row[],
                evaluations: next.evaluations as unknown as Row[],
              },
              schemaVersion: 1,
            },
          });
          if (!result.ok) toast.error("Sauvegarde échouée");
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [auditId, miniappKey],
  );

  const genId = () => Math.random().toString(36).slice(2, 10);

  // === Calculs ===
  const computeScore = (eval_: Evaluation): { total: number; pct: number; mention: string; mentionColor: string } => {
    let totalPondere = 0;
    let totalPonderationApplied = 0;
    for (const c of criteres) {
      const note = parseFloat(eval_.notes[c.id] ?? "");
      const pond = parseFloat(c.ponderation ?? "0");
      if (!isNaN(note) && !isNaN(pond) && pond > 0) {
        totalPondere += (note / 20) * pond;
        totalPonderationApplied += pond;
      }
    }
    const pct = totalPonderationApplied > 0 ? (totalPondere / totalPonderationApplied) * 100 : 0;
    const total = pct * 0.2;

    let mention = "—";
    let mentionColor = "text-muted-foreground";
    if (pct >= 90) { mention = "✨ Excellent"; mentionColor = "text-c2"; }
    else if (pct >= 75) { mention = "✓ Bien"; mentionColor = "text-c2/80"; }
    else if (pct >= 60) { mention = "✓ Validé"; mentionColor = "text-c4"; }
    else if (pct > 0) { mention = "❌ Non validé"; mentionColor = "text-destructive"; }

    return { total, pct, mention, mentionColor };
  };

  // === Critères ===
  const addCritere = () => {
    setCriteres((prev) => {
      const next = [...prev, { id: genId(), intitule: "", bloc_rncp: "", ponderation: "25" }];
      queueSave({ criteres: next, evaluations });
      return next;
    });
  };

  const updateCritere = (idx: number, field: keyof Critere, value: string) => {
    setCriteres((prev) => {
      const next = [...prev];
      const cur = next[idx];
      if (!cur) return prev;
      next[idx] = { ...cur, [field]: value };
      queueSave({ criteres: next, evaluations });
      return next;
    });
  };

  const deleteCritere = (idx: number) => {
    setCriteres((prev) => {
      const removed = prev[idx];
      const next = prev.filter((_, i) => i !== idx);
      // Cleanup notes des évaluations
      const cleanedEval = removed
        ? evaluations.map((ev) => {
            const { [removed.id]: _omit, ...rest } = ev.notes;
            return { ...ev, notes: rest };
          })
        : evaluations;
      setEvaluations(cleanedEval);
      queueSave({ criteres: next, evaluations: cleanedEval });
      return next;
    });
  };

  // === Évaluations ===
  const addEvaluation = () => {
    setEvaluations((prev) => {
      const next = [
        {
          id: genId(),
          apprenant: "",
          date: new Date().toISOString().slice(0, 10),
          session: "",
          notes: {},
          observations: "",
        },
        ...prev,
      ];
      queueSave({ criteres, evaluations: next });
      return next;
    });
    toast.success("Évaluation ajoutée");
  };

  const updateEvaluation = (idx: number, field: keyof Omit<Evaluation, "notes" | "id">, value: string) => {
    setEvaluations((prev) => {
      const next = [...prev];
      const cur = next[idx];
      if (!cur) return prev;
      next[idx] = { ...cur, [field]: value };
      queueSave({ criteres, evaluations: next });
      return next;
    });
  };

  const updateNote = (idx: number, critereId: string, value: string) => {
    setEvaluations((prev) => {
      const next = [...prev];
      const cur = next[idx];
      if (!cur) return prev;
      next[idx] = { ...cur, notes: { ...cur.notes, [critereId]: value } };
      queueSave({ criteres, evaluations: next });
      return next;
    });
  };

  const deleteEvaluation = (idx: number) => {
    setEvaluations((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      queueSave({ criteres, evaluations: next });
      return next;
    });
  };

  // KPI
  const stats = React.useMemo(() => {
    const scores = evaluations.map((e) => computeScore(e).pct).filter((p) => p > 0);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const validated = evaluations.filter((e) => computeScore(e).pct >= 60).length;
    return { avg, validated, total: evaluations.length };
  }, [evaluations, criteres]);

  return (
    <>
      <GrilleStyles />

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">
              Moyenne globale
            </p>
            <p className="font-sans text-2xl font-light leading-none">
              {stats.avg > 0 ? `${stats.avg.toFixed(1)} %` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">
              Apprenants validés (≥ 60%)
            </p>
            <p className="font-sans text-2xl font-light leading-none">
              {stats.validated} / {stats.total}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">
              Total pondérations
            </p>
            <p className="font-sans text-2xl font-light leading-none">
              {criteres.reduce((sum, c) => sum + (parseFloat(c.ponderation) || 0), 0)} %
            </p>
            {criteres.length > 0 &&
              Math.abs(criteres.reduce((s, c) => s + (parseFloat(c.ponderation) || 0), 0) - 100) > 0.5 && (
                <p className="font-mono text-[10px] text-c3 mt-1">⚠ Doit totaliser 100%</p>
              )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="evaluations">
        <TabsList>
          <TabsTrigger value="evaluations">
            Évaluations
            <span className="ml-1 rounded-md bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {evaluations.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="criteres">
            Grille de critères
            <span className="ml-1 rounded-md bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {criteres.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evaluations" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Évaluations individuelles</CardTitle>
              <Button size="sm" onClick={addEvaluation} disabled={criteres.length === 0}>
                <Plus className="h-3.5 w-3.5" />
                Évaluer un apprenant
              </Button>
            </CardHeader>
            <CardContent>
              {criteres.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Définissez d'abord les critères dans l'onglet « Grille de critères ».
                </p>
              ) : evaluations.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Aucune évaluation. Cliquez sur « Évaluer un apprenant ».
                </p>
              ) : (
                <div className="space-y-3">
                  {evaluations.map((ev, evIdx) => {
                    const score = computeScore(ev);
                    return (
                      <Card key={ev.id} className="bg-secondary/30">
                        <CardContent className="p-4">
                          <div className="flex flex-wrap items-end gap-3 mb-4">
                            <div className="flex-1 min-w-[160px]">
                              <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                                Apprenant
                              </label>
                              <input
                                className="cell-input"
                                value={ev.apprenant}
                                onChange={(e) => updateEvaluation(evIdx, "apprenant", e.target.value)}
                                placeholder="Nom Prénom"
                              />
                            </div>
                            <div>
                              <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                                Date
                              </label>
                              <input
                                type="date"
                                className="cell-input"
                                value={ev.date}
                                onChange={(e) => updateEvaluation(evIdx, "date", e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                                Session
                              </label>
                              <input
                                className="cell-input"
                                value={ev.session}
                                onChange={(e) => updateEvaluation(evIdx, "session", e.target.value)}
                              />
                            </div>
                            <div className="ml-auto text-right">
                              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                Score
                              </p>
                              <p className="font-sans text-2xl font-light leading-none">
                                {score.pct > 0 ? `${score.pct.toFixed(0)}%` : "—"}
                              </p>
                              <p className={cn("font-mono text-xs mt-1", score.mentionColor)}>
                                {score.mention}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => deleteEvaluation(evIdx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="space-y-2">
                            {criteres.map((c) => (
                              <div key={c.id} className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm">{c.intitule || "(critère sans nom)"}</p>
                                  {c.bloc_rncp && (
                                    <p className="font-mono text-[10px] text-muted-foreground">
                                      {c.bloc_rncp} · pondération {c.ponderation}%
                                    </p>
                                  )}
                                </div>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="20"
                                  className="cell-input w-24 text-right"
                                  value={ev.notes[c.id] ?? ""}
                                  onChange={(e) => updateNote(evIdx, c.id, e.target.value)}
                                  placeholder="/20"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="mt-3">
                            <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                              Observations
                            </label>
                            <textarea
                              className="cell-input min-h-[60px]"
                              value={ev.observations}
                              onChange={(e) => updateEvaluation(evIdx, "observations", e.target.value)}
                              placeholder="Points forts, axes d'amélioration..."
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="criteres" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Critères d'évaluation</CardTitle>
              <Button size="sm" onClick={addCritere}>
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {criteres.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Aucun critère. Définissez les critères pondérés à évaluer.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="miniapp-table">
                    <thead>
                      <tr>
                        <th>Intitulé du critère</th>
                        <th style={{ width: 200 }}>Bloc RNCP</th>
                        <th style={{ width: 130 }}>Pondération (%)</th>
                        <th style={{ width: 50 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {criteres.map((c, i) => (
                        <tr key={c.id}>
                          <td>
                            <input
                              className="cell-input"
                              value={c.intitule}
                              onChange={(e) => updateCritere(i, "intitule", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={c.bloc_rncp}
                              onChange={(e) => updateCritere(i, "bloc_rncp", e.target.value)}
                              placeholder="RNCP38362BC01"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              className="cell-input"
                              value={c.ponderation}
                              onChange={(e) => updateCritere(i, "ponderation", e.target.value)}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => deleteCritere(i)}
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
        </TabsContent>
      </Tabs>
    </>
  );
}

function GrilleStyles() {
  return (
    <style jsx global>{`
      .cell-input,
      .cell-select {
        width: 100%;
        padding: 8px 11px;
        background: transparent;
        border: 1px solid hsl(var(--border));
        border-radius: 7px;
        color: hsl(var(--foreground));
        font-family: inherit;
        font-size: 13px;
        transition: all 0.15s;
      }
      .cell-input:hover,
      .cell-select:hover {
        background: hsl(var(--secondary));
      }
      .cell-input:focus,
      .cell-select:focus {
        outline: none;
        background: hsl(var(--secondary));
        border-color: hsl(var(--ring));
        box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
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
    `}</style>
  );
}
