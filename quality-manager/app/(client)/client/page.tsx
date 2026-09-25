import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Building2, CalendarClock, FileText, FolderOpen, ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadClientOverview } from "@/lib/client/overview";
import { StatusPill } from "@/components/indicator/status-pill";

export const metadata = {
  title: "Mon espace",
};

const TYPE_LABEL: Record<string, string> = {
  initial: "Audit initial",
  surveillance: "Audit de surveillance",
  renouvellement: "Audit de renouvellement",
};

export default async function ClientHomePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const [{ data: profile }, overview] = await Promise.all([
    supabase.from("users").select("first_name").eq("id", userData.user.id).single(),
    loadClientOverview(userData.user.id),
  ]);

  const firstName = profile?.first_name?.trim();
  const { dossiers, criteres, pending, documents, nextAudit } = overview;

  if (dossiers.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center pt-16 text-center">
        <p className="qm-eyebrow mb-4">Espace client</p>
        <h1 className="qm-hero mb-4 font-sans text-4xl md:text-5xl">
          Bienvenue{firstName ? `, ${firstName}` : ""}.
        </h1>
        <div className="qm-glass mt-8 w-full rounded-2xl p-12">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-amethyst-bright/10 text-amethyst-bright">
            <FolderOpen className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-xl font-medium">Aucun dossier pour l&apos;instant</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Votre organisme ne vous a pas encore confié de dossier. Il apparaîtra ici dès qu&apos;il vous
            sera partagé.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero — même langage que la page dossier côté admin */}
      <section className="flex flex-col items-center gap-[18px] pb-[50px] pt-[30px] text-center">
        <div className="flex flex-wrap justify-center gap-2">
          <Pill dot tone="var(--amethyst-br)">Espace client</Pill>
          {overview.organizationNames.map((name) => (
            <Pill key={name} dot tone="var(--c2)">
              Accompagné par {name}
            </Pill>
          ))}
        </div>

        <p className="qm-eyebrow">Aujourd&apos;hui{firstName ? ` · ${firstName}` : ""}</p>

        <h1 className="qm-hero max-w-3xl font-sans text-4xl md:text-5xl lg:text-[56px]">
          Votre certification
          <br />
          avance <b className="qm-hero-accent">pas à pas.</b>
        </h1>

        <div
          className="mt-2 inline-flex items-baseline gap-1 font-sans text-[96px] font-thin leading-[0.88] tracking-[-0.06em] lg:text-[132px]"
          style={{
            background:
              "linear-gradient(180deg, var(--title-grad-start) 0%, var(--title-grad-mid) 55%, var(--c2) 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {overview.coverage}
          <span
            className="font-sans text-[40px] font-extralight leading-none lg:text-[52px]"
            style={{ WebkitTextFillColor: "var(--c2)", opacity: 0.85 }}
          >
            %
          </span>
        </div>
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--text-mute)]">
          Couverture de vos dossiers
        </p>
      </section>

      {/* Chiffres clés */}
      <div className="mx-auto mb-[50px] grid max-w-[1080px] gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Indicateurs" value={String(overview.done)} unit={`/ ${overview.total}`} foot="validés" />
        <Metric label="À fournir" value={String(pending.length)} foot="indicateurs en attente" />
        <Metric label="Documents" value={String(documents.length)} foot="déposés dans vos dossiers" />
        <Metric
          label="Prochain audit"
          value={nextAudit ? String(Math.max(nextAudit.daysLeft, 0)) : "—"}
          unit={nextAudit ? "jours" : undefined}
          foot={nextAudit ? formatDate(nextAudit.date) : "date à fixer"}
        />
      </div>

      {/* Les 7 critères */}
      <SectionTitle title="Les 7 critères du référentiel" hint="avancement global" />
      <div className="mb-[50px] grid gap-px overflow-hidden rounded-[20px] bg-[var(--border-soft)] p-px sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {criteres.map((c) => (
          <div
            key={c.num}
            className="relative overflow-hidden bg-[var(--bg-elev)] px-[18px] py-6 text-center backdrop-blur-2xl"
            style={{ ["--cf" as string]: `var(--${c.colorVar})` }}
          >
            <span
              className="absolute inset-x-0 bottom-0 h-[2px]"
              style={{ background: "var(--cf)", boxShadow: "0 0 20px var(--cf), 0 0 40px var(--cf)" }}
            />
            <div className="mb-3.5 font-mono text-[10.5px] font-medium tracking-[0.18em] text-[var(--text-mute)]">
              C{c.num}
            </div>
            <div className="mb-1.5 font-sans text-4xl font-extralight leading-none tracking-[-0.03em]">
              {c.pct}
              <small className="text-sm opacity-50">%</small>
            </div>
            <div className="min-h-[30px] text-[11.5px] font-medium leading-[1.3] text-[var(--text-soft)]">{c.title}</div>
            <div className="mt-2 font-mono text-[9.5px] tracking-[0.05em] text-[var(--text-faint)]">
              {c.done} / {c.total} indicateurs
            </div>
          </div>
        ))}
      </div>

      {/* Ce qui reste à fournir · Derniers documents · Votre organisme */}
      <div className="mb-[50px] grid gap-[18px] lg:grid-cols-[1.4fr_1fr]">
        <Panel icon={<ListChecks className="h-4 w-4" />} title="Ce qui reste à fournir" hint={`${pending.length} indicateur(s)`}>
          {pending.length === 0 ? (
            <Empty text="Tout est à jour : aucun indicateur en attente." />
          ) : (
            <div className="space-y-1.5">
              {pending.slice(0, 8).map((p) => (
                <Link
                  key={`${p.auditId}:${p.code}`}
                  href={`/client/dossiers/${p.auditId}` as Route}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3.5 py-2.5 transition-colors hover:bg-[var(--surface-2)]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px]">
                      <span className="mr-2 font-mono text-[10px] text-[var(--text-faint)]">I{p.num}</span>
                      {p.title}
                    </span>
                    {dossiers.length > 1 && (
                      <span className="font-mono text-[10px] text-[var(--text-faint)]">{p.auditName}</span>
                    )}
                  </span>
                  <StatusPill status={p.status} />
                </Link>
              ))}
              {pending.length > 8 && (
                <p className="pt-1 text-center font-mono text-[10.5px] text-[var(--text-mute)]">
                  et {pending.length - 8} autre(s) — ouvrez un dossier pour tout voir
                </p>
              )}
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-[18px]">
          <Panel
            icon={<FileText className="h-4 w-4" />}
            title="Derniers documents"
            hint={
              <Link href={"/client/documents" as Route} className="hover:text-foreground">
                tout voir →
              </Link>
            }
          >
            {documents.length === 0 ? (
              <Empty text="Aucun document déposé pour l'instant." />
            ) : (
              <div className="space-y-1.5">
                {documents.slice(0, 4).map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-lg bg-[var(--surface)] px-3 py-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-c2" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px]">{d.file_name}</span>
                      <span className="font-mono text-[10px] text-[var(--text-faint)]">
                        {d.auditName} · {formatShortDate(d.created_at)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel icon={<Building2 className="h-4 w-4" />} title="Votre organisme">
            <p className="text-[13.5px] font-medium">{overview.organizationNames.join(", ") || "—"}</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--text-mute)]">
              Il prépare votre dossier Qualiopi avec vous et valide chaque indicateur. Déposez vos preuves dans
              vos dossiers, il les retrouvera directement.
            </p>
            {nextAudit && (
              <p className="mt-3 flex items-center gap-2 font-mono text-[11px] text-[var(--text-soft)]">
                <CalendarClock className="h-3.5 w-3.5 text-[var(--amethyst-br)]" />
                Audit « {nextAudit.auditName} » le {formatDate(nextAudit.date)}
              </p>
            )}
          </Panel>
        </div>
      </div>

      {/* Vos dossiers */}
      <SectionTitle title="Vos dossiers" hint={`${dossiers.length} dossier(s) confié(s)`} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dossiers.map((d) => (
          <Link key={d.auditId} href={`/client/dossiers/${d.auditId}` as Route} className="group">
            <div className="qm-glass qm-glass-hover h-full rounded-2xl p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${
                    d.status === "en_cours"
                      ? "border border-[rgba(88,214,154,0.32)] bg-[rgba(88,214,154,0.1)] text-[var(--status-on)]"
                      : "border border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text-mute)]"
                  }`}
                >
                  {d.status === "en_cours" ? "En cours" : "Clôturé"}
                </span>
                {d.categories.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full border border-[var(--border-soft)] px-2.5 py-1 font-mono text-[10px] font-semibold"
                  >
                    {cat}
                  </span>
                ))}
              </div>
              <h3 className="mb-1.5 line-clamp-2 font-sans text-lg font-medium tracking-tight">{d.name}</h3>
              <p className="mb-4 font-mono text-[11px] text-muted-foreground">
                {TYPE_LABEL[d.auditType] ?? d.auditType}
                {d.auditDate ? ` · ${formatShortDate(d.auditDate)}` : ""}
              </p>
              <div className="mb-1 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                <span>
                  {d.done} / {d.total} indicateurs
                </span>
                <span className="font-semibold text-foreground">{d.coverage}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--amethyst-br)] to-[var(--c2)]"
                  style={{ width: `${d.coverage}%` }}
                />
              </div>
              <div className="mt-4 flex items-center justify-end">
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-amethyst-bright" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Pill({ children, dot = false, tone }: { children: React.ReactNode; dot?: boolean; tone?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em]">
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone, boxShadow: `0 0 6px ${tone}` }} />}
      <span style={{ color: tone }}>{children}</span>
    </span>
  );
}

function Metric({ label, value, unit, foot }: { label: string; value: string; unit?: string; foot: string }) {
  return (
    <div className="qm-glass flex flex-col items-center rounded-[18px] px-[22px] pb-[22px] pt-[26px] text-center">
      <div className="mb-3.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-[var(--text-mute)]">
        {label}
      </div>
      <div className="font-sans text-[44px] font-light leading-[0.95] tracking-[-0.025em]">
        {value}
        {unit && <small className="ml-1 text-lg font-normal text-[var(--text-faint)]">{unit}</small>}
      </div>
      <div className="mt-2.5 text-[12.5px] font-medium text-[var(--text-mute)]">{foot}</div>
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-[18px] flex items-end justify-between gap-4">
      <h2 className="font-sans text-2xl font-light tracking-[-0.015em]">{title}</h2>
      {hint && <span className="font-mono text-[11px] tracking-[0.1em] text-[var(--text-mute)]">{hint}</span>}
    </div>
  );
}

function Panel({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="qm-glass rounded-[18px] px-6 py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--amethyst-soft-2)] text-[var(--amethyst-br)]">
            {icon}
          </span>
          <span className="font-sans text-[15px] font-medium">{title}</span>
        </div>
        {hint && <span className="font-mono text-[10.5px] text-[var(--text-mute)]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-[var(--border-soft)] px-4 py-5 text-center text-[12.5px] text-[var(--text-mute)]">
      {text}
    </p>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
