import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <>
      <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-amethyst-bright">
        Connexion
      </div>
      <h2 className="mb-3 font-sans text-3xl font-light tracking-tight">Content de vous revoir</h2>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        Connectez-vous pour accéder à vos dossiers de conformité.
      </p>

      <LoginForm portal="admin" />

      <div className="mt-7 text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link
          href="/demande-acces"
          className="ml-1 font-medium text-amethyst-bright hover:underline"
        >
          Demander un accès
        </Link>
      </div>
    </>
  );
}
