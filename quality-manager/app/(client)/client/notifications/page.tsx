import { createClient } from "@/lib/supabase/server";
import { NotificationsCenter } from "@/components/notifications/notifications-center";

export const metadata = { title: "Notifications" };

/** Centre de notifications du client : tout ce que son organisme fait sur ses dossiers. */
export default async function ClientNotificationsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, category, title, source_label, source_url, read_at, created_at")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-[30px] border-b border-[var(--border-soft)] pb-6">
        <p className="qm-eyebrow mb-3">Espace client · Notifications</p>
        <h1 className="mb-3 font-sans text-[40px] font-light leading-[1.05] tracking-[-0.025em]">Notifications</h1>
        <p className="max-w-[700px] text-[14.5px] leading-[1.55] text-[var(--text-mute)]">
          Chaque action de votre organisme sur vos dossiers : indicateurs validés, documents ajoutés, nouveaux
          dossiers confiés.
        </p>
      </div>

      <NotificationsCenter notifications={notifications ?? []} />
    </div>
  );
}
