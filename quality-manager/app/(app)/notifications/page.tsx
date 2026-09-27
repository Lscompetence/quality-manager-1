import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientLoginLog } from "@/components/notifications/client-login-log";

export const metadata = { title: "Notifications" };

/**
 * Notifications de l'espace admin : uniquement les connexions des clients
 * à leur espace (migration 000013, `kind = client_login`).
 */
export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: logins } = await supabase
    .from("notifications")
    .select("id, title, read_at, created_at")
    .eq("user_id", userData.user.id)
    .eq("kind", "client_login")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="mb-[30px] border-b border-[var(--border-soft)] pb-6">
        <span className="mb-3 inline-flex items-center gap-[7px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em] text-c6">
          <span
            className="h-1.5 w-1.5 rounded-full bg-c6"
            style={{ boxShadow: "0 0 8px var(--c6)" }}
          />
          Centre · Notifications
        </span>
        <h1 className="mb-3 font-sans text-[40px] font-light leading-[1.05] tracking-[-0.025em]">
          Connexions clients
        </h1>
        <p className="max-w-[700px] text-[14.5px] leading-[1.55] text-[var(--text-mute)]">
          Vous êtes prévenu dès qu&apos;un client ouvre une session sur son espace.
        </p>
      </div>

      <ClientLoginLog logins={logins ?? []} />
    </div>
  );
}
