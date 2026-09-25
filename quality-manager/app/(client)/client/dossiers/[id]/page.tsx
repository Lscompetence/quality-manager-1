import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientDossierView } from "@/components/client/client-dossier-view";

type Params = { id: string };

export const metadata = { title: "Dossier Qualiopi" };

export default async function ClientDossierPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS isole automatiquement les données du dossier attribué au client connecté
  const [{ data: audit }, { data: indicators }, { data: attachments }] = await Promise.all([
    supabase
      .from("audits")
      .select("id, name, audit_type, categories, status, audit_date")
      .eq("id", id)
      .single(),
    supabase.from("audit_indicators").select("critere_num, indicator_code, status, notes").eq("audit_id", id),
    supabase
      .from("attachments")
      .select("id, kind, file_name, file_size, mime_type, storage_path, external_url, created_at, context_label, context_path")
      .eq("audit_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!audit) notFound();

  return (
    <ClientDossierView
      audit={audit}
      indicators={indicators ?? []}
      attachments={attachments ?? []}
    />
  );
}
