"use client";

import * as React from "react";
import { useTransition } from "react";
import { Ban, Loader2, RotateCcw, Send, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  reactivateClientAccess,
  resendClientAccessCredentials,
  revokeClientAccess,
} from "@/lib/actions/clients";
import { cn } from "@/lib/utils/cn";
import { InviteClientDialog } from "@/components/clients/invite-client-dialog";

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
export function ClientAccessCard({
  auditId,
  accesses,
}: {
  auditId: string;
  accesses: ClientAccessRow[];
}) {
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

        <InviteClientDialog auditId={auditId} />
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

  const active = access.status === "active";

  const toggle = () => {
    startTransition(async () => {
      const result = active
        ? await revokeClientAccess(access.id)
        : await reactivateClientAccess(access.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(active ? "Accès révoqué" : "Accès réactivé");
    });
  };

  const handleResendCredentials = () => {
    startResend(async () => {
      const toastId = toast.loading(`Envoi des accès à ${access.invited_email}…`);
      const res = await resendClientAccessCredentials(access.id);
      if (!res.ok) {
        toast.error("Les accès n'ont pas été envoyés", { id: toastId, description: res.error });
        return;
      }
      toast.success(`Accès envoyés à ${res.data.email}`, {
        id: toastId,
        description:
          res.data.mode === "invitation"
            ? "Une nouvelle invitation a été envoyée. Le client y choisira son mot de passe."
            : "Un email lui a été envoyé pour qu'il choisisse un nouveau mot de passe.",
      });
    });
  };

  return (
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
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
