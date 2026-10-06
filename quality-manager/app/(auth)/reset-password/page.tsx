import Link from "next/link";
import { cookies } from "next/headers";
import type { Route } from "next";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PORTALS, isPortal, type Portal } from "@/lib/auth/portals";
import { PASSWORD_SETUP_COOKIE, canSetPassword } from "@/lib/auth/password-setup";

const PORTAL_LABEL: Record<Portal, string> = {
  platform: "Espace LS Compétences",
  admin: "Espace admin",
  member: "Espace établissement",
  client: "Espace client",
};

export const metadata = {
  title: "Nouveau mot de passe",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string; next?: string }>;
}) {
  const { portal: rawPortal, next } = await searchParams;
  // L'espace vient du lien de l'email ; les anciens liens portent encore `next`.
  const portal: Portal = isPortal(rawPortal)
    ? rawPortal
    : next?.startsWith("/client")
      ? "client"
      : "admin";
  const target = PORTALS[portal].home;
  const eyebrow = PORTAL_LABEL[portal];

  // La page n'a de sens qu'avec la session posée par le lien reçu par email,
  // et pour le compte de ce lien — pas pour un compte déjà connecté ici.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const setupFor = (await cookies()).get(PASSWORD_SETUP_COOKIE)?.value;

  if (!user || !canSetPassword(setupFor, user.id)) {
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
          href={PORTALS[portal].forgot as Route}
          className="qm-btn-3d inline-flex h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold"
        >
          Recevoir un nouveau lien
        </Link>
        <div className="mt-7 text-center text-sm text-muted-foreground">
          <Link
            href={PORTALS[portal].login as Route}
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
        {eyebrow} · Nouveau mot de passe
      </div>
      <h2 className="mb-3 font-sans text-3xl font-light tracking-tight">
        Choisissez votre mot de passe
      </h2>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        Pour le compte <b className="text-foreground">{user.email}</b>. Il remplacera l&apos;ancien
        dès l&apos;enregistrement.
      </p>

      <ResetPasswordForm next={target} email={user.email ?? ""} />
    </>
  );
}
