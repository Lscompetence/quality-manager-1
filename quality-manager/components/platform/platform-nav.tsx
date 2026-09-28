"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, Building, Inbox, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { QmBrandMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils/cn";

const ITEMS = [
  { href: "/platform", label: "Pilotage", icon: LayoutDashboard, exact: true },
  { href: "/platform/clients", label: "Clients", icon: Building },
  { href: "/platform/demandes", label: "Demandes", icon: Inbox },
  { href: "/platform/qualite", label: "Qualité", icon: Activity },
];

/** Menu de l'espace super admin (LS Compétences) — même langage visuel que les autres espaces. */
export function PlatformNav({ email, toHandle }: { email: string; toHandle: number }) {
  const pathname = usePathname();
  return (
    <aside className="qm-glass sticky top-0 hidden h-screen w-[230px] shrink-0 flex-col border-y-0 border-l-0 border-r lg:flex">
      <Link
        href="/platform"
        className="mx-[18px] flex items-center gap-3 border-b border-[var(--border-soft)] px-2 pb-6 pt-6 transition-opacity hover:opacity-80"
      >
        <QmBrandMark size={38} priority />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[14.5px] font-semibold tracking-tight">
            Quality Manager
          </span>
          <span className="mt-0.5 truncate font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--text-mute)]">
            Espace LS Compétences
          </span>
        </div>
      </Link>

      <nav className="relative flex flex-col gap-px px-[18px] pt-[22px]">
        {ITEMS.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href as Route}
              className={cn(
                "relative flex items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-colors",
                active ? "text-foreground" : "text-[var(--text-soft)] hover:text-foreground",
              )}
            >
              {active && (
                <motion.div
                  layoutId="platform-nav-active"
                  className="absolute inset-0 rounded-[10px] bg-gradient-to-b from-[var(--amethyst-soft)] to-[var(--amethyst-soft-2)] shadow-[inset_0_0_0_1px_var(--amethyst-soft)]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className="relative z-10 h-4 w-4" />
              <span className="relative z-10 flex-1">{it.label}</span>
              {it.href === "/platform/demandes" && toHandle > 0 && (
                <span className="relative z-10 rounded-md bg-c3/15 px-1.5 font-mono text-[10px] text-c3">
                  {toHandle}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 p-[18px]">
        <p className="flex gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3 text-[11px] leading-relaxed text-[var(--text-mute)]">
          <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-[var(--status-on)]" />
          <span>
            Cet espace pilote l’activité. Il ne donne accès à{" "}
            <b className="text-foreground">aucun dossier ni document</b> client.
          </span>
        </p>
        <div className="truncate font-mono text-[10px] text-[var(--text-faint)]">{email}</div>
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-2 text-[13px] text-[var(--text-mute)] transition-colors hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </form>
      </div>
    </aside>
  );
}
