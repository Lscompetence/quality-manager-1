"use client";

import * as React from "react";
import { useTransition } from "react";
import Link from "next/link";
import { Bell, Check, AlertTriangle, Users, Sparkles, Info } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const CATEGORY_META: Record<
  Notification["category"],
  { icon: React.ReactNode; color: string; label: string }
> = {
  echeance: { icon: <Bell className="h-4 w-4" />, color: "bg-c4/15 text-c4", label: "Échéance" },
  alerte: { icon: <AlertTriangle className="h-4 w-4" />, color: "bg-c3/15 text-c3", label: "Alerte" },
  equipe: { icon: <Users className="h-4 w-4" />, color: "bg-amethyst-bright/15 text-amethyst-bright", label: "Équipe" },
  success: { icon: <Sparkles className="h-4 w-4" />, color: "bg-c2/15 text-c2", label: "Succès" },
  system: { icon: <Info className="h-4 w-4" />, color: "bg-secondary text-muted-foreground", label: "Système" },
};

export function NotificationsCenter({ notifications }: { notifications: Notification[] }) {
  const [filter, setFilter] = React.useState<"all" | Notification["category"]>("all");
  const [pending, startTransition] = useTransition();

  const filtered = filter === "all" ? notifications : notifications.filter((n) => n.category === filter);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

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
      {/* Filtres */}
      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap items-center gap-2">
          {(["all", "echeance", "alerte", "equipe", "success", "system"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === f
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80",
              )}
            >
              {f === "all" ? "Toutes" : CATEGORY_META[f as Notification["category"]].label}
            </button>
          ))}
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAll}
              disabled={pending}
              className="ml-auto"
            >
              <Check className="h-3.5 w-3.5" />
              Tout marquer comme lu ({unreadCount})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Liste */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {notifications.length === 0
                ? "Aucune notification pour l'instant."
                : "Aucune notification dans cette catégorie."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const meta = CATEGORY_META[n.category];
            const unread = !n.read_at;
            return (
              <Card
                key={n.id}
                className={cn(
                  "transition-colors",
                  unread ? "border-amethyst-bright/30 bg-amethyst-bright/[0.03]" : "",
                )}
              >
                <CardContent className="p-3 flex items-start gap-3">
                  <div className={cn("grid h-9 w-9 place-items-center rounded-lg shrink-0", meta.color)}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <p className="text-sm font-medium">
                        {n.title}
                        {unread && (
                          <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-amethyst-bright" />
                        )}
                      </p>
                      <Badge variant="outline" className="shrink-0">
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-3 mt-0.5">
                      {n.source_label && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {n.source_label}
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {formatRelative(n.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {n.source_url && (
                      <Button asChild variant="ghost" size="sm">
                        <Link href={n.source_url}>Ouvrir</Link>
                      </Button>
                    )}
                    {unread && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkRead(n.id)}
                        disabled={pending}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}
