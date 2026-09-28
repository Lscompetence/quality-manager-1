"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { handleClientRequest } from "@/lib/actions/platform";

/** Clôture (avec une réponse visible par le client) ou rouvre une demande. */
export function RequestHandler({
  id,
  status,
  response,
}: {
  id: string;
  status: "a_traiter" | "traite";
  response: string | null;
}) {
  const [text, setText] = React.useState(response ?? "");
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  const save = (next: "a_traiter" | "traite") =>
    startTransition(async () => {
      const r = await handleClientRequest({ id, status: next, response: text });
      if (!r.ok) return void toast.error(r.error);
      toast.success(next === "traite" ? "Demande traitée" : "Demande rouverte");
      router.refresh();
    });

  if (status === "traite") {
    return (
      <div className="flex items-center justify-end">
        <Button size="sm" variant="ghost" onClick={() => save("a_traiter")} disabled={pending}>
          <RotateCcw className="h-3.5 w-3.5" />
          Rouvrir
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Réponse au client (facultatif, visible dans son espace)"
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={() => save("traite")} disabled={pending}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Marquer comme traitée
        </Button>
      </div>
    </div>
  );
}
