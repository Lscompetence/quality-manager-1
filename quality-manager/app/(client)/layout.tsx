import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationListener } from "@/components/notifications/notification-listener";
import { ClientSidebar, type ClientDossier } from "@/components/layout/client-sidebar";
import { ClientTopbar } from "@/components/layout/client-topbar";
import { displayName } from "@/lib/utils/display-name";

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

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return (
    <div className="relative z-10 flex min-h-screen">
      <NotificationListener userId={user.id} />
      <ClientSidebar dossiers={dossiers} clientName={name} email={profile.email} unreadCount={unreadCount ?? 0} />
      <div className="flex min-w-0 flex-1 flex-col px-6 pt-7">
        <ClientTopbar name={name} />
        <main className="flex flex-1 flex-col pb-20">{children}</main>
      </div>
    </div>
  );
}
