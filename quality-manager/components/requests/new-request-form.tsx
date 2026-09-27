"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clientRequestSchema, type ClientRequestInput } from "@/lib/schemas/access";
import { createClientRequest } from "@/lib/actions/requests";
import { REQUEST_KIND_LABEL } from "@/lib/auth/permissions";

const KINDS: ClientRequestInput["kind"][] = ["support", "reclamation", "suggestion", "autre"];

export function NewRequestForm() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ClientRequestInput>({
    resolver: zodResolver(clientRequestSchema),
    defaultValues: { kind: "support", subject: "", message: "" },
  });
  const kind = watch("kind");

  const onSubmit = async (data: ClientRequestInput) => {
    setPending(true);
    const r = await createClientRequest(data);
    setPending(false);
    if (!r.ok) return void toast.error(r.error);
    toast.success("Message envoyé à LS Compétences");
    reset({ kind: "support", subject: "", message: "" });
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <div>
          <Label>Type</Label>
          <Select
            value={kind}
            onValueChange={(v) => setValue("kind", v as ClientRequestInput["kind"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {REQUEST_KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="subject">Objet</Label>
          <Input id="subject" {...register("subject")} />
          {errors.subject && (
            <p className="mt-1.5 text-xs text-destructive">{errors.subject.message}</p>
          )}
        </div>
      </div>
      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" rows={5} {...register("message")} />
        {errors.message && (
          <p className="mt-1.5 text-xs text-destructive">{errors.message.message}</p>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Envoyer
        </Button>
      </div>
    </form>
  );
}
