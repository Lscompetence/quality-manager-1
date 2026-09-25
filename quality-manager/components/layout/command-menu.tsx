"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Search, Home, User, Settings, Bell } from "lucide-react";

export function CommandMenu({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const runCommand = React.useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    [setOpen]
  );

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-background/80 backdrop-blur-sm" 
      onClick={() => setOpen(false)}
    >
      <div 
        className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl ring-1 ring-black/5" 
        onClick={e => e.stopPropagation()}
      >
        <Command className="flex w-full flex-col h-full bg-transparent">
          <div className="flex items-center border-b border-border px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-5 w-5 shrink-0 opacity-50" />
            <Command.Input
              className="flex h-14 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Que cherchez-vous ? (ex: Profil, Notifications...)"
              autoFocus
            />
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">Aucun résultat trouvé.</Command.Empty>
            
            <Command.Group heading="Navigation Rapide" className="overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
              
              <Command.Item 
                onSelect={() => runCommand(() => router.push("/dashboard"))} 
                className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-3 text-sm outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
              >
                <Home className="mr-3 h-4 w-4" />
                <span>Tableau de bord</span>
              </Command.Item>

              <Command.Item 
                onSelect={() => runCommand(() => router.push("/profile"))} 
                className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-3 text-sm outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
              >
                <User className="mr-3 h-4 w-4" />
                <span>Mon Profil</span>
              </Command.Item>

              <Command.Item 
                onSelect={() => runCommand(() => router.push("/settings"))} 
                className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-3 text-sm outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
              >
                <Settings className="mr-3 h-4 w-4" />
                <span>Paramètres de l&apos;organisme</span>
              </Command.Item>

              <Command.Item 
                onSelect={() => runCommand(() => router.push("/notifications"))} 
                className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-3 text-sm outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
              >
                <Bell className="mr-3 h-4 w-4" />
                <span>Toutes les notifications</span>
              </Command.Item>
              
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
