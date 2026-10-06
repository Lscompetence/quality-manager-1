"use client";

import * as React from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  Activity,
  Bell,
  Building,
  Building2,
  FileText,
  FolderOpen,
  Hash,
  Home,
  Inbox,
  Layers,
  LifeBuoy,
  Search,
  Settings,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { SearchGroup, SearchIcon } from "@/lib/search/items";

const ICONS: Record<SearchIcon, LucideIcon> = {
  home: Home,
  building: Building2,
  folder: FolderOpen,
  indicator: Hash,
  critere: Layers,
  miniapp: Zap,
  settings: Settings,
  bell: Bell,
  user: User,
  support: LifeBuoy,
  documents: FileText,
  client: Building,
  inbox: Inbox,
  activity: Activity,
};

/**
 * Recherche de l'espace (bouton loupe ou Ctrl+K). Son contenu est construit
 * côté serveur selon le rôle (lib/search/items.ts) : on ne propose que ce que
 * l'utilisateur a le droit d'ouvrir.
 */
export function CommandMenu({
  open,
  setOpen,
  groups,
  placeholder = "Rechercher une page, un dossier, un indicateur…",
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  groups: SearchGroup[];
  placeholder?: string;
}) {
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // La saisie automatique du navigateur envoie des événements sans `key`
      if (typeof e.key !== "string") return;
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href as Route);
    },
    [router, setOpen],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-background/70 px-4 pt-[14vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="qm-dialog-solid relative w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="flex h-full w-full flex-col bg-transparent" loop>
          <div className="flex items-center border-b border-[var(--border-soft)] px-4">
            <Search className="mr-3 h-5 w-5 shrink-0 text-[var(--text-mute)]" />
            <Command.Input
              className="flex h-14 w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-mute)]"
              placeholder={placeholder}
              autoFocus
            />
            <kbd className="ml-3 hidden shrink-0 rounded-md border border-[var(--border-soft)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-mute)] sm:block">
              Échap
            </kbd>
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-8 text-center text-sm text-[var(--text-mute)]">
              Aucun résultat.
            </Command.Empty>

            {groups.map((group) => (
              <Command.Group
                key={group.heading}
                heading={group.heading}
                className="overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-[var(--text-mute)]"
              >
                {group.items.map((item) => {
                  const Icon = ICONS[item.icon];
                  return (
                    <Command.Item
                      key={item.id}
                      value={`${item.label} ${item.hint ?? ""} ${item.id}`}
                      keywords={item.keywords}
                      onSelect={() => go(item.href)}
                      className="relative flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none data-[selected=true]:bg-[var(--amethyst-soft-2)] data-[selected=true]:text-foreground"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[var(--amethyst-br)]" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.hint && (
                        <span className="max-w-[45%] shrink-0 truncate text-xs text-[var(--text-mute)]">
                          {item.hint}
                        </span>
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>
          <div className="flex items-center gap-4 border-t border-[var(--border-soft)] px-4 py-2 font-mono text-[10px] text-[var(--text-mute)]">
            <span>↑ ↓ naviguer</span>
            <span>Entrée ouvrir</span>
            <span>Ctrl+K ouvrir / fermer</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

/** Bouton loupe + fenêtre de recherche, pour les barres du haut. */
export function SearchButton({
  groups,
  placeholder,
}: {
  groups: SearchGroup[];
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Rechercher (Ctrl+K)"
        title="Rechercher (Ctrl+K)"
        onClick={() => setOpen(true)}
        className="grid h-[38px] w-[38px] place-items-center rounded-[11px] border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-soft)] backdrop-blur-xl transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
      >
        <Search className="h-4 w-4" />
      </button>
      <CommandMenu open={open} setOpen={setOpen} groups={groups} placeholder={placeholder} />
    </>
  );
}
