import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = {
  title: "Nouveau mot de passe",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Seuls des chemins internes : jamais de redirection hors de l'app.
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const isClient = target.startsWith("/client");

  // La page n'a de sens qu'avec la session posée par le lien reçu par email.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <div className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-[rgba(232,93,93,0.12)] text-[#E85D5D]">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="mb-3 font-sans text-3xl font-light tracking-tight">Lien expiré</h2>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
          Ce lien n&apos;est plus valable ou a déjà été utilisé. Demandez-en un nouveau : il arrive
          en quelques secondes.
        </p>
        <Link
          href={(isClient ? "/client/forgot-password" : "/forgot-password") as Route}
          className="qm-btn-3d inline-flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold"
        >
          Recevoir un nouveau lien
        </Link>
        <div className="mt-7 text-center text-sm text-muted-foreground">
          <Link
            href={(isClient ? "/client/login" : "/login") as Route}
            className="font-medium text-amethyst-bright hover:underline"
          >
            ← Retour à la connexion
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-amethyst-bright">
        {isClient ? "Espace client · Nouveau mot de passe" : "Nouveau mot de passe"}
      </div>
      <h2 className="mb-3 font-sans text-3xl font-light tracking-tight">
        Choisissez votre mot de passe
      </h2>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        Pour le compte <b className="text-foreground">{user.email}</b>. Il remplacera l&apos;ancien
        dès l&apos;enregistrement.
      </p>

      <ResetPasswordForm next={target} />
    </>
  );
}
