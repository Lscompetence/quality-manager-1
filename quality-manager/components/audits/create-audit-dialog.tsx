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
import { Checkbox } from "@/components/ui/checkbox";
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
import { createAuditSchema, type CreateAuditInput, type CategoryEnum } from "@/lib/schemas/audits";
import { createAudit } from "@/lib/actions/audits";

const CATEGORIES: { value: CategoryEnum; label: string; desc: string }[] = [
  { value: "AF", label: "AF", desc: "Actions de formation" },
  { value: "BC", label: "BC", desc: "Bilans de compétences" },
  { value: "VAE", label: "VAE", desc: "Validation des acquis" },
  { value: "CFA", label: "CFA", desc: "Apprentissage" },
];

export function CreateAuditDialog() {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateAuditInput>({
    resolver: zodResolver(createAuditSchema),
    defaultValues: { categories: [], audit_type: "initial", name: "" },
  });

  const selectedCategories = watch("categories") ?? [];
  const auditType = watch("audit_type");

  const toggleCategory = (cat: CategoryEnum) => {
    const current = selectedCategories;
    const next = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
    setValue("categories", next, { shouldValidate: true });
  };

  const onSubmit = async (data: CreateAuditInput) => {
    setPending(true);
    const result = await createAudit(data);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Dossier créé");
    setOpen(false);
    reset();
    router.push(`/audits/${result.data.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nouveau dossier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un dossier d&apos;audit</DialogTitle>
          <DialogDescription>
            Renseignez le type d&apos;audit et les catégories de prestations concernées.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div>
            <Label htmlFor="name">Nom du dossier</Label>
            <Input
              id="name"
              placeholder="Ex : Audit initial 2026"
              {...register("name")}
            />
            {errors.name && <p className="mt-1.5 text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div>
            <Label>Type d&apos;audit</Label>
            <Select
              value={auditType}
              onValueChange={(v) =>
                setValue("audit_type", v as CreateAuditInput["audit_type"], { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="initial">Audit initial</SelectItem>
                <SelectItem value="surveillance">Audit de surveillance</SelectItem>
                <SelectItem value="renouvellement">Audit de renouvellement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Catégories de prestation</Label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const checked = selectedCategories.includes(cat.value);
                return (
                  <label
                    key={cat.value}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? "border-amethyst-bright bg-amethyst-bright/[0.08]"
                        : "border-border hover:bg-secondary/50"
                    }`}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleCategory(cat.value)} className="mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">{cat.label}</div>
                      <div className="text-xs text-muted-foreground">{cat.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            {errors.categories && (
              <p className="mt-1.5 text-xs text-destructive">{errors.categories.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="audit_date">Date de l&apos;audit (optionnel)</Label>
              <Input id="audit_date" type="date" {...register("audit_date")} />
            </div>
            <div>
              <Label htmlFor="certificateur">Certificateur</Label>
              <Input id="certificateur" placeholder="ICPF, AFNOR..." {...register("certificateur")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer le dossier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
