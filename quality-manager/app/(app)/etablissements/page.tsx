import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOrgAdmin } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateEstablishmentDialog } from "@/components/establishments/create-establishment-dialog";

export const metadata = { title: "Établissements" };

export default async function EstablishmentsPage() {
  const session = await requireOrgAdmin();
  const supabase = await createClient();

  const [{ data: members }, { data: audits }] = await Promise.all([
    supabase.from("establishment_members").select("establishment_id, user:users(role)"),
    supabase.from("audits").select("establishment_id, status"),
  ]);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright">
            Organisation · {session.organization.name}
          </p>
          <h1 className="font-sans text-3xl font-light tracking-tight">Établissements</h1>
          <p className="mt-2 text-muted-foreground">
            Créez vos établissements et ouvrez l’accès à leurs responsables pédagogiques.
          </p>
        </div>
        <CreateEstablishmentDialog />
      </div>

      <div className="space-y-3">
        {session.establishments.length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            Aucun établissement.
          </Card>
        )}
        {session.establishments.map((est) => {
          const estMembers = (members ?? []).filter((m) => m.establishment_id === est.id);
          const editors = estMembers.filter((m) => m.user?.role === "editor").length;
          const readers = estMembers.filter((m) => m.user?.role === "reader").length;
          const open = (audits ?? []).filter(
            (a) => a.establishment_id === est.id && a.status === "en_cours",
          ).length;
          return (
            <Link key={est.id} href={`/etablissements/${est.id}`} className="group block">
              <Card className="transition-colors hover:border-amethyst-bright/40">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{est.name}</div>
                    {est.city && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {est.city}
                      </div>
                    )}
                  </div>
                  <Badge variant={editors > 0 ? "outline" : "warning"}>
                    {editors > 0
                      ? `${editors} responsable${editors > 1 ? "s" : ""}`
                      : "Sans responsable"}
                  </Badge>
                  {readers > 0 && (
                    <Badge variant="secondary">
                      {readers} lecteur{readers > 1 ? "s" : ""}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {open} dossier{open > 1 ? "s" : ""} en cours
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amethyst-bright" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
