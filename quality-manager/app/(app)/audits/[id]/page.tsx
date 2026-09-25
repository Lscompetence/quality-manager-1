import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CRITERES, getIndicatorsByCritere, type CritereNum, type Category } from "@/lib/constants/rnq";
import { Plus, TrendingUp } from "lucide-react";
import { CategoryTint } from "@/components/layout/category-tint";
import { ClientAccessCard } from "@/components/audits/client-access-card";

export const metadata = {
  title: "Dossier",
};

type Params = { id: string };

const TYPE_LABEL: Record<string, string> = {
  initial: "Initial",
  surveillance: "Surveillance",
  renouvellement: "Renouvellement",
};

const TYPE_TONE: Record<string, string> = {
  initial: "var(--t-initial)",
  surveillance: "var(--t-surv)",
  renouvellement: "var(--t-renew)",
};

/** Accent de la catégorie : AF vert, BC bleu, VAE ambre, CFA violet (voir dossier_dashboard.html) */
const CATEGORY_TONE: Record<string, string> = {
  AF: "var(--c2)",
  BC: "var(--c4)",
  VAE: "var(--c3)",
  CFA: "var(--c6)",
};

const CATEGORY_LABEL: Record<string, string> = {
  AF: "Actions de formation",
  BC: "Bilans de compétences",
  VAE: "Validation des acquis",
  CFA: "Apprentissage",
};

export default async function AuditDashboardPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Les trois requêtes portent sur le même dossier et sont indépendantes : une seule attente.
  const [
    { data: audit },
    { data: indicators },
    { count: documentsCount },
    { count: documentsThisWeek },
    { count: completedThisMonth },
    { data: clientAccesses },
  ] = await Promise.all([
    supabase
      .from("audits")
      .select("id, name, audit_type, categories, status, audit_date, certificateur, created_at")
      .eq("id", id)
      .single(),
    supabase.from("audit_indicators").select("critere_num, status").eq("audit_id", id),
    supabase.from("attachments").select("id", { count: "exact", head: true }).eq("audit_id", id),
    // Preuves déposées depuis 7 jours — affichées en vert sous « Documents »
    supabase
      .from("attachments")
      .select("id", { count: "exact", head: true })
      .eq("audit_id", id)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()),
    // Indicateurs validés depuis 30 jours — donnent les points gagnés ce mois-ci
    supabase
      .from("audit_indicators")
      .select("id", { count: "exact", head: true })
      .eq("audit_id", id)
      .eq("status", "complet")
      .gte("updated_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()),
    // Accès client déjà accordés sur ce dossier — affichés dans la carte dédiée
    supabase
      .from("audit_access")
      .select("id, invited_email, status, created_at")
      .eq("audit_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!audit) notFound();

  const categories = (audit.categories ?? []) as Category[];

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

  for (const ind of indicators ?? []) {
    const c = ind.critere_num as CritereNum;
    if (!progressByCritere[c]) continue;
    if (ind.status === "complet") progressByCritere[c].done++;
  }

  const total = Object.values(progressByCritere).reduce((s, p) => s + p.total, 0);
  const totalDone = Object.values(progressByCritere).reduce((s, p) => s + p.done, 0);
  const coverage = total > 0 ? Math.round((totalDone / total) * 100) : 0;

  // La maquette teinte la page par la catégorie et réserve la couleur du type à sa pastille.
  const typeTone = TYPE_TONE[audit.audit_type] ?? "var(--t-initial)";
  const category = categories[0] ?? null;
  const catTone = category ? (CATEGORY_TONE[category] ?? "var(--amethyst-br)") : "var(--amethyst-br)";
  const catLabel =
    categories.length > 0
      ? (CATEGORY_LABEL[categories[0] ?? ""] ?? categories.join(", "))
      : "Périmètre à définir";
  const monthsToAudit = audit.audit_date ? monthsBetween(new Date(), new Date(audit.audit_date)) : null;

  const pointsThisMonth = total > 0 ? Math.round(((completedThisMonth ?? 0) / total) * 100) : 0;

  return (
    <div style={{ ["--cat-accent" as string]: catTone, ["--t-color" as string]: typeTone }}>
      <CategoryTint category={category} />

      {/* Hero du dossier */}
      <section className="flex flex-col items-center gap-[18px] pb-[60px] pt-[30px] text-center">
        <div className="mb-1.5 flex flex-wrap justify-center gap-2">
          <HeroPill dot tone={typeTone}>
            {TYPE_LABEL[audit.audit_type] ?? audit.audit_type}
          </HeroPill>
          <HeroPill dot tone={catTone}>
            {catLabel}
          </HeroPill>
          <HeroPill>
            {audit.status === "en_cours" ? "Ouvert le" : "Clôturé le"} {formatDate(audit.created_at)}
          </HeroPill>
        </div>

        <p className="qm-eyebrow">Aujourd&apos;hui · {audit.name}</p>

        <h1 className="qm-hero max-w-3xl font-sans text-4xl md:text-5xl lg:text-[60px]">
          Votre conformité
          <br />
          respire <b className="qm-hero-accent">en lumière.</b>
        </h1>

        {/* Pourcentage géant */}
        <div
          className="mt-3 inline-flex items-baseline gap-1 font-sans text-[110px] font-thin leading-[0.88] tracking-[-0.06em] lg:text-[156px]"
          style={{
            background: `linear-gradient(180deg, var(--title-grad-start) 0%, var(--title-grad-mid) 55%, ${catTone} 100%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: `drop-shadow(0 8px 40px color-mix(in srgb, ${catTone} 45%, transparent))`,
          }}
        >
          {coverage}
          <span
            className="font-sans text-[42px] font-extralight leading-none tracking-tight lg:text-[56px]"
            style={{ WebkitTextFillColor: catTone, opacity: 0.85 }}
          >
            %
          </span>
        </div>
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--text-mute)]">
          Couverture du dossier
        </p>

        <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-mute)]">
          <span>
            {totalDone} / {total} indicateurs
          </span>
          <span className="mx-1.5 text-[var(--text-faint)]">·</span>
          <span>
            {monthsToAudit === null
              ? "date d'audit à fixer"
              : monthsToAudit >= 0
                ? `${monthsToAudit} mois avant l'audit`
                : "audit passé"}
          </span>
          <span className="mx-1.5 text-[var(--text-faint)]">·</span>
          {pointsThisMonth > 0 ? (
            <span className="text-[var(--status-on)]">+{pointsThisMonth} pts ce mois-ci</span>
          ) : (
            <span>{documentsCount ?? 0} preuves déposées</span>
          )}
        </p>

        <Link
          href={`/audits/${audit.id}/documents`}
          prefetch={true}
          className="qm-btn-3d mt-6 inline-flex h-[46px] items-center gap-2 rounded-xl px-[22px] text-sm font-semibold"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter un document
        </Link>
      </section>

      {/* Métriques */}
      <div className="mx-auto mb-[50px] grid max-w-[1080px] gap-[18px] md:grid-cols-3">
        <Metric
          label="Indicateurs"
          value={String(totalDone)}
          unit={`/ ${total} applicables`}
          foot="filtrés selon votre dossier"
        />
        <Metric
          label="Documents"
          value={String(documentsCount ?? 0)}
          foot={
            documentsThisWeek && documentsThisWeek > 0
              ? `+${documentsThisWeek} cette semaine`
              : "preuves rattachées au dossier"
          }
          footHighlight={Boolean(documentsThisWeek && documentsThisWeek > 0)}
        />
        <Metric
          label="Audit prévu"
          value={monthsToAudit === null ? "—" : String(Math.max(monthsToAudit, 0))}
          unit={monthsToAudit === null ? undefined : "mois"}
          foot={audit.audit_date ? formatMonth(audit.audit_date) : "date non fixée"}
        />
      </div>

      {/* Les 7 critères */}
      <div className="mb-[22px] flex items-baseline justify-between">
        <h2 className="font-sans text-2xl font-light tracking-[-0.015em]">Les 7 critères du référentiel</h2>
        <span className="font-mono text-[11px] tracking-[0.1em] text-[var(--text-mute)]">
          cliquez pour explorer un critère
        </span>
      </div>

      <div className="grid gap-px overflow-hidden rounded-[20px] bg-[var(--border-soft)] p-px sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Object.values(CRITERES).map((critere) => {
          const numStr = String(critere.num).padStart(2, "0");
          const p = progressByCritere[critere.num as CritereNum];
          const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
          return (
            <Link
              key={critere.num}
              href={`/audits/${id}/critere/${numStr}`}
              prefetch={true}
              className="group relative overflow-hidden bg-[var(--bg-elev)] px-[18px] py-6 text-center backdrop-blur-2xl transition-colors hover:bg-[var(--surface-2)]"
              style={{ ["--cf" as string]: `var(--${critere.colorVar})` }}
            >
              <span
                className="absolute inset-x-0 bottom-0 h-[2px] transition-all group-hover:h-1"
                style={{ background: "var(--cf)", filter: "blur(0.5px)", boxShadow: "0 0 20px var(--cf), 0 0 40px var(--cf)" }}
              />
              <div className="mb-3.5 font-mono text-[10.5px] font-medium tracking-[0.18em] text-[var(--text-mute)]">
                C{critere.num}
              </div>
              <div className="mb-1.5 font-sans text-4xl font-extralight leading-none tracking-[-0.03em]">
                {pct}
                <small className="text-sm opacity-50">%</small>
              </div>
              <div className="min-h-[30px] text-[11.5px] font-medium leading-[1.3] text-[var(--text-soft)]">
                {critere.title}
              </div>
              <div className="mt-2 font-mono text-[9.5px] tracking-[0.05em] text-[var(--text-faint)]">
                {p.done} / {p.total} indicateurs
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-[22px]">
        <ClientAccessCard auditId={id} accesses={clientAccesses ?? []} />
      </div>
    </div>
  );
}

function HeroPill({
  children,
  dot = false,
  tone,
}: {
  children: React.ReactNode;
  dot?: boolean;
  tone?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] backdrop-blur-xl"
      style={{ color: dot && tone ? tone : "var(--text-mute)" }}
    >
      {dot && tone && (
        <span
          className="h-[5px] w-[5px] rounded-full"
          style={{ background: tone, boxShadow: `0 0 6px ${tone}` }}
        />
      )}
      {children}
    </span>
  );
}

function Metric({
  label,
  value,
  unit,
  foot,
  footHighlight = false,
}: {
  label: string;
  value: string;
  unit?: string;
  foot: string;
  footHighlight?: boolean;
}) {
  return (
    <div className="qm-glass qm-glass-hover flex flex-col items-center rounded-[18px] px-[22px] pb-[22px] pt-[26px] text-center">
      <div className="mb-3.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-[var(--text-mute)]">
        {label}
      </div>
      <div className="font-sans text-[44px] font-light leading-[0.95] tracking-[-0.025em]">
        {value}
        {unit && <small className="ml-1 text-lg font-normal text-[var(--text-faint)]">{unit}</small>}
      </div>
      <div
        className={
          footHighlight
            ? "mt-2.5 flex items-center gap-1.5 font-mono text-[11.5px] font-semibold text-[var(--status-on)]"
            : "mt-2.5 text-[12.5px] font-medium text-[var(--text-mute)]"
        }
      >
        {footHighlight && <TrendingUp className="h-3 w-3" />}
        {foot}
      </div>
    </div>
  );
}

function monthsBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
