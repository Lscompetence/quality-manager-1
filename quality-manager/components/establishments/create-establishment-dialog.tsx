"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { establishmentSchema, type EstablishmentInput } from "@/lib/schemas/access";
import { createEstablishment, updateEstablishment } from "@/lib/actions/access";

type Existing = EstablishmentInput & { id: string };

/** Création (sans `establishment`) ou modification d'un établissement. */
export function CreateEstablishmentDialog({ establishment }: { establishment?: Existing }) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const router = useRouter();
  const editing = Boolean(establishment);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EstablishmentInput>({
    resolver: zodResolver(establishmentSchema),
    defaultValues: establishment ?? {
      name: "",
      city: "",
      siret: "",
      declaration_nb: "",
      address: "",
    },
  });

  const onSubmit = async (data: EstablishmentInput) => {
    setPending(true);
    if (establishment) {
      const result = await updateEstablishment({ ...data, id: establishment.id });
      setPending(false);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Établissement mis à jour");
      setOpen(false);
      router.refresh();
      return;
    }
    const result = await createEstablishment(data);
    setPending(false);
    if (!result.ok) return void toast.error(result.error);
    toast.success("Établissement créé");
    setOpen(false);
    reset();
    router.push(`/etablissements/${result.data.id}` as Route);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="secondary" size="sm">
            <Pencil className="h-3.5 w-3.5" />
            Modifier
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" />
            Nouvel établissement
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Modifier l’établissement" : "Créer un établissement"}
          </DialogTitle>
          <DialogDescription>
            L’établissement est l’entité auditée : il porte ses propres dossiers et ses preuves.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field id="name" label="Nom" error={errors.name?.message}>
            <Input id="name" placeholder="Ex : Site de Casablanca" {...register("name")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="city" label="Ville" error={errors.city?.message}>
              <Input id="city" {...register("city")} />
            </Field>
            <Field id="siret" label="SIRET (optionnel)" error={errors.siret?.message}>
              <Input id="siret" inputMode="numeric" {...register("siret")} />
            </Field>
          </div>
          <Field
            id="declaration_nb"
            label="N° de déclaration d’activité (optionnel)"
            error={errors.declaration_nb?.message}
          >
            <Input id="declaration_nb" {...register("declaration_nb")} />
          </Field>
          <Field id="address" label="Adresse (optionnel)" error={errors.address?.message}>
            <Input id="address" {...register("address")} />
          </Field>
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
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                "Enregistrer"
              ) : (
                "Créer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
