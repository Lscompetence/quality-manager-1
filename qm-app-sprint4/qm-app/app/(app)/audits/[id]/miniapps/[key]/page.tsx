import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CRITERES, getIndicator, type CritereNum } from "@/lib/constants/rnq";
import { getMiniAppSchema } from "@/lib/miniapps/registry";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MiniApp } from "@/components/miniapps/engine/miniapp";
import type { MiniAppData } from "@/lib/miniapps/schema-types";

type Params = { id: string; key: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { key } = await params;
  const schema = getMiniAppSchema(key);
  return { title: schema?.shortName ?? "Mini-app" };
}

export default async function MiniAppPage({ params }: { params: Promise<Params> }) {
  const { id, key } = await params;
  const schema = getMiniAppSchema(key);
  if (!schema) notFound();

  const supabase = await createClient();

  // Audit + plan
  const { data: audit } = await supabase
    .from("audits")
    .select("id, name, organization:organizations(plan)")
    .eq("id", id)
    .single();
  if (!audit) notFound();

  // Gate plan : Essentiel ne peut pas accéder aux mini-apps
  const plan = audit.organization?.plan ?? "essentiel";
  if (plan === "essentiel") {
    return <EssentialGate auditId={id} miniappName={schema.name} indicators={schema.indicators} />;
  }

  // Charger les données existantes
  const { data: dataRow } = await supabase
    .from("miniapp_data")
    .select("data")
    .eq("audit_id", id)
    .eq("miniapp_key", key)
    .maybeSingle();

  const initialData = dataRow
    ? ({
        tables: ((dataRow.data as Record<string, unknown>)?.tables ?? {}) as MiniAppData["tables"],
        schemaVersion: 1,
      } as MiniAppData)
    : null;

  // PJ associées à cette mini-app
  const { data: attachments } = await supabase
    .from("attachments")
    .select(
      "id, kind, file_name, file_size, mime_type, storage_path, external_url, created_at, context_label, context_path",
    )
    .eq("audit_id", id)
    .eq("miniapp_key", key);

  const critere = CRITERES[schema.critere as CritereNum];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Breadcrumb
        items={[
          { label: "Vue d'ensemble", href: "/dashboard" },
          { label: audit.name, href: `/audits/${id}` },
          { label: schema.shortName },
        ]}
      />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-amethyst-bright">
            Mini-app · {schema.shortName}
          </span>
          <Badge variant="outline">
            C{schema.critere} {critere?.title}
          </Badge>
          {schema.indicators.map((code) => {
            const ind = getIndicator(code);
            return (
              <Badge key={code} variant="outline">
                {code}
                {ind?.v9Update && <AlertTriangle className="h-2.5 w-2.5 ml-0.5" />}
              </Badge>
            );
          })}
        </div>
        <h1 className="font-sans text-3xl font-light tracking-tight">{schema.name}</h1>
        <p className="mt-2 text-muted-foreground">{schema.description}</p>
      </div>

      {/* Moteur */}
      <MiniApp
        schema={schema}
        auditId={id}
        initialData={initialData}
        attachments={attachments ?? []}
      />
    </div>
  );
}

function EssentialGate({
  auditId,
  miniappName,
  indicators,
}: {
  auditId: string;
  miniappName: string;
  indicators: string[];
}) {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <Link
        href={`/audits/${auditId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour au dossier
      </Link>

      <Card>
        <CardContent className="p-10 text-center">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amethyst to-amethyst-bright text-white text-xl font-medium shadow-[0_8px_22px_-6px_rgba(107,79,187,0.55)]">
            ★
          </div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright mb-3">
            Mini-app réservée au plan Pro
          </p>
          <h2 className="font-sans text-2xl font-light tracking-tight mb-3">{miniappName}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Cette mini-app industrialise la saisie pour les indicateurs{" "}
            <b className="text-foreground">{indicators.join(", ")}</b>. Avec le plan Pro, vous
            accédez aux <b className="text-foreground">19 mini-apps métier</b>, aux calculs
            automatisés et aux exports d'audit.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-amethyst to-amethyst-bright px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_-6px_rgba(107,79,187,0.55)] hover:-translate-y-0.5 transition-all"
          >
            Voir le plan Pro
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
