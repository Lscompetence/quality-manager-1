import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import Link from "next/link";

export const metadata = {
  title: "Mot de passe oublié",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-amethyst-bright mb-3">
        Mot de passe oublié
      </div>
      <h2 className="font-sans text-3xl font-light mb-3 tracking-tight">Réinitialiser</h2>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
        Entrez votre email, nous vous enverrons un lien pour définir un nouveau mot de passe.
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
