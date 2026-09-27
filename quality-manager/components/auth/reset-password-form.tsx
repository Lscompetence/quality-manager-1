"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/schemas/auth";
import { resetPassword } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

/** Mêmes règles que `resetPasswordSchema`, affichées au fil de la saisie. */
const RULES = [
  { label: "8 caractères minimum", test: (v: string) => v.length >= 8 },
  { label: "1 majuscule", test: (v: string) => /[A-Z]/.test(v) },
  { label: "1 chiffre", test: (v: string) => /[0-9]/.test(v) },
];

/**
 * Formulaire de mot de passe utilisé pour deux parcours identiques côté
 * Supabase Auth (une session temporaire déjà établie par le lien reçu par
 * email, puis `updateUser({ password })`) : réinitialisation classique, et
 * première connexion d'un client invité sur un dossier.
 */
export function ResetPasswordForm({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });
  const password = watch("password") ?? "";

  const onSubmit = async (data: ResetPasswordInput) => {
    setPending(true);
    const result = await resetPassword(data, { fromEmailLink: true });

    if (!result.ok) {
      setPending(false);
      toast.error("Mot de passe non enregistré", { description: result.error });
      return;
    }
    toast.success("Mot de passe enregistré", { description: "Vous êtes connecté à votre espace." });
    router.replace(next as Route);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-5">
        <div>
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <div className="relative">
            <Input
              id="password"
              type={visible ? "text" : "password"}
              autoComplete="new-password"
              autoFocus
              className="pr-11"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-mute)] hover:text-foreground"
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {RULES.map((rule) => {
              const ok = rule.test(password);
              return (
                <li
                  key={rule.label}
                  className={cn(
                    "flex items-center gap-1.5 text-xs transition-colors",
                    ok ? "text-[var(--status-on)]" : "text-[var(--text-faint)]",
                  )}
                >
                  <Check className={cn("h-3 w-3", !ok && "opacity-40")} />
                  {rule.label}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <Input
            id="confirmPassword"
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            {...register("confirmPassword")}
          />
          {(errors.confirmPassword || errors.password) && (
            <p className="mt-1.5 text-xs text-destructive">
              {errors.password?.message ?? errors.confirmPassword?.message}
            </p>
          )}
        </div>

        <Button type="submit" disabled={pending} className="qm-btn-3d h-12 w-full rounded-2xl">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Enregistrer et me connecter <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
