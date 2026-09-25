"use client";

import * as React from "react";
import { Search, Bell, LogOut, Settings, User, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./theme-toggle";
import { logout } from "@/app/(auth)/actions";
import Link from "next/link";
import { CommandMenu } from "./command-menu";

type UserInfo = {
  firstName: string;
  lastName: string;
  organizationName: string;
};

export function Topbar({ user, breadcrumb, unreadCount = 0 }: { user: UserInfo; breadcrumb?: React.ReactNode; unreadCount?: number }) {
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const [openCommand, setOpenCommand] = React.useState(false);

  return (
    <header className="relative z-30 mb-7 flex h-[38px] items-center gap-2.5">
      <div className="min-w-0 flex-1">{breadcrumb}</div>

      <button
        type="button"
        aria-label="Recherche"
        onClick={() => setOpenCommand(true)}
        className="grid h-[38px] w-[38px] place-items-center rounded-[11px] border border-[var(--border-soft)] bg-[var(--surface)] text-[var(--text-soft)] backdrop-blur-xl transition-colors hover:bg-[var(--surface-2)] hover:text-foreground"
      >
        <Search className="h-4 w-4" />
      </button>
      
      <CommandMenu open={openCommand} setOpen={setOpenCommand} />

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] py-[5px] pl-[5px] pr-3.5 text-xs text-[var(--text-soft)] outline-none backdrop-blur-xl transition-colors hover:border-[var(--border-strong)]">
            <Avatar className="h-7 w-7">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden md:block text-[12px] font-medium">{user.organizationName}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            {user.firstName} {user.lastName}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Mon profil</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/notifications" className="cursor-pointer">
              <Bell className="mr-2 h-4 w-4" />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="ml-auto font-mono text-[10px] text-c3">{unreadCount}</span>
              )}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/clients" className="cursor-pointer">
              <Users className="mr-2 h-4 w-4" />
              <span>Clients</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Paramètres organisme</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <form action={logout} className="w-full cursor-pointer">
              <button type="submit" className="flex w-full items-center gap-2">
                <LogOut className="mr-2 h-4 w-4" />
                Se déconnecter
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
