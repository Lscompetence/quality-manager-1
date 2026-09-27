"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ROLE_LABEL } from "@/lib/auth/permissions";
import { deleteMemberAccount } from "@/lib/actions/access";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Member = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin" | "editor" | "reader";
  establishments: { id: string; name: string }[];
};

/**
 * Vue d'ensemble des personnes du client. Les accès s'ouvrent et se retirent
 * établissement par établissement ; ici, on voit qui a accès à quoi et on
 * peut supprimer un compte.
 */
export function TeamSection({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personnes de l’organisme</CardTitle>
        <CardDescription>
          {members.length} personne{members.length > 1 ? "s" : ""}. Les accès s’ouvrent depuis la
          page de chaque{" "}
          <Link href="/etablissements" className="text-amethyst-bright hover:underline">
            établissement
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {members.map((m) => (
            <MemberLine key={m.id} member={m} isCurrent={m.id === currentUserId} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MemberLine({ member: m, isCurrent }: { member: Member; isCurrent: boolean }) {
  const [pending, startTransition] = React.useTransition();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const router = useRouter();
  const initials = `${m.first_name.charAt(0)}${m.last_name.charAt(0)}`.toUpperCase();

  const remove = () => {
    startTransition(async () => {
      const r = await deleteMemberAccount(m.id);
      setConfirmOpen(false);
      if (!r.ok) toast.error("Compte non supprimé", { description: r.error });
      else {
        toast.success("Compte supprimé", {
          description: `${m.first_name} ${m.last_name} n’a plus accès à Quality Manager.`,
        });
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
      <Avatar className="h-9 w-9">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {m.first_name} {m.last_name}
          {isCurrent && <span className="font-mono text-[10px] text-muted-foreground">(vous)</span>}
        </div>
        <div className="truncate font-mono text-[11px] text-muted-foreground">{m.email}</div>
        {m.role !== "admin" && (
          <div className="mt-1 text-xs text-muted-foreground">
            {m.establishments.length === 0
              ? "Aucun établissement — pas d’accès aux dossiers"
              : m.establishments.map((e) => e.name).join(" · ")}
          </div>
        )}
      </div>
      <Badge
        variant={m.role === "admin" ? "default" : m.role === "editor" ? "outline" : "secondary"}
      >
        {ROLE_LABEL[m.role]}
      </Badge>
      {m.role !== "admin" && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConfirmOpen(true)}
            disabled={pending}
            title="Supprimer le compte"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={`Supprimer le compte de ${m.first_name} ${m.last_name} ?`}
            description="Suppression définitive. Ses contributions restent dans les dossiers."
            confirmLabel="Supprimer le compte"
            pending={pending}
            onConfirm={remove}
          />
        </>
      )}
    </div>
  );
}
