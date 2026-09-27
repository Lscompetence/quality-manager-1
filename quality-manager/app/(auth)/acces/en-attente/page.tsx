import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Accès en attente" };

export default async function PendingAccessPage() {
  const session = await getSession();
  if (session.kind === "anonymous") redirect("/login");
  if (session.kind === "platform") redirect("/platform");
  if (session.kind === "member") redirect("/dashboard");

  return (
    <>
      <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-amethyst-bright">
        Accès en attente
      </div>
      <h2 className="mb-3 font-sans text-3xl font-light tracking-tight">
        Votre accès n’est pas ouvert
      </h2>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        Le compte <b className="text-foreground">{session.email}</b> n’est rattaché à aucun
        organisme. Les accès sont ouverts par l’admin de votre organisme, ou par LS Compétences pour
        un nouvel organisme.
      </p>
      <form action={logout}>
        <Button type="submit" variant="secondary" className="w-full">
          Se déconnecter
        </Button>
      </form>
    </>
  );
}
