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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndicatorStatusForm } from "@/components/indicator/indicator-status-form";
import { StatusPill } from "@/components/indicator/status-pill";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { indicatorContextPath, indicatorContextPaths } from "@/lib/utils/context-path";

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

  // Requêtes indépendantes lancées ensemble : une seule attente au lieu de trois.
  const [{ data: audit }, { data: indicatorRow }, { data: attachments }] = await Promise.all([
    // Audit + plan de l'organisation
    supabase
      .from("audits")
      .select("id, name, categories, organization:organizations(plan)")
      .eq("id", id)
      .single(),
    // État actuel de l'indicateur, s'il existe
    supabase
      .from("audit_indicators")
      .select("status, notes")
      .eq("audit_id", id)
      .eq("indicator_code", code)
      .maybeSingle(),
    // Pièces jointes de cet indicateur
    supabase
      .from("attachments")
      .select("*")
      .eq("audit_id", id)
      .in("context_path", indicatorContextPaths(code))
      .order("created_at", { ascending: false }),
  ]);

  if (!audit) notFound();

  const plan = audit.organization?.plan ?? "essentiel";
  const categories = (audit.categories ?? []) as Category[];
  const miniapps = getMiniAppsForIndicatorInCategories(code, categories);
  const hasMiniapps = miniapps.length > 0;
  const showMiniappAccess = plan !== "essentiel" && hasMiniapps;

  const accent = `var(--${critere.colorVar})`;
  const numStr = String(critereNum).padStart(2, "0");
  const status = indicatorRow?.status ?? "a_traiter";

  return (
    <div className="space-y-8" style={{ ["--crit" as string]: accent }}>

      {/* En-tête de l'indicateur */}
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-[var(--border-soft)] pb-7">
        <div className="min-w-0 flex-1">
          <span
            className="mb-3 inline-flex items-center gap-[7px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: accent }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
            />
            Critère {numStr} · Indicateur {ind.num}
          </span>

          <h1 className="font-sans text-[40px] font-light leading-[1.05] tracking-[-0.025em]">
            {ind.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {ind.v9Update && (
              <Badge variant="warning">
                <AlertTriangle className="h-2.5 w-2.5" />
                MAJ V9
              </Badge>
            )}
            {ind.cfaOnly && <Badge variant="outline">CFA uniquement</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <StatusPill status={status} />
          <Link
            href={`/audits/${id}/documents`}
            prefetch={true}
            className="qm-btn-3d inline-flex h-[42px] items-center gap-2 rounded-xl px-[18px] text-[13.5px] font-semibold"
          >
            Ajouter un document
          </Link>
        </div>
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
            contextPath={indicatorContextPath(code)}
            contextLabel={`Indicateur ${code}`}
            attachments={attachments ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
