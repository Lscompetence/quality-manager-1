import type { Metadata } from "next";
import { BrandPanel } from "@/components/auth/brand-panel";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const metadata: Metadata = {
  title: "Connexion",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
      <BrandPanel />
      <div className="relative flex items-center justify-center bg-card/40 backdrop-blur-2xl border-l border-border p-6 lg:p-14">
        <div className="absolute right-7 top-7">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
