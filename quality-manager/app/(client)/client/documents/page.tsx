import { FolderOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadClientOverview } from "@/lib/client/overview";
import { AttachmentList } from "@/components/attachments/attachment-list";

export const metadata = {
  title: "Mes documents",
};

/**
 * Tous les documents du client, regroupés par dossier. Il peut en déposer
 * de nouveaux dans chacun, mais pas en supprimer : c'est l'organisme qui
 * garde la main sur les preuves validées.
 */
export default async function ClientDocumentsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { dossiers, documents } = await loadClientOverview(userData.user.id);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-[30px] border-b border-[var(--border-soft)] pb-6">
        <p className="qm-eyebrow mb-3">Espace client · Documents</p>
        <h1 className="mb-3 font-sans text-[40px] font-light leading-[1.05] tracking-[-0.025em]">Mes documents</h1>
        <p className="max-w-[700px] text-[14.5px] leading-[1.55] text-[var(--text-mute)]">
          Retrouvez les {documents.length} document(s) de vos dossiers et déposez vos nouvelles preuves. Votre
          organisme les retrouve directement dans votre dossier.
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
        <div className="space-y-[18px]">
          {dossiers.map((d) => {
            const docs = documents.filter((doc) => doc.auditId === d.auditId);
            return (
              <section key={d.auditId} className="qm-glass rounded-[18px] p-6">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <h2 className="font-sans text-xl font-light tracking-tight">{d.name}</h2>
                    <p className="font-mono text-[10.5px] text-[var(--text-mute)]">
                      {d.categories.join(" · ")} · {docs.length} document(s)
                    </p>
                  </div>
                </div>
                <AttachmentList
                  auditId={d.auditId}
                  contextPath="dossier"
                  contextLabel="Dossier"
                  attachments={docs}
                  canDelete={false}
                />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
