import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { PlatformNav } from "@/components/platform/platform-nav";

export const metadata = {
  title: { default: "Espace LS Compétences", template: "%s · LS Compétences" },
};

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformAdmin();
  const supabase = await createClient();
  const { count } = await supabase
    .from("client_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "a_traiter");

  return (
    <div className="relative z-10 flex min-h-screen">
      <PlatformNav email={session.email} toHandle={count ?? 0} />
      <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
