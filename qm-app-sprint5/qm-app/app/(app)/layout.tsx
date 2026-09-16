import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Profil + org
  const { data: profile } = await supabase
    .from("users")
    .select("first_name, last_name, role, organization:organizations(id, name)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Dossier en cours (le plus récent en_cours)
  const { data: currentAudit } = await supabase
    .from("audits")
    .select("id, name, status")
    .eq("status", "en_cours")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="relative z-10 flex min-h-screen">
      <Sidebar
        organizationName={profile.organization?.name ?? "Organisation"}
        currentAudit={currentAudit}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar
          user={{
            firstName: profile.first_name,
            lastName: profile.last_name,
            organizationName: profile.organization?.name ?? "",
          }}
        />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
