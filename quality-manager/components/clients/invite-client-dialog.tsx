"use client";

import * as React from "react";
import { useTransition } from "react";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteClientToAudit } from "@/lib/actions/clients";

/**
 * Bouton « Inviter un client » et sa fenêtre : un email crée l'accès du
 * client à ce dossier précis. Utilisé sur la page du dossier et sur la page
 * Clients.
 */
export function InviteClientDialog({
  auditId,
  auditName,
}: {
  auditId: string;
  auditName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    const value = email.trim();
    if (!value) return;
    startTransition(async () => {
      const result = await inviteClientToAudit({ auditId, email: value });
      if (!result.ok) {
        toast.error("Invitation non envoyée", { description: result.error });
        return;
      }
      toast.success(
        result.data.mode === "invited"
          ? `Invitation envoyée à ${value}`
          : `Accès ajouté pour ${value}`,
        {
          description:
            result.data.mode === "invited"
              ? "Il recevra un email pour choisir son mot de passe."
              : "Ce client avait déjà un compte : le dossier apparaît dans son espace.",
        },
      );
      setEmail("");
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="qm-btn-3d inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[12.5px] font-semibold"
        >
          <Mail className="h-3.5 w-3.5" />
          Inviter un client
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {auditName ? `Inviter un client · ${auditName}` : "Inviter un client sur ce dossier"}
          </DialogTitle>
        </DialogHeader>
        <p className="mb-1 text-[13px] text-muted-foreground">
          Un email lui sera envoyé pour créer son accès. Il ne verra que ce dossier — statut des
          indicateurs et documents — et pourra y déposer ses propres preuves.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor={`client-email-${auditId}`}>Email du client</Label>
          <Input
            id={`client-email-${auditId}`}
            type="email"
            placeholder="contact@client.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            disabled={pending}
          />
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !email.trim()}
            className="qm-btn-next inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[13px]"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            Envoyer l&apos;invitation
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
