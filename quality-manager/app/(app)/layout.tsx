import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth/session";
import { NotificationListener } from "@/components/notifications/notification-listener";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AutoBreadcrumb, type AuditRef } from "@/components/layout/auto-breadcrumb";
import { buildMemberSearch } from "@/lib/search/items";
import { WelcomeToast } from "@/components/layout/welcome-toast";
import { Suspense } from "react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Client → /client ; sans rattachement → /acces/en-attente ; compte gelé → /acces/suspendu
  const session = await requireMember();
  const supabase = await createClient();

  // Requêtes indépendantes, lancées ensemble
  const [{ data: allAudits }, { count: unreadCount }] = await Promise.all([
    // Dossiers visibles (la RLS filtre par établissement) — fil d'Ariane et menu
    supabase
      .from("audits")
      .select("id, name, audit_type, categories, establishment_id")
      .order("updated_at", {
        ascending: false,
      }),
    // Notifications non lues — seul le compteur est affiché
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.userId)
      .is("read_at", null),
  ]);

  const audits = (allAudits ?? []) as (AuditRef & { establishment_id: string })[];
  const searchGroups = buildMemberSearch({
    role: session.profile.role,
    establishments: session.establishments,
    audits,
  });

  return (
    <div className="relative z-10 flex min-h-screen">
      <NotificationListener userId={session.userId} />
      <Suspense>
        <WelcomeToast
          name={session.profile.firstName}
          spaceLabel={
            session.profile.role === "admin"
              ? `l’espace admin de ${session.organization.name}`
              : session.profile.role === "editor"
                ? "votre espace responsable pédagogique"
                : "votre espace lecteur"
          }
        />
      </Suspense>
      <Sidebar
        organizationName={session.organization.name}
        organization={{ name: session.organization.name, siret: session.organization.siret }}
        role={session.profile.role}
        audits={audits}
      />
      <div className="flex min-w-0 flex-1 flex-col px-6 pt-7">
        <Topbar
          user={{
            firstName: session.profile.firstName,
            lastName: session.profile.lastName,
            organizationName: session.organization.name,
            role: session.profile.role,
          }}
          unreadCount={unreadCount ?? 0}
          searchGroups={searchGroups}
          breadcrumb={<AutoBreadcrumb audits={audits} establishments={session.establishments} />}
        />
        {/* Même colonne centrée pour toutes les pages de l'espace */}
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col pb-20">{children}</main>
      </div>
    </div>
  );
}
