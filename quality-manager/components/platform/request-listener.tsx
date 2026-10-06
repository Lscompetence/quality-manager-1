"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { RequestKind } from "@/lib/auth/permissions";
import { REQUEST_CATEGORY_LABEL, requestCategory } from "@/lib/requests/categories";

type RequestRow = {
  id: string;
  kind: RequestKind;
  subject: string;
  contact_name: string | null;
  organization_name: string | null;
};

/**
 * Espace super admin : chaque nouvelle demande (contact, réclamation,
 * changement de plan, ouverture de compte) s'affiche aussitôt en message.
 * Le super admin n'a pas de ligne dans `notifications` : on écoute donc
 * directement `client_requests` (migration 000015). Rien n'est affiché par le
 * composant lui-même.
 */
export function PlatformRequestListener() {
  const router = useRouter();

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("platform:client_requests")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "client_requests" },
        (payload) => {
          const r = payload.new as RequestRow;
          const category = requestCategory(r);
          const from = r.contact_name ?? r.organization_name ?? "Un client";
          const options = {
            description: `${from} · ${r.subject}`,
            action: { label: "Ouvrir", onClick: () => router.push("/platform/demandes") },
          };
          const title = `Nouvelle demande : ${REQUEST_CATEGORY_LABEL[category]}`;
          if (category === "reclamation") toast.error(title, options);
          else if (category === "abonnement" || category === "ouverture_compte")
            toast.success(title, options);
          else toast.info(title, options);
          // Compteurs et listes à jour sans recharger la page
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
