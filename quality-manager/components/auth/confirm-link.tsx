"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { createBrowserClient } from "@supabase/ssr";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { Database } from "@/types/database";
import { PASSWORD_SETUP_COOKIE, PASSWORD_SETUP_MAX_AGE } from "@/lib/auth/password-setup";

/**
 * Atterrissage des liens reçus par email (invitation d'un client, renvoi de
 * ses accès) : la session est dans le fragment de l'URL. On l'installe en
 * cookies, on efface le fragment, puis on continue vers `next` — en
 * pratique le choix du mot de passe.
 */
export function ConfirmLink() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);
  // Le fragment est effacé dès la première lecture : l'effet ne doit pas
  // repasser (double exécution du mode strict en développement).
  const started = React.useRef(false);

  const next = safeNext(searchParams.get("next"));
  const loginPath = next.includes("/client") ? "/client/login" : "/login";

  React.useEffect(() => {
    if (started.current) return;
    started.current = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    if (hash.get("error")) {
      setError(
        hash.get("error_code") === "otp_expired"
          ? "Ce lien a expiré ou a déjà été utilisé. Demandez à votre organisme de vous renvoyer vos accès."
          : (hash.get("error_description") ?? "Ce lien n'est pas valide."),
      );
      return;
    }

    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (!accessToken || !refreshToken) {
      setError("Ce lien de connexion est incomplet. Ouvrez-le à nouveau depuis l'email reçu.");
      return;
    }

    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { isSingleton: false, auth: { detectSessionInUrl: false } },
    );
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ data, error }) => {
        if (error || !data.user) {
          setError(
            "Ce lien a expiré ou a déjà été utilisé. Demandez à votre organisme de vous renvoyer vos accès.",
          );
          return;
        }
        // Le choix du mot de passe n'est ouvert qu'au compte de CE lien
        // (voir PASSWORD_SETUP_COOKIE) : jamais au compte qui était déjà
        // connecté dans le navigateur.
        if (hash.get("type") === "recovery" || hash.get("type") === "invite") {
          document.cookie = `${PASSWORD_SETUP_COOKIE}=${data.user.id}; path=/; max-age=${PASSWORD_SETUP_MAX_AGE}; samesite=lax`;
        }
        router.replace(next as Route);
        router.refresh();
      });
  }, [next, router]);

  if (error) {
    return (
      <div>
        <div className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-[rgba(232,93,93,0.12)] text-[#E85D5D]">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="mb-3 font-sans text-3xl font-light tracking-tight">Lien non valide</h2>
        <p className="mb-8 text-sm leading-relaxed text-muted-foreground">{error}</p>
        <Link
          href={loginPath as Route}
          className="text-sm font-medium text-amethyst-bright hover:underline"
        >
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-amethyst-bright" />
      Connexion en cours…
    </div>
  );
}

/** N'accepte qu'un chemin interne, pour ne jamais rediriger hors de l'app. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}
