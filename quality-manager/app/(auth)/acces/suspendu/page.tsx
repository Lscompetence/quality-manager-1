import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { blockedReason, isAccessBlocked } from "@/lib/auth/permissions";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Accès suspendu" };

export default async function SuspendedPage() {
  const session = await getSession();
  if (session.kind !== "member") redirect("/dashboard");
  const status = session.organization.subscriptionStatus;
  if (!isAccessBlocked(status)) redirect("/dashboard");

  return (
    <>
      <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-c3">
        {status === "cancelled" ? "Abonnement résilié" : "Accès suspendu"}
      </div>
      <h2 className="mb-3 font-sans text-3xl font-light tracking-tight">
        {session.organization.name}
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{blockedReason(status)}</p>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        Vos dossiers sont conservés mais inaccessibles.{" "}
        {session.profile.role === "admin"
          ? "Contactez LS Compétences pour régulariser et rétablir l’accès."
          : "L’admin de votre organisme peut contacter LS Compétences pour rétablir l’accès."}
      </p>
      <form action={logout}>
        <Button type="submit" variant="secondary" className="w-full">
          Se déconnecter
        </Button>
      </form>
    </>
  );
}
