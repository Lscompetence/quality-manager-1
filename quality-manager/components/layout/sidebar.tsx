"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { FileText, Home, LayoutDashboard, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { CRITERES, type CritereNum } from "@/lib/constants/rnq";
import { QmBrandMark } from "@/components/brand/logo";
import type { AuditRef } from "@/components/layout/auto-breadcrumb";
import { cn } from "@/lib/utils/cn";

type AuditSummary = {
  id: string;
  name: string;
  status: "en_cours" | "cloture" | "archive";
};

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
  currentAudit,
  audits = [],
  critereScoresByAudit = {},
}: {
  organizationName: string;
  organization?: OrganizationSummary;
  currentAudit: AuditSummary | null;
  audits?: AuditRef[];
  /** Couverture par critère (0-100), par dossier */
  critereScoresByAudit?: Record<string, Partial<Record<CritereNum, number>>>;
}) {
  const pathname = usePathname();
  const org = organization ?? { name: organizationName, siret: null };


  // Le menu suit le dossier ouvert dans l'URL. Ailleurs, il reste sur le dossier
  // en cours, pour garder ses critères sous la main depuis l'accueil.
  const routeAuditId = pathname.startsWith("/audits/") ? pathname.split("/")[2] : undefined;
  const auditId = routeAuditId ?? currentAudit?.id;
  const audit = auditId ? audits.find((a) => a.id === auditId) : undefined;
  const scores = auditId ? critereScoresByAudit[auditId] : undefined;

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
          <span className="truncate text-[14.5px] font-semibold tracking-tight">Quality Manager</span>
          <span className="mt-0.5 truncate font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--text-mute)]">
            LS Compétences
          </span>
        </div>
      </Link>

      <div className="qm-scroll-hidden flex min-h-0 flex-1 flex-col overflow-y-auto px-[18px] pt-[22px]">
        {/* Contexte du dossier : ouvert dans l'URL, ou dossier en cours */}
        {auditId && <DossierContext audit={audit} name={audit?.name ?? currentAudit?.name ?? "Dossier"} />}

        {/* Navigation : les quatre entrées du menu */}
        <nav className="relative flex shrink-0 flex-col gap-px">
          <NavLink
            href="/dashboard"
            icon={<Home className="h-4 w-4" />}
            active={pathname === "/dashboard"}
          >Vue d&apos;ensemble</NavLink>

          {auditId && (
            <>
              <NavLink
                href={`/audits/${auditId}`}
                icon={<LayoutDashboard className="h-4 w-4" />}
                active={pathname === `/audits/${auditId}`}
              >
                Tableau de bord
              </NavLink>
              <NavLink
                href={`/audits/${auditId}/documents`}
                icon={<FileText className="h-4 w-4" />}
                active={pathname.includes("/documents")}
              >
                Documents
              </NavLink>
              <NavLink
                href={`/audits/${auditId}/miniapps`}
                icon={<Zap className="h-4 w-4" />}
                active={pathname.includes("/miniapps")}
              >
                Mini-apps
              </NavLink>
            </>
          )}
        </nav>

        {/* Critères du dossier, disponibles aussi depuis l'accueil */}
        {auditId && (
          <>
            <div className="mt-[22px] shrink-0 px-3 pb-2.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
              Critères
            </div>
            <nav className="relative flex shrink-0 flex-col pb-6">
              {Object.values(CRITERES).map((critere) => {
                const numStr = String(critere.num).padStart(2, "0");
                const href = `/audits/${auditId}/critere/${numStr}`;
                const active = pathname.includes(`/critere/${numStr}`);
                const score = scores?.[critere.num as CritereNum];
                return (
                  <Link
                    key={critere.num}
                    href={href as Route}
                    prefetch={true}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
                      active ? "text-foreground" : "text-[var(--text-soft)] hover:text-foreground",
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active-criteria"
                        className="absolute inset-0 rounded-lg bg-gradient-to-b from-[var(--amethyst-soft)] to-[var(--amethyst-soft-2)] shadow-[inset_0_0_0_1px_var(--amethyst-soft)]"
                        initial={false}
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex w-full items-start gap-2.5">
                      <span className="mt-0.5 w-4 shrink-0 font-mono text-[10px] text-[var(--text-faint)]">
                        {numStr}
                      </span>
                      <span
                        className="mt-[5px] h-2 w-2 shrink-0 rounded-full"
                        style={{ background: `var(--${critere.colorVar})` }}
                      />
                      <span className="flex-1 leading-[1.25]">{critere.title}</span>
                      {typeof score === "number" && (
                        <span className="mt-0.5 shrink-0 font-mono text-[10px] text-[var(--text-faint)]">
                          {score}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </div>

      {/* Carte organisme */}
      <div className="p-[18px] pt-0">
        <Link
          href="/settings"
          prefetch={true}
          className="flex items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3.5 py-3 transition-colors hover:border-[var(--border-strong)]"
        >
          <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-[#2C5A9E] to-amethyst text-[11px] font-bold text-white">
            {initials(org.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold">{org.name}</span>
            <span className="mt-0.5 block truncate font-mono text-[9.5px] text-[var(--text-faint)]">
              {org.siret ? `SIRET ${formatSiret(org.siret)}` : "SIRET non renseigné"}
            </span>
          </span>
        </Link>
      </div>
    </aside>
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
  icon,
  active,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
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
        "relative flex items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-colors",
        active ? "text-foreground" : "text-[var(--text-soft)] hover:text-foreground",
      )}
    >
      {active && (
        <motion.div
          layoutId="sidebar-active-main"
          className="absolute inset-0 rounded-[10px] bg-gradient-to-b from-[var(--amethyst-soft)] to-[var(--amethyst-soft-2)] shadow-[inset_0_0_0_1px_var(--amethyst-soft)]"
          initial={false}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-[11px] opacity-90">{icon}</span>
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
