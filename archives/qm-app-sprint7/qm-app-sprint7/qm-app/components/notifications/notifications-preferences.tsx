"use client";

import * as React from "react";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { updateNotifPreferences } from "@/lib/actions/profile";

type Prefs = Record<string, Record<string, boolean>>;

const CATEGORIES: { key: string; label: string; description: string; channels: ("inapp" | "email")[] }[] = [
  {
    key: "echeance_30j",
    label: "Échéances à 30 jours",
    description: "Alerte 30 jours avant la date d'audit prévue",
    channels: ["inapp", "email"],
  },
  {
    key: "echeance_7j",
    label: "Échéances à 7 jours",
    description: "Rappel urgent 7 jours avant l'audit",
    channels: ["inapp", "email"],
  },
  {
    key: "alerte_orange",
    label: "Alertes Orange (assiduité < 85%)",
    description: "Un apprenant passe sous le seuil orange",
    channels: ["inapp", "email"],
  },
  {
    key: "alerte_rouge",
    label: "Alertes Rouge (assiduité < 70%)",
    description: "Un apprenant passe sous le seuil rouge — risque abandon",
    channels: ["inapp", "email"],
  },
  {
    key: "weekly_digest",
    label: "Synthèse hebdomadaire",
    description: "Résumé de la semaine envoyé chaque lundi matin",
    channels: ["email"],
  },
];

export function NotificationsPreferences({ initialPreferences }: { initialPreferences: Prefs }) {
  const [prefs, setPrefs] = React.useState<Prefs>(initialPreferences);
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = React.useState(false);

  const toggle = (catKey: string, channel: "inapp" | "email") => {
    setPrefs((prev) => {
      const next = { ...prev };
      const current = next[catKey] ?? {};
      next[catKey] = { ...current, [channel]: !current[channel] };
      return next;
    });
    setDirty(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      const r = await updateNotifPreferences({ preferences: prefs });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Préférences enregistrées");
      setDirty(false);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Préférences de notification</CardTitle>
        <CardDescription>
          Choisissez les notifications à recevoir, et sur quels canaux.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {CATEGORIES.map((cat) => (
            <div key={cat.key} className="flex items-start gap-4 p-4 rounded-lg border border-border bg-secondary/30">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{cat.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {cat.channels.includes("inapp") && (
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={prefs[cat.key]?.inapp ?? false}
                      onCheckedChange={() => toggle(cat.key, "inapp")}
                    />
                    <span className="font-mono uppercase tracking-wider">In-app</span>
                  </label>
                )}
                {cat.channels.includes("email") && (
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={prefs[cat.key]?.email ?? false}
                      onCheckedChange={() => toggle(cat.key, "email")}
                    />
                    <span className="font-mono uppercase tracking-wider">Email</span>
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t border-border">
          <Button onClick={handleSave} disabled={!dirty || pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
