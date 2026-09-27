import { createClient } from "@/lib/supabase/server";
import { getClientSessionsOverview } from "@/lib/actions/clients";
import {
  ClientsAdminView,
  type DossierWithoutClient,
} from "@/components/clients/clients-admin-view";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  const supabase = await createClient();
  const [res, { data: audits }, { data: accesses }] = await Promise.all([
    getClientSessionsOverview(),
    supabase
      .from("audits")
      .select("id, name, audit_type, categories")
      .order("updated_at", { ascending: false }),
    supabase.from("audit_access").select("audit_id"),
  ]);
  const clients = res.ok ? res.data : [];

  // Dossiers qu'aucun client ne suit encore : chacun peut en recevoir un.
  const withClient = new Set((accesses ?? []).map((a) => a.audit_id));
  const dossiersWithoutClient: DossierWithoutClient[] = (audits ?? [])
    .filter((a) => !withClient.has(a.id))
    .map((a) => ({ id: a.id, name: a.name, type: a.audit_type, categories: a.categories ?? [] }));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright">
          Organisme · Administration
        </p>
        <h1 className="font-sans text-4xl font-light tracking-tight">Espace Clients</h1>
        <p className="mt-2 text-muted-foreground">
          Vos clients, les dossiers qui leur sont confiés, et les dossiers qui attendent encore leur
          client.
        </p>
      </div>

      <ClientsAdminView clients={clients} dossiersWithoutClient={dossiersWithoutClient} />
    </div>
  );
}
