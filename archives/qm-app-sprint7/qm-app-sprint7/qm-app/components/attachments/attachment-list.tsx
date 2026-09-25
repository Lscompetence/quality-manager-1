"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Image as ImageIcon, Link2, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
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
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  createAttachment,
  deleteAttachment,
  generateUploadPath,
  getAttachmentSignedUrl,
} from "@/lib/actions/attachments";
import { createClient } from "@/lib/supabase/client";

const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

type AttachmentRow = {
  id: string;
  kind: "upload" | "ref";
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string | null;
  external_url: string | null;
  created_at: string;
  context_label: string | null;
};

export function AttachmentList({
  auditId,
  miniappKey,
  contextPath,
  contextLabel,
  attachments,
}: {
  auditId?: string;
  miniappKey?: string;
  contextPath: string;
  contextLabel: string;
  attachments: AttachmentRow[];
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  return (
    <div>
      {attachments.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Aucune preuve attachée pour le moment.
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {attachments.map((att) => (
            <AttachmentRow key={att.id} att={att} onChange={() => router.refresh()} />
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Paperclip className="h-3.5 w-3.5" />
          Ajouter une preuve
        </Button>
      </div>

      <AddAttachmentDialog
        open={open}
        onOpenChange={setOpen}
        auditId={auditId}
        miniappKey={miniappKey}
        contextPath={contextPath}
        contextLabel={contextLabel}
        onAdded={() => router.refresh()}
      />
    </div>
  );
}

function AttachmentRow({ att, onChange }: { att: AttachmentRow; onChange: () => void }) {
  const [pending, startTransition] = useTransition();

  const handleOpen = async () => {
    if (att.kind === "ref" && att.external_url) {
      window.open(att.external_url, "_blank");
      return;
    }
    if (att.storage_path) {
      const result = await getAttachmentSignedUrl(att.storage_path);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      window.open(result.data.url, "_blank");
    }
  };

  const handleDelete = () => {
    if (!confirm("Supprimer cette preuve ?")) return;
    startTransition(async () => {
      const result = await deleteAttachment({ id: att.id });
      if (!result.ok) toast.error(result.error);
      else {
        toast.success("Preuve supprimée");
        onChange();
      }
    });
  };

  const Icon = att.kind === "ref" ? Link2 : att.mime_type?.startsWith("image/") ? ImageIcon : FileText;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/60 transition-colors">
      <div
        className={`grid h-9 w-9 place-items-center rounded-lg shrink-0 ${
          att.kind === "ref" ? "bg-c6/15 text-c6" : "bg-c2/15 text-c2"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{att.file_name}</div>
        <div className="font-mono text-[10px] text-muted-foreground">
          {att.kind === "ref"
            ? "Lien externe"
            : att.file_size
              ? formatSize(att.file_size)
              : ""}
          {" · "}
          {formatDate(att.created_at)}
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={handleOpen} title="Ouvrir">
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={pending}
        title="Supprimer"
        className="hover:text-destructive"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function AddAttachmentDialog({
  open,
  onOpenChange,
  auditId,
  miniappKey,
  contextPath,
  contextLabel,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  auditId?: string;
  miniappKey?: string;
  contextPath: string;
  contextLabel: string;
  onAdded: () => void;
}) {
  const [tab, setTab] = React.useState("upload");
  const [pending, setPending] = React.useState(false);

  // Upload state
  const [file, setFile] = React.useState<File | null>(null);

  // Ref state
  const [refName, setRefName] = React.useState("");
  const [refUrl, setRefUrl] = React.useState("");

  const reset = () => {
    setFile(null);
    setRefName("");
    setRefUrl("");
  };

  const handleUpload = async () => {
    if (!file) return;
    if (file.size > MAX_SIZE) {
      toast.error("Fichier trop volumineux (max 5 Mo)");
      return;
    }
    if (!ALLOWED_MIMES.includes(file.type)) {
      toast.error("Format non supporté (PDF, JPG, PNG, WebP uniquement)");
      return;
    }

    setPending(true);
    try {
      // 1. Demander un path au server
      const pathResult = await generateUploadPath({ audit_id: auditId, file_name: file.name });
      if (!pathResult.ok) {
        toast.error(pathResult.error);
        return;
      }

      // 2. Upload direct au Storage Supabase depuis le client
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(pathResult.data.bucket)
        .upload(pathResult.data.path, file, { contentType: file.type });

      if (uploadError) {
        toast.error("Échec de l'upload : " + uploadError.message);
        return;
      }

      // 3. Enregistrer en DB
      const insertResult = await createAttachment({
        audit_id: auditId,
        miniapp_key: miniappKey,
        context_path: contextPath,
        context_label: contextLabel,
        kind: "upload",
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: pathResult.data.path,
      });

      if (!insertResult.ok) {
        toast.error(insertResult.error);
        return;
      }

      toast.success("Preuve ajoutée");
      onAdded();
      onOpenChange(false);
      reset();
    } finally {
      setPending(false);
    }
  };

  const handleAddRef = async () => {
    if (!refName.trim() || !refUrl.trim()) {
      toast.error("Nom et URL requis");
      return;
    }
    setPending(true);
    const result = await createAttachment({
      audit_id: auditId,
      miniapp_key: miniappKey,
      context_path: contextPath,
      context_label: contextLabel,
      kind: "ref",
      file_name: refName,
      external_url: refUrl,
    });
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Lien ajouté");
    onAdded();
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une preuve</DialogTitle>
          <DialogDescription>
            Téléchargez un fichier (PDF, image) ou attachez un lien externe.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="upload">
              <Upload className="h-3.5 w-3.5" />
              Fichier
            </TabsTrigger>
            <TabsTrigger value="ref">
              <Link2 className="h-3.5 w-3.5" />
              Lien externe
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Fichier (PDF, JPG, PNG, WebP — max 5 Mo)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                {file && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {file.name} — {formatSize(file.size)}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
                  Annuler
                </Button>
                <Button onClick={handleUpload} disabled={!file || pending}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Télécharger"}
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>

          <TabsContent value="ref">
            <div className="space-y-4">
              <div>
                <Label htmlFor="refName">Nom du document</Label>
                <Input
                  id="refName"
                  placeholder="Ex : PV Conseil de perfectionnement 20-03-2026"
                  value={refName}
                  onChange={(e) => setRefName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="refUrl">URL externe (Drive, SharePoint…)</Label>
                <Input
                  id="refUrl"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={refUrl}
                  onChange={(e) => setRefUrl(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
                  Annuler
                </Button>
                <Button onClick={handleAddRef} disabled={pending}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter le lien"}
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(2)} Mo`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
