import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { PlatformNav } from "@/components/platform/platform-nav";
import { PlatformRequestListener } from "@/components/platform/request-listener";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SearchButton } from "@/components/layout/command-menu";
import { WelcomeToast } from "@/components/layout/welcome-toast";
import { buildPlatformSearch } from "@/lib/search/items";

export const metadata = {
  title: { default: "Espace LS Compétences", template: "%s · LS Compétences" },
};

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePlatformAdmin();
  const supabase = await createClient();
  const [{ count }, { data: clients }, { data: pending }] = await Promise.all([
    supabase
      .from("client_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "a_traiter"),
    supabase.from("organizations").select("id, name, plan, subscription_status").order("name"),
    supabase
      .from("client_requests")
      .select("id, subject, contact_name, organization_name")
      .eq("status", "a_traiter")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const searchGroups = buildPlatformSearch({
    clients: clients ?? [],
    pendingRequests: (pending ?? []).map((r) => ({
      id: r.id,
      subject: r.subject,
      who: r.contact_name ?? r.organization_name ?? "",
    })),
  });

  return (
    <div className="relative z-10 flex min-h-screen">
      <PlatformRequestListener />
      <Suspense>
        <WelcomeToast spaceLabel="l’espace LS Compétences" />
      </Suspense>
      <PlatformNav email={session.email} toHandle={count ?? 0} />
      <div className="flex min-w-0 flex-1 flex-col px-6 pt-7">
        {/* Barre du haut : recherche et mode jour / nuit, comme dans les autres espaces */}
        <header className="relative z-30 mb-7 flex h-[38px] items-center justify-end gap-2.5">
          <SearchButton
            groups={searchGroups}
            placeholder="Rechercher un client, une demande, une page…"
          />
          <ThemeToggle />
        </header>
        <main className="flex-1 pb-20">{children}</main>
      </div>
    </div>
  );
}
