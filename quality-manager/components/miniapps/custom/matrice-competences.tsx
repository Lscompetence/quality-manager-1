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

type Intervenant = {
  id: string;
  nom: string;
  prenom: string;
  statut: string;            // "interne", "sous_traitant", "freelance"
  qualifications: string;
  qualiopi_st: string;       // "oui", "non", "na"
};

type Module = {
  id: string;
  nom: string;
  duree_h: string;
  bloc_rncp: string;
};

type Affectation = {
  intervenantId: string;
  moduleId: string;
  niveau: string;            // "principal", "secondaire", "remplacant", "none"
};

type State = {
  intervenants: Intervenant[];
  modules: Module[];
  affectations: Affectation[];
};

const LEVELS = [
  { value: "none", label: "—", color: "" },
  { value: "principal", label: "P", color: "bg-c2/30 text-c2 border-c2/40" },
  { value: "secondaire", label: "S", color: "bg-c4/30 text-c4 border-c4/40" },
  { value: "remplacant", label: "R", color: "bg-c3/30 text-c3 border-c3/40" },
];

const STATUT_OPTIONS = [
  { value: "interne", label: "👔 Interne" },
  { value: "sous_traitant", label: "🤝 Sous-traitant" },
  { value: "freelance", label: "💼 Freelance" },
];

export function MatriceCompetences({
  auditId,
  miniappKey,
  initialData,
}: {
  auditId: string;
  miniappKey: string;
  initialData: MiniAppData | null;
}) {
  const initial = initialData?.tables ?? {};

  const [intervenants, setIntervenants] = React.useState<Intervenant[]>(
    (initial.intervenants as Intervenant[] | undefined) ?? [],
  );
  const [modules, setModules] = React.useState<Module[]>(
    (initial.modules as Module[] | undefined) ?? [],
  );
  const [affectations, setAffectations] = React.useState<Affectation[]>(
    (initial.affectations as Affectation[] | undefined) ?? [],
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
                intervenants: next.intervenants as unknown as Row[],
                modules: next.modules as unknown as Row[],
                affectations: next.affectations as unknown as Row[],
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

  // === Helpers ===
  const genId = () => Math.random().toString(36).slice(2, 10);

  const addIntervenant = () => {
    setIntervenants((prev) => {
      const next = [
        ...prev,
        {
          id: genId(),
          nom: "",
          prenom: "",
          statut: "interne",
          qualifications: "",
          qualiopi_st: "na",
        },
      ];
      queueSave({ intervenants: next, modules, affectations });
      return next;
    });
  };

  const updateIntervenant = (idx: number, field: keyof Intervenant, value: string) => {
    setIntervenants((prev) => {
      const next = [...prev];
      const cur = next[idx];
      if (!cur) return prev;
      next[idx] = { ...cur, [field]: value };
      queueSave({ intervenants: next, modules, affectations });
      return next;
    });
  };

  const deleteIntervenant = (idx: number) => {
    setIntervenants((prev) => {
      const removed = prev[idx];
      const next = prev.filter((_, i) => i !== idx);
      const nextAff = removed
        ? affectations.filter((a) => a.intervenantId !== removed.id)
        : affectations;
      setAffectations(nextAff);
      queueSave({ intervenants: next, modules, affectations: nextAff });
      return next;
    });
  };

  const addModule = () => {
    setModules((prev) => {
      const next = [
        ...prev,
        { id: genId(), nom: "", duree_h: "", bloc_rncp: "" },
      ];
      queueSave({ intervenants, modules: next, affectations });
      return next;
    });
  };

  const updateModule = (idx: number, field: keyof Module, value: string) => {
    setModules((prev) => {
      const next = [...prev];
      const cur = next[idx];
      if (!cur) return prev;
      next[idx] = { ...cur, [field]: value };
      queueSave({ intervenants, modules: next, affectations });
      return next;
    });
  };

  const deleteModule = (idx: number) => {
    setModules((prev) => {
      const removed = prev[idx];
      const next = prev.filter((_, i) => i !== idx);
      const nextAff = removed
        ? affectations.filter((a) => a.moduleId !== removed.id)
        : affectations;
      setAffectations(nextAff);
      queueSave({ intervenants, modules: next, affectations: nextAff });
      return next;
    });
  };

  // === Matrice click ===
  const getAffectation = (intId: string, modId: string): string => {
    const a = affectations.find((x) => x.intervenantId === intId && x.moduleId === modId);
    return a?.niveau ?? "none";
  };

  const cycleAffectation = (intId: string, modId: string) => {
    const current = getAffectation(intId, modId);
    const currentIdx = LEVELS.findIndex((l) => l.value === current);
    const next = LEVELS[(currentIdx + 1) % LEVELS.length]!;

    setAffectations((prev) => {
      const without = prev.filter(
        (a) => !(a.intervenantId === intId && a.moduleId === modId),
      );
      const updated =
        next.value === "none"
          ? without
          : [...without, { intervenantId: intId, moduleId: modId, niveau: next.value }];
      queueSave({ intervenants, modules, affectations: updated });
      return updated;
    });
  };

  // KPI : modules mono-formateur (= 1 seul principal et aucun secondaire/remplaçant)
  const monoFormateurs = React.useMemo(() => {
    return modules.filter((m) => {
      const aff = affectations.filter((a) => a.moduleId === m.id && a.niveau !== "none");
      const hasPrincipal = aff.some((a) => a.niveau === "principal");
      const hasBackup = aff.some((a) => a.niveau === "secondaire" || a.niveau === "remplacant");
      return hasPrincipal && !hasBackup;
    });
  }, [modules, affectations]);

  return (
    <>
      <MatriceStyles />

      {monoFormateurs.length > 0 && (
        <Card className="border-c3/30 bg-c3/[0.05] mb-4">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-c3/15 text-c3 shrink-0">
              ⚠
            </div>
            <p className="text-sm">
              <b className="text-c3">{monoFormateurs.length} module(s) mono-formateur(s) détecté(s).</b>{" "}
              Risque de continuité pédagogique — il est recommandé de désigner au moins un
              remplaçant.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="matrice">
        <TabsList>
          <TabsTrigger value="matrice">Matrice d&apos;affectation</TabsTrigger>
          <TabsTrigger value="intervenants">
            Intervenants
            <span className="ml-1 rounded-md bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {intervenants.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="modules">
            Modules
            <span className="ml-1 rounded-md bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {modules.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* === Onglet Matrice === */}
        <TabsContent value="matrice" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Matrice intervenants × modules</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Cliquez sur une cellule pour cycler : — → P (Principal) → S (Secondaire) → R (Remplaçant) → —
              </p>
            </CardHeader>
            <CardContent>
              {intervenants.length === 0 || modules.length === 0 ? (
                <p className="text-center py-12 text-sm text-muted-foreground">
                  Ajoutez d&apos;abord des intervenants et des modules dans les onglets correspondants.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="matrice-table">
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-background z-10">Intervenant</th>
                        {modules.map((m) => (
                          <th key={m.id} className="matrice-modhead">
                            <div className="text-xs font-medium normal-case tracking-normal whitespace-normal">
                              {m.nom || "(sans nom)"}
                            </div>
                            {m.duree_h && (
                              <div className="font-mono text-[9px] text-muted-foreground/70 mt-0.5">
                                {m.duree_h}h
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {intervenants.map((int) => (
                        <tr key={int.id}>
                          <td className="sticky left-0 bg-background z-10 matrice-intcell">
                            <div className="text-sm font-medium">
                              {int.prenom} {int.nom}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {STATUT_OPTIONS.find((s) => s.value === int.statut)?.label}
                            </div>
                          </td>
                          {modules.map((m) => {
                            const niveau = getAffectation(int.id, m.id);
                            const level = LEVELS.find((l) => l.value === niveau)!;
                            return (
                              <td key={m.id} className="matrice-cell">
                                <button
                                  type="button"
                                  className={cn(
                                    "h-10 w-10 rounded-lg border font-mono text-sm font-bold transition-all hover:scale-110",
                                    level.color || "border-border hover:bg-secondary",
                                  )}
                                  onClick={() => cycleAffectation(int.id, m.id)}
                                  title={`${int.prenom} ${int.nom} × ${m.nom}`}
                                >
                                  {level.label}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">Légende :</span>
                {LEVELS.filter((l) => l.value !== "none").map((l) => (
                  <span key={l.value} className="flex items-center gap-1.5">
                    <span className={cn("inline-grid h-6 w-6 place-items-center rounded-md border font-mono text-[10px] font-bold", l.color)}>
                      {l.label}
                    </span>
                    {l.value === "principal" && "Principal"}
                    {l.value === "secondaire" && "Secondaire / Co-anim"}
                    {l.value === "remplacant" && "Remplaçant"}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Onglet Intervenants === */}
        <TabsContent value="intervenants" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Équipe d&apos;intervenants (I21 / I27)</CardTitle>
              <Button size="sm" onClick={addIntervenant}>
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {intervenants.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Aucun intervenant. Cliquez sur « Ajouter ».
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="miniapp-table">
                    <thead>
                      <tr>
                        <th style={{ width: 180 }}>Prénom</th>
                        <th style={{ width: 180 }}>Nom</th>
                        <th style={{ width: 170 }}>Statut</th>
                        <th>Qualifications / certifications</th>
                        <th style={{ width: 170 }}>Qualiopi (ST)</th>
                        <th style={{ width: 50 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {intervenants.map((int, i) => (
                        <tr key={int.id}>
                          <td>
                            <input
                              className="cell-input"
                              value={int.prenom}
                              onChange={(e) => updateIntervenant(i, "prenom", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={int.nom}
                              onChange={(e) => updateIntervenant(i, "nom", e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              className="cell-select"
                              value={int.statut}
                              onChange={(e) => updateIntervenant(i, "statut", e.target.value)}
                            >
                              {STATUT_OPTIONS.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={int.qualifications}
                              onChange={(e) => updateIntervenant(i, "qualifications", e.target.value)}
                              placeholder="Diplômes, certifications, expérience..."
                            />
                          </td>
                          <td>
                            <select
                              className="cell-select"
                              value={int.qualiopi_st}
                              onChange={(e) => updateIntervenant(i, "qualiopi_st", e.target.value)}
                            >
                              <option value="na">— N/A (interne)</option>
                              <option value="oui">✓ Oui</option>
                              <option value="non">❌ Non</option>
                            </select>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => deleteIntervenant(i)}
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

        {/* === Onglet Modules === */}
        <TabsContent value="modules" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Modules de formation</CardTitle>
              <Button size="sm" onClick={addModule}>
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {modules.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Aucun module. Cliquez sur « Ajouter ».
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="miniapp-table">
                    <thead>
                      <tr>
                        <th>Nom du module</th>
                        <th style={{ width: 120 }}>Durée (h)</th>
                        <th style={{ width: 220 }}>Bloc RNCP</th>
                        <th style={{ width: 50 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((m, i) => (
                        <tr key={m.id}>
                          <td>
                            <input
                              className="cell-input"
                              value={m.nom}
                              onChange={(e) => updateModule(i, "nom", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="cell-input"
                              value={m.duree_h}
                              onChange={(e) => updateModule(i, "duree_h", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={m.bloc_rncp}
                              onChange={(e) => updateModule(i, "bloc_rncp", e.target.value)}
                              placeholder="RNCP38362BC01"
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => deleteModule(i)}
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

function MatriceStyles() {
  return (
    <style jsx global>{`
      .cell-input,
      .cell-select {
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
      .cell-select:hover {
        background: hsl(var(--secondary));
        border-color: hsl(var(--border));
      }
      .cell-input:focus,
      .cell-select:focus {
        outline: none;
        background: hsl(var(--secondary));
        border-color: hsl(var(--ring));
        box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
      }
      .miniapp-table,
      .matrice-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
      }
      .miniapp-table th,
      .matrice-table th {
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
      .matrice-modhead {
        min-width: 80px;
        max-width: 100px;
        text-align: center !important;
        padding: 10px 6px !important;
      }
      .matrice-intcell {
        padding: 10px 12px;
        border-bottom: 1px solid hsl(var(--border));
        min-width: 200px;
      }
      .matrice-cell {
        text-align: center;
        padding: 6px;
        border-bottom: 1px solid hsl(var(--border));
      }
      .matrice-table tr:hover .matrice-intcell {
        background: hsl(var(--secondary) / 0.4);
      }
    `}</style>
  );
}
