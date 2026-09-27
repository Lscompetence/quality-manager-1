-- =============================================================================
-- Auteur des notifications
-- =============================================================================
-- Chaque notification garde qui a déclenché l'action (un client qui dépose un
-- document, un membre du staff qui valide un indicateur…). Le centre de
-- notifications admin s'en sert pour son filtre « Clients » : les
-- notifications de chaque client, regroupées par client.
-- =============================================================================

alter table public.notifications
  add column if not exists actor_id uuid references public.users(id) on delete set null;

create index if not exists notifications_actor_id_idx on public.notifications (actor_id);

-- Notifications déjà envoyées : leur titre commence par le nom de l'auteur
-- (« Prénom Nom a déposé … »). On rattache celles des clients de l'organisme.
update public.notifications n
set actor_id = u.id
from public.users u
where n.actor_id is null
  and u.role = 'client'
  and u.organization_id = n.organization_id
  and trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) <> ''
  and n.title ilike trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')) || ' %';
