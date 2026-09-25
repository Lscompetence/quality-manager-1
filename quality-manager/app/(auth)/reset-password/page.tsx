import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = {
  title: "Nouveau mot de passe",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <>
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.20em] text-amethyst-bright mb-3">
        Nouveau mot de passe
      </div>
      <h2 className="font-sans text-3xl font-light mb-3 tracking-tight">Bienvenue</h2>
      <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
        Choisissez le mot de passe qui protégera votre accès.
      </p>

      <ResetPasswordForm next={next || "/dashboard"} />
    </>
  );
}
