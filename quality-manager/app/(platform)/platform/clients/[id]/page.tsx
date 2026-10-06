import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { SUBSCRIPTION_LABEL } from "@/lib/auth/permissions";
import { requestCategory } from "@/lib/requests/categories";
import { MONTHLY_PRICE_HT, annualTotal, formatEuros } from "@/lib/pricing";
import {
  RequestCategoryBadge,
  RequestStatusBadge,
} from "@/components/requests/request-category-badge";
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
      "id, name, email, phone, siret, plan, billing_cycle, billing_email, vat_number, address, subscription_status, status_changed_at, next_billing_at, last_payment_at, created_at",
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
      .eq("addressed_to", "platform")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const s = (stats ?? []).find((x) => x.organization_id === id);
  // Montant d'une échéance, d'après les tarifs du cadrage (lib/pricing.ts)
  const amountDue =
    org.plan === "reseau"
      ? "Sur devis"
      : org.billing_cycle === "annual"
        ? `${formatEuros(annualTotal(org.plan))} € HT par an`
        : `${formatEuros(MONTHLY_PRICE_HT[org.plan])} € HT par mois`;
  const overdue = isPaymentOverdue(org);

  return (
    <div className="w-full space-y-6">
      <Link
        href="/platform/clients"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Clients
      </Link>

      <PageHeader
        eyebrow={
          <>
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
          </>
        }
        title={org.name}
        description={`Client depuis le ${fmt(org.created_at)} · ${Number(s?.establishments_count ?? 0)} établissement(s) · ${Number(s?.users_count ?? 0)} utilisateur(s)`}
        actions={<StatusActions organizationId={org.id} status={org.subscription_status} />}
      />

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
          <CardTitle>Facturation</CardTitle>
          <CardDescription>
            Coordonnées saisies par l’admin du client (Paramètres → Abonnement), pour établir ses
            factures.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <BillingField label="Montant d’une échéance" value={amountDue} strong />
            <BillingField
              label="Email de facturation"
              value={org.billing_email ?? org.email ?? null}
              hint={org.billing_email ? undefined : "non renseigné : email de l’organisme"}
            />
            <BillingField label="N° de TVA intracommunautaire" value={org.vat_number} />
            <BillingField label="SIRET" value={org.siret} />
            <BillingField label="Adresse" value={org.address} />
            <BillingField
              label="Dernier paiement · prochaine échéance"
              value={`${fmt(org.last_payment_at)} · ${fmt(org.next_billing_at)}`}
            />
          </dl>
          <p className="mt-4 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
            Les factures sont établies hors de l’application, puis le paiement est enregistré
            ci-dessus. La facturation automatique (Stripe) est prévue en V2.
          </p>
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
            <div key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
              <RequestStatusBadge status={r.status} />
              <RequestCategoryBadge category={requestCategory(r)} />
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

function BillingField({
  label,
  value,
  hint,
  strong = false,
}: {
  label: string;
  value: string | null;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className={strong ? "text-base font-medium" : undefined}>
        {value || <span className="text-muted-foreground">Non renseigné</span>}
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  );
}
