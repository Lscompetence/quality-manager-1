"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { Bell, FileText, Folder, LayoutDashboard, Settings, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { QmBrandMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils/cn";
import { initialsOf } from "@/lib/utils/display-name";

export type ClientDossier = {
  accessId: string;
  auditId: string;
  name: string;
  auditType: string;
  category: string | null;
  organizationName: string;
};

const TYPE_LABEL: Record<string, string> = {
  initial: "Initial",
  surveillance: "Surveillance",
  renouvellement: "Renouvellement",
};

/** Accent de la catégorie : AF vert, BC bleu, VAE ambre, CFA violet — même échelle que le menu staff. */
const CATEGORY_TONE: Record<string, string> = {
  AF: "var(--c2)",
  BC: "var(--c4)",
  VAE: "var(--c3)",
  CFA: "var(--c6)",
};

/** Pages de l'espace client, au-dessus de la liste des dossiers. */
const NAV = [
  { href: "/client", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/client/documents", label: "Documents", icon: FileText },
  { href: "/client/miniapps", label: "Mini-apps", icon: Zap },
  { href: "/client/notifications", label: "Notifications", icon: Bell },
  { href: "/client/settings", label: "Paramètres", icon: Settings },
] as const;

/**
 * Menu de l'espace client : même langage visuel que le menu staff
 * (qm-glass, marque, liens en pilule active) — ses pages, puis la liste
 * des dossiers confiés, un client pouvant en suivre plusieurs.
 */
export function ClientSidebar({
  dossiers,
  clientName,
  email,
  unreadCount = 0,
}: {
  dossiers: ClientDossier[];
  clientName: string;
  email: string;
  unreadCount?: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="qm-glass sticky top-0 hidden h-screen w-[230px] shrink-0 flex-col border-y-0 border-l-0 border-r lg:flex">
      <Link
        href="/client"
        prefetch={true}
        className="mx-[18px] flex items-center gap-3 border-b border-[var(--border-soft)] px-2 pb-6 pt-6 transition-opacity hover:opacity-80"
      >
        <QmBrandMark size={38} priority />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[14.5px] font-semibold tracking-tight">Quality Manager</span>
          <span className="mt-0.5 truncate font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--text-mute)]">
            Espace client
          </span>
        </div>
      </Link>

      <div className="qm-scroll-hidden flex min-h-0 flex-1 flex-col overflow-y-auto px-[18px] pt-[22px]">
        <nav className="relative mb-[22px] flex shrink-0 flex-col gap-px">
          {NAV.map((item) => {
            const active =
              item.href === "/client"
                ? pathname === "/client"
                : item.href === "/client/miniapps"
                  ? pathname.startsWith("/client/miniapps") || pathname.includes("/miniapps")
                  : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href as Route}
                prefetch={true}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-colors",
                  active ? "text-foreground" : "text-[var(--text-soft)] hover:text-foreground",
                )}
              >
                {active && (
                  <motion.div
                    layoutId="client-sidebar-active"
                    className="absolute inset-0 rounded-[10px] bg-gradient-to-b from-[var(--amethyst-soft)] to-[var(--amethyst-soft-2)] shadow-[inset_0_0_0_1px_var(--amethyst-soft)]"
                    initial={false}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10 flex-1">{item.label}</span>
                {item.href === "/client/notifications" && unreadCount > 0 && (
                  <span className="relative z-10 rounded-md bg-[var(--amethyst-soft)] px-1.5 py-px font-mono text-[10px] font-semibold text-[var(--amethyst-br)]">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mb-2.5 shrink-0 px-3 font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
          Mes dossiers
        </div>

        <nav className="relative flex shrink-0 flex-col gap-px pb-6">
          {dossiers.length === 0 ? (
            <p className="px-3 py-4 text-[12.5px] leading-[1.5] text-[var(--text-mute)]">
              Aucun dossier ne vous a encore été confié.
            </p>
          ) : (
            dossiers.map((d) => {
              const href = `/client/dossiers/${d.auditId}`;
              const active = pathname === href;
              const tone = d.category ? (CATEGORY_TONE[d.category] ?? "var(--amethyst-br)") : "var(--amethyst-br)";
              return (
                <Link
                  key={d.accessId}
                  href={href as Route}
                  prefetch={true}
                  className={cn(
                    "relative flex items-start gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-colors",
                    active ? "text-foreground" : "text-[var(--text-soft)] hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="client-sidebar-active"
                      className="absolute inset-0 rounded-[10px] bg-gradient-to-b from-[var(--amethyst-soft)] to-[var(--amethyst-soft-2)] shadow-[inset_0_0_0_1px_var(--amethyst-soft)]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span
                    className="relative z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md"
                    style={{ background: `color-mix(in srgb, ${tone} 16%, transparent)`, color: tone }}
                  >
                    <Folder className="h-3.5 w-3.5" />
                  </span>
                  <span className="relative z-10 min-w-0 flex-1">
                    <span className="block truncate">{d.name}</span>
                    <span className="mt-0.5 block truncate font-mono text-[9.5px] uppercase tracking-[0.1em] text-[var(--text-faint)]">
                      {TYPE_LABEL[d.auditType] ?? d.auditType}
                      {d.organizationName ? ` · ${d.organizationName}` : ""}
                    </span>
                  </span>
                </Link>
              );
            })
          )}
        </nav>
      </div>

      <div className="p-[18px] pt-0">
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3.5 py-3">
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-[#2C5A9E] to-amethyst text-[11px] font-bold text-white">
            {initialsOf(clientName)}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium">{clientName}</span>
            {clientName !== email && (
              <span className="truncate font-mono text-[9.5px] text-[var(--text-faint)]">{email}</span>
            )}
          </span>
        </div>
      </div>
    </aside>
  );
}

