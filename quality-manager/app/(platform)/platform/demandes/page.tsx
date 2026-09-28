import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { REQUEST_KIND_LABEL } from "@/lib/auth/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RequestHandler } from "@/components/platform/request-handler";
import { NewClientDialog } from "@/components/platform/new-client-dialog";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Demandes" };

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  await requirePlatformAdmin();
  const { statut } = await searchParams;
  const status = statut === "traite" ? "traite" : "a_traiter";
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("client_requests")
    .select(
      "id, kind, status, subject, message, response, contact_name, contact_email, organization_name, organization_id, created_at, handled_at, organization:organizations(name)",
    )
    .eq("status", status)
    .order("created_at", { ascending: status === "a_traiter" });

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
            href={f.v === "a_traiter" ? "/platform/demandes" : "/platform/demandes?statut=traite"}
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

      <div className="space-y-3">
        {(requests ?? []).length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground">Aucune demande.</Card>
        )}
        {(requests ?? []).map((r) => (
          <Card key={r.id}>
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{REQUEST_KIND_LABEL[r.kind]}</Badge>
                <span className="font-medium">{r.subject}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
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
        ))}
      </div>
    </div>
  );
}
