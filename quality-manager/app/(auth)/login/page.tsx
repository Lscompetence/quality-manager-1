import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <>
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-amethyst-bright mb-3">
        Connexion
      </div>
      <h2 className="font-sans text-3xl font-light mb-3 tracking-tight">Content de vous revoir</h2>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
        Connectez-vous pour accéder à vos dossiers de conformité.
      </p>

      <LoginForm portal="admin" />

      <div className="mt-7 text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="ml-1 font-medium text-amethyst-bright hover:underline">
          Créer un compte
        </Link>
      </div>
    </>
  );
}
