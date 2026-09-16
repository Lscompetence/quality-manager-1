import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Tableau de bord",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Récupération du profil + organization
  const { data: profile } = await supabase
    .from("users")
    .select("first_name, last_name, role, organization:organizations(name, plan)")
    .eq("id", user!.id)
    .single();

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright">
          Sprint 1 · Fondations livrées
        </p>
        <h1 className="mt-2 font-sans text-4xl font-light tracking-tight">
          Bienvenue, {profile?.first_name ?? "Utilisateur"} 👋
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Vous êtes connecté à <b className="text-foreground">{profile?.organization?.name ?? "votre organisation"}</b>{" "}
          · plan <b className="uppercase text-foreground">{profile?.organization?.plan ?? "essentiel"}</b>{" "}
          · rôle <b className="uppercase text-foreground">{profile?.role ?? "user"}</b>
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card/40 p-6 backdrop-blur-xl">
        <h2 className="font-sans text-lg font-medium mb-3">Sprint 1 terminé</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>✓ Setup Next.js 14 + TypeScript strict + Tailwind + shadcn/ui</li>
          <li>✓ Schéma Supabase complet avec RLS multi-tenant</li>
          <li>✓ Auth fonctionnelle (login / signup / forgot password / callback)</li>
          <li>✓ Theming Aurora (dark/light) + fond aurore boréale</li>
          <li>✓ Schémas Zod + react-hook-form pour validation</li>
          <li>✓ Server Actions Next.js pour les mutations auth</li>
          <li>✓ CI/CD GitHub Actions + déploiement Vercel prêt</li>
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Sprint 2 ajoutera : sidebar de navigation, dashboard dossier, routing critères/indicateurs,
          composant Attachment universel.
        </p>
      </div>

      <form action={logout}>
        <Button type="submit" variant="secondary">
          Se déconnecter
        </Button>
      </form>
    </div>
  );
}
