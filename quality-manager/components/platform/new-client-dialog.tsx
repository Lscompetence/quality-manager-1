"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClientAccountSchema, type CreateClientAccountInput } from "@/lib/schemas/access";
import { createClientAccount } from "@/lib/actions/platform";

/** Crée un compte client et invite son admin. Pré-rempli depuis une demande d'ouverture. */
export function NewClientDialog({
  prefill,
  triggerLabel = "Nouveau client",
  size = "md",
}: {
  prefill?: Partial<CreateClientAccountInput>;
  triggerLabel?: string;
  size?: "md" | "sm";
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateClientAccountInput>({
    resolver: zodResolver(createClientAccountSchema),
    defaultValues: {
      organization_name: "",
      admin_email: "",
      admin_first_name: "",
      admin_last_name: "",
      plan: "pro",
      billing_cycle: "annual",
      ...prefill,
    },
  });
  const plan = watch("plan");
  const cycle = watch("billing_cycle");

  const onSubmit = async (data: CreateClientAccountInput) => {
    setPending(true);
    const r = await createClientAccount(data);
    setPending(false);
    if (!r.ok) return void toast.error("Compte non créé", { description: r.error });
    toast.success("Compte client créé", {
      description: `Invitation envoyée à ${data.admin_email} : l’admin y choisira son mot de passe.`,
    });
    setOpen(false);
    router.push(`/platform/clients/${r.data.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size}>
          <Plus className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un compte client</DialogTitle>
          <DialogDescription>
            L’admin reçoit un email pour activer son compte. Il crée ensuite ses établissements et
            ouvre les accès de ses responsables pédagogiques.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="organization_name">Organisme</Label>
            <Input id="organization_name" {...register("organization_name")} />
            {errors.organization_name && (
              <p className="mt-1.5 text-xs text-destructive">{errors.organization_name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="admin_first_name">Prénom de l’admin</Label>
              <Input id="admin_first_name" {...register("admin_first_name")} />
              {errors.admin_first_name && (
                <p className="mt-1.5 text-xs text-destructive">{errors.admin_first_name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="admin_last_name">Nom</Label>
              <Input id="admin_last_name" {...register("admin_last_name")} />
              {errors.admin_last_name && (
                <p className="mt-1.5 text-xs text-destructive">{errors.admin_last_name.message}</p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="admin_email">Email de l’admin</Label>
            <Input id="admin_email" type="email" {...register("admin_email")} />
            {errors.admin_email && (
              <p className="mt-1.5 text-xs text-destructive">{errors.admin_email.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Plan</Label>
              <Select
                value={plan}
                onValueChange={(v) => setValue("plan", v as CreateClientAccountInput["plan"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="essentiel">Essentiel</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="reseau">Réseau</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Facturation</Label>
              <Select
                value={cycle}
                onValueChange={(v) =>
                  setValue("billing_cycle", v as CreateClientAccountInput["billing_cycle"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annuelle</SelectItem>
                  <SelectItem value="monthly">Mensuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer et inviter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
