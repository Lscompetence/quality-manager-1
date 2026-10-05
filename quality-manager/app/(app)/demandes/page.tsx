import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth/session";
import { requestCategory } from "@/lib/requests/categories";
import {
  REQUEST_CATEGORY_STYLE,
  RequestCategoryBadge,
  RequestStatusBadge,
} from "@/components/requests/request-category-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewRequestForm } from "@/components/requests/new-request-form";

export const metadata = { title: "Contacter LS Compétences" };

export default async function RequestsPage() {
  const session = await requireMember();
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("client_requests")
    .select("id, kind, status, subject, message, response, contact_name, created_at, handled_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright">
          Service · LS Compétences
        </p>
        <h1 className="font-sans text-3xl font-light tracking-tight">Contacter LS Compétences</h1>
        <p className="mt-2 text-muted-foreground">
          Une question sur l’application, un dysfonctionnement, une idée d’amélioration :
          écrivez-nous. LS Compétences n’a pas accès à vos dossiers — décrivez ce que vous voyez,
          sans joindre de document confidentiel.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouveau message</CardTitle>
        </CardHeader>
        <CardContent>
          <NewRequestForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {session.profile.role === "admin" ? "Messages de l’organisme" : "Vos messages"}
          </CardTitle>
          <CardDescription>Suivi du traitement par LS Compétences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(requests ?? []).length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucun message.</p>
          )}
          {(requests ?? []).map((r) => (
            <div
              key={r.id}
              className="space-y-2 rounded-lg border border-l-4 border-border p-4"
              style={{ borderLeftColor: REQUEST_CATEGORY_STYLE[requestCategory(r)].accent }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <RequestStatusBadge status={r.status} />
                <RequestCategoryBadge category={requestCategory(r)} />
                <span className="text-sm font-medium">{r.subject}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  {session.profile.role === "admin" && r.contact_name ? ` · ${r.contact_name}` : ""}
                </span>
              </div>
              {r.message && (
                <p className="whitespace-pre-line text-sm text-muted-foreground">{r.message}</p>
              )}
              {r.response && (
                <p className="whitespace-pre-line rounded-md bg-secondary/50 p-3 text-sm">
                  <b className="font-medium">Réponse de LS Compétences : </b>
                  {r.response}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
