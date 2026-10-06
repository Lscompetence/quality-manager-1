import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationListener } from "@/components/notifications/notification-listener";
import { ClientSidebar, type ClientDossier } from "@/components/layout/client-sidebar";
import { ClientTopbar } from "@/components/layout/client-topbar";
import { displayName } from "@/lib/utils/display-name";
import { getIndicatorsByCritere, type Category, type CritereNum } from "@/lib/constants/rnq";

export default async function ClientAreaLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/client/login");

  const { data: profile } = await supabase
    .from("users")
    .select("first_name, last_name, email, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/client/login");

  // Cet espace est réservé aux comptes client : le staff reste dans le sien.
  if (profile.role !== "client") redirect("/dashboard");

  const { data: accesses } = await supabase
    .from("audit_access")
    .select("id, organization_name, audit:audits(id, name, audit_type, categories)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const dossiers: ClientDossier[] = (accesses ?? [])
    .filter((a) => a.audit)
    .map((a) => ({
      accessId: a.id,
      auditId: a.audit!.id,
      name: a.audit!.name,
      auditType: a.audit!.audit_type,
      category: a.audit!.categories?.[0] ?? null,
      organizationName: a.organization_name,
    }));

  const name = displayName(profile.first_name, profile.last_name, profile.email);

  const auditIds = dossiers.map((d) => d.auditId);
  const [{ count: unreadCount }, { data: completed }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
    // Indicateurs validés des dossiers confiés — pour l'avancement par critère du menu
    auditIds.length
      ? supabase
          .from("audit_indicators")
          .select("audit_id, critere_num")
          .in("audit_id", auditIds)
          .eq("status", "complet")
      : Promise.resolve({ data: [] as { audit_id: string; critere_num: number }[] }),
  ]);

  // Avancement (0-100) de chaque critère, pour chaque dossier confié.
  const doneByAudit = new Map<string, Partial<Record<CritereNum, number>>>();
  for (const ind of completed ?? []) {
    const per = doneByAudit.get(ind.audit_id) ?? {};
    const c = ind.critere_num as CritereNum;
    per[c] = (per[c] ?? 0) + 1;
    doneByAudit.set(ind.audit_id, per);
  }
  const critereScoresByAudit: Record<
    string,
    Partial<Record<CritereNum, number>>
  > = Object.fromEntries(
    (accesses ?? [])
      .filter((a) => a.audit)
      .map((a) => {
        const categories = (a.audit!.categories ?? []) as Category[];
        const done = doneByAudit.get(a.audit!.id) ?? {};
        return [
          a.audit!.id,
          Object.fromEntries(
            ([1, 2, 3, 4, 5, 6, 7] as CritereNum[]).map((c) => {
              const total = getIndicatorsByCritere(c, categories).length;
              return [c, total > 0 ? Math.round(((done[c] ?? 0) / total) * 100) : 0];
            }),
          ),
        ];
      }),
  );

  return (
    <div className="relative z-10 flex min-h-screen">
      <NotificationListener userId={user.id} />
      <Suspense>
        <ClientSidebar
          dossiers={dossiers}
          clientName={name}
          email={profile.email}
          unreadCount={unreadCount ?? 0}
          critereScoresByAudit={critereScoresByAudit}
        />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col px-6 pt-7">
        <ClientTopbar name={name} />
        {/* Même colonne centrée pour toutes les pages de l'espace */}
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col pb-20">{children}</main>
      </div>
    </div>
  );
}
