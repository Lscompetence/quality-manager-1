"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/schemas/auth";
import { forgotPassword } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setPending(true);
    await forgotPassword(data);
    setPending(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-c2/30 bg-c2/10 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-c2" />
        <p className="text-sm leading-relaxed">
          Si un compte est associé à cet email, vous recevrez un{" "}
          <b className="text-c2">lien de réinitialisation</b> dans quelques minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-5">
        <div>
          <Label htmlFor="email">Email professionnel</Label>
          <Input
            id="email"
            type="email"
            placeholder="prenom.nom@votre-of.fr"
            autoComplete="email"
            {...register("email")}
          />
          {errors.email && <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer le lien de réinitialisation"}
        </Button>
      </div>
    </form>
  );
}
