import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calendar, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CRITERES, getIndicatorsByCritere, type CritereNum, type Category } from "@/lib/constants/rnq";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Dossier",
};

type Params = { id: string };

export default async function AuditDashboardPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: audit } = await supabase
    .from("audits")
    .select("id, name, audit_type, categories, status, audit_date, certificateur")
    .eq("id", id)
    .single();

  if (!audit) notFound();

  // Compteur par critère
  const { data: indicators } = await supabase
    .from("audit_indicators")
    .select("critere_num, status")
    .eq("audit_id", id);

  const categories = (audit.categories ?? []) as Category[];

  const progressByCritere: Record<CritereNum, { total: number; done: number; inProgress: number }> = {
    1: { total: 0, done: 0, inProgress: 0 },
    2: { total: 0, done: 0, inProgress: 0 },
    3: { total: 0, done: 0, inProgress: 0 },
    4: { total: 0, done: 0, inProgress: 0 },
    5: { total: 0, done: 0, inProgress: 0 },
    6: { total: 0, done: 0, inProgress: 0 },
    7: { total: 0, done: 0, inProgress: 0 },
  };

  // Total des indicateurs applicables
  ([1, 2, 3, 4, 5, 6, 7] as CritereNum[]).forEach((c) => {
    progressByCritere[c].total = getIndicatorsByCritere(c, categories).length;
  });

  // Comptage des indicateurs "complet" et "en_cours"
  for (const ind of indicators ?? []) {
    const c = ind.critere_num as CritereNum;
    if (!progressByCritere[c]) continue;
    if (ind.status === "complet") progressByCritere[c].done++;
    if (ind.status === "en_cours") progressByCritere[c].inProgress++;
  }

  const total = Object.values(progressByCritere).reduce((s, p) => s + p.total, 0);
  const totalDone = Object.values(progressByCritere).reduce((s, p) => s + p.done, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Breadcrumb items={[{ label: "Vue d'ensemble", href: "/dashboard" }, { label: audit.name }]} />

      {/* Header dossier */}
      <div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Badge variant={audit.status === "en_cours" ? "success" : "secondary"}>
            {audit.status === "en_cours" ? "En cours" : audit.status}
          </Badge>
          <Badge variant="outline">
            {auditTypeLabel(audit.audit_type)}
          </Badge>
          {categories.map((cat) => (
            <Badge key={cat} variant="outline">{cat}</Badge>
          ))}
        </div>
        <h1 className="font-sans text-4xl font-light tracking-tight">{audit.name}</h1>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          {audit.audit_date && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(audit.audit_date)}
            </span>
          )}
          {audit.certificateur && (
            <span className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              {audit.certificateur}
            </span>
          )}
        </div>
      </div>

      {/* KPI global */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
                Progression globale
              </p>
              <p className="font-sans text-3xl font-light">
                <b className="font-medium text-amethyst-bright">{totalDone}</b>
                <span className="text-muted-foreground"> / {total} indicateurs complets</span>
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
                Couverture
              </p>
              <p className="font-sans text-3xl font-light">
                <b className="font-medium">{total > 0 ? Math.round((totalDone / total) * 100) : 0}</b>
                <span className="text-muted-foreground text-sm"> %</span>
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amethyst to-amethyst-bright transition-all"
              style={{ width: `${total > 0 ? (totalDone / total) * 100 : 0}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cartes critères */}
      <div>
        <h2 className="font-sans text-xl font-medium mb-4">Les 7 critères RNQ V9</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.values(CRITERES).map((critere) => {
            const numStr = String(critere.num).padStart(2, "0");
            const p = progressByCritere[critere.num];
            const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
            return (
              <Link
                key={critere.num}
                href={`/audits/${id}/critere/${numStr}`}
                className="group"
              >
                <Card className="hover:border-amethyst-bright/40 hover:-translate-y-0.5 transition-all h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`grid h-9 w-9 place-items-center rounded-lg text-white font-medium font-sans text-sm ${gradClass(critere.colorVar)}`}>
                        C{critere.num}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium truncate">{critere.title}</h3>
                        <p className="font-mono text-[10px] text-muted-foreground truncate">
                          {critere.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-mono text-muted-foreground">
                        <b className="text-foreground">{p.done}</b> / {p.total} complets
                      </span>
                      <span className="font-mono text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barClass(critere.colorVar)} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-end mt-4">
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amethyst-bright transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function auditTypeLabel(type: string): string {
  return {
    initial: "Audit initial",
    surveillance: "Audit de surveillance",
    renouvellement: "Audit de renouvellement",
  }[type] ?? type;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function gradClass(c: string): string {
  return {
    c1: "bg-gradient-to-br from-c1 to-c1-strong",
    c2: "bg-gradient-to-br from-c2 to-c2-strong",
    c3: "bg-gradient-to-br from-c3 to-c3-strong",
    c4: "bg-gradient-to-br from-c4 to-c4-strong",
    c5: "bg-gradient-to-br from-c5 to-c5-strong",
    c6: "bg-gradient-to-br from-c6 to-c6-strong",
    c7: "bg-gradient-to-br from-c7 to-c7-strong",
  }[c] ?? "bg-secondary";
}

function barClass(c: string): string {
  return {
    c1: "bg-c1",
    c2: "bg-c2",
    c3: "bg-c3",
    c4: "bg-c4",
    c5: "bg-c5",
    c6: "bg-c6",
    c7: "bg-c7",
  }[c] ?? "bg-amethyst-bright";
}
