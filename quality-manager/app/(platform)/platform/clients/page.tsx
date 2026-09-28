import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { SUBSCRIPTION_LABEL, type SubscriptionStatus } from "@/lib/auth/permissions";
import { isPaymentOverdue } from "@/lib/platform/stats";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewClientDialog } from "@/components/platform/new-client-dialog";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Clients" };

const FILTERS: { value: SubscriptionStatus | "tous"; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "active", label: "En cours" },
  { value: "suspended", label: "Suspendus" },
  { value: "cancelled", label: "Résiliés" },
];

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  await requirePlatformAdmin();
  const { statut } = await searchParams;
  const filter = FILTERS.some((f) => f.value === statut)
    ? (statut as SubscriptionStatus | "tous")
    : "tous";
  const supabase = await createClient();

  let query = supabase
    .from("organizations")
    .select(
      "id, name, plan, billing_cycle, subscription_status, next_billing_at, last_payment_at, created_at",
    )
    .order("name");
  if (filter !== "tous") query = query.eq("subscription_status", filter);
  const [{ data: clients }, { data: stats }] = await Promise.all([
    query,
    supabase.rpc("platform_client_stats"),
  ]);
  const statsById = new Map((stats ?? []).map((s) => [s.organization_id, s]));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright">
            LS Compétences · Comptes
          </p>
          <h1 className="font-sans text-3xl font-light tracking-tight">Clients</h1>
        </div>
        <NewClientDialog />
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "tous" ? "/platform/clients" : `/platform/clients?statut=${f.value}`}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm",
              filter === f.value
                ? "border-amethyst-bright bg-amethyst-bright/10"
                : "border-border text-muted-foreground hover:bg-secondary/50",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="p-4">Client</th>
                <th className="p-4">Statut</th>
                <th className="p-4">Plan</th>
                <th className="p-4 text-right">Établ.</th>
                <th className="p-4 text-right">Utilisateurs</th>
                <th className="p-4">Prochaine échéance</th>
              </tr>
            </thead>
            <tbody>
              {(clients ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Aucun client.
                  </td>
                </tr>
              )}
              {(clients ?? []).map((c) => {
                const s = statsById.get(c.id);
                const overdue = isPaymentOverdue(c);
                return (
                  <tr
                    key={c.id}
                    className="border-b border-border/60 last:border-0 hover:bg-secondary/30"
                  >
                    <td className="p-4">
                      <Link
                        href={`/platform/clients/${c.id}`}
                        className="font-medium hover:text-amethyst-bright"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          c.subscription_status === "active"
                            ? "success"
                            : c.subscription_status === "suspended"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {SUBSCRIPTION_LABEL[c.subscription_status]}
                      </Badge>
                    </td>
                    <td className="p-4 capitalize">
                      {c.plan} · {c.billing_cycle === "annual" ? "annuel" : "mensuel"}
                    </td>
                    <td className="p-4 text-right font-mono">
                      {Number(s?.establishments_count ?? 0)}
                    </td>
                    <td className="p-4 text-right font-mono">{Number(s?.users_count ?? 0)}</td>
                    <td className={cn("p-4 font-mono text-xs", overdue && "font-semibold text-c3")}>
                      {c.next_billing_at
                        ? new Date(c.next_billing_at).toLocaleDateString("fr-FR")
                        : "—"}
                      {overdue && " · en retard"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
