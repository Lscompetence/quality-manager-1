"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { applyPlanRequest } from "@/lib/actions/platform";
import type { Cycle, PlanTier } from "@/lib/requests/categories";

const PLAN_NAME: Record<PlanTier, string> = {
  essentiel: "Essentiel",
  pro: "Pro",
  reseau: "Réseau",
};
const CYCLE_NAME: Record<Cycle, string> = { annual: "annuel", monthly: "mensuel" };

/** Encart d'une demande de changement de plan : actuel → demandé, et application en un clic. */
export function ApplyPlanButton({
  requestId,
  organizationName,
  current,
  requested,
}: {
  requestId: string;
  organizationName: string;
  current: { plan: PlanTier; cycle: Cycle } | null;
  requested: { plan: PlanTier; cycle: Cycle };
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = useTransition();
  const target = `${PLAN_NAME[requested.plan]} · ${CYCLE_NAME[requested.cycle]}`;

  const apply = () =>
    startTransition(async () => {
      const result = await applyPlanRequest(requestId);
      setOpen(false);
      if (!result.ok) {
        toast.error("Plan non appliqué", { description: result.error });
        return;
      }
      toast.success(`${organizationName} passe au plan ${target}`, {
        description: "La demande est traitée et l’admin du client a été prévenu.",
      });
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amethyst-bright/30 bg-amethyst-bright/[0.06] p-3.5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-[var(--text-mute)]">Plan actuel</span>
        <b className="font-medium">
          {current ? `${PLAN_NAME[current.plan]} · ${CYCLE_NAME[current.cycle]}` : "—"}
        </b>
        <ArrowRight className="h-3.5 w-3.5 text-[var(--amethyst-br)]" />
        <span className="text-[var(--text-mute)]">demandé</span>
        <b className="font-medium text-[var(--amethyst-br)]">{target}</b>
      </div>
      <Button size="sm" onClick={() => setOpen(true)} disabled={pending}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        Appliquer ce plan
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        tone="default"
        pending={pending}
        title={`Passer ${organizationName} au plan ${target} ?`}
        description="Le plan et la facturation du client changent tout de suite, la demande passe en « traité » et son admin reçoit une notification. Pensez à enregistrer le paiement correspondant dans la fiche du client."
        confirmLabel="Appliquer"
        onConfirm={apply}
      />
    </div>
  );
}
