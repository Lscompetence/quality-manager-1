"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { signupSchema, type SignupInput } from "@/lib/schemas/auth";
import { signup } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function SignupForm() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { acceptTerms: false as unknown as true },
  });

  const accepted = watch("acceptTerms");

  const onSubmit = async (data: SignupInput) => {
    setPending(true);
    const result = await signup(data);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-c2/30 bg-c2/10 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-c2" />
        <p className="text-sm leading-relaxed">
          Compte créé. Vérifiez votre boîte mail&nbsp;: un <b>email de confirmation</b> vous a été
          envoyé.
        </p>
        <Button
          variant="secondary"
          className="mt-5 w-full"
          onClick={() => router.push("/login")}
        >
          Aller à la connexion
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName">Prénom</Label>
            <Input id="firstName" placeholder="Sofiane" {...register("firstName")} />
            {errors.firstName && (
              <p className="mt-1.5 text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="lastName">Nom</Label>
            <Input id="lastName" placeholder="Saidi" {...register("lastName")} />
            {errors.lastName && (
              <p className="mt-1.5 text-xs text-destructive">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="organizationName">Nom de votre organisme</Label>
          <Input id="organizationName" placeholder="LS Compétences" {...register("organizationName")} />
          {errors.organizationName && (
            <p className="mt-1.5 text-xs text-destructive">{errors.organizationName.message}</p>
          )}
          <p className="mt-1.5 text-[11.5px] text-muted-foreground/70">
            Vous pourrez le modifier plus tard dans les paramètres.
          </p>
        </div>

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
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1.5 text-xs text-destructive">{errors.password.message}</p>
          )}
          <p className="mt-1.5 text-[11.5px] text-muted-foreground/70">
            Min. 8 caractères, 1 majuscule, 1 chiffre.
          </p>
        </div>

        <div className="flex items-start gap-2.5 cursor-pointer">
          <Checkbox
            id="acceptTerms"
            checked={accepted}
            onCheckedChange={(c) => setValue("acceptTerms", c === true ? true : (false as unknown as true), { shouldValidate: true })}
            className="mt-0.5"
          />
          <label htmlFor="acceptTerms" className="text-xs leading-relaxed text-secondary-foreground cursor-pointer">
            J'accepte les{" "}
            <a href="#" className="text-amethyst-bright hover:underline">
              CGU
            </a>{" "}
            et la{" "}
            <a href="#" className="text-amethyst-bright hover:underline">
              politique de confidentialité
            </a>
          </label>
        </div>
        {errors.acceptTerms && (
          <p className="-mt-3 text-xs text-destructive">{errors.acceptTerms.message}</p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Créer mon compte <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
