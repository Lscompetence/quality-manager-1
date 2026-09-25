"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/schemas/auth";
import { resetPassword } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Formulaire de mot de passe utilisé pour deux parcours identiques côté
 * Supabase Auth (une session temporaire déjà établie par le lien reçu par
 * email, puis `updateUser({ password })`) : réinitialisation classique, et
 * première connexion d'un client invité sur un dossier.
 */
export function ResetPasswordForm({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setPending(true);
    const result = await resetPassword(data);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Mot de passe défini");
    router.push(next as Route);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-5">
        <div>
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
          {errors.password && <p className="mt-1.5 text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="mt-1.5 text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Définir le mot de passe"}
        </Button>
      </div>
    </form>
  );
}
