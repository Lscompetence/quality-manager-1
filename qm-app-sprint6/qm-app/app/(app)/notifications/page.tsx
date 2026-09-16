import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { NotificationsCenter } from "@/components/notifications/notifications-center";
import { NotificationsPreferences } from "@/components/notifications/notifications-preferences";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  // Notifications (50 dernières)
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, category, title, source_label, source_url, read_at, created_at")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Préférences
  const { data: prefsRow } = await supabase
    .from("notification_preferences")
    .select("preferences")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const preferences =
    (prefsRow?.preferences as Record<string, Record<string, boolean>>) ??
    DEFAULT_PREFERENCES;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Breadcrumb
        items={[{ label: "Vue d'ensemble", href: "/dashboard" }, { label: "Notifications" }]}
      />

      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright mb-2">
          Centre · Notifications
        </p>
        <h1 className="font-sans text-3xl font-light tracking-tight">Notifications</h1>
        <p className="mt-2 text-muted-foreground">
          Centre de notifications et préférences (in-app et email).
        </p>
      </div>

      <Tabs defaultValue="center">
        <TabsList>
          <TabsTrigger value="center">Notifications</TabsTrigger>
          <TabsTrigger value="preferences">Préférences</TabsTrigger>
        </TabsList>

        <TabsContent value="center" className="mt-4">
          <NotificationsCenter notifications={notifications ?? []} />
        </TabsContent>

        <TabsContent value="preferences" className="mt-4">
          <NotificationsPreferences initialPreferences={preferences} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const DEFAULT_PREFERENCES: Record<string, Record<string, boolean>> = {
  echeance_30j: { inapp: true, email: true },
  echeance_7j: { inapp: true, email: true },
  alerte_orange: { inapp: true, email: true },
  alerte_rouge: { inapp: true, email: true },
  weekly_digest: { email: true },
};
