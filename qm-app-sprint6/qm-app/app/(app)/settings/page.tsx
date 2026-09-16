import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { ProfileSection } from "@/components/settings/profile-section";
import { TeamSection } from "@/components/settings/team-section";
import { PlanSection } from "@/components/settings/plan-section";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  // Profil + org
  const { data: profile } = await supabase
    .from("users")
    .select("id, organization_id, role")
    .eq("id", userData.user.id)
    .single();
  if (!profile) redirect("/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .single();

  // Membres de l'équipe
  const { data: team } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, role, last_seen_at, created_at")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: true });

  // Audits actifs (pour quota)
  const { count: auditsCount } = await supabase
    .from("audits")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id)
    .eq("status", "en_cours");

  const isAdmin = profile.role === "admin";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Breadcrumb
        items={[{ label: "Vue d'ensemble", href: "/dashboard" }, { label: "Paramètres" }]}
      />

      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright mb-2">
          Configuration · Organisme
        </p>
        <h1 className="font-sans text-3xl font-light tracking-tight">Paramètres</h1>
        <p className="mt-2 text-muted-foreground">
          Configuration de votre organisme dans Quality Manager : profil, équipe et abonnement.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profil organisme</TabsTrigger>
          <TabsTrigger value="team">Équipe</TabsTrigger>
          <TabsTrigger value="plan">Abonnement</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileSection organization={org!} canEdit={isAdmin} />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <TeamSection
            members={team ?? []}
            currentUserId={userData.user.id}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          <PlanSection
            plan={org?.plan ?? "essentiel"}
            billingCycle={org?.billing_cycle ?? "annual"}
            billingEmail={org?.billing_email ?? ""}
            vatNumber={org?.vat_number ?? ""}
            auditsActive={auditsCount ?? 0}
            isAdmin={isAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
