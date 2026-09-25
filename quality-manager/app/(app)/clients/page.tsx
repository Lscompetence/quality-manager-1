import { getClientSessionsOverview } from "@/lib/actions/clients";
import { ClientsAdminView } from "@/components/clients/clients-admin-view";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  const res = await getClientSessionsOverview();
  const clients = res.ok ? res.data : [];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright">
          Organisme · Administration
        </p>
        <h1 className="font-sans text-4xl font-light tracking-tight">Espace Clients</h1>
        <p className="mt-2 text-muted-foreground">
          Vos clients et les dossiers qui leur sont confiés. Envoyez-leur leurs accès par email à
          tout moment.
        </p>
      </div>

      <ClientsAdminView clients={clients} />
    </div>
  );
}
