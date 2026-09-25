"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export type Member = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin" | "editor" | "reader";
  last_seen_at: string | null;
  created_at: string;
};

const ROLE_LABEL: Record<Member["role"], { label: string; variant: "default" | "secondary" | "outline" }> = {
  admin: { label: "Admin", variant: "default" },
  editor: { label: "Éditeur", variant: "outline" },
  reader: { label: "Lecteur", variant: "secondary" },
};

export function TeamSection({
  members,
  currentUserId,
  isAdmin,
}: {
  members: Member[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Membres de l&apos;organisme</CardTitle>
        <CardDescription>
          {members.length} membre{members.length > 1 ? "s" : ""} actuellement.{" "}
          {isAdmin
            ? "Vous pouvez inviter de nouveaux membres (à venir)."
            : "Seuls les admins peuvent gérer l'équipe."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {members.map((m) => {
            const isCurrent = m.id === currentUserId;
            const initials = `${m.first_name.charAt(0)}${m.last_name.charAt(0)}`.toUpperCase();
            const roleInfo = ROLE_LABEL[m.role];

            return (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                    {m.first_name} {m.last_name}
                    {isCurrent && (
                      <span className="font-mono text-[10px] text-muted-foreground">(vous)</span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground truncate">
                    {m.email}
                  </div>
                </div>
                <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
