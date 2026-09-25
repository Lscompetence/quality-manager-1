import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  // Liens envoyés par l'admin (invitation, renvoi des accès) : la session
  // arrive dans le fragment `#access_token=…`, invisible côté serveur. Le
  // navigateur conserve ce fragment à travers la redirection, et /confirm
  // l'installe côté client.
  return NextResponse.redirect(`${origin}/confirm?next=${encodeURIComponent(next)}`);
}
