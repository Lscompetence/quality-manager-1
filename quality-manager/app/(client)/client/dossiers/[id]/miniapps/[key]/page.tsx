import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMiniAppSchema } from "@/lib/miniapps/registry";
import { MiniApp } from "@/components/miniapps/engine/miniapp";
import { MiniAppHeader } from "@/components/miniapps/miniapp-header";
import { CockpitC7 } from "@/components/miniapps/custom/cockpit-c7";
import { MatriceCompetences } from "@/components/miniapps/custom/matrice-competences";
import { GrilleEvaluation } from "@/components/miniapps/custom/grille-evaluation";
import { SuiviAssiduite } from "@/components/miniapps/custom/suivi-assiduite";
import type { MiniAppData } from "@/lib/miniapps/schema-types";

type Params = { id: string; key: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { key } = await params;
  return { title: getMiniAppSchema(key)?.shortName ?? "Mini-app" };
}

/**
 * Une mini-app vue par le client : même cadre et mêmes données que côté
 * admin, en consultation seule. La base refuse de toute façon toute écriture
 * d'un client dans les mini-apps (aucune politique d'écriture pour lui).
 */
export default async function ClientMiniAppPage({ params }: { params: Promise<Params> }) {
  const { id, key } = await params;
  const schema = getMiniAppSchema(key);
  if (!schema) notFound();

  const supabase = await createClient();
  const [{ data: audit }, { data: dataRow }, { data: attachments }] = await Promise.all([
    supabase.from("audits").select("id, name").eq("id", id).single(),
    supabase.from("miniapp_data").select("data, updated_at").eq("audit_id", id).eq("miniapp_key", key).maybeSingle(),
    supabase
      .from("attachments")
      .select("id, kind, file_name, file_size, mime_type, storage_path, external_url, created_at, context_label, context_path")
      .eq("audit_id", id)
      .eq("miniapp_key", key),
  ]);
  if (!audit) notFound();

  const initialData = dataRow
    ? ({
        tables: ((dataRow.data as Record<string, unknown>)?.tables ?? {}) as MiniAppData["tables"],
        schemaVersion: 1,
      } as MiniAppData)
    : null;

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href={`/client/dossiers/${id}/miniapps` as Route}
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-[var(--text-mute)] hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Mini-apps · {audit.name}
      </Link>

      <MiniAppHeader
        critere={schema.critere}
        name={schema.name}
        description={schema.description}
        indicators={schema.indicators}
        docRef={schema.docRef}
        right={
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--text-mute)]">
            <Eye className="h-3.5 w-3.5" />
            Consultation
          </span>
        }
      />

      {!dataRow ? (
        <div className="qm-panel px-6 py-12 text-center">
          <p className="text-[14px] font-medium">Pas encore renseignée</p>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] text-[var(--text-mute)]">
            Votre organisme n&apos;a pas encore rempli cette mini-app pour votre dossier. Vous serez notifié dès
            qu&apos;il la mettra à jour.
          </p>
        </div>
      ) : schema.kind === "custom" ? (
        // Composants sur mesure : toute saisie désactivée d'un coup.
        <fieldset disabled className="m-0 min-w-0 border-0 p-0">
          <CustomMiniApp schemaKey={schema.key} auditId={id} initialData={initialData} attachments={attachments ?? []} />
        </fieldset>
      ) : (
        <MiniApp schemaKey={schema.key} auditId={id} initialData={initialData} attachments={attachments ?? []} readOnly />
      )}
    </div>
  );
}

function CustomMiniApp({
  schemaKey,
  auditId,
  initialData,
  attachments,
}: {
  schemaKey: string;
  auditId: string;
  initialData: MiniAppData | null;
  attachments: Array<{
    id: string;
    kind: "upload" | "ref";
    file_name: string;
    file_size: number | null;
    mime_type: string | null;
    storage_path: string | null;
    external_url: string | null;
    created_at: string;
    context_label: string | null;
  }>;
}) {
  switch (schemaKey) {
    case "cockpit-c7":
      return <CockpitC7 auditId={auditId} miniappKey={schemaKey} initialData={initialData} attachments={attachments} />;
    case "matrice-competences":
      return <MatriceCompetences auditId={auditId} miniappKey={schemaKey} initialData={initialData} />;
    case "grille-evaluation":
      return <GrilleEvaluation auditId={auditId} miniappKey={schemaKey} initialData={initialData} />;
    case "suivi-assiduite":
      return <SuiviAssiduite auditId={auditId} miniappKey={schemaKey} initialData={initialData} />;
    default:
      return null;
  }
}
