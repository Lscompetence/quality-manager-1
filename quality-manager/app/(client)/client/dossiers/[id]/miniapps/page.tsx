import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CRITERES, type Category, type CritereNum } from "@/lib/constants/rnq";
import { getApplicableMiniApps } from "@/lib/miniapps/applicable";

type Params = { id: string };

export const metadata = { title: "Mini-apps" };

/**
 * Mini-apps d'un dossier confié, côté client : consultation seule de ce que
 * l'organisme a renseigné. Celles déjà remplies passent en premier.
 */
export default async function ClientMiniAppsPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  // La RLS ne renvoie ce dossier que s'il est confié au client connecté.
  const [{ data: audit }, { data: filled }] = await Promise.all([
    supabase.from("audits").select("id, name, categories").eq("id", id).single(),
    supabase.from("miniapp_data").select("miniapp_key, updated_at").eq("audit_id", id),
  ]);
  if (!audit) notFound();

  const categories = (audit.categories ?? []) as Category[];
  const filledAt = new Map((filled ?? []).map((f) => [f.miniapp_key, f.updated_at]));
  const miniapps = getApplicableMiniApps(categories).sort(
    (a, b) => Number(filledAt.has(b.key)) - Number(filledAt.has(a.key)),
  );

  const byCritere = new Map<CritereNum, typeof miniapps>();
  for (const m of miniapps) {
    const c = m.critere as CritereNum;
    byCritere.set(c, [...(byCritere.get(c) ?? []), m]);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/client/dossiers/${id}` as Route}
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-[var(--text-mute)] hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {audit.name}
      </Link>

      <div className="mb-[30px] border-b border-[var(--border-soft)] pb-6">
        <p className="qm-eyebrow mb-3">
          Mini-apps · {filledAt.size} renseignée(s) sur {miniapps.length}
        </p>
        <h1 className="mb-3 font-sans text-[40px] font-light leading-[1.05] tracking-[-0.025em]">
          Mini-apps du dossier
        </h1>
        <p className="max-w-[700px] text-[14.5px] leading-[1.55] text-[var(--text-mute)]">
          Les registres et outils tenus par votre organisme pour votre certification ({categories.join(" · ")}).
          Vous les consultez ici ; c&apos;est votre organisme qui les met à jour.
        </p>
      </div>

      <div className="space-y-8">
        {([1, 2, 3, 4, 5, 6, 7] as CritereNum[]).map((c) => {
          const list = byCritere.get(c);
          if (!list?.length) return null;
          const critere = CRITERES[c];
          return (
            <section key={c}>
              <h2
                className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: `var(--${critere.colorVar})` }}
              >
                C{c} · {critere.title}
              </h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {list.map((m) => {
                  const updated = filledAt.get(m.key);
                  return (
                    <Link key={m.key} href={`/client/dossiers/${id}/miniapps/${m.key}` as Route} className="group">
                      <div className="qm-glass qm-glass-hover h-full rounded-2xl p-5">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--amethyst-soft-2)] text-[var(--amethyst-br)]">
                            <Sparkles className="h-4 w-4" />
                          </span>
                          <span
                            className={
                              updated
                                ? "rounded-full border border-[rgba(88,214,154,0.32)] bg-[rgba(88,214,154,0.1)] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--status-on)]"
                                : "rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]"
                            }
                          >
                            {updated ? "Renseignée" : "Pas encore"}
                          </span>
                        </div>
                        <h3 className="mb-1 text-[15px] font-medium">{m.name}</h3>
                        <p className="line-clamp-2 text-[12.5px] leading-relaxed text-[var(--text-mute)]">
                          {m.description}
                        </p>
                        <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-[var(--text-faint)]">
                          <span>
                            {m.indicators.join(" · ")}
                            {updated ? ` · mis à jour le ${formatDate(updated)}` : ""}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 transition-colors group-hover:text-[var(--amethyst-br)]" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
