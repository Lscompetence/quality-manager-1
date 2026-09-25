"use client";

import * as React from "react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOrganization } from "@/lib/actions/organization";
import { updateOrgSchema, type UpdateOrgInput } from "@/lib/schemas/organization";

const LEGAL_FORMS = ["SAS", "SARL", "SASU", "EURL", "EI / EIRL", "Association", "Autre"];

export function ProfileSection({
  organization,
  canEdit,
}: {
  organization: {
    name: string;
    legal_form: string | null;
    siret: string | null;
    declaration_nb: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
    reset,
  } = useForm<UpdateOrgInput>({
    resolver: zodResolver(updateOrgSchema),
    defaultValues: {
      name: organization.name,
      legal_form: organization.legal_form ?? "",
      siret: organization.siret ?? "",
      declaration_nb: organization.declaration_nb ?? "",
      address: organization.address ?? "",
      phone: organization.phone ?? "",
      email: organization.email ?? "",
      website: organization.website ?? "",
    },
  });

  const legalForm = watch("legal_form");

  const onSubmit = (data: UpdateOrgInput) => {
    startTransition(async () => {
      const result = await updateOrganization(data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Organisme mis à jour");
      reset(data);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identité administrative</CardTitle>
        <CardDescription>
          Ces informations apparaîtront sur les exports d&apos;audit Qualiopi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <fieldset disabled={!canEdit} className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="name">Raison sociale</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="mt-1.5 text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="legal_form">Forme juridique</Label>
              <Select
                value={legalForm ?? ""}
                onValueChange={(v) => setValue("legal_form", v, { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {LEGAL_FORMS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="siret">SIRET</Label>
              <Input id="siret" placeholder="000 000 000 00000" {...register("siret")} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="declaration_nb">N° de déclaration d&apos;activité</Label>
              <Input id="declaration_nb" placeholder="00 00 00000 00" {...register("declaration_nb")} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address">Adresse postale</Label>
              <Input id="address" {...register("address")} />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" type="tel" {...register("phone")} />
            </div>
            <div>
              <Label htmlFor="email">Email général</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="website">Site web</Label>
              <Input id="website" type="url" placeholder="https://…" {...register("website")} />
            </div>
          </fieldset>

          {canEdit ? (
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="secondary" onClick={() => reset()} disabled={!isDirty || pending}>
                Annuler
              </Button>
              <Button type="submit" disabled={!isDirty || pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Lecture seule. Demandez à un admin de votre organisme pour modifier.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
