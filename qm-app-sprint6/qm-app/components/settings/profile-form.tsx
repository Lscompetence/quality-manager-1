"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/actions/profile";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/schemas/profile";

export function ProfileForm({
  initialFirstName,
  initialLastName,
}: {
  initialFirstName: string;
  initialLastName: string;
}) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { first_name: initialFirstName, last_name: initialLastName },
  });

  const onSubmit = (data: UpdateProfileInput) => {
    startTransition(async () => {
      const r = await updateProfile(data);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Profil mis à jour");
      reset(data);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={() => reset()} disabled={!isDirty || pending}>
          Annuler
        </Button>
        <Button type="submit" disabled={!isDirty || pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
