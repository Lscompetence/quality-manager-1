import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NotificationsCenter } from "@/components/notifications/notifications-center";
import { NotificationsPreferences } from "@/components/notifications/notifications-preferences";
import { displayName } from "@/lib/utils/display-name";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  // Notifications (50 dernières). `*` plutôt qu'une liste : `actor_id`
  // n'existe qu'une fois la migration 000012 passée.
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Clients de l'organisme, pour le filtre « Clients »
  const { data: clientRows } = await supabase
    .from("users")
    .select("id, first_name, last_name, email")
    .eq("role", "client");
  const clients = (clientRows ?? []).map((c) => ({
    id: c.id,
    name: displayName(c.first_name, c.last_name, c.email),
  }));

  // Préférences
  const { data: prefsRow } = await supabase
    .from("notification_preferences")
    .select("preferences")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const preferences =
    (prefsRow?.preferences as Record<string, Record<string, boolean>>) ?? DEFAULT_PREFERENCES;

  const unreadCount = (notifications ?? []).filter((n) => !n.read_at).length;

  return (
    <div>
      {/* En-tête .app-header de notifications.html */}
      <div className="mb-[30px] grid gap-8 border-b border-[var(--border-soft)] pb-6 md:grid-cols-[1fr_auto]">
        <div>
          <span className="mb-3 inline-flex items-center gap-[7px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-c6">
            <span
              className="h-1.5 w-1.5 rounded-full bg-c6"
              style={{ boxShadow: "0 0 8px var(--c6)" }}
            />
            Centre · Notifications
          </span>
          <h1 className="mb-3 font-sans text-[40px] font-light leading-[1.05] tracking-[-0.025em]">
            Notifications
          </h1>
          <p className="max-w-[700px] text-[14.5px] leading-[1.55] text-[var(--text-mute)]">
            Toutes les alertes Qualiopi : <b className="font-semibold">échéances</b>,{" "}
            <b className="font-semibold">seuils franchis</b>,{" "}
            <b className="font-semibold">actions en attente</b>,{" "}
            <b className="font-semibold">activité équipe</b>. Configurez vos préférences pour ne
            recevoir que ce qui compte.
          </p>
        </div>
      </div>

      <Tabs defaultValue="center">
        <TabsList>
          <TabsTrigger value="center">
            Centre de notification
            {unreadCount > 0 && (
              <span className="rounded-md bg-[var(--surface-2)] px-[7px] py-px font-mono text-[10px] text-[var(--text-mute)]">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="preferences">Préférences</TabsTrigger>
        </TabsList>

        <TabsContent value="center">
          <NotificationsCenter notifications={notifications ?? []} clients={clients} />
        </TabsContent>

        <TabsContent value="preferences">
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
