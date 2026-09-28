import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { REQUEST_KIND_LABEL, SUBSCRIPTION_LABEL } from "@/lib/auth/permissions";
import { isPaymentOverdue } from "@/lib/platform/stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DeleteClientDialog,
  PaymentForm,
  PlanForm,
  ResendInviteButton,
  StatusActions,
} from "@/components/platform/client-actions";

export const metadata = { title: "Client" };

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "—");

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePlatformAdmin();
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select(
      "id, name, email, phone, siret, plan, billing_cycle, subscription_status, status_changed_at, next_billing_at, last_payment_at, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!org) notFound();

  const [{ data: admins }, { data: stats }, { data: requests }] = await Promise.all([
    supabase
      .from("users")
      .select("first_name, last_name, email")
      .eq("organization_id", id)
      .eq("role", "admin"),
    supabase.rpc("platform_client_stats"),
    supabase
      .from("client_requests")
      .select("id, kind, status, subject, created_at")
      .eq("organization_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const s = (stats ?? []).find((x) => x.organization_id === id);
  const overdue = isPaymentOverdue(org);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/platform/clients"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Clients
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge
              variant={
                org.subscription_status === "active"
                  ? "success"
                  : org.subscription_status === "suspended"
                    ? "warning"
                    : "secondary"
              }
            >
              {SUBSCRIPTION_LABEL[org.subscription_status]}
            </Badge>
            {overdue && <Badge variant="warning">Échéance dépassée</Badge>}
          </div>
          <h1 className="font-sans text-3xl font-light tracking-tight">{org.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Client depuis le {fmt(org.created_at)} · {Number(s?.establishments_count ?? 0)}{" "}
            établissement(s) · {Number(s?.users_count ?? 0)} utilisateur(s)
          </p>
        </div>
        <StatusActions organizationId={org.id} status={org.subscription_status} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Admin du compte</CardTitle>
            <CardDescription>
              Le contact client. Il ouvre lui-même les accès de ses équipes.
            </CardDescription>
          </div>
          <ResendInviteButton organizationId={org.id} />
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {(admins ?? []).map((a) => (
            <div key={a.email}>
              <b className="font-medium">
                {a.first_name} {a.last_name}
              </b>{" "}
              <span className="font-mono text-xs text-muted-foreground">{a.email}</span>
            </div>
          ))}
          {org.phone && <div className="text-muted-foreground">{org.phone}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Abonnement et paiements</CardTitle>
          <CardDescription>
            Dernier paiement : {fmt(org.last_payment_at)} · Prochaine échéance :{" "}
            {fmt(org.next_billing_at)} · Statut modifié le {fmt(org.status_changed_at)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PlanForm organizationId={org.id} plan={org.plan} billingCycle={org.billing_cycle} />
          <PaymentForm organizationId={org.id} nextBillingAt={org.next_billing_at} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demandes du client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(requests ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune demande.</p>
          )}
          {(requests ?? []).map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-sm">
              <Badge variant={r.status === "traite" ? "success" : "warning"}>
                {r.status === "traite" ? "Traité" : "À traiter"}
              </Badge>
              <Badge variant="outline">{REQUEST_KIND_LABEL[r.kind]}</Badge>
              <span className="truncate">{r.subject}</span>
              <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                {fmt(r.created_at)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Zone sensible</CardTitle>
            <CardDescription>
              Suppression définitive du compte et de toutes ses données.
            </CardDescription>
          </div>
          <DeleteClientDialog organizationId={org.id} name={org.name} />
        </CardHeader>
      </Card>
    </div>
  );
}
