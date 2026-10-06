import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProfileForm } from "@/components/settings/profile-form";

export const metadata = { title: "Mon profil" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select(
      "first_name, last_name, email, role, last_seen_at, created_at, organization:organizations(name)",
    )
    .eq("id", userData.user.id)
    .single();
  if (!profile) redirect("/login");

  const initials = `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader eyebrow="Compte utilisateur" title="Mon profil" />

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-medium">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">{profile.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="default">{profile.role}</Badge>
              <span className="font-mono text-[10px] text-muted-foreground">
                {profile.organization?.name}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modifier mes informations</CardTitle>
          <CardDescription>
            Ces informations apparaîtront dans l&apos;application (sidebar, signatures, traces
            audit).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm initialFirstName={profile.first_name} initialLastName={profile.last_name} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mot de passe</CardTitle>
          <CardDescription>
            Pour des raisons de sécurité, la modification du mot de passe se fait via le lien « Mot
            de passe oublié » de la page de connexion.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
