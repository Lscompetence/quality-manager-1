"use client";

import * as React from "react";
import { useTransition } from "react";
import { Plus, Trash2, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { saveMiniAppData } from "@/lib/actions/miniapps";
import type { MiniAppData, Row } from "@/lib/miniapps/schema-types";

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

type SatisfactionRow = {
  session: string;
  date: string;
  nb_participants: string;
  nb_reponses: string;
  note_global: string;       // 0-5
  note_contenu: string;
  note_animateur: string;
  note_organisation: string;
  commentaires: string;
};

type ReclamationRow = {
  date: string;
  source: string;
  emetteur: string;
  objet: string;
  gravite: string;
  statut: string;
  date_traitement: string;
  reponse: string;
};

type AmeliorationRow = {
  date: string;
  origine: string;
  action: string;
  responsable: string;
  echeance: string;
  statut: string;
  evaluation: string;
};

export function CockpitC7({
  auditId,
  miniappKey,
  initialData,
  attachments,
}: {
  auditId: string;
  miniappKey: string;
  initialData: MiniAppData | null;
  attachments: AttachmentRow[];
}) {
  const initial = initialData?.tables ?? {};
  const [satisfaction, setSatisfaction] = React.useState<SatisfactionRow[]>(
    (initial.satisfaction as SatisfactionRow[] | undefined) ?? [],
  );
  const [reclamations, setReclamations] = React.useState<ReclamationRow[]>(
    (initial.reclamations as ReclamationRow[] | undefined) ?? [],
  );
  const [ameliorations, setAmeliorations] = React.useState<AmeliorationRow[]>(
    (initial.ameliorations as AmeliorationRow[] | undefined) ?? [],
  );

  const [, startTransition] = useTransition();
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const queueSave = React.useCallback(
    (next: { satisfaction: SatisfactionRow[]; reclamations: ReclamationRow[]; ameliorations: AmeliorationRow[] }) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        startTransition(async () => {
          const result = await saveMiniAppData({
            audit_id: auditId,
            miniapp_key: miniappKey,
            data: {
              tables: {
                satisfaction: next.satisfaction as unknown as Row[],
                reclamations: next.reclamations as unknown as Row[],
                ameliorations: next.ameliorations as unknown as Row[],
              },
              schemaVersion: 1,
            },
          });
          if (!result.ok) toast.error("Sauvegarde échouée : " + result.error);
        });
      }, SAVE_DEBOUNCE_MS);
    },
    [auditId, miniappKey],
  );

  // === Calculs des KPI ===
  const kpi = React.useMemo(() => {
    // Satisfaction
    const validRatings = satisfaction
      .map((s) => parseFloat(s.note_global))
      .filter((n) => !isNaN(n) && n > 0);
    const avgRating =
      validRatings.length > 0
        ? validRatings.reduce((a, b) => a + b, 0) / validRatings.length
        : 0;
    const totalReponses = satisfaction.reduce(
      (sum, s) => sum + (parseInt(s.nb_reponses) || 0),
      0,
    );
    const totalParticipants = satisfaction.reduce(
      (sum, s) => sum + (parseInt(s.nb_participants) || 0),
      0,
    );
    const tauxReponse =
      totalParticipants > 0 ? (totalReponses / totalParticipants) * 100 : 0;

    // Réclamations
    const totalRecla = reclamations.length;
    const reclaTraitees = reclamations.filter((r) => r.statut === "traite").length;

    // Améliorations
    const totalAmelio = ameliorations.length;
    const amelioRealisees = ameliorations.filter((a) => a.statut === "realisee").length;

    return {
      avgRating,
      tauxReponse,
      totalRecla,
      reclaTraitees,
      totalAmelio,
      amelioRealisees,
    };
  }, [satisfaction, reclamations, ameliorations]);

  // === Helpers d'update ===
  const updateSatisfaction = (
    rowIndex: number,
    field: keyof SatisfactionRow,
    value: string,
  ) => {
    setSatisfaction((prev) => {
      const next = [...prev];
      const cur = next[rowIndex];
      if (!cur) return prev;
      next[rowIndex] = { ...cur, [field]: value };
      queueSave({ satisfaction: next, reclamations, ameliorations });
      return next;
    });
  };

  const addSatisfaction = () => {
    setSatisfaction((prev) => {
      const next = [
        {
          session: "",
          date: new Date().toISOString().slice(0, 10),
          nb_participants: "",
          nb_reponses: "",
          note_global: "",
          note_contenu: "",
          note_animateur: "",
          note_organisation: "",
          commentaires: "",
        },
        ...prev,
      ];
      queueSave({ satisfaction: next, reclamations, ameliorations });
      return next;
    });
    toast.success("Session ajoutée");
  };

  const deleteSatisfaction = (rowIndex: number) => {
    setSatisfaction((prev) => {
      const next = prev.filter((_, i) => i !== rowIndex);
      queueSave({ satisfaction: next, reclamations, ameliorations });
      return next;
    });
  };

  const updateReclamation = (
    rowIndex: number,
    field: keyof ReclamationRow,
    value: string,
  ) => {
    setReclamations((prev) => {
      const next = [...prev];
      const cur = next[rowIndex];
      if (!cur) return prev;
      next[rowIndex] = { ...cur, [field]: value };
      queueSave({ satisfaction, reclamations: next, ameliorations });
      return next;
    });
  };

  const addReclamation = () => {
    setReclamations((prev) => {
      const next = [
        {
          date: new Date().toISOString().slice(0, 10),
          source: "",
          emetteur: "",
          objet: "",
          gravite: "modere",
          statut: "a_traiter",
          date_traitement: "",
          reponse: "",
        },
        ...prev,
      ];
      queueSave({ satisfaction, reclamations: next, ameliorations });
      return next;
    });
    toast.success("Réclamation ajoutée");
  };

  const deleteReclamation = (rowIndex: number) => {
    setReclamations((prev) => {
      const next = prev.filter((_, i) => i !== rowIndex);
      queueSave({ satisfaction, reclamations: next, ameliorations });
      return next;
    });
  };

  const updateAmelioration = (
    rowIndex: number,
    field: keyof AmeliorationRow,
    value: string,
  ) => {
    setAmeliorations((prev) => {
      const next = [...prev];
      const cur = next[rowIndex];
      if (!cur) return prev;
      next[rowIndex] = { ...cur, [field]: value };
      queueSave({ satisfaction, reclamations, ameliorations: next });
      return next;
    });
  };

  const addAmelioration = () => {
    setAmeliorations((prev) => {
      const next = [
        {
          date: new Date().toISOString().slice(0, 10),
          origine: "",
          action: "",
          responsable: "",
          echeance: "",
          statut: "prevue",
          evaluation: "",
        },
        ...prev,
      ];
      queueSave({ satisfaction, reclamations, ameliorations: next });
      return next;
    });
    toast.success("Action ajoutée");
  };

  const deleteAmelioration = (rowIndex: number) => {
    setAmeliorations((prev) => {
      const next = prev.filter((_, i) => i !== rowIndex);
      queueSave({ satisfaction, reclamations, ameliorations: next });
      return next;
    });
  };

  return (
    <>
      <CockpitStyles />

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <KpiCard
          icon={<TrendingUp />}
          label="Satisfaction moyenne"
          value={kpi.avgRating > 0 ? `${kpi.avgRating.toFixed(1)} / 5` : "—"}
          sub={`${kpi.tauxReponse.toFixed(0)}% de taux de réponse`}
          tone="success"
        />
        <KpiCard
          icon={<AlertCircle />}
          label="Réclamations"
          value={`${kpi.reclaTraitees} / ${kpi.totalRecla}`}
          sub="traitées"
          tone={kpi.totalRecla === kpi.reclaTraitees ? "success" : "warning"}
        />
        <KpiCard
          icon={<CheckCircle2 />}
          label="Actions d'amélioration"
          value={`${kpi.amelioRealisees} / ${kpi.totalAmelio}`}
          sub="réalisées"
          tone={
            kpi.totalAmelio > 0 && kpi.amelioRealisees / kpi.totalAmelio > 0.7
              ? "success"
              : "info"
          }
        />
      </div>

      <Tabs defaultValue="satisfaction">
        <TabsList>
          <TabsTrigger value="satisfaction">
            Satisfaction (I30)
            <span className="ml-1 rounded-md bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {satisfaction.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="reclamations">
            Réclamations (I31)
            <span className="ml-1 rounded-md bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {reclamations.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="ameliorations">
            Amélioration continue (I32)
            <span className="ml-1 rounded-md bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {ameliorations.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* === Onglet Satisfaction === */}
        <TabsContent value="satisfaction" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Évaluations de satisfaction</CardTitle>
              <Button size="sm" onClick={addSatisfaction}>
                <Plus className="h-3.5 w-3.5" />
                Ajouter une session
              </Button>
            </CardHeader>
            <CardContent>
              {satisfaction.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Aucune session évaluée. Cliquez sur « Ajouter ».
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="miniapp-table">
                    <thead>
                      <tr>
                        <th>Session</th>
                        <th style={{ width: 120 }}>Date</th>
                        <th style={{ width: 90 }}>Inscrits</th>
                        <th style={{ width: 90 }}>Réponses</th>
                        <th style={{ width: 90 }}>Global /5</th>
                        <th style={{ width: 90 }}>Contenu</th>
                        <th style={{ width: 90 }}>Animateur</th>
                        <th style={{ width: 90 }}>Orga.</th>
                        <th>Commentaires</th>
                        <th style={{ width: 50 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {satisfaction.map((row, i) => (
                        <tr key={i}>
                          <td>
                            <input
                              className="cell-input"
                              value={row.session}
                              onChange={(e) => updateSatisfaction(i, "session", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              className="cell-input"
                              value={row.date}
                              onChange={(e) => updateSatisfaction(i, "date", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="cell-input"
                              value={row.nb_participants}
                              onChange={(e) => updateSatisfaction(i, "nb_participants", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="cell-input"
                              value={row.nb_reponses}
                              onChange={(e) => updateSatisfaction(i, "nb_reponses", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="5"
                              className="cell-input"
                              value={row.note_global}
                              onChange={(e) => updateSatisfaction(i, "note_global", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="5"
                              className="cell-input"
                              value={row.note_contenu}
                              onChange={(e) => updateSatisfaction(i, "note_contenu", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="5"
                              className="cell-input"
                              value={row.note_animateur}
                              onChange={(e) => updateSatisfaction(i, "note_animateur", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="5"
                              className="cell-input"
                              value={row.note_organisation}
                              onChange={(e) => updateSatisfaction(i, "note_organisation", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={row.commentaires}
                              onChange={(e) => updateSatisfaction(i, "commentaires", e.target.value)}
                              placeholder="Verbatim, points forts/faibles..."
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => deleteSatisfaction(i)}
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

        {/* === Onglet Réclamations === */}
        <TabsContent value="reclamations" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Registre des réclamations</CardTitle>
              <Button size="sm" onClick={addReclamation}>
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {reclamations.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Aucune réclamation enregistrée.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="miniapp-table">
                    <thead>
                      <tr>
                        <th style={{ width: 130 }}>Date</th>
                        <th style={{ width: 130 }}>Source</th>
                        <th style={{ width: 180 }}>Émetteur</th>
                        <th>Objet</th>
                        <th style={{ width: 130 }}>Gravité</th>
                        <th style={{ width: 130 }}>Statut</th>
                        <th style={{ width: 130 }}>Date trait.</th>
                        <th>Réponse</th>
                        <th style={{ width: 50 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {reclamations.map((row, i) => (
                        <tr key={i}>
                          <td>
                            <input
                              type="date"
                              className="cell-input"
                              value={row.date}
                              onChange={(e) => updateReclamation(i, "date", e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              className="cell-select"
                              value={row.source}
                              onChange={(e) => updateReclamation(i, "source", e.target.value)}
                            >
                              <option value="">—</option>
                              <option value="apprenant">Apprenant</option>
                              <option value="entreprise">Entreprise</option>
                              <option value="opco">OPCO</option>
                              <option value="autre">Autre</option>
                            </select>
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={row.emetteur}
                              onChange={(e) => updateReclamation(i, "emetteur", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={row.objet}
                              onChange={(e) => updateReclamation(i, "objet", e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              className="cell-select"
                              value={row.gravite}
                              onChange={(e) => updateReclamation(i, "gravite", e.target.value)}
                            >
                              <option value="mineure">🟢 Mineure</option>
                              <option value="modere">🟠 Modérée</option>
                              <option value="majeure">🔴 Majeure</option>
                            </select>
                          </td>
                          <td>
                            <select
                              className="cell-select"
                              value={row.statut}
                              onChange={(e) => updateReclamation(i, "statut", e.target.value)}
                            >
                              <option value="a_traiter">⏳ À traiter</option>
                              <option value="en_cours">🔄 En cours</option>
                              <option value="traite">✓ Traitée</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="date"
                              className="cell-input"
                              value={row.date_traitement}
                              onChange={(e) => updateReclamation(i, "date_traitement", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={row.reponse}
                              onChange={(e) => updateReclamation(i, "reponse", e.target.value)}
                              placeholder="Réponse apportée..."
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => deleteReclamation(i)}
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

        {/* === Onglet Améliorations === */}
        <TabsContent value="ameliorations" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Plan d'amélioration continue</CardTitle>
              <Button size="sm" onClick={addAmelioration}>
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {ameliorations.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Aucune action d'amélioration enregistrée.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="miniapp-table">
                    <thead>
                      <tr>
                        <th style={{ width: 130 }}>Date</th>
                        <th style={{ width: 150 }}>Origine</th>
                        <th>Action</th>
                        <th style={{ width: 170 }}>Responsable</th>
                        <th style={{ width: 130 }}>Échéance</th>
                        <th style={{ width: 140 }}>Statut</th>
                        <th>Évaluation efficacité</th>
                        <th style={{ width: 50 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {ameliorations.map((row, i) => (
                        <tr key={i}>
                          <td>
                            <input
                              type="date"
                              className="cell-input"
                              value={row.date}
                              onChange={(e) => updateAmelioration(i, "date", e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              className="cell-select"
                              value={row.origine}
                              onChange={(e) => updateAmelioration(i, "origine", e.target.value)}
                            >
                              <option value="">—</option>
                              <option value="satisfaction">📊 Satisfaction</option>
                              <option value="reclamation">⚠ Réclamation</option>
                              <option value="audit">🔍 Audit</option>
                              <option value="veille">📡 Veille</option>
                              <option value="equipe">👥 Équipe</option>
                              <option value="autre">Autre</option>
                            </select>
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={row.action}
                              onChange={(e) => updateAmelioration(i, "action", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={row.responsable}
                              onChange={(e) => updateAmelioration(i, "responsable", e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              className="cell-input"
                              value={row.echeance}
                              onChange={(e) => updateAmelioration(i, "echeance", e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              className="cell-select"
                              value={row.statut}
                              onChange={(e) => updateAmelioration(i, "statut", e.target.value)}
                            >
                              <option value="prevue">📋 Prévue</option>
                              <option value="en_cours">🔄 En cours</option>
                              <option value="realisee">✓ Réalisée</option>
                              <option value="abandonnee">✗ Abandonnée</option>
                            </select>
                          </td>
                          <td>
                            <input
                              className="cell-input"
                              value={row.evaluation}
                              onChange={(e) => updateAmelioration(i, "evaluation", e.target.value)}
                              placeholder="Mesure de l'efficacité..."
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => deleteAmelioration(i)}
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

function KpiCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "success" | "warning" | "info";
}) {
  const toneClass = {
    success: "bg-c2/10 text-c2",
    warning: "bg-c3/10 text-c3",
    info: "bg-amethyst-bright/10 text-amethyst-bright",
  }[tone];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-lg shrink-0 ${toneClass}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">
              {label}
            </p>
            <p className="font-sans text-2xl font-light leading-none">{value}</p>
            <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CockpitStyles() {
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
