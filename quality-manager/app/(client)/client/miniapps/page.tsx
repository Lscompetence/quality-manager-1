import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ArrowRight, FolderOpen, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Mini-apps" };

/**
 * Entrée « Mini-apps » du menu client. Les mini-apps appartiennent à un
 * dossier : avec un seul dossier confié, on y va directement ; avec
 * plusieurs, le client choisit lequel consulter.
 */
export default async function ClientMiniAppsEntryPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: accesses } = await supabase
    .from("audit_access")
    .select("id, audit:audits(id, name, audit_type, categories)")
    .eq("user_id", userData.user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const dossiers = (accesses ?? []).filter((a) => a.audit).map((a) => a.audit!);

  if (dossiers.length === 1) {
    redirect(`/client/dossiers/${dossiers[0]!.id}/miniapps` as Route);
  }

  const auditIds = dossiers.map((d) => d.id);
  const { data: filled } = auditIds.length
    ? await supabase.from("miniapp_data").select("audit_id").in("audit_id", auditIds)
    : { data: [] as { audit_id: string }[] };
  const filledCount = new Map<string, number>();
  for (const f of filled ?? []) filledCount.set(f.audit_id, (filledCount.get(f.audit_id) ?? 0) + 1);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-[30px] border-b border-[var(--border-soft)] pb-6">
        <p className="qm-eyebrow mb-3">Espace client · Mini-apps</p>
        <h1 className="mb-3 font-sans text-[40px] font-light leading-[1.05] tracking-[-0.025em]">Mini-apps</h1>
        <p className="max-w-[700px] text-[14.5px] leading-[1.55] text-[var(--text-mute)]">
          Les registres et outils tenus par votre organisme pour chacun de vos dossiers. Choisissez un dossier
          pour les consulter.
        </p>
      </div>

      {dossiers.length === 0 ? (
        <div className="qm-glass rounded-2xl p-12 text-center">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-amethyst-bright/10 text-amethyst-bright">
            <FolderOpen className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted-foreground">Aucun dossier ne vous a encore été confié.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {dossiers.map((d) => (
            <Link key={d.id} href={`/client/dossiers/${d.id}/miniapps` as Route} className="group">
              <div className="qm-glass qm-glass-hover flex h-full items-center gap-4 rounded-2xl p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--amethyst-soft-2)] text-[var(--amethyst-br)]">
                  <Sparkles className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{d.name}</span>
                  <span className="font-mono text-[10.5px] text-[var(--text-mute)]">
                    {(d.categories ?? []).join(" · ")} · {filledCount.get(d.id) ?? 0} mini-app(s) renseignée(s)
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-[var(--text-mute)] transition-colors group-hover:text-[var(--amethyst-br)]" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
