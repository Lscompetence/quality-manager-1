import Link from "next/link";
import { AccountRequestForm } from "@/components/auth/account-request-form";

export const metadata = { title: "Demander un accès" };

export default function AccountRequestPage() {
  return (
    <>
      <div className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-amethyst-bright">
        Demander un accès
      </div>
      <h2 className="mb-3 font-sans text-3xl font-light tracking-tight">Ouvrir un compte</h2>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        Les comptes Quality Manager sont ouverts par LS Compétences. Laissez vos coordonnées : nous
        créons votre espace et vous envoyons l’accès administrateur.
      </p>
      <AccountRequestForm />
      <div className="mt-7 text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link href="/login" className="ml-1 font-medium text-amethyst-bright hover:underline">
          Se connecter
        </Link>
      </div>
    </>
  );
}
