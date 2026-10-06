import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireOrgAdmin } from "@/lib/auth/session";
import type { MemberRole } from "@/lib/auth/permissions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProfileSection } from "@/components/settings/profile-section";
import { TeamSection } from "@/components/settings/team-section";
import { PlanSection } from "@/components/settings/plan-section";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  // Paramètres : réservés à l'admin du client
  const session = await requireOrgAdmin();
  const supabase = await createClient();
  const orgId = session.organization.id;

  const { data: org } = await supabase.from("organizations").select("*").eq("id", orgId).single();

  const [{ data: team }, { data: memberships }, { count: auditsCount }, { data: planRequests }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, first_name, last_name, email, role, created_at")
        .eq("organization_id", orgId)
        // Les comptes client (accès à un dossier précis) ne sont pas des membres
        .neq("role", "client")
        .order("created_at", { ascending: true }),
      supabase
        .from("establishment_members")
        .select("user_id, establishment:establishments(id, name)"),
      supabase
        .from("audits")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("status", "en_cours"),
      // Demande de changement de plan encore en attente chez LS Compétences
      supabase
        .from("client_requests")
        .select("subject, created_at")
        .eq("organization_id", orgId)
        .eq("status", "a_traiter")
        .like("subject", "Changement d’abonnement%")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
  const pendingPlanRequest = planRequests?.[0]
    ? { subject: planRequests[0].subject, createdAt: planRequests[0].created_at }
    : null;

  const members = (team ?? []).map((m) => ({
    ...m,
    // Les comptes client sont exclus par la requête ci-dessus
    role: m.role as MemberRole,
    establishments: (memberships ?? [])
      .filter((ms) => ms.user_id === m.id && ms.establishment)
      .map((ms) => ms.establishment!),
  }));

  const isAdmin = true;

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow="Configuration · Organisme"
        title="Paramètres"
        description="Configuration de votre organisme dans Quality Manager : profil, équipe et abonnement."
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profil organisme</TabsTrigger>
          <TabsTrigger value="team">Personnes</TabsTrigger>
          <TabsTrigger value="plan">Abonnement</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileSection organization={org!} canEdit={isAdmin} />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <TeamSection members={members} currentUserId={session.userId} />
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          <PlanSection
            plan={org?.plan ?? "essentiel"}
            billingCycle={org?.billing_cycle ?? "annual"}
            subscriptionStatus={org?.subscription_status ?? "active"}
            nextBillingAt={org?.next_billing_at ?? null}
            lastPaymentAt={org?.last_payment_at ?? null}
            billingEmail={org?.billing_email ?? ""}
            vatNumber={org?.vat_number ?? ""}
            auditsActive={auditsCount ?? 0}
            establishmentsCount={session.establishments.length}
            membersCount={members.length}
            pendingRequest={pendingPlanRequest}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
