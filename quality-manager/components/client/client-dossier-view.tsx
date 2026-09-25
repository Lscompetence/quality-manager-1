"use client";

import Link from "next/link";
import type { Route } from "next";

import * as React from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileCheck,
  FileText,
  FolderCheck,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { StatusPill } from "@/components/indicator/status-pill";
import { CRITERES, getIndicatorsByCritere, type Category, type CritereNum } from "@/lib/constants/rnq";
import { cn } from "@/lib/utils/cn";
import { indicatorCodeOf, indicatorContextPath } from "@/lib/utils/context-path";

export type ClientDossierViewProps = {
  audit: {
    id: string;
    name: string;
    audit_type: string;
    categories: string[];
    status: string;
    audit_date: string | null;
  };
  indicators: {
    critere_num: number;
    indicator_code: string;
    status: string;
    notes?: string | null;
  }[];
  attachments: {
    id: string;
    kind: "upload" | "ref";
    file_name: string;
    file_size: number | null;
    mime_type: string | null;
    storage_path: string | null;
    external_url: string | null;
    created_at: string;
    context_label: string | null;
    context_path: string | null;
  }[];
};

const TYPE_LABEL: Record<string, string> = {
  initial: "Audit Initial",
  surveillance: "Audit de Surveillance",
  renouvellement: "Audit de Renouvellement",
};

const CATEGORY_TONE: Record<string, string> = {
  AF: "var(--c2)",
  BC: "var(--c4)",
  VAE: "var(--c3)",
  CFA: "var(--c6)",
};

const CATEGORY_LABEL: Record<string, string> = {
  AF: "Actions de Formation",
  BC: "Bilans de Compétences",
  VAE: "Validation des Acquis",
  CFA: "Apprentissage",
};

export function ClientDossierView({ audit, indicators, attachments }: ClientDossierViewProps) {
  const [selectedCritere, setSelectedCritere] = React.useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const categories = (audit.categories ?? []) as Category[];
  const category = categories[0] ?? null;
  const tone = category ? CATEGORY_TONE[category] ?? "var(--amethyst-br)" : "var(--amethyst-br)";

  // Compute coverage stats
  const progressByCritere: Record<CritereNum, { total: number; done: number }> = {
    1: { total: 0, done: 0 },
    2: { total: 0, done: 0 },
    3: { total: 0, done: 0 },
    4: { total: 0, done: 0 },
    5: { total: 0, done: 0 },
    6: { total: 0, done: 0 },
    7: { total: 0, done: 0 },
  };

  ([1, 2, 3, 4, 5, 6, 7] as CritereNum[]).forEach((c) => {
    progressByCritere[c].total = getIndicatorsByCritere(c, categories).length;
  });

  const statusByCode = new Map<string, string>();
  for (const ind of indicators) {
    statusByCode.set(ind.indicator_code, ind.status);
    const c = ind.critere_num as CritereNum;
    if (progressByCritere[c] && ind.status === "complet") progressByCritere[c].done++;
  }

  const total = Object.values(progressByCritere).reduce((s, p) => s + p.total, 0);
  const done = Object.values(progressByCritere).reduce((s, p) => s + p.done, 0);
  const coverage = total > 0 ? Math.round((done / total) * 100) : 0;

  // Audit Step timeline determination
  const isClosed = audit.status === "cloture";
  const hasAuditDate = Boolean(audit.audit_date);
  const hasProofProgress = coverage > 0 || attachments.length > 0;

  const currentStep = isClosed ? 4 : hasAuditDate ? 3 : hasProofProgress ? 2 : 1;

  const steps = [
    {
      num: 1,
      title: "Lancement & Périmètre",
      desc: "Dossier créé et périmètre RNQ défini",
      icon: FolderCheck,
      completed: true,
      active: currentStep === 1,
    },
    {
      num: 2,
      title: "Revue des Preuves",
      desc: `${done}/${total} indicateurs validés · ${attachments.length} pièces déposées`,
      icon: FileCheck,
      completed: coverage >= 80 || currentStep > 2,
      active: currentStep === 2,
    },
    {
      num: 3,
      title: "Passage de l'Audit",
      desc: audit.audit_date ? `Programmé le ${formatDate(audit.audit_date)}` : "Date d'audit en attente",
      icon: Calendar,
      completed: currentStep > 3,
      active: currentStep === 3,
    },
    {
      num: 4,
      title: "Certification Qualiopi",
      desc: isClosed ? "Certification accordée" : "Audit final et délivrance du titre",
      icon: ShieldCheck,
      completed: isClosed,
      active: currentStep === 4,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-10" style={{ ["--cat-accent" as string]: tone }}>
      {/* En-tête Hero */}
      <div className="qm-glass rounded-3xl p-8 md:p-10 relative overflow-hidden">
        <div
          className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: tone }}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em]">
                {TYPE_LABEL[audit.audit_type] ?? audit.audit_type}
              </span>
              {category && (
                <span
                  className="rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: tone }}
                >
                  {CATEGORY_LABEL[category] ?? category}
                </span>
              )}
              <span
                className={cn(
                  "rounded-full px-3 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em]",
                  isClosed
                    ? "border border-[rgba(88,214,154,0.32)] bg-[rgba(88,214,154,0.1)] text-[var(--status-on)]"
                    : "border border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text-mute)]",
                )}
              >
                {isClosed ? "Certifié / Clôturé" : "Audit en cours"}
              </span>
            </div>

            <h1 className="font-sans text-3xl md:text-4xl font-light tracking-tight">{audit.name}</h1>
            <p className="font-mono text-xs text-muted-foreground flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              {audit.audit_date
                ? `Date fixée pour l'audit : ${formatDate(audit.audit_date)}`
                : "Organisme en cours de préparation du dossier"}
            </p>
            <Link
              href={`/client/dossiers/${audit.id}/miniapps` as Route}
              className="qm-btn-add mt-1 w-fit"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Mini-apps du dossier
            </Link>
          </div>

          {/* Badge Pourcentage */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-6 min-w-[160px] text-center">
            <div className="font-sans text-5xl font-extralight tracking-tight" style={{ color: tone }}>
              {coverage}
              <span className="text-xl font-thin opacity-70">%</span>
            </div>
            <span className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-mute)]">
              Conformité Qualiopi
            </span>
          </div>
        </div>

        {/* Timeline des 4 Étapes de l'Admin */}
        <div className="mt-10 border-t border-[var(--border-soft)] pt-8">
          <h2 className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-mute)]">
            Feuille de route & Étapes de votre dossier
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.num}
                  className={cn(
                    "relative flex flex-col rounded-2xl border p-4 transition-all",
                    s.active
                      ? "border-amethyst-bright bg-amethyst-bright/5 shadow-lg"
                      : s.completed
                        ? "border-[rgba(88,214,154,0.32)] bg-[rgba(88,214,154,0.05)]"
                        : "border-[var(--border-soft)] bg-[var(--surface)] opacity-60",
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-xl text-xs font-bold font-mono",
                        s.active
                          ? "bg-amethyst-bright text-white"
                          : s.completed
                            ? "bg-[var(--status-on)] text-black"
                            : "bg-[var(--surface-2)] text-muted-foreground",
                      )}
                    >
                      {s.completed ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                    </span>
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        s.active
                          ? "text-amethyst-bright"
                          : s.completed
                            ? "text-[var(--status-on)]"
                            : "text-muted-foreground",
                      )}
                    />
                  </div>
                  <h3 className="font-sans text-sm font-medium">{s.title}</h3>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground leading-tight">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Explorer les Indicateurs par Critère */}
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-sans text-2xl font-light tracking-tight">Indicateurs RNQ ({indicators.length})</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Consultez les exigences des indicateurs et déposez directement vos justificatifs.
            </p>
          </div>

          {/* Filtre par statut */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amethyst-bright"
            >
              <option value="all">Tous les statuts</option>
              <option value="complet">Validé / Complet</option>
              <option value="en_cours">En cours de revue</option>
              <option value="a_traiter">À traiter</option>
            </select>
          </div>
        </div>

        {/* Boutons Filtrer par Critère */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCritere("all")}
            className={cn(
              "rounded-xl px-3 py-1.5 font-mono text-xs font-semibold transition-all",
              selectedCritere === "all"
                ? "bg-amethyst-bright text-white shadow-md"
                : "border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-soft)] hover:bg-[var(--surface-2)]",
            )}
          >
            Tous les critères (1-7)
          </button>
          {Object.values(CRITERES).map((c) => (
            <button
              key={c.num}
              type="button"
              onClick={() => setSelectedCritere(c.num)}
              className={cn(
                "rounded-xl px-3 py-1.5 font-mono text-xs font-semibold transition-all flex items-center gap-1.5",
                selectedCritere === c.num
                  ? "bg-amethyst-bright text-white shadow-md"
                  : "border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-soft)] hover:bg-[var(--surface-2)]",
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: `var(--${c.colorVar})` }} />
              C{c.num}
            </button>
          ))}
        </div>

        {/* Liste des critères et leurs indicateurs */}
        <div className="space-y-4">
          {Object.values(CRITERES)
            .filter((critere) => selectedCritere === "all" || selectedCritere === critere.num)
            .map((critere) => {
              const allInds = getIndicatorsByCritere(critere.num as CritereNum, categories);
              const inds = allInds.filter((ind) => {
                if (statusFilter === "all") return true;
                const st = statusByCode.get(ind.code) ?? "a_traiter";
                return st === statusFilter;
              });

              if (inds.length === 0 && statusFilter !== "all") return null;

              const p = progressByCritere[critere.num as CritereNum];
              const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;

              return (
                <details key={critere.num} open className="qm-glass group rounded-2xl p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ background: `var(--${critere.colorVar})` }}
                      />
                      <div>
                        <span className="font-mono text-xs text-[var(--text-mute)] mr-2">Critère {critere.num}</span>
                        <span className="font-sans text-base font-medium">{critere.title}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-semibold" style={{ color: `var(--${critere.colorVar})` }}>
                        {p.done} / {p.total} ({pct}%)
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    </div>
                  </summary>

                  <div className="mt-4 space-y-3 border-t border-[var(--border-soft)] pt-4">
                    {inds.map((ind) => {
                      const status = statusByCode.get(ind.code) ?? "a_traiter";
                      const indAttachments = attachments.filter(
                        (att) =>
                          indicatorCodeOf(att.context_path) === ind.code ||
                          att.context_label === ind.code ||
                          att.context_label === `${ind.code} - ${ind.title}`,
                      );

                      return (
                        <div
                          key={ind.code}
                          className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className="font-mono text-xs font-bold text-amethyst-bright mr-2">{ind.num}</span>
                              <h4 className="inline font-sans text-sm font-medium">{ind.title}</h4>
                            </div>
                            <StatusPill status={status} />
                          </div>

                          {/* Zone de dépôt des preuves spécifique à cet indicateur */}
                          <div className="rounded-lg bg-[var(--surface-2)] p-3 space-y-2">
                            <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" />
                                Preuves fournies pour cet indicateur ({indAttachments.length})
                              </span>
                            </div>

                            <AttachmentList
                              auditId={audit.id}
                              contextPath={indicatorContextPath(ind.code)}
                              contextLabel={`${ind.code} - ${ind.title}`}
                              attachments={indAttachments}
                              canDelete={false}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              );
            })}
        </div>
      </div>

      {/* Hub Tous les Documents du Dossier */}
      <div className="qm-glass rounded-3xl p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amethyst-bright/10 text-amethyst-bright">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-sans text-xl font-medium">Toutes les preuves du dossier</h2>
            <p className="text-xs text-muted-foreground">
              Vue centralisée de tous les documents téléversés par vous ou votre accompagnateur.
            </p>
          </div>
        </div>

        <AttachmentList
          auditId={audit.id}
          contextPath="dossier"
          contextLabel="Dossier"
          attachments={attachments}
          canDelete={false}
        />
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}
