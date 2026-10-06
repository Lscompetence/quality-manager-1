import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { REQUEST_KIND_LABEL, type RequestKind } from "@/lib/auth/permissions";
import { computeQualityStats } from "@/lib/platform/stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiTile } from "@/components/platform/kpi-tile";

export const metadata = { title: "Qualité et amélioration continue" };

const PERIOD_DAYS = 365;

export default async function QualityPage() {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const since = new Date(Date.now() - PERIOD_DAYS * 24 * 3600 * 1000).toISOString();

  const { data: requests } = await supabase
    .from("client_requests")
    .select(
      "id, kind, status, subject, message, created_at, handled_at, organization:organizations(name)",
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const stats = computeQualityStats(requests ?? []);
  const improvementInputs = (requests ?? []).filter(
    (r) => (r.kind === "reclamation" || r.kind === "suggestion") && r.status === "a_traiter",
  );

  return (
    <div className="w-full space-y-6">
      <div>
        <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright">
          LS Compétences · Qualité du service
        </p>
        <h1 className="font-sans text-3xl font-light tracking-tight">
          Qualité et amélioration continue
        </h1>
        <p className="mt-2 text-muted-foreground">
          Sur les {PERIOD_DAYS} derniers jours : les réclamations et suggestions des clients, et la
          réactivité de leur traitement.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Demandes reçues" value={stats.total} />
        <KpiTile
          label="Taux de traitement"
          value={`${stats.handledRate} %`}
          tone={stats.handledRate >= 80 || stats.total === 0 ? "ok" : "warn"}
        />
        <KpiTile
          label="Délai moyen"
          value={stats.avgHandlingDays === null ? "—" : `${stats.avgHandlingDays} j`}
          hint="Entre réception et traitement"
        />
        <KpiTile
          label="Réclamations"
          value={stats.byKind.reclamation.total}
          tone={stats.byKind.reclamation.toHandle > 0 ? "warn" : "neutral"}
          hint={`${stats.byKind.reclamation.toHandle} en attente`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Par type</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              {(Object.keys(stats.byKind) as RequestKind[]).map((k) => (
                <tr key={k} className="border-b border-border/60 last:border-0">
                  <td className="py-2">{REQUEST_KIND_LABEL[k]}</td>
                  <td className="py-2 text-right font-mono">{stats.byKind[k].total}</td>
                  <td className="py-2 text-right font-mono text-muted-foreground">
                    {stats.byKind[k].toHandle} en attente
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entrées d’amélioration en attente</CardTitle>
          <CardDescription>Réclamations et suggestions non encore traitées.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {improvementInputs.length === 0 && (
            <p className="text-sm text-muted-foreground">Rien en attente.</p>
          )}
          {improvementInputs.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant={r.kind === "reclamation" ? "warning" : "outline"}>
                  {REQUEST_KIND_LABEL[r.kind]}
                </Badge>
                <span className="font-medium">{r.subject}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  {r.organization?.name ?? "—"} ·{" "}
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
              {r.message && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.message}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Module à enrichir : enquête de satisfaction des clients, plan d’amélioration du produit et
        suivi des évolutions du référentiel (Cadrage v3.1, § 3.2 — contenu à préciser).
      </p>
    </div>
  );
}
