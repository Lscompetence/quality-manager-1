"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  Buildings,
  ChartPieSlice,
  ChatsCircle,
  Files,
  House,
  Lightning,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { QmBrandMark } from "@/components/brand/logo";
import type { AuditRef } from "@/components/layout/auto-breadcrumb";
import { cn } from "@/lib/utils/cn";
import type { MemberRole } from "@/lib/auth/permissions";

export type OrganizationSummary = {
  name: string;
  siret: string | null;
};

/** Accent de la catégorie : AF vert, BC bleu, VAE ambre, CFA violet (dossier_dashboard.html) */
const CATEGORY_TONE: Record<string, string> = {
  AF: "var(--c2)",
  BC: "var(--c4)",
  VAE: "var(--c3)",
  CFA: "var(--c6)",
};

export function Sidebar({
  organizationName,
  organization,
  role,
  audits = [],
}: {
  organizationName: string;
  organization?: OrganizationSummary;
  role: MemberRole;
  audits?: AuditRef[];
}) {
  const pathname = usePathname();
  const org = organization ?? { name: organizationName, siret: null };

  // Le menu ne montre un dossier que tant qu'on est dedans (URL /audits/…) :
  // une fois sorti, plus aucun dossier affiché.
  const auditId = pathname.startsWith("/audits/") ? pathname.split("/")[2] : undefined;
  const audit = auditId ? audits.find((a) => a.id === auditId) : undefined;
  // L'admin pilote et consulte : il atteint un dossier par ses établissements.
  // Le tableau de bord, les documents et les mini-apps sont l'espace de travail
  // de l'editor et du reader (le dossier ouvert, sinon le dernier modifié).
  const isAdmin = role === "admin";
  const dashboardAuditId = isAdmin ? undefined : (auditId ?? audits[0]?.id);

  return (
    <aside className="qm-glass sticky top-0 hidden h-screen w-[230px] shrink-0 flex-col border-y-0 border-l-0 border-r lg:flex">
      {/* Marque */}
      <Link
        href="/dashboard"
        prefetch={true}
        className="mx-[18px] flex items-center gap-3 border-b border-[var(--border-soft)] px-2 pb-6 pt-6 transition-opacity hover:opacity-80"
      >
        <QmBrandMark size={38} priority />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[14.5px] font-semibold tracking-tight">
            Quality Manager
          </span>
          <span className="mt-0.5 truncate font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--text-mute)]">
            LS Compétences
          </span>
        </div>
      </Link>

      <div className="qm-scroll-hidden flex min-h-0 flex-1 flex-col overflow-y-auto px-[18px] pt-[22px]">
        {/* Contexte du dossier ouvert dans l'URL */}
        {auditId && <DossierContext audit={audit} name={audit?.name ?? "Dossier"} />}

        {/* Navigation — sprint 8 : établissements (admin), contact LS, puis le dossier */}
        <nav className="relative flex shrink-0 flex-col gap-1">
          <NavLink href="/dashboard" icon={House} active={pathname === "/dashboard"}>
            Vue d&apos;ensemble
          </NavLink>

          {role === "admin" && (
            <NavLink
              href="/etablissements"
              icon={Buildings}
              active={pathname.startsWith("/etablissements")}
            >
              Établissements
            </NavLink>
          )}

          <NavLink href="/demandes" icon={ChatsCircle} active={pathname.startsWith("/demandes")}>
            {role === "admin" ? "Messages" : "Contacter mon admin"}
          </NavLink>

          {dashboardAuditId && (
            <NavLink
              href={`/audits/${dashboardAuditId}`}
              icon={ChartPieSlice}
              active={pathname === `/audits/${dashboardAuditId}`}
            >
              Tableau de bord
            </NavLink>
          )}

          {/* Pièces et mini-apps du dossier ouvert */}
          {auditId && !isAdmin && (
            <>
              <NavLink
                href={`/audits/${auditId}/documents`}
                icon={Files}
                active={pathname.startsWith(`/audits/${auditId}/documents`)}
              >
                Documents
              </NavLink>
              <NavLink
                href={`/audits/${auditId}/miniapps`}
                icon={Lightning}
                active={pathname.startsWith(`/audits/${auditId}/miniapps`)}
              >
                Mini-apps
              </NavLink>
            </>
          )}
        </nav>
      </div>

      {/* Carte organisme — mène aux paramètres, réservés à l'admin */}
      <div className="p-[18px] pt-0">
        {isAdmin ? (
          <Link
            href="/settings"
            prefetch={true}
            className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3.5 py-3 transition-colors hover:border-[var(--border-strong)]"
          >
            <OrganizationCard org={org} />
          </Link>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3.5 py-3">
            <OrganizationCard org={org} />
          </div>
        )}
      </div>
    </aside>
  );
}

function OrganizationCard({ org }: { org: OrganizationSummary }) {
  return (
    <>
      <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-[#2C5A9E] to-amethyst text-[11px] font-bold text-white">
        {initials(org.name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold">{org.name}</span>
        <span className="mt-0.5 block truncate font-mono text-[9.5px] text-[var(--text-faint)]">
          {org.siret ? `SIRET ${formatSiret(org.siret)}` : "SIRET non renseigné"}
        </span>
      </span>
    </>
  );
}

/** Encart « Dossier en cours » des maquettes : type coloré + catégorie, liseré en haut. */
/** Encart « Dossier en cours » : libellé seul, liseré coloré par la catégorie. */
function DossierContext({ audit, name }: { audit?: AuditRef; name: string }) {
  const category = audit?.categories?.[0];
  const tone = category ? (CATEGORY_TONE[category] ?? "var(--amethyst-br)") : "var(--amethyst-br)";

  return (
    <div className="relative mb-4 shrink-0 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3.5">
      <span
        className="absolute inset-x-0 top-0 h-[2px] opacity-85"
        style={{ background: tone, boxShadow: `0 0 14px ${tone}` }}
      />
      <div className="mb-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--text-faint)]">
        Dossier en cours
      </div>
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className="h-[5px] w-[5px] rounded-full bg-[var(--status-on)]"
          style={{ boxShadow: "0 0 6px var(--status-on)" }}
        />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--status-on)]">
          En cours
        </span>
      </div>
      <div className="font-sans text-[13.5px] font-medium leading-[1.2]">{name}</div>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  active,
  children,
  onClick,
}: {
  href: string;
  /** Icône Phosphor, en duotone dans une tuile de verre (globals.css : .qm-nav-tile) */
  icon: PhosphorIcon;
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href as Route}
      prefetch={true}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-[11px] rounded-[12px] px-2 py-[7px] text-[13px] font-medium transition-colors",
        active ? "text-foreground" : "text-[var(--text-soft)] hover:text-foreground",
      )}
    >
      {active && (
        <motion.div
          layoutId="sidebar-active-main"
          className="absolute inset-0 rounded-[12px] bg-gradient-to-r from-[var(--amethyst-soft)] to-[var(--amethyst-soft-2)] shadow-[inset_0_0_0_1px_var(--amethyst-soft)]"
          initial={false}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      <span className="qm-nav-tile relative z-10" data-active={active}>
        <Icon size={17} weight="duotone" />
      </span>
      <span className="relative z-10">{children}</span>
    </Link>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** SIRET affiché comme dans la maquette : 3 premiers chiffres … 3 derniers */
function formatSiret(siret: string): string {
  const digits = siret.replace(/\D/g, "");
  if (digits.length < 7) return digits;
  return `${digits.slice(0, 3)} ··· ${digits.slice(-3)}`;
}
