import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // ❗ IMPORTANT : ne pas mettre de code entre createServerClient et getUser
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Pages publiques, accessibles sans session : un visiteur non connecté n'y
  // est jamais bloqué. `isAuthOnly` en est le sous-ensemble qu'un utilisateur
  // déjà connecté doit fuir (se réinscrire ou se reconnecter n'a pas de sens
  // une fois dans l'app) — `/callback` en est volontairement exclue : c'est
  // justement là qu'une session vient tout juste de naître (connexion,
  // réinitialisation de mot de passe, ou première invitation d'un client).
  const isClientLogin = pathname === "/client/login";
  const isAuthOnly =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    isClientLogin;
  // /reset-password a besoin d'une session (même temporaire, posée par un lien
  // reçu par email) mais n'a pas vocation à faire fuir un utilisateur déjà
  // connecté : ni tout à fait publique, ni "auth only".
  const isPublicRoute = isAuthOnly || pathname === "/callback" || pathname === "/reset-password";

  // Pas connecté + route protégée → page de connexion de l'espace visé
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/client") ? "/client/login" : "/login";
    return NextResponse.redirect(url);
  }

  // Connecté + sur une page réservée aux visiteurs déconnectés → son espace.
  // Les layouts redirigent ensuite un compte arrivé du mauvais côté.
  if (user && isAuthOnly) {
    const url = request.nextUrl.clone();
    url.pathname = isClientLogin ? "/client" : "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
