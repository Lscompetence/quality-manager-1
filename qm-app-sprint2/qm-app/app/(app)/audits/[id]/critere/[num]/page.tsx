import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  CRITERES,
  getIndicatorsByCritere,
  type CritereNum,
  type Category,
} from "@/lib/constants/rnq";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Params = { id: string; num: string };

export const metadata = {
  title: "Critère",
};

export default async function CriterePage({ params }: { params: Promise<Params> }) {
  const { id, num } = await params;
  const critereNum = Number(num) as CritereNum;
  const critere = CRITERES[critereNum];
  if (!critere) notFound();

  const supabase = await createClient();

  const { data: audit } = await supabase
    .from("audits")
    .select("id, name, categories")
    .eq("id", id)
    .single();

  if (!audit) notFound();

  const categories = (audit.categories ?? []) as Category[];
  const indicators = getIndicatorsByCritere(critereNum, categories);

  // États de chaque indicateur
  const { data: states } = await supabase
    .from("audit_indicators")
    .select("indicator_code, status")
    .eq("audit_id", id)
    .eq("critere_num", critereNum);

  const stateByCode = new Map<string, string>();
  for (const s of states ?? []) stateByCode.set(s.indicator_code, s.status);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Breadcrumb
        items={[
          { label: "Vue d'ensemble", href: "/dashboard" },
          { label: audit.name, href: `/audits/${id}` },
          { label: `C${critereNum} · ${critere.title}` },
        ]}
      />

      {/* Header critère */}
      <div className="flex items-start gap-5">
        <div
          className={`grid h-16 w-16 place-items-center rounded-2xl text-white font-medium font-sans text-2xl shrink-0 ${gradClass(critere.colorVar)}`}
        >
          C{critereNum}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright mb-2">
            Critère {critereNum} · RNQ V9
          </p>
          <h1 className="font-sans text-3xl font-light tracking-tight">{critere.title}</h1>
          <p className="mt-2 text-muted-foreground">{critere.subtitle}</p>
        </div>
      </div>

      {/* Liste des indicateurs */}
      <div className="space-y-2">
        {indicators.map((ind) => {
          const status = stateByCode.get(ind.code) ?? "a_traiter";
          return (
            <Link
              key={ind.code}
              href={`/audits/${id}/critere/${num}/indicateur/${ind.code}`}
              className="group block"
            >
              <Card className="hover:border-amethyst-bright/40 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-10 shrink-0">
                    {ind.code}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-medium truncate">{ind.title}</h3>
                      {ind.v9Update && (
                        <Badge variant="warning">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          MAJ V9
                        </Badge>
                      )}
                      {ind.cfaOnly && <Badge variant="outline">CFA</Badge>}
                    </div>
                  </div>
                  <StatusBadge status={status} />
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amethyst-bright transition-colors shrink-0" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "complet":
      return <Badge variant="success">Complet</Badge>;
    case "en_cours":
      return <Badge variant="default">En cours</Badge>;
    case "non_applicable":
      return <Badge variant="secondary">N/A</Badge>;
    default:
      return <Badge variant="outline">À traiter</Badge>;
  }
}

function gradClass(c: string): string {
  return {
    c1: "bg-gradient-to-br from-c1 to-c1-strong shadow-[0_8px_22px_-6px_rgba(226,117,75,0.45)]",
    c2: "bg-gradient-to-br from-c2 to-c2-strong shadow-[0_8px_22px_-6px_rgba(43,167,133,0.45)]",
    c3: "bg-gradient-to-br from-c3 to-c3-strong shadow-[0_8px_22px_-6px_rgba(209,122,14,0.45)]",
    c4: "bg-gradient-to-br from-c4 to-c4-strong shadow-[0_8px_22px_-6px_rgba(61,90,153,0.45)]",
    c5: "bg-gradient-to-br from-c5 to-c5-strong shadow-[0_8px_22px_-6px_rgba(74,158,54,0.45)]",
    c6: "bg-gradient-to-br from-c6 to-c6-strong shadow-[0_8px_22px_-6px_rgba(133,48,219,0.45)]",
    c7: "bg-gradient-to-br from-c7 to-c7-strong shadow-[0_8px_22px_-6px_rgba(200,42,125,0.45)]",
  }[c] ?? "bg-secondary";
}
