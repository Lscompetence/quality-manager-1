"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth";
import { login } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function LoginForm() {
  const [pending, setPending] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setPending(true);
    const result = await login(data);
    if (result && !result.ok) {
      toast.error(result.error);
      setPending(false);
    }
    // En cas de succès la server action redirige donc on ne fait rien
  };

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

        <div>
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1.5 text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-secondary-foreground">
            <Checkbox id="remember" />
            Se souvenir de moi
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-amethyst-bright hover:underline"
          >
            Mot de passe oublié&nbsp;?
          </Link>
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Se connecter <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
