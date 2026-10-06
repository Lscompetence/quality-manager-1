"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Forward, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { forwardTeamRequest, handleTeamRequest } from "@/lib/actions/requests";

/**
 * L'admin traite un message de son équipe : il répond et le clôt, le rouvre,
 * ou le transmet à LS Compétences quand il ne peut pas le régler lui-même.
 */
export function TeamRequestHandler({
  id,
  status,
  response,
}: {
  id: string;
  status: "a_traiter" | "traite";
  response: string | null;
}) {
  const [text, setText] = React.useState(response ?? "");
  const [confirmForward, setConfirmForward] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();

  const save = (next: "a_traiter" | "traite") =>
    startTransition(async () => {
      const r = await handleTeamRequest({ id, status: next, response: text });
      if (!r.ok) return void toast.error(r.error);
      toast.success(next === "traite" ? "Réponse envoyée" : "Message rouvert");
      router.refresh();
    });

  const forward = () =>
    startTransition(async () => {
      const r = await forwardTeamRequest(id);
      setConfirmForward(false);
      if (!r.ok) return void toast.error(r.error);
      toast.success("Message transmis à LS Compétences");
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
        placeholder="Votre réponse (visible par la personne qui vous a écrit)"
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setConfirmForward(true)}
          disabled={pending}
        >
          <Forward className="h-3.5 w-3.5" />
          Transmettre à LS Compétences
        </Button>
        <Button size="sm" onClick={() => save("traite")} disabled={pending}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Répondre et clore
        </Button>
      </div>
      <ConfirmDialog
        open={confirmForward}
        onOpenChange={setConfirmForward}
        tone="default"
        title="Transmettre à LS Compétences ?"
        description="Une demande part à LS Compétences en votre nom, avec le message de votre collaborateur. Ce message sera marqué comme transmis et son auteur en sera prévenu."
        confirmLabel="Transmettre"
        pending={pending}
        onConfirm={forward}
      />
    </div>
  );
}
