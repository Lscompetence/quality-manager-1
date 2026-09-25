import { Suspense } from "react";
import { ConfirmLink } from "@/components/auth/confirm-link";

export const metadata = {
  title: "Connexion en cours",
};

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmLink />
    </Suspense>
  );
}
