import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Espace LS Compétences",
  // Page privée : ni indexée, ni liée depuis les autres pages
  robots: { index: false, follow: false },
};

/** Connexion du super admin LS Compétences. Refuse tout autre compte. */
export default function PlatformLoginPage() {
  return (
    <>
      <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-amethyst-bright">
        Espace LS Compétences
      </div>
      <h2 className="mb-3 font-sans text-3xl font-light tracking-tight">
        Bienvenue sur la plateforme
      </h2>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        Réservé à l&apos;équipe LS Compétences : comptes clients, abonnements et demandes.
      </p>

      <LoginForm portal="platform" />
    </>
  );
}
