"use client";

import * as React from "react";
import { useTransition } from "react";
import { Check, X, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { updatePlan } from "@/lib/actions/organization";
import { listMiniAppKeys } from "@/lib/miniapps/registry";

type Plan = "essentiel" | "pro" | "reseau";
type BillingCycle = "monthly" | "annual";

const PRICING: Record<Plan, { monthly: number; annual: number; annualTotal: number | null }> = {
  essentiel: { monthly: 35, annual: 29, annualTotal: 350 },
  pro: { monthly: 75, annual: 62, annualTotal: 750 },
  reseau: { monthly: 0, annual: 0, annualTotal: null },
};

const FEATURES: Record<
  Plan,
  { tagline: string; included: string[]; excluded: string[]; highlight: string[] }
> = {
  essentiel: {
    tagline: "L'autonomie guidée : nos fiches d'aide sur chaque indicateur, à votre rythme",
    highlight: ["1 audit géré", "2 catégories max (AF · BC · VAE · CFA)"],
    included: [
      "Tous les indicateurs Qualiopi",
      "Dépôt libre de preuves (PDF, Excel…)",
      "Vue Documents",
      "Exports PDF audit",
      "2 à 3 utilisateurs",
      "1 Go stockage",
      "Support par email",
    ],
    excluded: ["Pas d'accès aux mini-apps"],
  },
  pro: {
    tagline: "Votre consultant Qualiopi intégré + industrialisation par les mini-apps",
    highlight: ["3 audits gérés en simultané", "3 catégories max", `Les ${listMiniAppKeys().length} mini-apps métier`],
    included: [
      "Tout l'Essentiel inclus",
      "Calculs automatisés (assiduité, évaluations…)",
      "Alertes et notifications",
      "Synthèse hebdomadaire par email",
      "2 à 3 utilisateurs",
      "10 Go stockage",
      "Support prioritaire",
    ],
    excluded: [],
  },
  reseau: {
    tagline: "Le consultant intégré + le pilotage qualité multi-sites",
    highlight: ["Audits illimités", "Toutes catégories", "Multi-organismes"],
    included: [
      "Tout le Pro inclus",
      "Utilisateurs illimités",
      "SSO entreprise (SAML / OIDC)",
      "API & intégrations",
      "Stockage illimité",
      "Account manager dédié",
    ],
    excluded: [],
  },
};

export function PlanSection({
  plan,
  billingCycle,
  billingEmail,
  vatNumber,
  auditsActive,
  isAdmin,
}: {
  plan: Plan;
  billingCycle: BillingCycle;
  billingEmail: string;
  vatNumber: string;
  auditsActive: number;
  isAdmin: boolean;
}) {
  const [cycle, setCycle] = React.useState<BillingCycle>(billingCycle);
  const [pending, startTransition] = useTransition();

  const auditQuota = plan === "essentiel" ? 1 : plan === "pro" ? 3 : Infinity;

  const handleChangePlan = (newPlan: Plan) => {
    if (!isAdmin) {
      toast.error("Action réservée aux admins");
      return;
    }
    if (newPlan === plan) return;
    startTransition(async () => {
      const result = await updatePlan({ plan: newPlan, billing_cycle: cycle });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Plan basculé vers ${newPlan}`);
    });
  };

  return (
    <div className="space-y-4">
      {/* Plan actuel + KPI utilisation */}
      <Card>
        <CardHeader>
          <CardTitle>Votre plan actuel : {plan.charAt(0).toUpperCase() + plan.slice(1)}</CardTitle>
          <CardDescription>
            Facturation {cycle === "annual" ? "annuelle" : "mensuelle"}
            {PRICING[plan].annualTotal !== null && cycle === "annual"
              ? ` · ${PRICING[plan].annualTotal} € HT/an`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <KpiTile
              label="Audits actifs"
              value={auditsActive}
              max={auditQuota === Infinity ? "∞" : auditQuota}
            />
            <KpiTile label="Utilisateurs" value="—" max={plan === "reseau" ? "∞" : "2-3"} />
            <KpiTile
              label="Stockage"
              value="—"
              max={plan === "essentiel" ? "1 Go" : plan === "pro" ? "10 Go" : "∞"}
            />
          </div>

          {/* Encart ROI consultant */}
          <div className="rounded-xl border border-c2/30 bg-gradient-to-br from-c2/[0.06] to-amethyst-bright/[0.05] p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-c2/15 text-c2">
                <DollarSign className="h-4 w-4" />
              </div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-c2">
                Votre retour sur investissement
              </p>
            </div>
            <div className="grid md:grid-cols-[1fr_auto] gap-4 items-center">
              <p className="text-sm leading-relaxed">
                Quality Manager remplace l'<b>accompagnement consultant Qualiopi</b> (~2 500 € HT
                en moyenne) tout en restant disponible <b>24/7</b> pour guider votre équipe sur
                chaque indicateur.
              </p>
              <div className="md:text-right md:border-l md:border-c2/30 md:pl-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Économie estimée
                </p>
                <p className="font-sans text-2xl font-light text-c2">
                  <b className="font-medium">1 750</b> € HT
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  par cycle de certification
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Choix du plan */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Choisir un plan</CardTitle>
            <CardDescription>
              Tous les plans incluent la conformité Qualiopi complète. Différenciation par nombre
              d'audits, catégories et fonctionnalités d'industrialisation.
            </CardDescription>
          </div>
          <BillingToggle cycle={cycle} setCycle={setCycle} />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {(["essentiel", "pro", "reseau"] as Plan[]).map((p) => (
              <PlanCard
                key={p}
                plan={p}
                isCurrent={p === plan}
                cycle={cycle}
                onSelect={() => handleChangePlan(p)}
                pending={pending}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Facturation */}
      <Card>
        <CardHeader>
          <CardTitle>Facturation</CardTitle>
          <CardDescription>Méthode de paiement et historique.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Email de facturation
              </p>
              <p>{billingEmail || "—"}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                N° TVA intracommunautaire
              </p>
              <p>{vatNumber || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiTile({ label, value, max }: { label: string; value: number | string; max: number | string }) {
  const pct =
    typeof value === "number" && typeof max === "number" && max > 0
      ? Math.min(100, (value / max) * 100)
      : null;

  return (
    <div className="p-4 rounded-lg border border-border bg-secondary/30">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
        {label}
      </p>
      <p className="font-sans text-xl font-light leading-none">
        <b className="font-medium text-amethyst-bright">{value}</b>{" "}
        <span className="text-muted-foreground text-sm">/ {max}</span>
      </p>
      {pct !== null && (
        <div className="mt-2 h-1 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amethyst to-amethyst-bright"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
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
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary p-1">
      <button
        type="button"
        className={cn(
          "rounded-full px-3 py-1 text-xs font-semibold transition-all",
          cycle === "annual"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground",
        )}
        onClick={() => setCycle("annual")}
      >
        Annuel
        <span className="ml-1.5 rounded-full bg-c2/30 px-1.5 py-0.5 font-mono text-[9px] text-c2">
          −2 MOIS
        </span>
      </button>
      <button
        type="button"
        className={cn(
          "rounded-full px-3 py-1 text-xs font-semibold transition-all",
          cycle === "monthly"
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground",
        )}
        onClick={() => setCycle("monthly")}
      >
        Mensuel
      </button>
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  cycle,
  onSelect,
  pending,
  isAdmin,
}: {
  plan: Plan;
  isCurrent: boolean;
  cycle: BillingCycle;
  onSelect: () => void;
  pending: boolean;
  isAdmin: boolean;
}) {
  const features = FEATURES[plan];
  const pricing = PRICING[plan];
  const price = cycle === "annual" ? pricing.annual : pricing.monthly;
  const isReseau = plan === "reseau";

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-card p-5",
        isCurrent
          ? "border-amethyst-bright/60 shadow-[0_0_0_2px_hsl(var(--ring)/0.15)]"
          : "border-border",
      )}
    >
      {isCurrent && (
        <Badge className="absolute -top-2 right-4">
          <Check className="h-2.5 w-2.5" />
          Actuel
        </Badge>
      )}
      <h3 className="font-sans text-lg font-medium capitalize">{plan}</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-4 min-h-[40px]">{features.tagline}</p>

      <div className="mb-4">
        {isReseau ? (
          <p className="font-sans text-3xl font-light">Sur devis</p>
        ) : (
          <>
            <p className="font-sans">
              <span className="text-3xl font-light">{price}</span>
              <span className="text-sm text-muted-foreground"> €/mois HT</span>
            </p>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
              {cycle === "annual"
                ? `facturé ${pricing.annualTotal} € HT/an`
                : "sans engagement annuel"}
            </p>
          </>
        )}
      </div>

      <ul className="space-y-1.5 mb-5">
        {features.highlight.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm font-medium">
            <Check className="h-3.5 w-3.5 text-amethyst-bright shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
        {features.included.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="h-3.5 w-3.5 text-c2 shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
        {features.excluded.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
            <X className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {isReseau ? (
        <Button variant="secondary" className="w-full">
          Nous contacter
        </Button>
      ) : (
        <Button
          className="w-full"
          variant={isCurrent ? "secondary" : "primary"}
          onClick={onSelect}
          disabled={!isAdmin || isCurrent || pending}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isCurrent ? (
            "Plan actuel"
          ) : (
            "Basculer"
          )}
        </Button>
      )}
    </div>
  );
}
