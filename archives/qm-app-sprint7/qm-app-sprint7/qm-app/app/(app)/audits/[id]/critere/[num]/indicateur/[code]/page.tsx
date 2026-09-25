import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, AlertTriangle, FileText, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  CRITERES,
  getIndicator,
  getMiniAppsForIndicatorInCategories,
  type Category,
  type CritereNum,
} from "@/lib/constants/rnq";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndicatorStatusForm } from "@/components/indicator/indicator-status-form";
import { AttachmentList } from "@/components/attachments/attachment-list";

type Params = { id: string; num: string; code: string };

export const metadata = { title: "Indicateur" };

export default async function IndicatorPage({ params }: { params: Promise<Params> }) {
  const { id, num, code } = await params;
  const ind = getIndicator(code);
  if (!ind) notFound();

  const critereNum = Number(num) as CritereNum;
  const critere = CRITERES[critereNum];
  if (!critere) notFound();

  const supabase = await createClient();

  // Audit + plan de l'organisation
  const { data: audit } = await supabase
    .from("audits")
    .select("id, name, categories, organization:organizations(plan)")
    .eq("id", id)
    .single();
  if (!audit) notFound();

  // Récupère l'état actuel de l'indicateur s'il existe
  const { data: indicatorRow } = await supabase
    .from("audit_indicators")
    .select("status, notes")
    .eq("audit_id", id)
    .eq("indicator_code", code)
    .maybeSingle();

  // PJ pour cet indicateur (via context_path commence par "indicator:<code>")
  const { data: attachments } = await supabase
    .from("attachments")
    .select("*")
    .eq("audit_id", id)
    .eq("context_path", `indicator:${code}`)
    .order("created_at", { ascending: false });

  const plan = audit.organization?.plan ?? "essentiel";
  const categories = (audit.categories ?? []) as Category[];
  const miniapps = getMiniAppsForIndicatorInCategories(code, categories);
  const hasMiniapps = miniapps.length > 0;
  const showMiniappAccess = plan !== "essentiel" && hasMiniapps;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Breadcrumb
        items={[
          { label: "Vue d'ensemble", href: "/dashboard" },
          { label: audit.name, href: `/audits/${id}` },
          { label: `C${critereNum}`, href: `/audits/${id}/critere/${num}` },
          { label: ind.code },
        ]}
      />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-amethyst-bright">
            Indicateur {ind.code} · C{critereNum} {critere.title}
          </span>
          {ind.v9Update && (
            <Badge variant="warning">
              <AlertTriangle className="h-2.5 w-2.5" />
              MAJ V9
            </Badge>
          )}
          {ind.cfaOnly && <Badge variant="outline">CFA uniquement</Badge>}
        </div>
        <h1 className="font-sans text-3xl font-light tracking-tight">{ind.title}</h1>
      </div>

      {/* Statut + notes */}
      <Card>
        <CardHeader>
          <CardTitle>Statut & notes</CardTitle>
        </CardHeader>
        <CardContent>
          <IndicatorStatusForm
            auditId={id}
            indicatorCode={code}
            initialStatus={indicatorRow?.status ?? "a_traiter"}
            initialNotes={indicatorRow?.notes ?? ""}
          />
        </CardContent>
      </Card>

      {/* Mini-apps */}
      {hasMiniapps && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amethyst-bright" />
              Mini-apps associées
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showMiniappAccess ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {miniapps.map((mini) => (
                  <Link
                    key={mini.key}
                    href={`/audits/${id}/miniapps/${mini.key}`}
                    className="group flex items-center gap-3 p-3.5 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/60 hover:border-amethyst-bright/40 transition-colors"
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-amethyst-bright/10 text-amethyst-bright shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{mini.shortName}</div>
                      <div className="font-mono text-[10px] text-muted-foreground truncate">
                        {mini.description}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amethyst-bright" />
                  </Link>
                ))}
              </div>
            ) : (
              // Teaser pour plan Essentiel
              <div className="rounded-xl border border-amethyst-bright/30 bg-gradient-to-br from-amethyst-bright/[0.05] to-c2/[0.05] p-5">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-amethyst-bright mb-2">
                  Avec le plan Pro
                </p>
                <p className="text-sm leading-relaxed">
                  Automatisez la saisie de cet indicateur grâce à{" "}
                  {miniapps.length === 1 ? (
                    <>
                      la mini-app <b>{miniapps[0]!.shortName}</b>
                    </>
                  ) : (
                    <>
                      <b>{miniapps.length} mini-apps métier</b> dédiées
                    </>
                  )}{" "}
                  : ajout/édition rapide, calculs automatiques, et exports.{" "}
                  <Link href="/settings" className="text-amethyst-bright hover:underline">
                    Voir le plan Pro →
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pièces jointes (toujours dispo, même en Essentiel) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-amethyst-bright" />
            Preuves attachées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AttachmentList
            auditId={id}
            contextPath={`indicator:${code}`}
            contextLabel={`Indicateur ${code}`}
            attachments={attachments ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
