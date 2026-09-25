"use client";

import * as React from "react";
import { useTransition } from "react";
import { Ban, Check, Copy, Key, Loader2, Mail, RotateCcw, Send, UserPlus } from "lucide-react";
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
import {
  inviteClientToAudit,
  reactivateClientAccess,
  resendClientAccessCredentials,
  revokeClientAccess,
} from "@/lib/actions/clients";
import { cn } from "@/lib/utils/cn";

export type ClientAccessRow = {
  id: string;
  invited_email: string;
  status: "active" | "revoked";
  created_at: string;
};

/**
 * Carte « Accès client » d'un dossier : qui peut le consulter depuis
 * l'espace client, avec le bouton d'invitation et le détail de chaque accès.
 */
export function ClientAccessCard({ auditId, accesses }: { auditId: string; accesses: ClientAccessRow[] }) {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!email.trim()) return;
    startTransition(async () => {
      const result = await inviteClientToAudit({ auditId, email: email.trim() });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.data.mode === "invited"
          ? `Invitation envoyée à ${email.trim()}`
          : `Accès ajouté pour ${email.trim()} (compte client existant)`,
      );
      setEmail("");
      setOpen(false);
    });
  };

  return (
    <div className="qm-glass rounded-[18px] px-6 py-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--amethyst-soft-2)] text-[var(--amethyst-br)]">
            <UserPlus className="h-4 w-4" />
          </span>
          <div>
            <div className="font-sans text-[15px] font-medium">Accès client</div>
            <div className="font-mono text-[10.5px] text-[var(--text-mute)]">
              Qui peut consulter ce dossier depuis son espace client
            </div>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button type="button" className="qm-btn-3d inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[12.5px] font-semibold">
              <Mail className="h-3.5 w-3.5" />
              Inviter un client
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Inviter un client sur ce dossier</DialogTitle>
            </DialogHeader>
            <p className="mb-1 text-[13px] text-muted-foreground">
              Un email lui sera envoyé pour créer son accès. Il ne verra que ce dossier — statut des
              indicateurs et documents — et pourra y déposer ses propres preuves.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="client-email">Email du client</Label>
              <Input
                id="client-email"
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
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                Envoyer l&apos;invitation
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {accesses.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--border-soft)] px-4 py-5 text-center text-[12.5px] text-[var(--text-mute)]">
          Aucun client invité pour l&apos;instant.
        </p>
      ) : (
        <div className="space-y-1.5">
          {accesses.map((access) => (
            <AccessRow key={access.id} access={access} />
          ))}
        </div>
      )}
    </div>
  );
}

function AccessRow({ access }: { access: ClientAccessRow }) {
  const [pending, startTransition] = useTransition();
  const [resending, startResend] = useTransition();
  const [linkModalOpen, setLinkModalOpen] = React.useState(false);
  const [directLink, setDirectLink] = React.useState<string | undefined>(undefined);
  const [copied, setCopied] = React.useState(false);

  const active = access.status === "active";

  const toggle = () => {
    startTransition(async () => {
      const result = active ? await revokeClientAccess(access.id) : await reactivateClientAccess(access.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(active ? "Accès révoqué" : "Accès réactivé");
    });
  };

  const handleResendCredentials = () => {
    startResend(async () => {
      const res = await resendClientAccessCredentials(access.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Accès ré-envoyés à ${res.data.email}`);
      if (res.data.directLink) {
        setDirectLink(res.data.directLink);
        setLinkModalOpen(true);
      }
    });
  };

  const copyToClipboard = () => {
    if (!directLink) return;
    navigator.clipboard.writeText(directLink);
    setCopied(true);
    toast.success("Lien de connexion copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface)] px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">{access.invited_email}</div>
          <div className="font-mono text-[10px] text-[var(--text-faint)]">
            Invité le {formatDate(access.created_at)}
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]",
            active
              ? "border-[rgba(88,214,154,0.32)] bg-[rgba(88,214,154,0.1)] text-[var(--status-on)]"
              : "border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text-faint)]",
          )}
        >
          {active ? "Actif" : "Révoqué"}
        </span>

        <div className="flex items-center gap-1.5">
          {active && (
            <button
              type="button"
              onClick={handleResendCredentials}
              disabled={resending}
              title="Envoyer / Renvoyer les accès au client"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--amethyst-soft)] bg-[var(--amethyst-soft-2)] px-2.5 text-[11.5px] font-semibold text-[var(--amethyst-br)] transition-all hover:bg-[var(--amethyst-bright)] hover:text-white disabled:opacity-50"
            >
              {resending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>Envoyer accès</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            title={active ? "Révoquer l'accès" : "Réactiver l'accès"}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--border-soft)] text-[var(--text-mute)] transition-colors hover:bg-[var(--surface-2)] hover:text-foreground disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : active ? (
              <Ban className="h-3.5 w-3.5" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-4 w-4 text-amethyst-bright" />
              Accès ré-envoyé avec succès
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            Un email de connexion a été envoyé à <strong>{access.invited_email}</strong>. Vous pouvez aussi lui transmettre ce lien direct pour lui permettre d&apos;accéder immédiatement à son espace :
          </p>
          {directLink && (
            <div className="flex items-center gap-2">
              <Input readOnly value={directLink} className="font-mono text-xs" />
              <button
                type="button"
                onClick={copyToClipboard}
                className="qm-btn-3d flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-[var(--status-on)]" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copié !" : "Copier"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

