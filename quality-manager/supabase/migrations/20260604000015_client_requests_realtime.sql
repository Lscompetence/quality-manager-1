-- =============================================================================
-- Demandes en temps réel pour le super admin
--
-- Le super admin n'a pas de profil client : il ne peut pas recevoir de ligne
-- dans `notifications` (clé étrangère vers `users`). Il est donc prévenu en
-- direct à partir des demandes elles-mêmes : chaque nouvelle ligne de
-- `client_requests` (contact, réclamation, changement de plan, ouverture de
-- compte) déclenche un message dans son espace.
--
-- Le temps réel respecte les règles d'accès : seul le super admin (policy
-- « Platform admins see requests ») et l'organisme concerné reçoivent la ligne.
-- =============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'client_requests'
  ) then
    alter publication supabase_realtime add table public.client_requests;
  end if;
end
$$;
