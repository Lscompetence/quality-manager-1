"use client";

import * as React from "react";
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
 * Changement de mot de passe pour un utilisateur déjà connecté. Même action
 * que la réinitialisation, mais on reste sur la page au lieu de rediriger.
 */
export function ChangePasswordForm() {
  const [pending, setPending] = React.useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (data: ResetPasswordInput) => {
    setPending(true);
    const result = await resetPassword(data);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Mot de passe modifié");
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <Label htmlFor="new-password">Nouveau mot de passe</Label>
        <Input id="new-password" type="password" autoComplete="new-password" {...register("password")} />
        {errors.password && <p className="mt-1.5 text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div>
        <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
        <Input id="confirm-password" type="password" autoComplete="new-password" {...register("confirmPassword")} />
        {errors.confirmPassword && (
          <p className="mt-1.5 text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">8 caractères minimum, dont 1 majuscule et 1 chiffre.</p>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Changer le mot de passe"}
        </Button>
      </div>
    </form>
  );
}
