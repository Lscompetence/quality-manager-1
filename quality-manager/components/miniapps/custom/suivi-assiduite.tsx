"use client";

import * as React from "react";
import { useTransition } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { saveMiniAppData } from "@/lib/actions/miniapps";
import { cn } from "@/lib/utils/cn";
import type { MiniAppData, Row } from "@/lib/miniapps/schema-types";

const SAVE_DEBOUNCE_MS = 800;

type Beneficiaire = {
  id: string;
  nom: string;
  prenom: string;
  session: string;
};

type DemiJournee = {
  date: string;           // YYYY-MM-DD
  moment: "matin" | "apresmidi";
  label: string;
};

type Presence = "P" | "A_J" | "A_NJ" | "R" | "";

type Emargement = {
  beneficiaireId: string;
  demiJourneeKey: string;     // `${date}__${moment}`
  presence: Presence;
  motif: string;
};

type State = {
  beneficiaires: Beneficiaire[];
  demiJournees: DemiJournee[];
  emargements: Emargement[];
};

const PRESENCE_OPTIONS: { value: Presence; label: string; color: string }[] = [
  { value: "", label: "—", color: "" },
  { value: "P", label: "P", color: "bg-c2/30 text-c2 border-c2/40" },
  { value: "A_J", label: "AJ", color: "bg-c3/30 text-c3 border-c3/40" },
  { value: "A_NJ", label: "AN", color: "bg-destructive/30 text-destructive border-destructive/40" },
  { value: "R", label: "R", color: "bg-c4/30 text-c4 border-c4/40" },
];

export function SuiviAssiduite({
  auditId,
  miniappKey,
  initialData,
}: {
  auditId: string;
  miniappKey: string;
  initialData: MiniAppData | null;
}) {
  const initial = initialData?.tables ?? {};

  const [beneficiaires, setBeneficiaires] = React.useState<Beneficiaire[]>(
    (initial.beneficiaires as Beneficiaire[] | undefined) ?? [],
  );
  const [demiJournees, setDemiJournees] = React.useState<DemiJournee[]>(
    (initial.demiJournees as DemiJournee[] | undefined) ?? [],
  );
  const [emargements, setEmargements] = React.useState<Emargement[]>(
    (initial.emargements as Emargement[] | undefined) ?? [],
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
                beneficiaires: next.beneficiaires as unknown as Row[],
                demiJournees: next.demiJournees as unknown as Row[],
                emargements: next.emargements as unknown as Row[],
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

  // === Helpers calculs ===
  const dmKey = (dj: DemiJournee) => `${dj.date}__${dj.moment}`;

  const getPresence = (benId: string, djKey: string): Presence => {
    return emargements.find((e) => e.beneficiaireId === benId && e.demiJourneeKey === djKey)?.presence ?? "";
  };

  const cyclePresence = (benId: string, djKey: string) => {
    const current = getPresence(benId, djKey);
    const currentIdx = PRESENCE_OPTIONS.findIndex((p) => p.value === current);
    const next = PRESENCE_OPTIONS[(currentIdx + 1) % PRESENCE_OPTIONS.length]!;

    setEmargements((prev) => {
      const without = prev.filter((e) => !(e.beneficiaireId === benId && e.demiJourneeKey === djKey));
      const updated =
        next.value === ""
          ? without
          : [...without, { beneficiaireId: benId, demiJourneeKey: djKey, presence: next.value, motif: "" }];
      queueSave({ beneficiaires, demiJournees, emargements: updated });
      return updated;
    });
  };

  // Taux d'assiduité par bénéficiaire
  const tauxAssiduite = (benId: string): { taux: number; total: number; presents: number } => {
    const aff = emargements.filter((e) => e.beneficiaireId === benId);
    const totalCounted = aff.filter((e) => e.presence === "P" || e.presence === "A_J" || e.presence === "A_NJ").length;
    const presents = aff.filter((e) => e.presence === "P").length;
    return {
      taux: totalCounted > 0 ? (presents / totalCounted) * 100 : 0,
      total: totalCounted,
      presents,
    };
  };

  const niveauAlerte = (taux: number): { label: string; color: string } => {
    if (taux >= 95) return { label: "✓ Excellente", color: "text-c2" };
    if (taux >= 85) return { label: "✓ Normale", color: "text-foreground" };
    if (taux >= 70) return { label: "🟠 N2 Orange", color: "text-c3" };
    if (taux > 0) return { label: "🔴 N3 Rouge", color: "text-destructive" };
    return { label: "—", color: "text-muted-foreground" };
  };

  const alertes = beneficiaires
    .map((b) => ({ b, ...tauxAssiduite(b.id) }))
    .filter((x) => x.total > 0 && x.taux < 85);

  // === Ajouts ===
  const addBeneficiaire = () => {
    setBeneficiaires((prev) => {
      const next = [...prev, { id: genId(), nom: "", prenom: "", session: "" }];
      queueSave({ beneficiaires: next, demiJournees, emargements });
      return next;
    });
  };

  const updateBeneficiaire = (idx: number, field: keyof Beneficiaire, value: string) => {
    setBeneficiaires((prev) => {
      const next = [...prev];
      const cur = next[idx];
      if (!cur) return prev;
      next[idx] = { ...cur, [field]: value };
      queueSave({ beneficiaires: next, demiJournees, emargements });
      return next;
    });
  };

  const deleteBeneficiaire = (idx: number) => {
    setBeneficiaires((prev) => {
      const removed = prev[idx];
      const next = prev.filter((_, i) => i !== idx);
      const nextEmar = removed
        ? emargements.filter((e) => e.beneficiaireId !== removed.id)
        : emargements;
      setEmargements(nextEmar);
      queueSave({ beneficiaires: next, demiJournees, emargements: nextEmar });
      return next;
    });
  };

  const addJournee = (date: string) => {
    if (!date) return;
    const matin: DemiJournee = { date, moment: "matin", label: "Matin" };
    const aprem: DemiJournee = { date, moment: "apresmidi", label: "AM" };
    setDemiJournees((prev) => {
      const next = [...prev, matin, aprem].sort((a, b) => a.date.localeCompare(b.date) || a.moment.localeCompare(b.moment));
      queueSave({ beneficiaires, demiJournees: next, emargements });
      return next;
    });
    toast.success("Journée ajoutée (matin + après-midi)");
  };

  const deleteDemiJournee = (key: string) => {
    setDemiJournees((prev) => {
      const next = prev.filter((dj) => dmKey(dj) !== key);
      const nextEmar = emargements.filter((e) => e.demiJourneeKey !== key);
      setEmargements(nextEmar);
      queueSave({ beneficiaires, demiJournees: next, emargements: nextEmar });
      return next;
    });
  };

  const [dateInput, setDateInput] = React.useState("");

  return (
    <>
      <SuiviStyles />

      {alertes.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/[0.05] mb-4">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-destructive/15 text-destructive shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">
                {alertes.length} bénéficiaire(s) sous le seuil d&apos;alerte
              </p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                {alertes.slice(0, 5).map((a) => {
                  const lvl = niveauAlerte(a.taux);
                  return (
                    <div key={a.b.id}>
                      <b>{a.b.prenom} {a.b.nom}</b> : {a.taux.toFixed(0)}% —{" "}
                      <span className={lvl.color}>{lvl.label}</span>
                    </div>
                  );
                })}
                {alertes.length > 5 && <div>… et {alertes.length - 5} autre(s)</div>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="emargements">
        <TabsList>
          <TabsTrigger value="emargements">Émargements</TabsTrigger>
          <TabsTrigger value="beneficiaires">
            Bénéficiaires
            <span className="ml-1 rounded-md bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {beneficiaires.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="emargements" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Émargement par demi-journée</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Cliquez sur une cellule pour cycler : — → P (Présent) → AJ (Absent justifié) → AN (Absent non justifié) → R (Retard) → —
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 mb-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    Ajouter une journée
                  </label>
                  <input
                    type="date"
                    className="cell-input w-44"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    addJournee(dateInput);
                    setDateInput("");
                  }}
                  disabled={!dateInput}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter
                </Button>
              </div>

              {beneficiaires.length === 0 || demiJournees.length === 0 ? (
                <p className="text-center py-12 text-sm text-muted-foreground">
                  Ajoutez des bénéficiaires et des journées pour démarrer.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="matrice-table">
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-background z-10">Bénéficiaire</th>
                        {demiJournees.map((dj) => (
                          <th key={dmKey(dj)} className="dj-head">
                            <div className="text-[10px] font-medium">
                              {formatShortDate(dj.date)}
                            </div>
                            <div className="font-mono text-[9px] text-muted-foreground/70 mt-0.5">
                              {dj.label}
                            </div>
                            <button
                              type="button"
                              className="mt-1 text-muted-foreground/40 hover:text-destructive"
                              onClick={() => deleteDemiJournee(dmKey(dj))}
                              title="Supprimer cette demi-journée"
                            >
                              ✕
                            </button>
                          </th>
                        ))}
                        <th className="sticky right-0 bg-background">Taux</th>
                      </tr>
                    </thead>
                    <tbody>
                      {beneficiaires.map((b) => {
                        const stats = tauxAssiduite(b.id);
                        const lvl = niveauAlerte(stats.taux);
                        return (
                          <tr key={b.id}>
                            <td className="sticky left-0 bg-background z-10 matrice-intcell">
                              <div className="text-sm font-medium">
                                {b.prenom} {b.nom}
                              </div>
                              <div className="font-mono text-[10px] text-muted-foreground">
                                {b.session}
                              </div>
                            </td>
                            {demiJournees.map((dj) => {
                              const p = getPresence(b.id, dmKey(dj));
                              const opt = PRESENCE_OPTIONS.find((o) => o.value === p)!;
                              return (
                                <td key={dmKey(dj)} className="matrice-cell">
                                  <button
                                    type="button"
                                    className={cn(
                                      "h-9 w-9 rounded-md border font-mono text-[11px] font-bold transition-all hover:scale-110",
                                      opt.color || "border-border hover:bg-secondary",
                                    )}
                                    onClick={() => cyclePresence(b.id, dmKey(dj))}
                                  >
                                    {opt.label}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="sticky right-0 bg-background text-right matrice-intcell">
                              <div className="text-sm font-medium">
                                {stats.total > 0 ? `${stats.taux.toFixed(0)}%` : "—"}
                              </div>
                              <div className={cn("font-mono text-[10px]", lvl.color)}>
                                {lvl.label}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">Légende :</span>
                {PRESENCE_OPTIONS.filter((p) => p.value).map((p) => (
                  <span key={p.value} className="flex items-center gap-1.5">
                    <span className={cn("inline-grid h-6 w-6 place-items-center rounded-md border font-mono text-[10px] font-bold", p.color)}>
                      {p.label}
                    </span>
                    {p.value === "P" && "Présent"}
                    {p.value === "A_J" && "Absent justifié"}
                    {p.value === "A_NJ" && "Absent non justifié"}
                    {p.value === "R" && "Retard"}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beneficiaires" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Liste des bénéficiaires</CardTitle>
              <Button size="sm" onClick={addBeneficiaire}>
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {beneficiaires.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Aucun bénéficiaire.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="miniapp-table">
                    <thead>
                      <tr>
                        <th style={{ width: 180 }}>Prénom</th>
                        <th style={{ width: 180 }}>Nom</th>
                        <th>Session / Promo</th>
                        <th style={{ width: 50 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {beneficiaires.map((b, i) => (
                        <tr key={b.id}>
                          <td>
                            <input
                              className="cell-input"
                              value={b.prenom}
                              onChange={(e) => updateBeneficiaire(i, "prenom", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={b.nom}
                              onChange={(e) => updateBeneficiaire(i, "nom", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={b.session}
                              onChange={(e) => updateBeneficiaire(i, "session", e.target.value)}
                              placeholder="BTS MCO 2026..."
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => deleteBeneficiaire(i)}
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

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  } catch {
    return iso;
  }
}

function SuiviStyles() {
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
      .dj-head {
        min-width: 60px;
        max-width: 70px;
        text-align: center !important;
        padding: 8px 4px !important;
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
    `}</style>
  );
}
