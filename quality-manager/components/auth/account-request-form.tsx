"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { accountRequestSchema, type AccountRequestInput } from "@/lib/schemas/access";
import { requestAccountOpening } from "@/lib/actions/requests";

export function AccountRequestForm() {
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountRequestInput>({ resolver: zodResolver(accountRequestSchema) });

  const onSubmit = async (data: AccountRequestInput) => {
    setPending(true);
    const r = await requestAccountOpening(data);
    setPending(false);
    if (!r.ok) return void toast.error(r.error);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-c2/30 bg-c2/10 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-c2" />
        <p className="text-sm leading-relaxed">
          Demande reçue. LS Compétences vous recontacte pour ouvrir votre compte ; vous recevrez
          ensuite un <b className="text-c2">email d’activation</b>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div>
        <Label htmlFor="organization_name">Organisme de formation</Label>
        <Input id="organization_name" {...register("organization_name")} />
        {errors.organization_name && (
          <p className="mt-1.5 text-xs text-destructive">{errors.organization_name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="contact_name">Votre nom</Label>
        <Input id="contact_name" autoComplete="name" {...register("contact_name")} />
        {errors.contact_name && (
          <p className="mt-1.5 text-xs text-destructive">{errors.contact_name.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="contact_email">Email professionnel</Label>
        <Input
          id="contact_email"
          type="email"
          autoComplete="email"
          {...register("contact_email")}
        />
        {errors.contact_email && (
          <p className="mt-1.5 text-xs text-destructive">{errors.contact_email.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="message">Message (optionnel)</Label>
        <Textarea
          id="message"
          rows={3}
          placeholder="Nombre d’établissements, échéance d’audit…"
          {...register("message")}
        />
      </div>
      {/* Champ piège : invisible pour un humain */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
        {...register("website")}
      />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Demander l’ouverture d’un compte"
        )}
      </Button>
    </form>
  );
}
