import Link from "next/link";
import { ArrowRight, Building2, FolderOpen, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireMember, type MemberSession } from "@/lib/auth/session";
import { canCreateAudit } from "@/lib/auth/permissions";
import {
  AUDIT_TYPE_LABEL,
  computeAuditProgress,
  type AuditProgress,
  type IndicatorStatus,
} from "@/lib/progress";
import type { Category } from "@/lib/constants/rnq";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateAuditDialog } from "@/components/audits/create-audit-dialog";
import { CreateEstablishmentDialog } from "@/components/establishments/create-establishment-dialog";
import { CritereBars, ProgressBar } from "@/components/progress/progress-views";

export const metadata = {
  title: "Vue d'ensemble",
};

type AuditRow = {
  id: string;
  name: string;
  establishment_id: string;
  audit_type: "initial" | "surveillance" | "renouvellement";
  categories: Category[];
  status: "en_cours" | "cloture" | "archive";
  audit_date: string | null;
  certificateur: string | null;
  updated_at: string;
};

export default async function DashboardPage() {
  const session = await requireMember();
  const supabase = await createClient();

  const { data: auditsData } = await supabase
    .from("audits")
    .select(
      "id, name, establishment_id, audit_type, categories, status, audit_date, certificateur, updated_at",
    )
    .in("status", ["en_cours", "cloture"])
    .order("updated_at", { ascending: false });
  const audits = (auditsData ?? []) as AuditRow[];

  const { data: indicatorRows } = audits.length
    ? await supabase
        .from("audit_indicators")
        .select("audit_id, indicator_code, status")
        .in(
          "audit_id",
          audits.map((a) => a.id),
        )
    : { data: [] as { audit_id: string; indicator_code: string; status: IndicatorStatus }[] };

  const progressByAudit = new Map<string, AuditProgress>(
    audits.map((a) => [
      a.id,
      computeAuditProgress(
        a.categories,
        (indicatorRows ?? []).filter((r) => r.audit_id === a.id),
      ),
    ]),
  );

  return session.profile.role === "admin" ? (
    <AdminOverview session={session} audits={audits} progressByAudit={progressByAudit} />
  ) : (
    <DossierOverview session={session} audits={audits} progressByAudit={progressByAudit} />
  );
}

// -----------------------------------------------------------------------------
// Admin : avancement de chaque établissement
// -----------------------------------------------------------------------------
function AdminOverview({
  session,
  audits,
  progressByAudit,
}: {
  session: MemberSession;
  audits: AuditRow[];
  progressByAudit: Map<string, AuditProgress>;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright">
            Vue d’ensemble · {session.organization.name}
          </p>
          <h1 className="font-sans text-4xl font-light tracking-tight">Vos établissements</h1>
          <p className="mt-2 text-muted-foreground">
            L’avancement Qualiopi de chaque établissement, critère par critère. Les responsables
            pédagogiques remplissent les dossiers ; vous les consultez.
          </p>
        </div>
        {/* Sans établissement, le bouton est dans l'encart central : un seul à la fois */}
        {session.establishments.length > 0 && <CreateEstablishmentDialog />}
      </div>

      {session.establishments.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-amethyst-bright/10 text-amethyst-bright">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-xl font-medium">Commencez par créer un établissement</h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
            Un établissement est l’entité auditée. Créez-le, puis ouvrez l’accès à son responsable
            pédagogique : c’est lui qui construira le dossier.
          </p>
          <CreateEstablishmentDialog />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {session.establishments.map((est) => {
            const estAudits = audits.filter((a) => a.establishment_id === est.id);
            const current = estAudits.find((a) => a.status === "en_cours") ?? estAudits[0];
            const progress = current ? progressByAudit.get(current.id) : undefined;
            return (
              <Link key={est.id} href={`/etablissements/${est.id}`} className="group">
                <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-amethyst-bright/40">
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-sans text-lg font-medium tracking-tight">
                          {est.name}
                        </h3>
                        {est.city && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {est.city}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">
                        {estAudits.length} dossier{estAudits.length > 1 ? "s" : ""}
                      </Badge>
                    </div>

                    {current && progress ? (
                      <>
                        <div>
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="truncate text-muted-foreground">
                              {current.name} · {AUDIT_TYPE_LABEL[current.audit_type]}
                            </span>
                            <span className="font-mono">
                              <b>{progress.done}</b>/{progress.total} · {progress.percent} %
                            </span>
                          </div>
                          <ProgressBar percent={progress.percent} />
                        </div>
                        <CritereBars progress={progress} />
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Aucun dossier ouvert pour l’instant.
                      </p>
                    )}

                    <div className="flex justify-end">
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-amethyst-bright" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Editor / reader : les dossiers de leurs établissements
// -----------------------------------------------------------------------------
function DossierOverview({
  session,
  audits,
  progressByAudit,
}: {
  session: MemberSession;
  audits: AuditRow[];
  progressByAudit: Map<string, AuditProgress>;
}) {
  const canCreate = canCreateAudit(session.profile.role, session.establishments.length);
  const multi = session.establishments.length > 1;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright">
            Vue d’ensemble · Dossiers
          </p>
          <h1 className="font-sans text-4xl font-light tracking-tight">
            Bonjour {session.profile.firstName}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {session.establishments.length === 1 ? `${session.establishments[0]!.name} — ` : ""}
            vos dossiers d’audit Qualiopi (RNQ V9 — 7 critères, 32 indicateurs).
          </p>
        </div>
        {canCreate && <CreateAuditDialog establishments={session.establishments} />}
      </div>

      {session.establishments.length === 0 ? (
        <Card className="p-12 text-center">
          <h2 className="mb-2 text-xl font-medium">Aucun établissement ne vous est rattaché</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Demandez à l’admin de votre organisme de vous ouvrir l’accès à votre établissement.
          </p>
        </Card>
      ) : audits.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-amethyst-bright/10 text-amethyst-bright">
            <FolderOpen className="h-6 w-6" />
          </div>
          <h2 className="mb-2 text-xl font-medium">Aucun dossier pour l’instant</h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
            {canCreate
              ? "Créez votre dossier d’audit : initial, surveillance ou renouvellement, selon l’étape où vous en êtes."
              : "Le responsable pédagogique n’a pas encore ouvert de dossier."}
          </p>
          {canCreate && <CreateAuditDialog establishments={session.establishments} />}
        </Card>
      ) : (
        <div className="space-y-8">
          {session.establishments.map((est) => {
            const estAudits = audits.filter((a) => a.establishment_id === est.id);
            if (estAudits.length === 0 && multi) return null;
            return (
              <section key={est.id}>
                {multi && <h2 className="mb-3 font-sans text-lg font-medium">{est.name}</h2>}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {estAudits.map((audit) => (
                    <AuditCard
                      key={audit.id}
                      audit={audit}
                      progress={progressByAudit.get(audit.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AuditCard({ audit, progress }: { audit: AuditRow; progress?: AuditProgress }) {
  return (
    <Link href={`/audits/${audit.id}`} className="group">
      <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-amethyst-bright/40">
        <CardContent className="p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant={audit.status === "en_cours" ? "success" : "secondary"}>
              {audit.status === "en_cours" ? "En cours" : "Clôturé"}
            </Badge>
            {audit.categories.map((cat) => (
              <Badge key={cat} variant="outline">
                {cat}
              </Badge>
            ))}
          </div>
          <h3 className="mb-1.5 line-clamp-2 font-sans text-lg font-medium tracking-tight">
            {audit.name}
          </h3>
          <p className="mb-4 font-mono text-[11px] text-muted-foreground">
            {AUDIT_TYPE_LABEL[audit.audit_type]}
            {audit.certificateur ? ` · ${audit.certificateur}` : ""}
          </p>
          {progress && (
            <div className="mb-4">
              <div className="mb-1 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>
                  {progress.done}/{progress.total} complets
                </span>
                <span>{progress.percent} %</span>
              </div>
              <ProgressBar percent={progress.percent} className="h-1.5" />
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-muted-foreground">
              {audit.audit_date
                ? `Audit prévu : ${formatDate(audit.audit_date)}`
                : "Pas de date fixée"}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-amethyst-bright" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
