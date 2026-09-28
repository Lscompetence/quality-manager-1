"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Pause, Play, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  deleteClientAccount,
  recordPayment,
  resendAdminInvite,
  setClientPlan,
  setSubscriptionStatus,
} from "@/lib/actions/platform";
import type { SubscriptionStatus } from "@/lib/auth/permissions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Result = { ok: true } | { ok: false; error: string };

function useAction() {
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<Result>, success: string, onDone?: () => void) =>
    startTransition(async () => {
      const r = await fn();
      onDone?.();
      if (!r.ok) toast.error("L’opération n’a pas abouti", { description: r.error });
      else {
        toast.success(success);
        router.refresh();
      }
    });
  return { pending, run };
}

export function StatusActions({
  organizationId,
  status,
}: {
  organizationId: string;
  status: SubscriptionStatus;
}) {
  const { pending, run } = useAction();
  const [asking, setAsking] = React.useState<"suspended" | "cancelled" | null>(null);
  const set = (next: SubscriptionStatus, label: string) =>
    run(
      () => setSubscriptionStatus({ organization_id: organizationId, status: next }),
      label,
      () => setAsking(null),
    );

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "active" && (
        <Button size="sm" onClick={() => set("active", "Accès rétabli")} disabled={pending}>
          <Play className="h-3.5 w-3.5" />
          Réactiver
        </Button>
      )}
      {status === "active" && (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => setAsking("suspended")}
        >
          <Pause className="h-3.5 w-3.5" />
          Suspendre
        </Button>
      )}
      {status !== "cancelled" && (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => setAsking("cancelled")}
        >
          <XCircle className="h-3.5 w-3.5" />
          Résilier
        </Button>
      )}
      {pending && <Loader2 className="h-4 w-4 animate-spin self-center" />}

      <ConfirmDialog
        open={asking !== null}
        onOpenChange={(open) => !open && setAsking(null)}
        title={
          asking === "cancelled" ? "Résilier l’abonnement ?" : "Suspendre l’accès de ce client ?"
        }
        description={
          asking === "cancelled"
            ? "Ses utilisateurs perdent l’accès. Les données sont conservées jusqu’à une suppression définitive."
            : "Ses utilisateurs ne verront plus leurs dossiers jusqu’à la réactivation. Rien n’est effacé."
        }
        confirmLabel={asking === "cancelled" ? "Résilier" : "Suspendre"}
        pending={pending}
        onConfirm={() =>
          asking === "cancelled"
            ? set("cancelled", "Abonnement résilié")
            : set("suspended", "Client suspendu")
        }
      />
    </div>
  );
}

export function PaymentForm({
  organizationId,
  nextBillingAt,
}: {
  organizationId: string;
  nextBillingAt: string | null;
}) {
  const { pending, run } = useAction();
  const today = new Date().toISOString().slice(0, 10);
  const [paidAt, setPaidAt] = React.useState(today);
  const [next, setNext] = React.useState(nextBillingAt?.slice(0, 10) ?? "");

  return (
    <form
      className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            recordPayment({
              organization_id: organizationId,
              paid_at: paidAt,
              next_billing_at: next,
            }),
          "Paiement enregistré",
        );
      }}
    >
      <div>
        <Label htmlFor="paid_at">Paiement reçu le</Label>
        <Input
          id="paid_at"
          type="date"
          value={paidAt}
          onChange={(e) => setPaidAt(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="next_billing_at">Prochaine échéance</Label>
        <Input
          id="next_billing_at"
          type="date"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
      </Button>
    </form>
  );
}

export function PlanForm({
  organizationId,
  plan,
  billingCycle,
}: {
  organizationId: string;
  plan: "essentiel" | "pro" | "reseau";
  billingCycle: "monthly" | "annual";
}) {
  const { pending, run } = useAction();
  const [p, setP] = React.useState(plan);
  const [c, setC] = React.useState(billingCycle);
  const dirty = p !== plan || c !== billingCycle;
  return (
    <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <div>
        <Label>Plan</Label>
        <Select value={p} onValueChange={(v) => setP(v as typeof plan)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="essentiel">Essentiel</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="reseau">Réseau</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Facturation</Label>
        <Select value={c} onValueChange={(v) => setC(v as typeof billingCycle)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="annual">Annuelle</SelectItem>
            <SelectItem value="monthly">Mensuelle</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        disabled={!dirty || pending}
        onClick={() =>
          run(
            () => setClientPlan({ organization_id: organizationId, plan: p, billing_cycle: c }),
            "Plan mis à jour",
          )
        }
      >
        Enregistrer
      </Button>
    </div>
  );
}

export function ResendInviteButton({ organizationId }: { organizationId: string }) {
  const { pending, run } = useAction();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        run(() => resendAdminInvite(organizationId), "Accès renvoyés à l’admin par email")
      }
    >
      <Mail className="h-3.5 w-3.5" />
      Renvoyer les accès
    </Button>
  );
}

export function DeleteClientDialog({
  organizationId,
  name,
}: {
  organizationId: string;
  name: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [confirmName, setConfirmName] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  const submit = () =>
    startTransition(async () => {
      const r = await deleteClientAccount({
        organization_id: organizationId,
        confirm_name: confirmName,
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success("Compte client supprimé");
      setOpen(false);
      router.push("/platform/clients");
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
          Supprimer le compte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer définitivement {name} ?</DialogTitle>
          <DialogDescription>
            Tous les établissements, dossiers, preuves et comptes utilisateurs de ce client seront
            effacés. Cette action est irréversible. Pensez à prévenir le client pour qu’il exporte
            ses données avant.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="confirm_name">Tapez le nom exact du client pour confirmer</Label>
          <Input
            id="confirm_name"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={name}
          />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Annuler
          </Button>
          <Button
            onClick={submit}
            disabled={pending || confirmName.trim() !== name.trim()}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer définitivement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
