import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = {
  title: "Mot de passe oublié",
};

/** Mot de passe oublié côté client : le lien reçu ramène dans l'espace client. */
export default function ClientForgotPasswordPage() {
  return (
    <>
      <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-amethyst-bright">
        Espace client · Réinitialisation
      </div>
      <h2 className="mb-3 font-sans text-3xl font-light tracking-tight">Mot de passe oublié ?</h2>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        Entrez l&apos;email avec lequel votre organisme vous a invité. Nous vous enverrons un lien
        pour choisir un nouveau mot de passe.
      </p>

      <ForgotPasswordForm portal="client" />

      <div className="mt-7 text-center text-sm text-muted-foreground">
        <Link href="/client/login" className="font-medium text-amethyst-bright hover:underline">
          ← Retour à la connexion
        </Link>
      </div>
    </>
  );
}
