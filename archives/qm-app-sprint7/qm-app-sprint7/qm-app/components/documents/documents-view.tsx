"use client";

import * as React from "react";
import { ExternalLink, FileText, Image as ImageIcon, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CRITERES, type CritereNum } from "@/lib/constants/rnq";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getAttachmentSignedUrl } from "@/lib/actions/attachments";
import { cn } from "@/lib/utils/cn";

type Attachment = {
  id: string;
  kind: "upload" | "ref";
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string | null;
  external_url: string | null;
  created_at: string;
  context_label: string | null;
  context_path: string | null;
  miniapp_key: string | null;
  critere: CritereNum | null;
  indicatorCode: string | null;
  sourceLabel: string;
};

export function DocumentsView({ attachments }: { attachments: Attachment[] }) {
  const [query, setQuery] = React.useState("");
  const [critereFilter, setCritereFilter] = React.useState<string>("all");
  const [kindFilter, setKindFilter] = React.useState<string>("all");

  const filtered = React.useMemo(() => {
    return attachments.filter((att) => {
      if (kindFilter !== "all" && att.kind !== kindFilter) return false;
      if (critereFilter !== "all" && String(att.critere) !== critereFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        const hay = `${att.file_name} ${att.sourceLabel} ${att.context_label ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [attachments, query, critereFilter, kindFilter]);

  // Grouper par critère
  const grouped = React.useMemo(() => {
    const map = new Map<string, Attachment[]>();
    for (const att of filtered) {
      const k = att.critere ? `C${att.critere}` : "Autres";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(att);
    }
    return map;
  }, [filtered]);

  return (
    <>
      {/* Filtres */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Recherche
            </label>
            <Input
              placeholder="Rechercher un document, une source…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Critère
            </label>
            <Select value={critereFilter} onValueChange={setCritereFilter}>
              <SelectTrigger className="min-w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les critères</SelectItem>
                {Object.values(CRITERES).map((c) => (
                  <SelectItem key={c.num} value={String(c.num)}>
                    C{c.num} · {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Type
            </label>
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger className="min-w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="upload">Fichiers uploadés</SelectItem>
                <SelectItem value="ref">Liens externes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground my-4">
        {filtered.length} document(s) affiché(s) sur {attachments.length} au total.
      </div>

      {/* Groupes par critère */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {attachments.length === 0
                ? "Aucune preuve attachée à ce dossier pour l'instant."
                : "Aucun résultat ne correspond à vos filtres."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, atts]) => {
              const num = key.startsWith("C") ? Number(key.slice(1)) : null;
              const critere = num ? CRITERES[num as CritereNum] : null;
              return (
                <div key={key}>
                  <div className="flex items-center gap-3 mb-3">
                    {critere ? (
                      <div className={cn("grid h-8 w-8 place-items-center rounded-lg text-white font-medium text-xs", gradClass(critere.colorVar))}>
                        C{critere.num}
                      </div>
                    ) : (
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground text-xs">
                        —
                      </div>
                    )}
                    <h2 className="font-sans text-lg font-medium">
                      {critere ? critere.title : "Autres"}
                    </h2>
                    <Badge variant="secondary">{atts.length}</Badge>
                  </div>
                  <div className="grid gap-2">
                    {atts.map((att) => (
                      <AttachmentRow key={att.id} att={att} />
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </>
  );
}

function AttachmentRow({ att }: { att: Attachment }) {
  const [opening, setOpening] = React.useState(false);

  const handleOpen = async () => {
    if (att.kind === "ref" && att.external_url) {
      window.open(att.external_url, "_blank");
      return;
    }
    if (!att.storage_path) return;
    setOpening(true);
    const result = await getAttachmentSignedUrl(att.storage_path);
    setOpening(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    window.open(result.data.url, "_blank");
  };

  const Icon = att.kind === "ref" ? Link2 : att.mime_type?.startsWith("image/") ? ImageIcon : FileText;

  return (
    <Card className="hover:border-amethyst-bright/40 transition-colors">
      <CardContent className="p-3 flex items-center gap-3">
        <div
          className={cn(
            "grid h-9 w-9 place-items-center rounded-lg shrink-0",
            att.kind === "ref" ? "bg-c6/15 text-c6" : "bg-c2/15 text-c2",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{att.file_name}</div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            <Badge variant="outline">{att.sourceLabel}</Badge>
            {att.context_label && (
              <span className="font-mono text-[10px] text-muted-foreground truncate">
                {att.context_label}
              </span>
            )}
            <span className="font-mono text-[10px] text-muted-foreground">
              {formatDate(att.created_at)}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleOpen} disabled={opening}>
          {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
          Ouvrir
        </Button>
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function gradClass(c: string): string {
  return {
    c1: "bg-gradient-to-br from-c1 to-c1-strong",
    c2: "bg-gradient-to-br from-c2 to-c2-strong",
    c3: "bg-gradient-to-br from-c3 to-c3-strong",
    c4: "bg-gradient-to-br from-c4 to-c4-strong",
    c5: "bg-gradient-to-br from-c5 to-c5-strong",
    c6: "bg-gradient-to-br from-c6 to-c6-strong",
    c7: "bg-gradient-to-br from-c7 to-c7-strong",
  }[c] ?? "bg-muted";
}
