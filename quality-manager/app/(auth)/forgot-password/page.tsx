import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import Link from "next/link";

export const metadata = {
  title: "Mot de passe oublié",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-amethyst-bright">
        Connexion · Réinitialisation
      </div>
      <h2 className="mb-3 font-sans text-3xl font-light tracking-tight">Mot de passe oublié ?</h2>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        Entrez l&apos;email de votre compte : nous vous envoyons un lien pour choisir un nouveau mot
        de passe.
      </p>

      <ForgotPasswordForm />

      <div className="mt-7 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-amethyst-bright hover:underline">
          ← Retour à la connexion
        </Link>
      </div>
    </>
  );
}
