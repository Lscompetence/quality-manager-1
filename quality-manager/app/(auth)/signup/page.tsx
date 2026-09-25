import { SignupForm } from "@/components/auth/signup-form";
import Link from "next/link";

export const metadata = {
  title: "Inscription",
};

export default function SignupPage() {
  return (
    <>
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-amethyst-bright mb-3">
        Inscription
      </div>
      <h2 className="font-sans text-3xl font-light mb-3 tracking-tight">Démarrer avec QM</h2>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
        Créez votre compte organisme et démarrez votre démarche Qualiopi.
      </p>

      <SignupForm />

      <div className="mt-7 text-center text-sm text-muted-foreground">
        Vous avez déjà un compte&nbsp;?
        <Link href="/login" className="ml-1 font-medium text-amethyst-bright hover:underline">
          Se connecter
        </Link>
      </div>
    </>
  );
}
