import { PageHeader } from "@/components/layout/page-header";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth/session";
import { isDossierReadOnly, readOnlyReason } from "@/lib/auth/permissions";
import { ReadOnlyBanner } from "@/components/miniapps/read-only";
import { getIndicator, MINIAPPS, type CritereNum } from "@/lib/constants/rnq";
import { DocumentsView } from "@/components/documents/documents-view";
import { indicatorCodeOf } from "@/lib/utils/context-path";

type Params = { id: string };

export const metadata = { title: "Documents" };

export default async function DocumentsPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const session = await requireMember();
  const readOnly = isDossierReadOnly(session.profile.role);
  const supabase = await createClient();

  const { data: audit } = await supabase.from("audits").select("id, name").eq("id", id).single();

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
    <div className="w-full space-y-6">
      {readOnly && (
        <div className="mb-6">
          <ReadOnlyBanner reason={readOnlyReason(session.profile.role)} />
        </div>
      )}

      <PageHeader
        eyebrow={`Vue Documents · ${enriched.length} preuves`}
        title="Documents du dossier"
        description="Toutes les preuves attachées au dossier d’audit, organisées par critère et source. C’est la vue que vous montrerez à l’auditeur."
      />

      <DocumentsView attachments={enriched} />
    </div>
  );
}
