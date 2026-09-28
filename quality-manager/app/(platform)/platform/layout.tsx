import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { PlatformNav } from "@/components/platform/platform-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";

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
      <div className="flex min-w-0 flex-1 flex-col px-6 pt-7">
        {/* Barre du haut : mode jour / nuit, comme dans les autres espaces */}
        <header className="relative z-30 mb-7 flex h-[38px] items-center justify-end gap-2.5">
          <ThemeToggle />
        </header>
        <main className="flex-1 pb-20">{children}</main>
      </div>
    </div>
  );
}
