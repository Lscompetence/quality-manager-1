import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Espace établissement",
};

/**
 * Connexion des responsables pédagogiques (editor) et des lecteurs (reader).
 * Pas de demande d'accès ici : c'est l'admin de l'organisme qui ouvre les accès.
 */
export default function EstablishmentLoginPage() {
  return (
    <>
      <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-amethyst-bright">
        Espace établissement
      </div>
      <h2 className="mb-3 font-sans text-3xl font-light tracking-tight">Bienvenue</h2>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        Responsables pédagogiques et lecteurs : accédez aux dossiers Qualiopi de votre
        établissement.
      </p>

      <LoginForm portal="member" />

      <p className="mt-7 text-center text-xs leading-relaxed text-muted-foreground">
        Votre accès vous est ouvert par l&apos;admin de votre organisme.
      </p>
    </>
  );
}
