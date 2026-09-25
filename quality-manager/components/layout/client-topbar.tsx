"use client";

import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "./theme-toggle";
import { logoutClient } from "@/app/(auth)/actions";
import { initialsOf } from "@/lib/utils/display-name";

/**
 * Barre du haut de l'espace client : même habillage que celle du staff
 * (défile avec la page, pas de fond fixe), réduite à l'essentiel — pas de
 * recherche ni de notifications, qui n'ont pas de sens hors de l'espace staff.
 */
export function ClientTopbar({ name }: { name: string }) {
  const initials = initialsOf(name);

  return (
    <header className="relative z-30 mb-7 flex h-[38px] items-center justify-end gap-2.5">
      <ThemeToggle />

      <div className="flex items-center gap-2.5 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] py-[5px] pl-[5px] pr-3.5 text-xs text-[var(--text-soft)] backdrop-blur-xl">
        <Avatar className="h-7 w-7">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden text-[12px] font-medium md:block">
          {name}
        </span>
        <form action={logoutClient}>
          <button
            type="submit"
            title="Se déconnecter"
            className="grid h-6 w-6 place-items-center rounded-full text-[var(--text-mute)] transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </header>
  );
}
