import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Client Supabase avec la clé de service : bypasse RLS et donne accès à
 * l'API d'administration (`auth.admin.*`).
 *
 * Usage strictement serveur — à n'importer que depuis des fichiers `"use
 * server"` (Next.js exclut ce code du bundle navigateur). Réservé aux
 * actions qui doivent agir au-delà des droits normaux de l'utilisateur
 * connecté : ici, inviter un compte client par email et créer son accès à
 * un dossier avant même qu'il n'ait de session.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante : impossible d'inviter un client sans elle (voir .env.local).",
    );
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
