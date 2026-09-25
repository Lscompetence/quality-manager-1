import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Client Supabase anonyme, sans session ni PKCE, pour déclencher les emails
 * d'authentification (mot de passe oublié, renvoi des accès d'un client).
 *
 * Sans PKCE, le lien reçu fonctionne quel que soit le navigateur qui l'ouvre
 * (le téléphone du client, par exemple), pas seulement celui qui a fait la
 * demande. La session arrive dans le fragment `#access_token=…`, que
 * `/callback` transmet à `/confirm`.
 */
export function createEmailLinkClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: "implicit",
      },
    },
  );
}

/** URL de retour d'un lien email : `/callback`, puis `next` une fois connecté. */
export function emailRedirectUrl(next: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${appUrl}/callback?next=${encodeURIComponent(next)}`;
}

/** Traduit les refus d'envoi de Supabase Auth en message lisible. */
export function emailErrorMessage(raw: string): string {
  const wait = raw.match(/after (\d+) seconds?/i)?.[1];
  if (wait)
    return `Un email vient déjà d'être envoyé. Patientez ${wait} secondes avant de réessayer.`;
  if (/rate limit/i.test(raw))
    return "Limite d'envoi d'emails atteinte. Réessayez dans quelques minutes.";
  return `L'email n'a pas pu être envoyé : ${raw}`;
}
