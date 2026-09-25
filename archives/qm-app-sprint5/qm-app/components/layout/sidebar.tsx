"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, LayoutDashboard, Zap } from "lucide-react";
import { CRITERES } from "@/lib/constants/rnq";
import { cn } from "@/lib/utils/cn";

type AuditSummary = {
  id: string;
  name: string;
  status: "en_cours" | "cloture" | "archive";
};

export function Sidebar({
  organizationName,
  currentAudit,
}: {
  organizationName: string;
  currentAudit: AuditSummary | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-[230px] shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur-2xl">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-3 p-5 hover:opacity-80 transition-opacity">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amethyst to-amethyst-bright text-white font-semibold shadow-[0_4px_12px_-2px_rgba(107,79,187,0.4)]">
          Q
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium tracking-tight">Quality Manager</span>
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {organizationName.length > 16 ? organizationName.slice(0, 14) + "…" : organizationName}
          </span>
        </div>
      </Link>

      {/* Dossier en cours */}
      {currentAudit && (
        <div className="mx-3 mb-3 rounded-xl border border-amethyst-bright/30 bg-amethyst-bright/[0.06] p-3">
          <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">
            Dossier en cours
          </div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-c2 shadow-[0_0_6px_var(--c2)]" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-c2">
              {currentAudit.status === "en_cours" ? "EN COURS" : currentAudit.status.toUpperCase()}
            </span>
          </div>
          <Link href={`/audits/${currentAudit.id}`} className="text-sm font-medium hover:text-amethyst-bright transition-colors">
            {currentAudit.name}
          </Link>
        </div>
      )}

      {/* Nav principale */}
      <nav className="flex flex-col gap-0.5 px-3">
        <NavLink href="/dashboard" icon={<Home className="h-4 w-4" />} active={pathname === "/dashboard"}>
          Vue d'ensemble
        </NavLink>
        {currentAudit && (
          <>
            <NavLink
              href={`/audits/${currentAudit.id}`}
              icon={<LayoutDashboard className="h-4 w-4" />}
              active={pathname === `/audits/${currentAudit.id}`}
            >
              Tableau de bord
            </NavLink>
            <NavLink
              href={`/audits/${currentAudit.id}/documents`}
              icon={<FileText className="h-4 w-4" />}
              active={pathname.includes("/documents")}
            >
              Documents
            </NavLink>
            <NavLink
              href={`/audits/${currentAudit.id}/miniapps`}
              icon={<Zap className="h-4 w-4" />}
              active={pathname.includes("/miniapps")}
            >
              Mini-apps
            </NavLink>
          </>
        )}
      </nav>

      {/* Critères */}
      {currentAudit && (
        <>
          <div className="mt-6 px-5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Critères
          </div>
          <nav className="mt-2 flex flex-col px-3">
            {Object.values(CRITERES).map((critere) => {
              const numStr = String(critere.num).padStart(2, "0");
              const href = `/audits/${currentAudit.id}/critere/${numStr}`;
              const active = pathname.includes(`/critere/${numStr}`);
              return (
                <Link
                  key={critere.num}
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                >
                  <span className="font-mono text-[10px] font-medium text-muted-foreground/70 group-hover:text-foreground/70 w-5">
                    {numStr}
                  </span>
                  <span className={cn("h-2 w-2 rounded-full", colorDotClass(critere.colorVar))} />
                  <span className="truncate">{critere.title}</span>
                </Link>
              );
            })}
          </nav>
        </>
      )}
    </aside>
  );
}

function NavLink({
  href,
  icon,
  active,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

function colorDotClass(colorVar: string): string {
  switch (colorVar) {
    case "c1": return "bg-c1";
    case "c2": return "bg-c2";
    case "c3": return "bg-c3";
    case "c4": return "bg-c4";
    case "c5": return "bg-c5";
    case "c6": return "bg-c6";
    case "c7": return "bg-c7";
    default:   return "bg-muted-foreground";
  }
}
