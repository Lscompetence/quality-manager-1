"use client";

import * as React from "react";
import { useTransition } from "react";
import { Clock, FolderOpen, Search, Send, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ClientSessionOverview } from "@/lib/actions/clients";
import { resendClientAccessCredentials } from "@/lib/actions/clients";

/**
 * Liste des clients de l'organisme : leur nom, leurs dossiers confiés, et
 * l'envoi de leurs accès par email. Volontairement sans accès à la session
 * du client : l'admin n'entre jamais dans son espace.
 */
export function ClientsAdminView({ clients }: { clients: ClientSessionOverview[] }) {
  const [search, setSearch] = React.useState("");
  const [target, setTarget] = React.useState<ClientSessionOverview | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredClients = React.useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.email.toLowerCase().includes(q) ||
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.dossiers.some((d) => d.name.toLowerCase().includes(q)),
    );
  }, [clients, search]);

  const sendAccess = () => {
    const client = target;
    const access = client?.dossiers.find((d) => d.status === "active");
    if (!client || !access) return;

    startTransition(async () => {
      const toastId = toast.loading(`Envoi des accès à ${fullName(client)}…`);
      const res = await resendClientAccessCredentials(access.accessId);
      setTarget(null);
      if (!res.ok) {
        toast.error("Les accès n'ont pas été envoyés", { id: toastId, description: res.error });
        return;
      }
      toast.success(`Accès envoyés à ${fullName(client)}`, {
        id: toastId,
        description:
          res.data.mode === "invitation"
            ? `Une nouvelle invitation a été envoyée à ${res.data.email}. Le client y choisira son mot de passe.`
            : `Un email a été envoyé à ${res.data.email} pour qu'il choisisse un nouveau mot de passe.`,
      });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-[280px] max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par client, email ou dossier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <UserCheck className="h-4 w-4 text-[var(--status-on)]" />
            <strong className="text-foreground">{clients.length}</strong> client
            {clients.length > 1 ? "s" : ""} au total
          </span>
        </div>
      </div>

      {filteredClients.length === 0 ? (
        <div className="qm-glass rounded-2xl p-12 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-amethyst-bright/10 text-amethyst-bright">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="mb-1 text-lg font-medium">Aucun client trouvé</h2>
          <p className="text-sm text-muted-foreground">
            {search
              ? "Aucun résultat ne correspond à votre recherche."
              : "Aucun accès client configuré pour l'instant."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredClients.map((client) => {
            const canSend = client.dossiers.some((d) => d.status === "active");
            return (
              <div key={client.email} className="qm-glass rounded-2xl p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3.5">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amethyst-bright/20 bg-gradient-to-br from-amethyst/30 to-amethyst-bright/10 font-sans text-sm font-semibold text-amethyst-bright">
                      {initials(client.firstName, client.lastName, client.email)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-sans text-base font-medium">{fullName(client)}</h3>
                        {client.lastSignInAt ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(88,214,154,0.32)] bg-[rgba(88,214,154,0.1)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--status-on)]">
                            <Clock className="h-3 w-3" /> Connecté{" "}
                            {formatRelativeDate(client.lastSignInAt)}
                          </span>
                        ) : (
                          <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-faint)]">
                            En attente de 1ère connexion
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{client.email}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTarget(client)}
                    disabled={!canSend || pending}
                    title={
                      canSend
                        ? "Envoyer ses accès par email"
                        : "Aucun dossier actif : réactivez un accès d'abord"
                    }
                    className="qm-btn-add inline-flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Envoyer les accès
                  </button>
                </div>

                <div className="mt-4 border-t border-[var(--border-soft)] pt-3.5">
                  <div className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--text-mute)]">
                    Dossiers confiés ({client.dossiers.length})
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {client.dossiers.map((d) => (
                      <div
                        key={d.accessId}
                        className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3"
                      >
                        <div className="flex items-center gap-2 font-sans text-xs font-semibold">
                          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amethyst-bright" />
                          <span className="truncate">{d.name}</span>
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {d.type} · {d.status === "active" ? "Actif" : "Révoqué"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
        tone="default"
        pending={pending}
        title={target ? `Envoyer les accès à ${fullName(target)} ?` : ""}
        description={
          target ? (
            <>
              Un email sera envoyé à <strong>{target.email}</strong> avec un lien pour choisir son
              mot de passe et accéder à son espace client.
            </>
          ) : null
        }
        confirmLabel="Envoyer"
        onConfirm={sendAccess}
      />
    </div>
  );
}

function fullName(client: ClientSessionOverview): string {
  return `${client.firstName} ${client.lastName}`.trim() || client.email;
}

function initials(first: string, last: string, email: string): string {
  if (first || last) {
    return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}
