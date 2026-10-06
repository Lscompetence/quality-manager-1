-- =============================================================================
-- Messages : chaque niveau ne parle qu'au niveau juste au-dessus
--
--   editor / reader ──▶ admin de l'organisme ──▶ super admin (LS Compétences)
--
-- `addressed_to` dit à qui s'adresse une demande :
--   'platform' → LS Compétences (envoyée par l'admin, ou demande d'ouverture
--                de compte d'un visiteur) ;
--   'admin'    → l'admin de l'organisme (envoyée par un editor ou un reader).
-- Le super admin ne voit plus que les demandes qui lui sont adressées.
--
-- Tout le script s'exécute dans une transaction : une erreur annule tout.
-- =============================================================================

begin;

alter table client_requests
  add column if not exists addressed_to text not null default 'platform';

alter table client_requests drop constraint if exists client_requests_addressed_to_check;
alter table client_requests
  add constraint client_requests_addressed_to_check check (addressed_to in ('platform', 'admin'));

create index if not exists idx_client_requests_addressed_to on client_requests(addressed_to);

-- Reprise : les messages déjà envoyés par un editor ou un reader vont à leur admin
update client_requests r
set addressed_to = 'admin'
from users u
where u.id = r.created_by
  and u.role in ('editor', 'reader')
  and r.addressed_to = 'platform';

-- ---- Règles d'accès ------------------------------------------------------------
drop policy if exists "Members create requests for their client" on client_requests;
drop policy if exists "Platform admins see requests" on client_requests;
drop policy if exists "Platform admins handle requests" on client_requests;
drop policy if exists "Admins handle team requests" on client_requests;

-- L'admin écrit à LS ; l'editor et le reader écrivent à leur admin.
create policy "Members create requests for their client"
  on client_requests for insert
  with check (
    organization_id = auth_organization_id()
    and created_by = auth.uid()
    and kind <> 'ouverture_compte'
    and status = 'a_traiter'
    and response is null
    and handled_at is null
    and handled_by is null
    and (
      (auth_user_role() = 'admin' and addressed_to = 'platform')
      or (auth_user_role() in ('editor', 'reader') and addressed_to = 'admin')
    )
  );

-- (inchangée) chacun voit ses messages ; l'admin voit tous ceux de son organisme

-- Le super admin ne voit et ne traite que ce qui lui est adressé
create policy "Platform admins see requests"
  on client_requests for select
  using (is_platform_admin() and addressed_to = 'platform');
create policy "Platform admins handle requests"
  on client_requests for update
  using (is_platform_admin() and addressed_to = 'platform')
  with check (is_platform_admin() and addressed_to = 'platform');

-- L'admin répond aux messages de son équipe
create policy "Admins handle team requests"
  on client_requests for update
  using (organization_id = auth_organization_id() and auth_is_org_admin() and addressed_to = 'admin')
  with check (organization_id = auth_organization_id() and auth_is_org_admin() and addressed_to = 'admin');

-- Qui traite une demande ne change que son traitement (statut, réponse),
-- jamais son contenu, son auteur ni son destinataire.
create or replace function client_requests_handling_only()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated'
     and (to_jsonb(new) - 'status' - 'response' - 'handled_at' - 'handled_by' - 'organization_id')
         is distinct from
         (to_jsonb(old) - 'status' - 'response' - 'handled_at' - 'handled_by' - 'organization_id') then
    raise exception 'Seuls le statut et la réponse d''une demande sont modifiables';
  end if;
  -- organization_id : seul LS peut le renseigner (rattacher une demande d'ouverture au client créé)
  if coalesce(auth.role(), '') = 'authenticated'
     and new.organization_id is distinct from old.organization_id
     and not is_platform_admin() then
    raise exception 'Le client d''une demande n''est pas modifiable';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_client_requests_handling_only on client_requests;
create trigger trg_client_requests_handling_only
  before update on client_requests
  for each row execute function client_requests_handling_only();

-- ---- Indicateurs du super admin : seulement ses demandes ------------------------
create or replace function platform_kpis()
returns table (
  requests_to_handle bigint,
  requests_handled   bigint,
  clients_active     bigint,
  clients_suspended  bigint,
  clients_cancelled  bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'Accès réservé à LS Compétences';
  end if;
  return query select
    (select count(*) from client_requests where status = 'a_traiter' and addressed_to = 'platform'),
    (select count(*) from client_requests where status = 'traite' and addressed_to = 'platform'),
    (select count(*) from organizations where subscription_status = 'active'),
    (select count(*) from organizations where subscription_status = 'suspended'),
    (select count(*) from organizations where subscription_status = 'cancelled');
end;
$$;

commit;
