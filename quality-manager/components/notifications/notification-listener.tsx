"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type NotificationRow = {
  id: string;
  category: "echeance" | "alerte" | "equipe" | "system" | "success";
  title: string;
  source_label: string | null;
  source_url: string | null;
};

/**
 * Écoute en temps réel les notifications destinées à l'utilisateur connecté
 * (admin comme client) et les affiche en message dès leur arrivée : quand le
 * client dépose un document, l'admin le voit aussitôt, et inversement.
 * Rien n'est affiché visuellement par ce composant lui-même.
 */
export function NotificationListener({ userId }: { userId: string }) {
  const router = useRouter();

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as NotificationRow;
          const options = {
            description: n.source_label ?? undefined,
            action: n.source_url
              ? { label: "Ouvrir", onClick: () => router.push(n.source_url as Route) }
              : undefined,
          };

          if (n.category === "success") toast.success(n.title, options);
          else if (n.category === "alerte" || n.category === "echeance") toast.warning(n.title, options);
          else toast.info(n.title, options);

          // Compteurs, listes et avancements à jour sans recharger la page.
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}
