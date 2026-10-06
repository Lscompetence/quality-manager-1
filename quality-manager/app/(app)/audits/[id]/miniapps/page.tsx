import { PageHeader } from "@/components/layout/page-header";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth/session";
import { isDossierReadOnly, readOnlyReason } from "@/lib/auth/permissions";
import { ReadOnlyBanner } from "@/components/miniapps/read-only";
import {
  CRITERES,
  type CritereNum,
  type Category,
  getApplicableIndicators,
} from "@/lib/constants/rnq";
import { listMiniAppSchemas } from "@/lib/miniapps/registry";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Params = { id: string };

export const metadata = { title: "Mini-apps" };

export default async function MiniAppsListPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const session = await requireMember();
  const readOnly = isDossierReadOnly(session.profile.role);
  const supabase = await createClient();

  const { data: audit } = await supabase
    .from("audits")
    .select("id, name, categories, organization:organizations(plan)")
    .eq("id", id)
    .single();

  if (!audit) notFound();

  const plan = audit.organization?.plan ?? "essentiel";
  const categories = (audit.categories ?? []) as Category[];

  // Indicateurs applicables au dossier
  const applicableCodes = new Set(getApplicableIndicators(categories).map((i) => i.code));

  // Mini-apps dont au moins un indicateur est applicable ET dont les catégories
  // recoupent celles du dossier (ex: le registre EPI ne sort pas sur un dossier AF seul)
  const allMiniapps = listMiniAppSchemas();
  const applicableMiniapps = allMiniapps.filter((m) => {
    const indicatorMatch = m.indicators.some((c) => applicableCodes.has(c));
    if (!indicatorMatch) return false;
    if (!m.categories || m.categories.length === 0) return true;
    return m.categories.some((c) => categories.includes(c));
  });

  // Grouper par critère
  const byCritere: Record<CritereNum, typeof applicableMiniapps> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
    7: [],
  };
  for (const m of applicableMiniapps) {
    byCritere[m.critere as CritereNum].push(m);
  }

  return (
    <div className="w-full space-y-8">
      {readOnly && (
        <div className="mb-6">
          <ReadOnlyBanner reason={readOnlyReason(session.profile.role)} />
        </div>
      )}

      <PageHeader
        eyebrow={`Mini-apps métier · ${applicableMiniapps.length} disponibles`}
        title="Mini-apps du dossier"
        description={`Mini-apps adaptées aux catégories de votre dossier (${categories.join(" · ")}). Industrialisent la saisie pour les indicateurs RNQ V9.`}
      />

      {plan === "essentiel" && (
        <Card className="border-amethyst-bright/30">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amethyst-bright/10 text-amethyst-bright">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-amethyst-bright">
                Plan Essentiel
              </p>
              <p className="text-sm">
                Vous voyez la liste, mais l&apos;accès aux mini-apps est réservé au plan Pro.{" "}
                {/* L'abonnement est géré par l'admin : lui seul est envoyé vers ses paramètres */}
                {session.profile.role === "admin" ? (
                  <Link
                    href="/settings"
                    className="font-medium text-amethyst-bright hover:underline"
                  >
                    Demander le plan Pro →
                  </Link>
                ) : (
                  <span className="text-[var(--text-mute)]">
                    L&apos;admin de votre organisme peut demander le passage au plan Pro.
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.entries(byCritere).map(([num, miniapps]) => {
        if (miniapps.length === 0) return null;
        const critere = CRITERES[Number(num) as CritereNum];
        // Chaque critère garde sa couleur (--c1 à --c7), la même que partout dans l'app
        const color = `var(--${critere.colorVar})`;
        const tint = (pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
        return (
          <div key={num} style={{ "--crit": color } as CSSProperties}>
            <div className="mb-3 flex items-center gap-2.5">
              <span
                className="grid h-6 min-w-6 place-items-center rounded-md px-1.5 font-mono text-[11px] font-semibold text-foreground"
                style={{ background: tint(22), boxShadow: `inset 0 0 0 1px ${tint(45)}` }}
              >
                C{num}
              </span>
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {critere.title}
              </div>
              <span className="h-px flex-1" style={{ background: tint(35) }} />
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {miniapps.map((m) => (
                <Link key={m.key} href={`/audits/${id}/miniapps/${m.key}`} className="group">
                  <Card
                    className="h-full overflow-hidden border-t-[3px] transition-all hover:-translate-y-0.5 hover:border-[var(--crit)]"
                    style={{ borderTopColor: color }}
                  >
                    <CardContent className="p-5">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                          style={{ background: tint(16), color }}
                        >
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-[var(--crit)]" />
                      </div>
                      <h3 className="mb-1.5 text-sm font-medium leading-tight">{m.shortName}</h3>
                      <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                        {m.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {m.docRef && <Badge variant="secondary">{m.docRef}</Badge>}
                        {m.indicators.map((code) => (
                          <Badge key={code} variant="outline">
                            {code}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
