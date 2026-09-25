import { KeyRound, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/settings/profile-form";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export const metadata = {
  title: "Paramètres",
};

export default async function ClientSettingsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("first_name, last_name, email")
    .eq("id", userData.user.id)
    .single();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-[30px] border-b border-[var(--border-soft)] pb-6">
        <p className="qm-eyebrow mb-3">Espace client · Paramètres</p>
        <h1 className="mb-3 font-sans text-[40px] font-light leading-[1.05] tracking-[-0.025em]">Paramètres</h1>
        <p className="text-[14.5px] leading-[1.55] text-[var(--text-mute)]">
          Votre identité et la sécurité de votre accès.
        </p>
      </div>

      <div className="space-y-[18px]">
        <section className="qm-glass rounded-[18px] p-6">
          <Header icon={<UserRound className="h-4 w-4" />} title="Mon profil" hint={profile?.email ?? ""} />
          <ProfileForm initialFirstName={profile?.first_name ?? ""} initialLastName={profile?.last_name ?? ""} />
        </section>

        <section className="qm-glass rounded-[18px] p-6">
          <Header icon={<KeyRound className="h-4 w-4" />} title="Mot de passe" hint="Connexion à l'espace client" />
          <ChangePasswordForm />
        </section>
      </div>
    </div>
  );
}

function Header({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--amethyst-soft-2)] text-[var(--amethyst-br)]">
          {icon}
        </span>
        <span className="font-sans text-[15px] font-medium">{title}</span>
      </div>
      <span className="truncate font-mono text-[10.5px] text-[var(--text-mute)]">{hint}</span>
    </div>
  );
}
