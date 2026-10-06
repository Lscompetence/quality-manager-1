import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOrgAdmin } from "@/lib/auth/session";
import { AUDIT_TYPE_LABEL, computeAuditProgress } from "@/lib/progress";
import type { Category } from "@/lib/constants/rnq";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateEstablishmentDialog } from "@/components/establishments/create-establishment-dialog";
import { MembersSection, type MemberRow } from "@/components/establishments/members-section";
import { CritereBars, IndicatorGrid, ProgressBar } from "@/components/progress/progress-views";

export const metadata = { title: "Établissement" };

type Params = { id: string };

export default async function EstablishmentPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  await requireOrgAdmin();
  const supabase = await createClient();

  const { data: est } = await supabase
    .from("establishments")
    .select("id, name, city, siret, declaration_nb, address")
    .eq("id", id)
    .maybeSingle();
  if (!est) notFound();

  const [{ data: memberRows }, { data: audits }] = await Promise.all([
    supabase
      .from("establishment_members")
      .select("user:users(id, first_name, last_name, email, role)")
      .eq("establishment_id", id),
    supabase
      .from("audits")
      .select("id, name, audit_type, categories, status, audit_date, certificateur")
      .eq("establishment_id", id)
      .neq("status", "archive")
      .order("updated_at", { ascending: false }),
  ]);

  const members = (memberRows ?? [])
    .map((r) => r.user)
    .filter((u): u is MemberRow => Boolean(u))
    .sort((a, b) =>
      a.role === b.role ? a.last_name.localeCompare(b.last_name) : a.role === "editor" ? -1 : 1,
    );

  const { data: indicatorRows } =
    audits && audits.length
      ? await supabase
          .from("audit_indicators")
          .select("audit_id, indicator_code, status")
          .in(
            "audit_id",
            audits.map((a) => a.id),
          )
      : { data: [] };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright">
            Établissement
          </p>
          <h1 className="font-sans text-3xl font-light tracking-tight">{est.name}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {est.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {est.city}
              </span>
            )}
            {est.siret && <span className="font-mono text-xs">SIRET {est.siret}</span>}
            {est.declaration_nb && (
              <span className="font-mono text-xs">NDA {est.declaration_nb}</span>
            )}
          </div>
        </div>
        <CreateEstablishmentDialog
          establishment={{
            id: est.id,
            name: est.name,
            city: est.city ?? "",
            siret: est.siret ?? "",
            declaration_nb: est.declaration_nb ?? "",
            address: est.address ?? "",
          }}
        />
      </div>

      <MembersSection establishmentId={est.id} members={members} />

      <Card>
        <CardHeader>
          <CardTitle>Avancement des dossiers</CardTitle>
          <CardDescription>
            Critère par critère et indicateur par indicateur. Cliquez pour consulter le détail et
            les preuves — en lecture seule.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!audits || audits.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun dossier ouvert. Le responsable pédagogique crée le dossier depuis son espace.
            </p>
          ) : (
            audits.map((audit) => {
              const progress = computeAuditProgress(
                audit.categories as Category[],
                (indicatorRows ?? []).filter((r) => r.audit_id === audit.id),
              );
              return (
                <div key={audit.id} className="space-y-4 rounded-xl border border-border p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={audit.status === "en_cours" ? "success" : "secondary"}>
                      {audit.status === "en_cours" ? "En cours" : "Clôturé"}
                    </Badge>
                    <Badge variant="outline">{AUDIT_TYPE_LABEL[audit.audit_type]}</Badge>
                    {(audit.categories as string[]).map((c) => (
                      <Badge key={c} variant="outline">
                        {c}
                      </Badge>
                    ))}
                    {audit.audit_date && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(audit.audit_date).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                    <Link
                      href={`/audits/${audit.id}`}
                      className="ml-auto inline-flex items-center gap-1 text-sm text-amethyst-bright hover:underline"
                    >
                      Consulter <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-medium">{audit.name}</span>
                      <span className="font-mono text-xs">
                        <b>{progress.done}</b>/{progress.total} complets · {progress.inProgress} en
                        cours · {progress.percent} %
                      </span>
                    </div>
                    <ProgressBar percent={progress.percent} />
                  </div>
                  <CritereBars progress={progress} auditId={audit.id} />
                  <IndicatorGrid progress={progress} auditId={audit.id} />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
