"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, MailCheck, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/schemas/auth";
import { forgotPassword, type LoginPortal } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Délai imposé par Supabase entre deux emails pour la même adresse. */
const RESEND_DELAY = 60;

export function ForgotPasswordForm({ portal = "admin" }: { portal?: LoginPortal }) {
  const [pending, setPending] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const send = async (email: string) => {
    setPending(true);
    const result = await forgotPassword({ email }, portal);
    setPending(false);
    if (!result.ok) {
      toast.error("Le lien n'a pas pu être envoyé", { description: result.error });
      return;
    }
    toast.success("Email envoyé", { description: `Consultez la boîte de réception de ${email}.` });
    setSentTo(email);
    setCooldown(RESEND_DELAY);
  };

  const onSubmit = (data: ForgotPasswordInput) => send(data.email);

  if (sentTo) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-6">
          <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[var(--amethyst-soft-2)] text-[var(--amethyst-br)]">
            <MailCheck className="h-5 w-5" />
          </span>
          <p className="mb-1.5 text-[15px] font-medium">Vérifiez votre boîte de réception</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Si un compte est associé à <b className="text-foreground">{sentTo}</b>, un lien pour
            choisir un nouveau mot de passe vient de lui être envoyé. Il est valable une heure.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Rien reçu ? Regardez dans vos courriers indésirables, puis marquez l&apos;email comme «
            non indésirable » pour recevoir les suivants normalement.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={pending || cooldown > 0}
          onClick={() => send(sentTo)}
          className="h-12 w-full rounded-2xl"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              {cooldown > 0 ? `Renvoyer l'email dans ${cooldown} s` : "Renvoyer l'email"}
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-5">
        <div>
          <Label htmlFor="email">{portal === "client" ? "Email" : "Email professionnel"}</Label>
          <Input
            id="email"
            type="email"
            placeholder={portal === "client" ? "vous@exemple.fr" : "prenom.nom@votre-of.fr"}
            autoComplete="email"
            autoFocus
            {...register("email")}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" disabled={pending} className="qm-btn-3d h-12 w-full rounded-2xl">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Envoyer le lien <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
