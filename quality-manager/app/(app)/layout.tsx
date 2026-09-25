import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationListener } from "@/components/notifications/notification-listener";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getIndicatorsByCritere, type Category, type CritereNum } from "@/lib/constants/rnq";
import { AutoBreadcrumb, type AuditRef } from "@/components/layout/auto-breadcrumb";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Profil + org
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("first_name, last_name, role, organization:organizations(id, name, siret)")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Profile fetch error:", profileError);
  }

  if (!profile) {
    console.error("Profile not found for user:", user.id);
    return (
      <div className="flex h-screen w-full items-center justify-center p-4 text-center bg-background">
        <div className="max-w-md space-y-4 rounded-xl border border-border bg-card p-6 shadow-xl">
          <h1 className="text-xl font-bold text-destructive">Erreur d&apos;accès (RLS)</h1>
          <p className="text-sm text-muted-foreground">
            Votre profil utilisateur n&apos;a pas pu être chargé (accès refusé par la base de données). 
            Vérifiez que les politiques RLS ont bien été appliquées et que la fonction get_current_org_id() n&apos;est pas bloquée.
          </p>
          <div className="pt-4 text-left bg-black/10 p-2 rounded text-xs text-red-500 overflow-auto">
            {profileError?.message || "Aucune ligne retournée (0 rows)"}
          </div>
          <form action={async () => {
            "use server";
            const s = await createClient();
            await s.auth.signOut();
            redirect("/login");
          }}>
            <button type="submit" className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md w-full">
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Un compte client n'a rien à faire dans l'espace staff : son propre espace
  // ne montre que les dossiers qui lui ont été confiés (voir (client)/layout.tsx).
  if (profile.role === "client") {
    redirect("/client");
  }

  // Les trois requêtes suivantes sont indépendantes : elles partent ensemble
  // plutôt qu'à la queue leu leu, ce qui économise deux allers-retours à chaque navigation.
  const [
    { data: allAudits },
    { data: currentAudit },
    { data: allIndicators },
    { count: unreadCount },
  ] = await Promise.all([
    // Tous les dossiers — sert au fil d'Ariane de la barre du haut
    supabase.from("audits").select("id, name, audit_type, categories").order("updated_at", {
      ascending: false,
    }),
    // Dossier en cours (le plus récent en_cours)
    supabase
      .from("audits")
      .select("id, name, status, categories")
      .eq("status", "en_cours")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Scores du menu latéral : seuls les indicateurs complets comptent,
    // le filtre est donc fait par la base plutôt qu'après coup.
    supabase.from("audit_indicators").select("audit_id, critere_num").eq("status", "complet"),
    // Notifications non lues — seul le compteur est affiché, on ne charge pas les lignes
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
  ]);

  // Couverture par critère, pour chaque dossier — affichée dans le menu latéral.
  // Calculée pour tous les dossiers car le menu suit celui qui est ouvert dans l'URL.
  const doneByAudit = new Map<string, Partial<Record<CritereNum, number>>>();
  for (const ind of allIndicators ?? []) {
    const perCritere = doneByAudit.get(ind.audit_id) ?? {};
    const c = ind.critere_num as CritereNum;
    perCritere[c] = (perCritere[c] ?? 0) + 1;
    doneByAudit.set(ind.audit_id, perCritere);
  }

  const critereScoresByAudit: Record<string, Partial<Record<CritereNum, number>>> =
    Object.fromEntries(
      (allAudits ?? []).map((audit) => {
        const categories = (audit.categories ?? []) as Category[];
        const done = doneByAudit.get(audit.id) ?? {};
        const scores = Object.fromEntries(
          ([1, 2, 3, 4, 5, 6, 7] as CritereNum[]).map((c) => {
            const total = getIndicatorsByCritere(c, categories).length;
            return [c, total > 0 ? Math.round(((done[c] ?? 0) / total) * 100) : 0];
          }),
        );
        return [audit.id, scores];
      }),
    );

  return (
    <div className="relative z-10 flex min-h-screen">
      <NotificationListener userId={user.id} />
      <Sidebar
        organizationName={profile.organization?.name ?? "Organisation"}
        organization={{
          name: profile.organization?.name ?? "Organisation",
          siret: profile.organization?.siret ?? null,
        }}
        currentAudit={currentAudit}
        audits={(allAudits ?? []) as AuditRef[]}
        critereScoresByAudit={critereScoresByAudit}
      />
      <div className="flex min-w-0 flex-1 flex-col px-6 pt-7">
        <Topbar
          user={{
            firstName: profile.first_name,
            lastName: profile.last_name,
            organizationName: profile.organization?.name ?? "",
          }}
          unreadCount={unreadCount ?? 0}
          breadcrumb={<AutoBreadcrumb audits={(allAudits ?? []) as AuditRef[]} />}
        />
        <main className="flex flex-1 flex-col pb-20">{children}</main>
      </div>
    </div>
  );
}
