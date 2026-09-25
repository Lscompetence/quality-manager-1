-- =============================================================================
-- Notifications en temps réel.
--
-- Chaque action d'un admin ou d'un client crée une notification pour l'autre
-- côté. Pour qu'elle s'affiche immédiatement dans sa session (message en haut
-- à droite), la table doit être diffusée par Supabase Realtime. Les politiques
-- RLS s'appliquent aussi au temps réel : chacun ne reçoit que les siennes.
-- =============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
