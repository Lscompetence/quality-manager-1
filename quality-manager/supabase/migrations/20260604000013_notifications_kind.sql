-- =============================================================================
-- Nature des notifications
-- =============================================================================
-- Le centre de notifications admin n'affiche plus qu'une chose : les
-- connexions des clients à leur espace. `kind` les distingue du reste de
-- l'activité (dépôts, validations…), qui ne concerne plus que les clients.
--
-- Confidentialité : une connexion n'enregistre que le client et l'heure
-- (created_at). Ni adresse IP, ni appareil, ni pages consultées.
-- =============================================================================

alter table public.notifications
  add column if not exists kind text not null default 'activity';

alter table public.notifications
  drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check check (kind in ('activity', 'client_login'));

create index if not exists notifications_user_kind_idx on public.notifications (user_id, kind);
