import { PageHeader } from "@/components/layout/page-header";
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
import { TeamRequestHandler } from "@/components/requests/team-request-handler";

export const metadata = { title: "Messages" };

type RequestRow = {
  id: string;
  kind: "ouverture_compte" | "reclamation" | "suggestion" | "support" | "autre";
  status: "a_traiter" | "traite";
  addressed_to: "platform" | "admin";
  subject: string;
  message: string | null;
  response: string | null;
  contact_name: string | null;
  created_at: string;
};

/**
 * Messages — chaque niveau parle au niveau juste au-dessus :
 * - editor / reader : écrivent à leur admin et lisent ses réponses ;
 * - admin : traite les messages de son équipe, et écrit à LS Compétences.
 */
export default async function RequestsPage() {
  const session = await requireMember();
  const isAdmin = session.profile.role === "admin";
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_requests")
    .select("id, kind, status, addressed_to, subject, message, response, contact_name, created_at")
    .order("created_at", { ascending: false });
  const requests = (data ?? []) as RequestRow[];

  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <PageHeader
          eyebrow="Messages · Admin de l’organisme"
          title="Contacter mon admin"
          description="Une question, un blocage, une réclamation ou une idée : écrivez à l’admin de votre organisme. Il vous répond ici, ou transmet à LS Compétences si nécessaire."
        />
        <Card>
          <CardHeader>
            <CardTitle>Nouveau message</CardTitle>
          </CardHeader>
          <CardContent>
            <NewRequestForm recipient="votre admin" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Vos messages</CardTitle>
            <CardDescription>Suivi du traitement par votre admin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <RequestList requests={requests} responseLabel="Réponse de votre admin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const team = requests.filter((r) => r.addressed_to === "admin");
  const toLs = requests.filter((r) => r.addressed_to === "platform");
  const teamToHandle = team.filter((r) => r.status === "a_traiter").length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Messages · Équipe et LS Compétences"
        title="Messages"
        description="Les responsables pédagogiques et lecteurs de votre organisme vous écrivent ici. Répondez-leur, ou transmettez à LS Compétences ce que vous ne pouvez pas régler."
      />

      <Card>
        <CardHeader>
          <CardTitle>
            Messages de votre équipe
            {teamToHandle > 0 && (
              <span className="ml-2 rounded-full bg-[rgba(232,93,93,0.12)] px-2 py-0.5 align-middle font-mono text-[11px] font-semibold text-[#E85D5D]">
                {teamToHandle} à traiter
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Visibles par vous seul — LS Compétences n’y a pas accès.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RequestList
            requests={team}
            responseLabel="Votre réponse"
            showAuthor
            empty="Aucun message de votre équipe."
            renderActions={(r) => (
              <TeamRequestHandler id={r.id} status={r.status} response={r.response} />
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Écrire à LS Compétences</CardTitle>
          <CardDescription>
            Une question sur l’application, un dysfonctionnement, une idée d’amélioration. LS
            Compétences n’a pas accès à vos dossiers — décrivez ce que vous voyez, sans joindre de
            document confidentiel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewRequestForm recipient="LS Compétences" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vos demandes à LS Compétences</CardTitle>
          <CardDescription>Suivi du traitement par LS Compétences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RequestList requests={toLs} responseLabel="Réponse de LS Compétences" />
        </CardContent>
      </Card>
    </div>
  );
}

function RequestList({
  requests,
  responseLabel,
  showAuthor = false,
  empty = "Aucun message.",
  renderActions,
}: {
  requests: RequestRow[];
  responseLabel: string;
  showAuthor?: boolean;
  empty?: string;
  renderActions?: (r: RequestRow) => React.ReactNode;
}) {
  if (requests.length === 0)
    return <p className="py-4 text-center text-sm text-muted-foreground">{empty}</p>;

  return requests.map((r) => (
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
          {showAuthor && r.contact_name ? ` · ${r.contact_name}` : ""}
        </span>
      </div>
      {r.message && (
        <p className="whitespace-pre-line text-sm text-muted-foreground">{r.message}</p>
      )}
      {r.response && (r.status === "traite" || !renderActions) && (
        <p className="whitespace-pre-line rounded-md bg-secondary/50 p-3 text-sm">
          <b className="font-medium">{responseLabel} : </b>
          {r.response}
        </p>
      )}
      {renderActions?.(r)}
    </div>
  ));
}
