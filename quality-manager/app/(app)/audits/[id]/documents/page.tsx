import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getIndicator, MINIAPPS, type CritereNum } from "@/lib/constants/rnq";
import { DocumentsView } from "@/components/documents/documents-view";
import { indicatorCodeOf } from "@/lib/utils/context-path";

type Params = { id: string };

export const metadata = { title: "Documents" };

export default async function DocumentsPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: audit } = await supabase
    .from("audits")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!audit) notFound();

  // Toutes les PJ du dossier
  const { data: attachments } = await supabase
    .from("attachments")
    .select(
      "id, kind, file_name, file_size, mime_type, storage_path, external_url, created_at, context_label, context_path, miniapp_key",
    )
    .eq("audit_id", id)
    .order("created_at", { ascending: false });

  // Enrichir chaque PJ avec critère + indicateur déduit
  type EnrichedAttachment = NonNullable<typeof attachments>[number] & {
    critere: CritereNum | null;
    indicatorCode: string | null;
    sourceLabel: string;
  };

  const enriched: EnrichedAttachment[] = (attachments ?? []).map((att) => {
    let critere: CritereNum | null = null;
    let indicatorCode: string | null = null;
    let sourceLabel = "—";

    // Cas 1 : PJ attachée à un indicateur via context_path = "indicator:I11"
    const codeFromPath = indicatorCodeOf(att.context_path);
    if (codeFromPath) {
      indicatorCode = codeFromPath;
      const ind = getIndicator(codeFromPath);
      if (ind) {
        critere = ind.critere as CritereNum;
        sourceLabel = `Indicateur ${indicatorCode}`;
      }
    }
    // Cas 2 : PJ attachée à une mini-app via miniapp_key
    else if (att.miniapp_key) {
      const meta = MINIAPPS[att.miniapp_key];
      if (meta) {
        critere = meta.critere as CritereNum;
        sourceLabel = meta.shortName;
      }
    }

    return { ...att, critere, indicatorCode, sourceLabel };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">

      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright mb-2">
          Vue Documents · {enriched.length} preuves
        </p>
        <h1 className="font-sans text-3xl font-light tracking-tight">Documents du dossier</h1>
        <p className="mt-2 text-muted-foreground">
          Toutes les preuves attachées au dossier d&apos;audit, organisées par critère et source.
          C&apos;est la vue que vous montrerez à l&apos;auditeur.
        </p>
      </div>

      <DocumentsView attachments={enriched} />
    </div>
  );
}
