import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="relative z-10 min-h-screen">
      {/* Sidebar + topbar seront ajoutés au Sprint 2 */}
      <main className="container mx-auto p-8">{children}</main>
    </div>
  );
}
