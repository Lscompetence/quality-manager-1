import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { REQUEST_KIND_LABEL } from "@/lib/auth/permissions";
import { isPaymentOverdue } from "@/lib/platform/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiTile } from "@/components/platform/kpi-tile";
import { NewClientDialog } from "@/components/platform/new-client-dialog";

export const metadata = { title: "Pilotage" };

export default async function PlatformHome() {
  await requirePlatformAdmin();
  const supabase = await createClient();

  const [{ data: kpis }, { data: pending }, { data: clients }] = await Promise.all([
    supabase.rpc("platform_kpis"),
    supabase
      .from("client_requests")
      .select(
        "id, kind, subject, organization_name, contact_name, created_at, organization:organizations(name)",
      )
      .eq("status", "a_traiter")
      .order("created_at", { ascending: true })
      .limit(6),
    supabase.from("organizations").select("id, name, subscription_status, next_billing_at"),
  ]);
  const k = kpis?.[0];
  const overdue = (clients ?? []).filter((c) => isPaymentOverdue(c));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright">
            LS Compétences · Pilotage
          </p>
          <h1 className="font-sans text-4xl font-light tracking-tight">Activité Quality Manager</h1>
        </div>
        <NewClientDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiTile
          label="À traiter"
          value={Number(k?.requests_to_handle ?? 0)}
          tone={Number(k?.requests_to_handle ?? 0) > 0 ? "warn" : "neutral"}
          href="/platform/demandes"
          hint="Demandes en attente"
        />
        <KpiTile
          label="Traité"
          value={Number(k?.requests_handled ?? 0)}
          href="/platform/demandes?statut=traite"
          hint="Demandes clôturées"
        />
        <KpiTile
          label="Abonnements en cours"
          value={Number(k?.clients_active ?? 0)}
          tone="ok"
          href="/platform/clients?statut=active"
        />
        <KpiTile
          label="Suspendus"
          value={Number(k?.clients_suspended ?? 0)}
          tone={Number(k?.clients_suspended ?? 0) > 0 ? "danger" : "neutral"}
          href="/platform/clients?statut=suspended"
        />
        <KpiTile
          label="Résiliés"
          value={Number(k?.clients_cancelled ?? 0)}
          href="/platform/clients?statut=cancelled"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Demandes à traiter</CardTitle>
            <Link
              href="/platform/demandes"
              className="text-sm text-amethyst-bright hover:underline"
            >
              Tout voir
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {(pending ?? []).length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">Rien en attente.</p>
            )}
            {(pending ?? []).map((r) => (
              <Link
                key={r.id}
                href="/platform/demandes"
                className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-secondary/40"
              >
                <Badge variant="outline">{REQUEST_KIND_LABEL[r.kind]}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.subject}</div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {r.organization?.name ?? r.organization_name ?? "—"} · {r.contact_name ?? ""} ·{" "}
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Échéances de paiement dépassées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdue.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">Aucun retard.</p>
            )}
            {overdue.map((c) => (
              <Link
                key={c.id}
                href={`/platform/clients/${c.id}`}
                className="flex items-center gap-3 rounded-lg border border-c3/30 p-3 hover:bg-secondary/40"
              >
                <div className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</div>
                <span className="font-mono text-[11px] text-c3">
                  échéance {new Date(c.next_billing_at!).toLocaleDateString("fr-FR")}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
