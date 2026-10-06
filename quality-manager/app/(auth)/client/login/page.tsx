import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Espace client",
};

/**
 * Connexion de l'espace client. Pas de lien d'inscription : un client
 * n'ouvre pas son compte lui-même, il le reçoit par invitation de
 * l'organisme qui l'accompagne.
 */
export default function ClientLoginPage() {
  return (
    <>
      <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-amethyst-bright">
        Espace client
      </div>
      <h2 className="mb-3 font-sans text-3xl font-light tracking-tight">
        Bienvenue dans l’espace client
      </h2>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        Connectez-vous pour suivre votre dossier Qualiopi et déposer vos documents.
      </p>

      <LoginForm portal="client" />

      <p className="mt-7 text-center text-xs leading-relaxed text-muted-foreground">
        Votre accès vous a été envoyé par email par votre organisme.
      </p>
    </>
  );
}
