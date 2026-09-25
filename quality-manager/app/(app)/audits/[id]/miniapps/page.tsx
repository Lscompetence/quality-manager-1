import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CRITERES, type CritereNum, type Category, getApplicableIndicators } from "@/lib/constants/rnq";
import { listMiniAppSchemas } from "@/lib/miniapps/registry";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Params = { id: string };

export const metadata = { title: "Mini-apps" };

export default async function MiniAppsListPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
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
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [],
  };
  for (const m of applicableMiniapps) {
    byCritere[m.critere as CritereNum].push(m);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">

      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright mb-2">
          Mini-apps métier · {applicableMiniapps.length} disponibles
        </p>
        <h1 className="font-sans text-3xl font-light tracking-tight">Mini-apps du dossier</h1>
        <p className="mt-2 text-muted-foreground">
          Mini-apps adaptées aux catégories de votre dossier ({categories.join(" · ")}). Industrialisent
          la saisie pour les indicateurs RNQ V9.
        </p>
      </div>

      {plan === "essentiel" && (
        <Card className="border-amethyst-bright/30">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-amethyst-bright/10 text-amethyst-bright shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-amethyst-bright mb-1">
                Plan Essentiel
              </p>
              <p className="text-sm">
                Vous voyez la liste, mais l&apos;accès aux mini-apps est réservé au plan Pro.{" "}
                <Link href="/settings" className="font-medium text-amethyst-bright hover:underline">
                  Voir le plan Pro →
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.entries(byCritere).map(([num, miniapps]) => {
        if (miniapps.length === 0) return null;
        const critere = CRITERES[Number(num) as CritereNum];
        return (
          <div key={num}>
            <div className="flex items-center gap-3 mb-3">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                C{num} · {critere?.title}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {miniapps.map((m) => (
                <Link key={m.key} href={`/audits/${id}/miniapps/${m.key}`} className="group">
                  <Card className="hover:border-amethyst-bright/40 hover:-translate-y-0.5 transition-all h-full">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-amethyst-bright/10 text-amethyst-bright shrink-0">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amethyst-bright" />
                      </div>
                      <h3 className="text-sm font-medium leading-tight mb-1.5">{m.shortName}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
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
