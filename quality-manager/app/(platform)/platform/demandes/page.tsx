import Link from "next/link";
import type { Route } from "next";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";
import {
  REQUEST_CATEGORIES,
  REQUEST_CATEGORY_LABEL,
  parsePlanRequest,
  requestCategory,
  type RequestCategory,
} from "@/lib/requests/categories";
import { Card, CardContent } from "@/components/ui/card";
import {
  REQUEST_CATEGORY_STYLE,
  RequestCategoryBadge,
  RequestStatusBadge,
} from "@/components/requests/request-category-badge";
import { RequestHandler } from "@/components/platform/request-handler";
import { NewClientDialog } from "@/components/platform/new-client-dialog";
import { ApplyPlanButton } from "@/components/platform/apply-plan-button";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Demandes" };

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; type?: string }>;
}) {
  await requirePlatformAdmin();
  const { statut, type } = await searchParams;
  const status = statut === "traite" ? "traite" : "a_traiter";
  const typeFilter = REQUEST_CATEGORIES.includes(type as RequestCategory)
    ? (type as RequestCategory)
    : null;
  const supabase = await createClient();

  const { data } = await supabase
    .from("client_requests")
    .select(
      "id, kind, status, subject, message, response, contact_name, contact_email, organization_name, organization_id, created_at, handled_at, organization:organizations(name, plan, billing_cycle)",
    )
    .eq("status", status)
    .order("created_at", { ascending: status === "a_traiter" });

  const all = (data ?? []).map((r) => ({ ...r, category: requestCategory(r) }));
  const counts = Object.fromEntries(
    REQUEST_CATEGORIES.map((c) => [c, all.filter((r) => r.category === c).length]),
  ) as Record<RequestCategory, number>;
  const requests = typeFilter ? all.filter((r) => r.category === typeFilter) : all;

  const href = (s: string, t: RequestCategory | null) => {
    const params = new URLSearchParams();
    if (s === "traite") params.set("statut", "traite");
    if (t) params.set("type", t);
    const q = params.toString();
    return (q ? `/platform/demandes?${q}` : "/platform/demandes") as Route;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright">
          LS Compétences · Relation client
        </p>
        <h1 className="font-sans text-3xl font-light tracking-tight">Demandes</h1>
      </div>

      <div className="flex gap-2">
        {[
          { v: "a_traiter", l: "À traiter" },
          { v: "traite", l: "Traité" },
        ].map((f) => (
          <Link
            key={f.v}
            href={href(f.v, typeFilter)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm",
              status === f.v
                ? "border-amethyst-bright bg-amethyst-bright/10"
                : "border-border text-muted-foreground hover:bg-secondary/50",
            )}
          >
            {f.l}
          </Link>
        ))}
      </div>

      {/* Répartition par type : chaque couleur correspond à une catégorie */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {REQUEST_CATEGORIES.map((c) => {
          const style = REQUEST_CATEGORY_STYLE[c];
          const Icon = style.icon;
          const active = typeFilter === c;
          return (
            <Link
              key={c}
              href={href(status, active ? null : c)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 transition-colors",
                active
                  ? style.badge
                  : "border-[var(--border-soft)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
              )}
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white"
                style={{ background: style.accent }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-foreground">
                  {REQUEST_CATEGORY_LABEL[c]}
                </span>
                <span className="font-mono text-[10px] text-[var(--text-mute)]">
                  {status === "a_traiter" ? "à traiter" : "traitées"}
                </span>
              </span>
              <span className="font-sans text-xl font-light text-foreground">{counts[c]}</span>
            </Link>
          );
        })}
      </div>

      <div className="space-y-3">
        {requests.length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground">Aucune demande.</Card>
        )}
        {requests.map((r) => {
          const requestedPlan = r.category === "abonnement" ? parsePlanRequest(r.subject) : null;
          return (
            <Card
              key={r.id}
              className="overflow-hidden border-l-4"
              style={{ borderLeftColor: REQUEST_CATEGORY_STYLE[r.category].accent }}
            >
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <RequestCategoryBadge category={r.category} />
                  <RequestStatusBadge status={r.status} />
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <p className="font-medium">{r.subject}</p>
                <div className="text-sm text-muted-foreground">
                  {r.organization_id ? (
                    <Link
                      href={`/platform/clients/${r.organization_id}`}
                      className="text-foreground hover:text-amethyst-bright"
                    >
                      {r.organization?.name}
                    </Link>
                  ) : (
                    <span className="text-foreground">{r.organization_name}</span>
                  )}
                  {" · "}
                  {r.contact_name} <span className="font-mono text-xs">{r.contact_email}</span>
                </div>
                {r.message && <p className="whitespace-pre-line text-sm">{r.message}</p>}
                {r.status === "traite" && r.response && (
                  <p className="whitespace-pre-line rounded-md bg-secondary/50 p-3 text-sm">
                    <b className="font-medium">Réponse : </b>
                    {r.response}
                  </p>
                )}
                {requestedPlan && r.status === "a_traiter" && r.organization_id && (
                  <ApplyPlanButton
                    requestId={r.id}
                    organizationName={r.organization?.name ?? "Ce client"}
                    current={
                      r.organization
                        ? { plan: r.organization.plan, cycle: r.organization.billing_cycle }
                        : null
                    }
                    requested={requestedPlan}
                  />
                )}
                {r.kind === "ouverture_compte" && r.status === "a_traiter" && (
                  <NewClientDialog
                    size="sm"
                    triggerLabel="Créer le compte"
                    prefill={{
                      organization_name: r.organization_name ?? "",
                      admin_email: r.contact_email ?? "",
                      admin_first_name: (r.contact_name ?? "").split(" ")[0] ?? "",
                      admin_last_name: (r.contact_name ?? "").split(" ").slice(1).join(" "),
                      request_id: r.id,
                    }}
                  />
                )}
                <RequestHandler id={r.id} status={r.status} response={r.response} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
