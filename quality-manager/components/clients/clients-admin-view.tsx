"use client";

import * as React from "react";
import Link from "next/link";
import { useTransition } from "react";
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FolderOpen,
  Key,
  Loader2,
  Mail,
  Search,
  Send,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ClientSessionOverview } from "@/lib/actions/clients";
import { resendClientAccessCredentials } from "@/lib/actions/clients";

export function ClientsAdminView({ clients }: { clients: ClientSessionOverview[] }) {
  const [search, setSearch] = React.useState("");
  const [selectedClient, setSelectedClient] = React.useState<ClientSessionOverview | null>(null);
  const [directLinkModal, setDirectLinkModal] = React.useState<{ email: string; link?: string } | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [pendingAccessId, setPendingAccessId] = React.useState<string | null>(null);
  const [, startTransition] = useTransition();

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

  const handleResendAccess = (accessId: string, email: string) => {
    setPendingAccessId(accessId);
    startTransition(async () => {
      const res = await resendClientAccessCredentials(accessId);
      setPendingAccessId(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Accès ré-envoyés à ${email}`);
      if (res.data.directLink) {
        setDirectLinkModal({ email, link: res.data.directLink });
      }
    });
  };

  const copyLink = () => {
    if (!directLinkModal?.link) return;
    navigator.clipboard.writeText(directLinkModal.link);
    setCopied(true);
    toast.success("Lien copié dans le presse-papier !");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Barre de filtre & métriques */}
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
            <strong className="text-foreground">{clients.length}</strong> clients au total
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
            {search ? "Aucun résultat ne correspond à votre recherche." : "Aucun accès client configuré pour l'instant."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredClients.map((client) => (
            <div key={client.email} className="qm-glass qm-glass-hover rounded-2xl p-5 transition-all">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                {/* Info Client */}
                <div className="flex items-start gap-3.5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amethyst/30 to-amethyst-bright/10 font-sans text-sm font-semibold text-amethyst-bright border border-amethyst-bright/20">
                    {initials(client.firstName, client.lastName, client.email)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-sans text-base font-medium">
                        {client.firstName || client.lastName
                          ? `${client.firstName} ${client.lastName}`.trim()
                          : client.email}
                      </h3>
                      {client.lastSignInAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(88,214,154,0.32)] bg-[rgba(88,214,154,0.1)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--status-on)]">
                          <Clock className="h-3 w-3" /> Connecté {formatRelativeDate(client.lastSignInAt)}
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

                {/* Actions globales client */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedClient(client)}
                    className="qm-btn-3d inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-xs font-semibold"
                  >
                    <Eye className="h-3.5 w-3.5 text-amethyst-bright" />
                    Consulter les sessions ({client.dossiers.length})
                  </button>
                </div>
              </div>

              {/* Dossiers rattachés à ce client */}
              <div className="mt-4 border-t border-[var(--border-soft)] pt-3.5">
                <div className="mb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--text-mute)]">
                  Dossiers confiés ({client.dossiers.length})
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {client.dossiers.map((d) => (
                    <div
                      key={d.accessId}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3 transition-colors hover:bg-[var(--surface-2)]"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/audits/${d.auditId}`}
                          className="flex items-center gap-2 font-sans text-xs font-semibold hover:underline"
                        >
                          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amethyst-bright" />
                          <span className="truncate">{d.name}</span>
                        </Link>
                        <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {d.type} · Statut {d.status === "active" ? "Actif" : "Révoqué"}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleResendAccess(d.accessId, client.email)}
                          disabled={pendingAccessId === d.accessId}
                          title="Envoyer les accès au client pour ce dossier"
                          className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--border-soft)] text-amethyst-bright transition-colors hover:bg-amethyst-bright/10 disabled:opacity-50"
                        >
                          {pendingAccessId === d.accessId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                        </button>

                        <Link
                          href={`/client/dossiers/${d.auditId}`}
                          target="_blank"
                          title="Aperçu session client pour ce dossier"
                          className="grid h-7 w-7 place-items-center rounded-lg border border-[var(--border-soft)] text-muted-foreground transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Consultation des sessions Client */}
      {selectedClient && (
        <Dialog open={Boolean(selectedClient)} onOpenChange={(o) => !o && setSelectedClient(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 font-sans text-xl font-light">
                <Users className="h-5 w-5 text-amethyst-bright" />
                Session client · {selectedClient.email}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground block">Email client :</span>
                  <span className="font-semibold text-foreground">{selectedClient.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Dernière connexion :</span>
                  <span className="font-semibold text-foreground">
                    {selectedClient.lastSignInAt ? formatDate(selectedClient.lastSignInAt) : "Jamais connecté"}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Accès aux dossiers ({selectedClient.dossiers.length})
                </h4>
                <div className="space-y-2">
                  {selectedClient.dossiers.map((d) => (
                    <div
                      key={d.accessId}
                      className="flex items-center justify-between rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-3 text-xs"
                    >
                      <div>
                        <div className="font-medium text-foreground">{d.name}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          Type : {d.type} · Accordé le {formatDate(d.createdAt)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleResendAccess(d.accessId, selectedClient.email)}
                          disabled={pendingAccessId === d.accessId}
                          className="qm-btn-3d inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold"
                        >
                          {pendingAccessId === d.accessId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Mail className="h-3.5 w-3.5 text-amethyst-bright" />
                          )}
                          Envoyer accès
                        </button>

                        <Link
                          href={`/client/dossiers/${d.auditId}`}
                          target="_blank"
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-2)] px-3 text-xs font-semibold hover:bg-[var(--surface)]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Consulter la vue client
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Lien direct d'accès */}
      {directLinkModal && (
        <Dialog open={Boolean(directLinkModal)} onOpenChange={(o) => !o && setDirectLinkModal(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-sans">
                <Key className="h-5 w-5 text-amethyst-bright" />
                Accès ré-envoyé avec succès
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              L&apos;email d&apos;invitation et de réinitialisation d&apos;accès a été envoyé à{" "}
              <strong>{directLinkModal.email}</strong>.
            </p>
            {directLinkModal.link && (
              <div className="space-y-2 pt-2">
                <label className="font-mono text-[11px] font-semibold text-muted-foreground block">
                  Lien de connexion directe à transmettre au client :
                </label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={directLinkModal.link} className="font-mono text-xs" />
                  <button
                    type="button"
                    onClick={copyLink}
                    className="qm-btn-3d flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-[var(--status-on)]" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copié !" : "Copier"}
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function initials(first: string, last: string, email: string): string {
  if (first || last) {
    return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
