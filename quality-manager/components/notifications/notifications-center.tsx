"use client";

import * as React from "react";
import { useTransition } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, Bell, Calendar, Check, CheckCheck, Info, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/profile";

type Notification = {
  id: string;
  category: "echeance" | "alerte" | "equipe" | "system" | "success";
  title: string;
  source_label: string | null;
  source_url: string | null;
  read_at: string | null;
  created_at: string;
};

/** Couleurs d'icône reprises de notifications.html (.notif-icon.*) */
const CATEGORY_META: Record<
  Notification["category"],
  { icon: React.ReactNode; className: string; label: string }
> = {
  echeance: {
    icon: <Calendar className="h-[15px] w-[15px]" />,
    className: "bg-[rgba(239,158,40,0.15)] text-c3",
    label: "Échéances",
  },
  alerte: {
    icon: <AlertTriangle className="h-[15px] w-[15px]" />,
    className: "bg-[rgba(239,92,92,0.10)] text-destructive",
    label: "Alertes",
  },
  equipe: {
    icon: <Users className="h-[15px] w-[15px]" />,
    className: "bg-[rgba(107,137,208,0.15)] text-c4",
    label: "Équipe",
  },
  system: {
    icon: <Info className="h-[15px] w-[15px]" />,
    className: "bg-[var(--amethyst-soft-2)] text-[var(--amethyst-br)]",
    label: "Système",
  },
  success: {
    icon: <Sparkles className="h-[15px] w-[15px]" />,
    className: "bg-[rgba(93,201,165,0.15)] text-c2",
    label: "Succès",
  },
};

/** Filtres de la maquette : toutes, non lues, puis trois catégories */
const FILTERS = [
  { key: "all", label: "Toutes" },
  { key: "unread", label: "Non lues" },
  { key: "echeance", label: "Échéances" },
  { key: "alerte", label: "Alertes" },
  { key: "equipe", label: "Équipe" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export function NotificationsCenter({ notifications }: { notifications: Notification[] }) {
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [pending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read_at;
    return n.category === filter;
  });

  const groups = groupByDay(filtered);

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      await markNotificationRead(id);
    });
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      const r = await markAllNotificationsRead();
      if (r.ok) toast.success("Toutes les notifications marquées comme lues");
    });
  };

  return (
    <>
      {/* Barre d'outils */}
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-elev)] px-[18px] py-3.5">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count =
              f.key === "all"
                ? notifications.length
                : f.key === "unread"
                  ? unreadCount
                  : null;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                  active
                    ? "border-[var(--amethyst-soft)] bg-[var(--amethyst-soft-2)] text-[var(--amethyst-br)]"
                    : "border-[var(--border-soft)] text-[var(--text-mute)] hover:bg-[var(--surface)] hover:text-foreground",
                )}
              >
                {f.label}
                {count !== null && <span className="opacity-60"> · {count}</span>}
              </button>
            );
          })}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-mute)] transition-colors hover:text-[var(--amethyst-br)] disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Liste groupée par jour */}
      {filtered.length === 0 ? (
        <div className="qm-glass rounded-[18px] px-[30px] py-[60px] text-center">
          <Bell className="mx-auto mb-3 h-10 w-10 text-[var(--text-faint)]" />
          <p className="text-sm text-[var(--text-mute)]">
            {notifications.length === 0
              ? "Aucune notification pour l'instant."
              : "Aucune notification dans cette catégorie."}
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.title} className="mb-6">
            <div className="mb-2.5 pl-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-mute)]">
              {group.title}
            </div>

            {group.items.map((n) => {
              const meta = CATEGORY_META[n.category];
              const unread = !n.read_at;

              return (
                <div
                  key={n.id}
                  className={cn(
                    "relative mb-2 flex items-start gap-3.5 rounded-xl border px-5 py-4 transition-colors",
                    unread
                      ? "border-[var(--amethyst-soft)] bg-[var(--amethyst-soft-2)] hover:bg-[var(--amethyst-soft)]"
                      : "border-[var(--border-soft)] bg-[var(--bg-elev)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  {unread && (
                    <span
                      className="absolute -left-[3px] top-[18px] h-1.5 w-1.5 rounded-full bg-[var(--amethyst-br)]"
                      style={{ boxShadow: "0 0 8px var(--amethyst-br)" }}
                    />
                  )}

                  <div
                    className={cn(
                      "grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px]",
                      meta.className,
                    )}
                  >
                    {meta.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-[13.5px] leading-[1.4]">{n.title}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2.5 font-mono text-[10.5px] text-[var(--text-mute)]">
                      {n.source_label && (
                        <span className="rounded border border-[var(--border-soft)] bg-[var(--surface)] px-2 py-0.5">
                          {n.source_label}
                        </span>
                      )}
                      <span className="opacity-85">{formatRelative(n.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-1.5">
                    {n.source_url && (
                      <Link
                        href={n.source_url as Route}
                        className="grid h-[30px] items-center rounded-[7px] border border-transparent px-2.5 text-xs text-[var(--text-mute)] transition-colors hover:border-[var(--border-soft)] hover:bg-[var(--surface)] hover:text-foreground"
                      >
                        Ouvrir
                      </Link>
                    )}
                    {unread && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n.id)}
                        disabled={pending}
                        title="Marquer comme lu"
                        className="grid h-[30px] w-[30px] place-items-center rounded-[7px] border border-transparent text-[var(--text-mute)] transition-colors hover:border-[var(--border-soft)] hover:bg-[var(--surface)] hover:text-foreground disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </>
  );
}

/** La maquette groupe les notifications par jour : Aujourd'hui, Hier, puis la date. */
function groupByDay(items: Notification[]): { title: string; items: Notification[] }[] {
  const groups = new Map<string, Notification[]>();

  for (const n of items) {
    const title = dayTitle(new Date(n.created_at));
    const bucket = groups.get(title) ?? [];
    bucket.push(n);
    groups.set(title, bucket);
  }

  return [...groups.entries()].map(([title, list]) => ({ title, items: list }));
}

function dayTitle(date: Date): string {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.floor((startOfToday.getTime() - date.getTime()) / 86_400_000);

  if (days < 0 || date >= startOfToday) return "Aujourd'hui";
  if (days < 1) return "Hier";
  if (days < 7) return "Cette semaine";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Il y a ${d} j`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
