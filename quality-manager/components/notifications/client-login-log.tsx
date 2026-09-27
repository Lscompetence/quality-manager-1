"use client";

import * as React from "react";
import { useTransition } from "react";
import { Check, CheckCheck, LogIn, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/profile";

export type ClientLogin = {
  id: string;
  title: string;
  read_at: string | null;
  created_at: string;
};

/**
 * Journal des connexions clients, seule notification de l'espace admin :
 * le nom du client et l'heure de sa connexion, rien de plus.
 */
export function ClientLoginLog({ logins }: { logins: ClientLogin[] }) {
  const [pending, startTransition] = useTransition();
  const unreadCount = logins.filter((n) => !n.read_at).length;

  const markRead = (id: string) => {
    startTransition(async () => {
      await markNotificationRead(id);
    });
  };

  const markAll = () => {
    startTransition(async () => {
      const r = await markAllNotificationsRead();
      if (r.ok) toast.success("Toutes les connexions marquées comme lues");
    });
  };

  return (
    <>
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-elev)] px-[18px] py-3.5">
        <p className="flex items-center gap-2 text-xs text-[var(--text-mute)]">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--status-on)]" />
          Seuls le nom du client et l&apos;heure de connexion sont enregistrés. Ce qu&apos;il
          consulte ou fait dans son espace reste privé.
        </p>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAll}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-mute)] transition-colors hover:text-[var(--amethyst-br)] disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {logins.length === 0 ? (
        <div className="qm-glass rounded-[18px] px-[30px] py-[60px] text-center">
          <LogIn className="mx-auto mb-3 h-10 w-10 text-[var(--text-faint)]" />
          <p className="text-sm text-[var(--text-mute)]">
            Aucune connexion client pour l&apos;instant.
          </p>
        </div>
      ) : (
        logins.map((n) => {
          const unread = !n.read_at;
          return (
            <div
              key={n.id}
              className={cn(
                "relative mb-2 flex items-center gap-3.5 rounded-xl border px-5 py-4 transition-colors",
                unread
                  ? "border-[var(--amethyst-soft)] bg-[var(--amethyst-soft-2)]"
                  : "border-[var(--border-soft)] bg-[var(--bg-elev)]",
              )}
            >
              {unread && (
                <span
                  className="absolute -left-[3px] top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[var(--amethyst-br)]"
                  style={{ boxShadow: "0 0 8px var(--amethyst-br)" }}
                />
              )}
              <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] bg-[rgba(93,201,165,0.15)] text-c2">
                <LogIn className="h-[15px] w-[15px]" />
              </div>
              <div className="min-w-0 flex-1 text-[13.5px] leading-[1.4]">{n.title}</div>
              <time
                dateTime={n.created_at}
                className="shrink-0 font-mono text-[11px] text-[var(--text-mute)]"
              >
                {formatDateTime(n.created_at)}
              </time>
              {unread && (
                <button
                  type="button"
                  onClick={() => markRead(n.id)}
                  disabled={pending}
                  title="Marquer comme lu"
                  className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[7px] border border-transparent text-[var(--text-mute)] transition-colors hover:border-[var(--border-soft)] hover:bg-[var(--surface)] hover:text-foreground disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
