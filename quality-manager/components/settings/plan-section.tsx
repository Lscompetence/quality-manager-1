"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Check,
  Clock,
  FolderOpen,
  Building2,
  HardDrive,
  Loader2,
  Lock,
  Receipt,
  Sparkles,
  TrendingDown,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils/cn";
import { updateBilling, updatePlan } from "@/lib/actions/organization";
import { listMiniAppKeys } from "@/lib/miniapps/registry";
import {
  FREE_MONTHS_ANNUAL,
  MONTHLY_PRICE_HT,
  annualMonthlyEquivalent,
  annualTotal,
  formatEuros,
} from "@/lib/pricing";
import { SUBSCRIPTION_LABEL, type SubscriptionStatus } from "@/lib/auth/permissions";

type Plan = "essentiel" | "pro" | "reseau";
type BillingCycle = "monthly" | "annual";

const PLAN_LABEL: Record<Plan, string> = { essentiel: "Essentiel", pro: "Pro", reseau: "Réseau" };
const CYCLE_LABEL: Record<BillingCycle, string> = { annual: "annuelle", monthly: "mensuelle" };

/** Tarifs du cadrage (§ 4.3), tous dérivés du prix mensuel (voir lib/pricing.ts). */
function pricing(plan: Plan): { monthly: string; annual: string; annualTotal: string } | null {
  if (plan === "reseau") return null;
  return {
    monthly: formatEuros(MONTHLY_PRICE_HT[plan]),
    annual: formatEuros(annualMonthlyEquivalent(plan)),
    annualTotal: formatEuros(annualTotal(plan)),
  };
}

/** Limites indicatives : affichées, pas encore appliquées (SPRINT8.md § 8). */
const LIMITS: Record<Plan, { audits: number | null; storage: string }> = {
  essentiel: { audits: 1, storage: "1 Go" },
  pro: { audits: 3, storage: "10 Go" },
  reseau: { audits: null, storage: "Illimité" },
};

const FEATURES: Record<Plan, { tagline: string; included: string[]; excluded: string[] }> = {
  essentiel: {
    tagline: "La conformité Qualiopi complète, en autonomie guidée.",
    included: [
      "Les 32 indicateurs, filtrés selon vos catégories",
      "Dépôt libre de preuves et vue Documents",
      "2 catégories maximum",
      "1 Go de stockage",
      "Support par email",
    ],
    excluded: ["Mini-apps métier"],
  },
  pro: {
    tagline: "Votre consultant Qualiopi intégré, avec les mini-apps.",
    included: [
      "Tout l’Essentiel",
      `Les ${listMiniAppKeys().length} mini-apps métier`,
      "Calculs et contrôles automatiques",
      "Alertes et synthèse hebdomadaire",
      "3 catégories maximum · 10 Go",
      "Support prioritaire",
    ],
    excluded: [],
  },
  reseau: {
    tagline: "Le pilotage qualité de plusieurs sites.",
    included: [
      "Tout le Pro",
      "Catégories et stockage illimités",
      "SSO entreprise, API et intégrations",
      "Account manager dédié",
    ],
    excluded: [],
  },
};

export type PendingPlanRequest = { subject: string; createdAt: string } | null;

export function PlanSection({
  plan,
  billingCycle,
  subscriptionStatus,
  nextBillingAt,
  lastPaymentAt,
  billingEmail,
  vatNumber,
  auditsActive,
  establishmentsCount,
  membersCount,
  pendingRequest,
}: {
  plan: Plan;
  billingCycle: BillingCycle;
  subscriptionStatus: SubscriptionStatus;
  nextBillingAt: string | null;
  lastPaymentAt: string | null;
  billingEmail: string;
  vatNumber: string;
  auditsActive: number;
  establishmentsCount: number;
  membersCount: number;
  /** Demande de changement de plan pas encore traitée par LS Compétences */
  pendingRequest: PendingPlanRequest;
}) {
  const price = pricing(plan);
  const limit = LIMITS[plan];
  const overAuditLimit = limit.audits !== null && auditsActive > limit.audits;

  return (
    <div className="space-y-5">
      {/* 1. L'abonnement en cours */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-mute)]">
              Votre abonnement
            </p>
            <CardTitle className="flex flex-wrap items-center gap-3 text-2xl font-light">
              Plan {PLAN_LABEL[plan]}
              <StatusPill status={subscriptionStatus} />
            </CardTitle>
            <CardDescription className="mt-1.5">
              Facturation {CYCLE_LABEL[billingCycle]}
              {price
                ? billingCycle === "annual"
                  ? ` · ${price.annualTotal} € HT par an (${price.annual} € HT/mois)`
                  : ` · ${price.monthly} € HT par mois`
                : " · sur devis"}
            </CardDescription>
          </div>
          <p className="flex max-w-[260px] items-start gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2.5 text-xs leading-relaxed text-[var(--text-mute)]">
            <Lock className="mt-px h-3.5 w-3.5 shrink-0" />
            Plan, facturation et paiements sont gérés par LS Compétences. Vous pouvez demander un
            changement ci-dessous.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {pendingRequest && (
            <div className="flex items-start gap-3 rounded-xl border border-c3/35 bg-c3/[0.07] p-4 text-sm">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-c3" />
              <p>
                <b className="font-medium">Demande en cours :</b>{" "}
                {pendingRequest.subject.replace(/^Changement d’abonnement : /, "passage au plan ")},
                envoyée le {formatDate(pendingRequest.createdAt)}. LS Compétences l’appliquera à
                réception.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Tile
              icon={<CalendarClock className="h-4 w-4" />}
              label="Prochaine échéance"
              value={nextBillingAt ? formatDate(nextBillingAt) : "À définir"}
            />
            <Tile
              icon={<Receipt className="h-4 w-4" />}
              label="Dernier paiement"
              value={lastPaymentAt ? formatDate(lastPaymentAt) : "Aucun enregistré"}
            />
            <Tile
              icon={<FolderOpen className="h-4 w-4" />}
              label="Dossiers en cours"
              value={String(auditsActive)}
              hint={
                limit.audits === null
                  ? "illimités avec ce plan"
                  : `limite indicative du plan : ${limit.audits}`
              }
              warn={overAuditLimit}
            />
            <Tile
              icon={<Building2 className="h-4 w-4" />}
              label="Établissements"
              value={String(establishmentsCount)}
              hint="tous inclus dans l’abonnement"
            />
            <Tile
              icon={<Users className="h-4 w-4" />}
              label="Personnes"
              value={String(membersCount)}
              hint="admin, responsables et lecteurs"
            />
            <Tile
              icon={<HardDrive className="h-4 w-4" />}
              label="Stockage inclus"
              value={limit.storage}
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. Retour sur investissement */}
      <div className="flex flex-col gap-4 rounded-2xl border border-c2/30 bg-gradient-to-br from-c2/[0.07] to-amethyst-bright/[0.05] p-5 sm:flex-row sm:items-center">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-c2/15 text-c2">
          <TrendingDown className="h-5 w-5" />
        </span>
        <p className="flex-1 text-sm leading-relaxed">
          Quality Manager remplace l’<b>accompagnement consultant Qualiopi</b> (environ 2 500 € HT)
          et reste disponible <b>24 h/24</b> pour guider votre équipe sur chaque indicateur.
        </p>
        <div className="shrink-0 sm:border-l sm:border-c2/30 sm:pl-5 sm:text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-mute)]">
            Économie estimée
          </p>
          <p className="font-sans text-2xl font-light text-c2">
            <b className="font-medium">1 750</b> € HT
          </p>
          <p className="font-mono text-[10px] text-[var(--text-mute)]">
            par cycle de certification
          </p>
        </div>
      </div>

      {/* 3. Changer de plan */}
      <PlanChooser plan={plan} billingCycle={billingCycle} pendingRequest={pendingRequest} />

      {/* 4. Coordonnées de facturation */}
      <BillingForm billingEmail={billingEmail} vatNumber={vatNumber} />
    </div>
  );
}

// -----------------------------------------------------------------------------

function PlanChooser({
  plan,
  billingCycle,
  pendingRequest,
}: {
  plan: Plan;
  billingCycle: BillingCycle;
  pendingRequest: PendingPlanRequest;
}) {
  const router = useRouter();
  const [cycle, setCycle] = React.useState<BillingCycle>(billingCycle);
  const [asked, setAsked] = React.useState<Plan | null>(null);
  const [pending, startTransition] = useTransition();

  const send = () => {
    const target = asked;
    if (!target) return;
    startTransition(async () => {
      const result = await updatePlan({ plan: target, billing_cycle: cycle });
      setAsked(null);
      if (!result.ok) {
        toast.error("Demande non envoyée", { description: result.error });
        return;
      }
      toast.success("Demande envoyée à LS Compétences", {
        description: `Passage au plan ${PLAN_LABEL[target]} (facturation ${CYCLE_LABEL[cycle]}) : appliqué à réception.`,
      });
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-4">
        <div>
          <CardTitle>Changer de plan</CardTitle>
          <CardDescription className="mt-1.5 max-w-xl">
            Tous les plans incluent la conformité Qualiopi complète. Votre demande est envoyée à LS
            Compétences, qui l’applique à réception.
          </CardDescription>
        </div>
        <BillingToggle cycle={cycle} setCycle={setCycle} />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-3">
          {(["essentiel", "pro", "reseau"] as Plan[]).map((p) => (
            <PlanCard
              key={p}
              plan={p}
              cycle={cycle}
              isCurrent={p === plan && cycle === billingCycle}
              isCurrentPlan={p === plan}
              recommended={p === "pro" && plan === "essentiel"}
              requestPending={Boolean(pendingRequest)}
              onSelect={() => setAsked(p)}
            />
          ))}
        </div>
      </CardContent>

      <ConfirmDialog
        open={asked !== null}
        onOpenChange={(open) => !open && setAsked(null)}
        tone="default"
        pending={pending}
        title={
          asked === "reseau"
            ? "Demander un devis pour le plan Réseau ?"
            : `Demander le plan ${asked ? PLAN_LABEL[asked] : ""} ?`
        }
        description={
          asked === "reseau"
            ? "LS Compétences vous recontacte pour établir un devis adapté à vos sites."
            : `Facturation ${CYCLE_LABEL[cycle]}. LS Compétences applique le changement à réception ; rien n’est facturé d’ici là.`
        }
        confirmLabel="Envoyer la demande"
        onConfirm={send}
      />
    </Card>
  );
}

function PlanCard({
  plan,
  cycle,
  isCurrent,
  isCurrentPlan,
  recommended,
  requestPending,
  onSelect,
}: {
  plan: Plan;
  cycle: BillingCycle;
  /** Même plan et même facturation que l'abonnement en cours */
  isCurrent: boolean;
  isCurrentPlan: boolean;
  recommended: boolean;
  requestPending: boolean;
  onSelect: () => void;
}) {
  const features = FEATURES[plan];
  const price = pricing(plan);

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border bg-[var(--surface)] p-5 transition-colors",
        isCurrentPlan
          ? "border-amethyst-bright/60 shadow-[inset_0_0_0_1px_var(--amethyst-soft)]"
          : "border-[var(--border-soft)]",
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="font-sans text-lg font-medium">{PLAN_LABEL[plan]}</h3>
        {isCurrentPlan ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--amethyst-soft-2)] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--amethyst-br)]">
            <Check className="h-3 w-3" />
            Plan actuel
          </span>
        ) : recommended ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-c2/15 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-c2">
            <Sparkles className="h-3 w-3" />
            Recommandé
          </span>
        ) : null}
      </div>
      <p className="mb-4 min-h-[36px] text-xs leading-relaxed text-[var(--text-mute)]">
        {features.tagline}
      </p>

      <div className="mb-4 border-b border-[var(--border-soft)] pb-4">
        {price ? (
          <>
            <p className="font-sans">
              <span className="text-3xl font-light">
                {cycle === "annual" ? price.annual : price.monthly}
              </span>
              <span className="text-sm text-[var(--text-mute)]"> € HT / mois</span>
            </p>
            <p className="mt-1 font-mono text-[10px] text-[var(--text-mute)]">
              {cycle === "annual"
                ? `soit ${price.annualTotal} € HT par an, ${FREE_MONTHS_ANNUAL} mois offerts`
                : "sans engagement annuel"}
            </p>
          </>
        ) : (
          <>
            <p className="font-sans text-3xl font-light">Sur devis</p>
            <p className="mt-1 font-mono text-[10px] text-[var(--text-mute)]">
              selon le nombre de sites
            </p>
          </>
        )}
      </div>

      <ul className="mb-5 flex-1 space-y-2">
        {features.included.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-c2" />
            <span>{f}</span>
          </li>
        ))}
        {features.excluded.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-[var(--text-mute)]">
            <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Button
        className="w-full"
        variant={isCurrent || requestPending ? "secondary" : "primary"}
        disabled={isCurrent || requestPending}
        onClick={onSelect}
      >
        {isCurrent
          ? "Plan actuel"
          : requestPending
            ? "Une demande est en cours"
            : plan === "reseau"
              ? "Demander un devis"
              : isCurrentPlan
                ? `Passer en facturation ${CYCLE_LABEL[cycle]}`
                : "Demander ce plan"}
      </Button>
    </div>
  );
}

function BillingToggle({
  cycle,
  setCycle,
}: {
  cycle: BillingCycle;
  setCycle: (c: BillingCycle) => void;
}) {
  const option = (value: BillingCycle, label: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setCycle(value)}
      aria-pressed={cycle === value}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
        cycle === value
          ? "bg-foreground text-background"
          : "text-[var(--text-mute)] hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] p-1">
      {option(
        "annual",
        <>
          Annuel
          <span className="rounded-full bg-c2/25 px-1.5 py-px font-mono text-[9px] text-c2">
            −{FREE_MONTHS_ANNUAL} mois
          </span>
        </>,
      )}
      {option("monthly", "Mensuel")}
    </div>
  );
}

function BillingForm({ billingEmail, vatNumber }: { billingEmail: string; vatNumber: string }) {
  const router = useRouter();
  const [email, setEmail] = React.useState(billingEmail);
  const [vat, setVat] = React.useState(vatNumber);
  const [pending, startTransition] = useTransition();
  const dirty = email !== billingEmail || vat !== vatNumber;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateBilling({ billing_email: email, vat_number: vat });
      if (!result.ok) {
        toast.error("Coordonnées non enregistrées", { description: result.error });
        return;
      }
      toast.success("Coordonnées de facturation enregistrées");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facturation</CardTitle>
        <CardDescription className="mt-1.5">Où LS Compétences envoie vos factures.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="grid items-end gap-4 md:grid-cols-[1fr_1fr_auto]">
          <div>
            <Label htmlFor="billing_email">Email de facturation</Label>
            <Input
              id="billing_email"
              type="email"
              placeholder="compta@votre-of.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="vat_number">N° de TVA intracommunautaire</Label>
            <Input
              id="vat_number"
              placeholder="FR00 123456789"
              value={vat}
              onChange={(e) => setVat(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={!dirty || pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Tile({
  icon,
  label,
  value,
  hint,
  warn = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        warn ? "border-c3/40 bg-c3/[0.06]" : "border-[var(--border-soft)] bg-[var(--surface)]",
      )}
    >
      <p className="mb-2 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-mute)]">
        <span className={warn ? "text-c3" : "text-[var(--amethyst-br)]"}>{icon}</span>
        {label}
      </p>
      <p className="font-sans text-xl font-light leading-tight">{value}</p>
      {hint && (
        <p className={cn("mt-1 text-xs", warn ? "text-c3" : "text-[var(--text-mute)]")}>
          {warn ? `Au-delà de la ${hint}` : hint}
        </p>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: SubscriptionStatus }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]",
        status === "active" &&
          "border-[rgba(88,214,154,0.32)] bg-[rgba(88,214,154,0.1)] text-[var(--status-on)]",
        status === "suspended" && "border-c3/40 bg-c3/10 text-c3",
        status === "cancelled" &&
          "border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text-faint)]",
      )}
    >
      {SUBSCRIPTION_LABEL[status]}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
