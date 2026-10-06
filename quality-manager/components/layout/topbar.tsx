"use client";

import * as React from "react";
import { Bell, LogOut, Settings, User } from "lucide-react";
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
import { SearchButton } from "./command-menu";
import type { SearchGroup } from "@/lib/search/items";
import { ROLE_LABEL, type MemberRole } from "@/lib/auth/permissions";

type UserInfo = {
  firstName: string;
  lastName: string;
  organizationName: string;
  role: MemberRole;
};

export function Topbar({
  user,
  breadcrumb,
  unreadCount = 0,
  searchGroups = [],
}: {
  user: UserInfo;
  breadcrumb?: React.ReactNode;
  unreadCount?: number;
  /** Contenu de la recherche, construit côté serveur selon le rôle */
  searchGroups?: SearchGroup[];
}) {
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <header className="relative z-30 mb-7 flex h-[38px] items-center gap-2.5">
      <div className="min-w-0 flex-1">{breadcrumb}</div>

      <SearchButton groups={searchGroups} />

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="qm-profile-chip flex items-center gap-2.5 rounded-full py-[4px] pl-[4px] pr-3.5 text-xs text-[var(--text-soft)] outline-none">
            <span className="qm-avatar-ring">
              <Avatar className="h-[26px] w-[26px]">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </span>
            <span className="hidden text-[12px] font-medium md:block">{user.organizationName}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            {user.firstName} {user.lastName}
            <span className="mt-0.5 block font-mono text-[10px] font-normal text-[var(--text-mute)]">
              {ROLE_LABEL[user.role]}
            </span>
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
          {user.role === "admin" && (
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Paramètres organisme</span>
              </Link>
            </DropdownMenuItem>
          )}
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
