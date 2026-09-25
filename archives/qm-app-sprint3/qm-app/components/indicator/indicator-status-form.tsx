"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { upsertIndicator } from "@/lib/actions/indicators";
import type { IndicatorStatusEnum } from "@/lib/schemas/indicators";

const STATUSES: { value: IndicatorStatusEnum; label: string }[] = [
  { value: "a_traiter", label: "À traiter" },
  { value: "en_cours", label: "En cours" },
  { value: "complet", label: "Complet" },
  { value: "non_applicable", label: "Non applicable" },
];

export function IndicatorStatusForm({
  auditId,
  indicatorCode,
  initialStatus,
  initialNotes,
}: {
  auditId: string;
  indicatorCode: string;
  initialStatus: string;
  initialNotes: string;
}) {
  const [status, setStatus] = React.useState<IndicatorStatusEnum>(
    (initialStatus as IndicatorStatusEnum) ?? "a_traiter",
  );
  const [notes, setNotes] = React.useState(initialNotes ?? "");
  const [pending, startTransition] = useTransition();

  const dirty =
    status !== ((initialStatus as IndicatorStatusEnum) ?? "a_traiter") ||
    notes !== (initialNotes ?? "");

  const handleSave = () => {
    startTransition(async () => {
      const result = await upsertIndicator({
        audit_id: auditId,
        indicator_code: indicatorCode,
        status,
        notes,
      });
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success("Indicateur mis à jour");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
          Statut
        </label>
        <Select value={status} onValueChange={(v) => setStatus(v as IndicatorStatusEnum)}>
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
          Notes internes
        </label>
        <Textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes, contexte, points d'attention pour l'audit…"
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!dirty || pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
