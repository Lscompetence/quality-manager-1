import Link from "next/link";
import { ArrowRight, FolderOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateAuditDialog } from "@/components/audits/create-audit-dialog";

const TYPE_LABEL: Record<string, string> = {
  initial: "Audit initial",
  surveillance: "Audit de surveillance",
  renouvellement: "Audit de renouvellement",
};

export const metadata = {
  title: "Vue d'ensemble",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: audits } = await supabase
    .from("audits")
    .select("id, name, audit_type, categories, status, audit_date, certificateur, updated_at")
    .in("status", ["en_cours", "cloture"])
    .order("updated_at", { ascending: false });


  return (
    <div className="max-w-6xl">
      <div className="flex items-end justify-between gap-4 mb-10">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright mb-2">
            Vue d&apos;ensemble · Dossiers
          </p>
          <h1 className="font-sans text-4xl font-light tracking-tight">Bienvenue 👋</h1>
          <p className="mt-2 text-muted-foreground">
            Gérez vos dossiers d&apos;audit Qualiopi (RNQ V9 — 7 critères, 32 indicateurs).
          </p>
        </div>
        <CreateAuditDialog />
      </div>

      {!audits || audits.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {audits.map((audit) => (
            <AuditCard key={audit.id} audit={audit} />
          ))}
        </div>
      )}
    </div>
  );
}

function AuditCard({
  audit,
}: {
  audit: {
    id: string;
    name: string;
    audit_type: "initial" | "surveillance" | "renouvellement";
    categories: string[];
    status: "en_cours" | "cloture" | "archive";
    audit_date: string | null;
    certificateur: string | null;
    updated_at: string;
  };
}) {
  const typeLabel = TYPE_LABEL[audit.audit_type] ?? audit.audit_type;

  return (
    <Link href={`/audits/${audit.id}`} className="group">
      <Card className="hover:border-amethyst-bright/40 hover:-translate-y-0.5 transition-all h-full">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge variant={audit.status === "en_cours" ? "success" : "secondary"}>
              {audit.status === "en_cours" ? "En cours" : audit.status}
            </Badge>
            {audit.categories.map((cat) => (
              <Badge key={cat} variant="outline">
                {cat}
              </Badge>
            ))}
          </div>
          <h3 className="font-sans text-lg font-medium tracking-tight mb-1.5 line-clamp-2">
            {audit.name}
          </h3>
          <p className="font-mono text-[11px] text-muted-foreground mb-4">
            {typeLabel}
            {audit.certificateur ? ` · ${audit.certificateur}` : ""}
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-muted-foreground">
              {audit.audit_date ? `Audit prévu : ${formatDate(audit.audit_date)}` : "Pas de date fixée"}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-amethyst-bright transition-colors" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState() {
  return (
    <Card className="text-center p-12">
      <div className="mx-auto h-14 w-14 grid place-items-center rounded-2xl bg-amethyst-bright/10 text-amethyst-bright mb-5">
        <FolderOpen className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-medium mb-2">Aucun dossier pour l&apos;instant</h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-6 text-sm">
        Créez votre premier dossier d&apos;audit pour commencer à structurer votre conformité Qualiopi.
      </p>
      <CreateAuditDialog />
    </Card>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
