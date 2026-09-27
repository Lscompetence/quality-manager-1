"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { inviteMemberSchema, type InviteMemberInput } from "@/lib/schemas/access";
import { inviteMember, removeMember } from "@/lib/actions/access";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/auth/permissions";

export type MemberRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin" | "editor" | "reader";
};

export function MembersSection({
  establishmentId,
  members,
}: {
  establishmentId: string;
  members: MemberRow[];
}) {
  const hasEditor = members.some((m) => m.role === "editor");
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Accès à l’établissement</CardTitle>
          <CardDescription>
            Le responsable pédagogique remplit le dossier ; les lecteurs le consultent.
          </CardDescription>
        </div>
        <InviteMemberDialog establishmentId={establishmentId} />
      </CardHeader>
      <CardContent className="space-y-2">
        {!hasEditor && (
          <p className="rounded-lg border border-c3/30 bg-c3/[0.06] p-3 text-sm">
            <b className="text-c3">Aucun responsable pédagogique.</b> Ouvrez-lui l’accès : sans lui,
            personne ne peut créer ni remplir de dossier pour cet établissement.
          </p>
        )}
        {members.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Personne n’a encore accès.
          </p>
        ) : (
          members.map((m) => <MemberLine key={m.id} member={m} establishmentId={establishmentId} />)
        )}
      </CardContent>
    </Card>
  );
}

function MemberLine({ member, establishmentId }: { member: MemberRow; establishmentId: string }) {
  const [pending, startTransition] = React.useTransition();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const router = useRouter();
  const initials = `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`.toUpperCase();

  const remove = () => {
    startTransition(async () => {
      const r = await removeMember({ establishment_id: establishmentId, user_id: member.id });
      setConfirmOpen(false);
      if (!r.ok) toast.error("Accès non retiré", { description: r.error });
      else {
        toast.success("Accès retiré", {
          description: `${member.first_name} ${member.last_name} n’a plus accès à cet établissement.`,
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
        <div className="text-sm font-medium">
          {member.first_name} {member.last_name}
        </div>
        <div className="truncate font-mono text-[11px] text-muted-foreground">{member.email}</div>
      </div>
      <Badge variant={member.role === "editor" ? "default" : "secondary"}>
        {ROLE_LABEL[member.role]}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setConfirmOpen(true)}
        disabled={pending}
        title="Retirer l’accès"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <UserMinus className="h-3.5 w-3.5" />
        )}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Retirer l’accès de ${member.first_name} ${member.last_name} ?`}
        description="Son compte reste actif, mais il ne verra plus les dossiers de cet établissement."
        confirmLabel="Retirer l’accès"
        pending={pending}
        onConfirm={remove}
      />
    </div>
  );
}

function InviteMemberDialog({ establishmentId }: { establishmentId: string }) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      establishment_id: establishmentId,
      role: "editor",
      email: "",
      first_name: "",
      last_name: "",
    },
  });
  const role = watch("role");

  const onSubmit = async (data: InviteMemberInput) => {
    setPending(true);
    const r = await inviteMember(data);
    setPending(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success(r.data.invited ? "Invitation envoyée par email" : "Accès ouvert");
    setOpen(false);
    reset({
      establishment_id: establishmentId,
      role: "editor",
      email: "",
      first_name: "",
      last_name: "",
    });
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-3.5 w-3.5" />
          Ouvrir un accès
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ouvrir un accès</DialogTitle>
          <DialogDescription>
            La personne reçoit un email pour choisir son mot de passe. Si elle a déjà un compte dans
            votre organisme, elle est simplement rattachée à cet établissement.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <Label>Rôle</Label>
            <Select
              value={role}
              onValueChange={(v) => setValue("role", v as InviteMemberInput["role"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">{ROLE_LABEL.editor}</SelectItem>
                <SelectItem value="reader">{ROLE_LABEL.reader}</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-xs text-muted-foreground">{ROLE_DESCRIPTION[role]}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="first_name">Prénom</Label>
              <Input id="first_name" {...register("first_name")} />
              {errors.first_name && (
                <p className="mt-1.5 text-xs text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="last_name">Nom</Label>
              <Input id="last_name" {...register("last_name")} />
              {errors.last_name && (
                <p className="mt-1.5 text-xs text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email professionnel</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ouvrir l’accès"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
