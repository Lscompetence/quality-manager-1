"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { toast } from "sonner";

/**
 * Message de bienvenue juste après la connexion. La page de connexion
 * redirige avec `?bienvenue=1` ; on affiche le message une fois, puis on
 * retire le paramètre de l'adresse pour qu'il ne revienne pas au rechargement.
 */
export function WelcomeToast({ spaceLabel, name }: { spaceLabel: string; name?: string }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const shown = React.useRef(false);

  React.useEffect(() => {
    if (shown.current || params.get("bienvenue") !== "1") return;
    shown.current = true;
    toast.success(name ? `Bienvenue ${name}` : "Bienvenue", {
      description: `Vous êtes connecté à ${spaceLabel}.`,
    });
    router.replace(pathname as Route);
  }, [params, pathname, router, spaceLabel, name]);

  return null;
}
