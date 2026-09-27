-- =============================================================================
-- Sprint 8 — Rôles et espaces (Cadrage v3.2, § 3), adapté à cette base
--
--   Plateforme (LS Compétences, super admin)
--     └─ Client (organizations)  — souscrit l'abonnement, piloté par l'admin
--          └─ Établissements     — entités auditées
--               └─ Dossiers d'audit, indicateurs, mini-apps, preuves
--
--   super admin → table platform_admins, AUCUNE policy sur les dossiers ni le
--                 stockage : la base refuse la lecture.
--   admin       → gère établissements, accès, abonnement ; LIT les dossiers
--                 de tous ses établissements, n'écrit rien.
--   editor      → écrit dans les dossiers de ses établissements.
--   reader      → lit les dossiers de ses établissements.
--
-- Différence avec la migration d'origine du sprint 8 : cette base porte déjà
-- le rôle `client` (accès à un dossier précis via audit_access, migrations
-- 000004 à 000013). Il garde ses droits actuels — lecture de ses dossiers
-- confiés, dépôt de preuves — en attendant l'étape des autres rôles.
--
-- Les policies des tables concernées sont d'abord TOUTES supprimées, quel que
-- soit leur nom (plusieurs migrations successives en ont créé), puis
-- recréées ici : l'état final ne dépend pas de l'historique.
--
-- Tout le script s'exécute dans une transaction : une erreur annule tout.
-- =============================================================================

begin;

-- =============================================================================
-- 1. ABONNEMENT : statut du compte client
-- =============================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('active', 'suspended', 'cancelled');
  end if;
end
$$;

alter table organizations
  add column if not exists subscription_status subscription_status not null default 'active',
  add column if not exists status_changed_at   timestamptz,
  add column if not exists last_payment_at     timestamptz;

create index if not exists idx_organizations_status on organizations(subscription_status);

-- =============================================================================
-- 2. SUPER ADMINS (LS Compétences) — pas de ligne dans `users`
-- =============================================================================
create table if not exists platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table platform_admins enable row level security;

create or replace function is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from platform_admins where user_id = auth.uid())
$$;

-- =============================================================================
-- 3. ÉTABLISSEMENTS et rattachement des editors / readers
-- =============================================================================
create table if not exists establishments (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  siret           text,
  declaration_nb  text,
  address         text,
  city            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_establishments_org on establishments(organization_id);

drop trigger if exists trg_establishments_updated_at on establishments;
create trigger trg_establishments_updated_at before update on establishments
  for each row execute function set_updated_at();

create table if not exists establishment_members (
  establishment_id uuid not null references establishments(id) on delete cascade,
  user_id          uuid not null references users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (establishment_id, user_id)
);

create index if not exists idx_establishment_members_user on establishment_members(user_id);

-- =============================================================================
-- 4. DOSSIERS rattachés à un établissement
-- Reprise de l'existant : un établissement par client ayant déjà des
-- dossiers, nommé comme le client, qui récupère tous ses dossiers.
-- =============================================================================
alter table audits
  add column if not exists establishment_id uuid references establishments(id) on delete cascade;

insert into establishments (organization_id, name, siret, declaration_nb, address)
select o.id, o.name, o.siret, o.declaration_nb, o.address
from organizations o
where exists (select 1 from audits a where a.organization_id = o.id and a.establishment_id is null)
  and not exists (select 1 from establishments e where e.organization_id = o.id);

update audits a
set establishment_id = (
  select e.id from establishments e
  where e.organization_id = a.organization_id
  order by e.created_at
  limit 1
)
where a.establishment_id is null;

insert into establishment_members (establishment_id, user_id)
select e.id, u.id
from users u
join establishments e on e.organization_id = u.organization_id
where u.role in ('editor', 'reader')
on conflict do nothing;

alter table audits alter column establishment_id set not null;
create index if not exists idx_audits_establishment on audits(establishment_id);

create or replace function check_audit_establishment_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from establishments
    where id = new.establishment_id and organization_id = new.organization_id
  ) then
    raise exception 'Établissement et client incohérents';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audits_establishment_org on audits;
create trigger trg_audits_establishment_org
  before insert or update of establishment_id, organization_id on audits
  for each row execute function check_audit_establishment_org();

-- Supprimer un utilisateur ne bloque pas sur ses contributions passées
alter table audit_indicators drop constraint if exists audit_indicators_updated_by_fkey,
  add constraint audit_indicators_updated_by_fkey foreign key (updated_by) references users(id) on delete set null;
alter table miniapp_data drop constraint if exists miniapp_data_updated_by_fkey,
  add constraint miniapp_data_updated_by_fkey foreign key (updated_by) references users(id) on delete set null;
alter table attachments drop constraint if exists attachments_uploaded_by_fkey,
  add constraint attachments_uploaded_by_fkey foreign key (uploaded_by) references users(id) on delete set null;

-- =============================================================================
-- 5. DEMANDES CLIENTS adressées à LS Compétences
-- =============================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'request_kind') then
    create type request_kind as enum ('ouverture_compte', 'reclamation', 'suggestion', 'support', 'autre');
  end if;
  if not exists (select 1 from pg_type where typname = 'request_status') then
    create type request_status as enum ('a_traiter', 'traite');
  end if;
end
$$;

create table if not exists client_requests (
  id                uuid primary key default uuid_generate_v4(),
  organization_id   uuid references organizations(id) on delete set null,
  kind              request_kind not null,
  status            request_status not null default 'a_traiter',
  subject           text not null,
  message           text,
  contact_name      text,
  contact_email     text,
  organization_name text,
  response          text,
  handled_at        timestamptz,
  handled_by        uuid references auth.users(id) on delete set null,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index if not exists idx_client_requests_status on client_requests(status);
create index if not exists idx_client_requests_org on client_requests(organization_id);

alter table client_requests enable row level security;
alter table establishments enable row level security;
alter table establishment_members enable row level security;

-- =============================================================================
-- 6. HELPERS D'AUTORISATION (security definer : pas de récursion RLS)
-- =============================================================================
create or replace function auth_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from users
  where id = auth.uid()
    and not exists (select 1 from platform_admins where user_id = auth.uid())
$$;

create or replace function auth_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from users
  where id = auth.uid()
    and not exists (select 1 from platform_admins where user_id = auth.uid())
$$;

create or replace function try_uuid(p text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

create or replace function auth_org_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from users u
    join organizations o on o.id = u.organization_id
    where u.id = auth.uid() and o.subscription_status = 'active'
  )
$$;

create or replace function auth_is_org_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth_user_role() = 'admin' and auth_org_active()
$$;

create or replace function auth_can_read_establishment(p_est uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth_org_active() and exists (
    select 1 from establishments e
    where e.id = p_est
      and e.organization_id = auth_organization_id()
      and (
        auth_user_role() = 'admin'
        or (
          auth_user_role() in ('editor', 'reader')
          and exists (
            select 1 from establishment_members m
            where m.establishment_id = e.id and m.user_id = auth.uid()
          )
        )
      )
  )
$$;

create or replace function auth_can_write_establishment(p_est uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth_org_active()
     and auth_user_role() = 'editor'
     and exists (
       select 1 from establishment_members m
       join establishments e on e.id = m.establishment_id
       where m.establishment_id = p_est
         and m.user_id = auth.uid()
         and e.organization_id = auth_organization_id()
     )
$$;

-- Le rôle `client` (existant) lit ses dossiers confiés via audit_access
create or replace function auth_can_read_audit(p_audit uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select auth_can_read_establishment(a.establishment_id) from audits a where a.id = p_audit),
    false
  )
  or (
    auth_user_role() = 'client'
    and auth_org_active()
    and p_audit in (select client_audit_ids())
  )
$$;

create or replace function auth_can_write_audit(p_audit uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select auth_can_write_establishment(a.establishment_id) from audits a where a.id = p_audit),
    false
  )
$$;

-- =============================================================================
-- 7. POLICIES — remise à zéro puis réécriture
-- =============================================================================
do $$
declare
  p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in (
        'organizations', 'users', 'audits', 'audit_indicators', 'miniapp_data',
        'attachments', 'certifications', 'notifications', 'notification_preferences',
        'audit_access', 'establishments', 'establishment_members', 'client_requests',
        'platform_admins'
      )
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;

  -- Stockage : seules les policies du bucket des preuves
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') || coalesce(with_check, '')) like '%attachments%'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end
$$;

-- ---- Platform admins --------------------------------------------------------
create policy "Platform admins see themselves"
  on platform_admins for select using (user_id = auth.uid());

-- ---- Organizations ------------------------------------------------------------
-- Lisible même suspendu (pour afficher « accès suspendu »), pas par un client.
create policy "Members see their organization"
  on organizations for select
  using (id = auth_organization_id() and auth_user_role() <> 'client');
create policy "Admins update their organization"
  on organizations for update
  using (id = auth_organization_id() and auth_is_org_admin())
  with check (id = auth_organization_id() and auth_is_org_admin());
create policy "Platform admins see clients"
  on organizations for select using (is_platform_admin());
create policy "Platform admins manage clients"
  on organizations for update using (is_platform_admin()) with check (is_platform_admin());

create or replace function protect_subscription_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.subscription_status is distinct from old.subscription_status
      or new.plan              is distinct from old.plan
      or new.billing_cycle     is distinct from old.billing_cycle
      or new.status_changed_at is distinct from old.status_changed_at
      or new.last_payment_at   is distinct from old.last_payment_at
      or new.next_billing_at   is distinct from old.next_billing_at)
     and coalesce(auth.role(), '') = 'authenticated'
     and not is_platform_admin()
  then
    raise exception 'Seul LS Compétences peut modifier l''abonnement (plan, statut, paiements)';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_organizations_protect_subscription on organizations;
create trigger trg_organizations_protect_subscription
  before update on organizations
  for each row execute function protect_subscription_fields();

-- ---- Users ----------------------------------------------------------------------
-- Un client ne voit que son propre profil ; le staff voit son organisme.
create policy "Members see their team"
  on users for select
  using (
    id = auth.uid()
    or (organization_id = auth_organization_id() and auth_user_role() in ('admin', 'editor', 'reader'))
  );
create policy "Users update their own profile"
  on users for update using (id = auth.uid()) with check (id = auth.uid());
create policy "Admins manage their team"
  on users for update
  using (organization_id = auth_organization_id() and auth_is_org_admin())
  with check (organization_id = auth_organization_id() and auth_is_org_admin());
create policy "Admins remove team members"
  on users for delete
  using (organization_id = auth_organization_id() and auth_is_org_admin() and id <> auth.uid() and role <> 'admin');
create policy "Platform admins see client admins"
  on users for select using (is_platform_admin() and role = 'admin');

create or replace function protect_user_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'authenticated' then
    return new;
  end if;
  if new.id is distinct from old.id then
    raise exception 'Identifiant de profil non modifiable';
  end if;
  if new.organization_id is distinct from old.organization_id then
    raise exception 'Changement de client interdit';
  end if;
  if new.email is distinct from old.email then
    raise exception 'Email non modifiable depuis l''application';
  end if;
  if new.role is distinct from old.role then
    if not auth_is_org_admin() then
      raise exception 'Seul un admin peut changer un rôle';
    end if;
    if new.id = auth.uid() then
      raise exception 'Un admin ne peut pas changer son propre rôle';
    end if;
    if old.role = 'admin' or new.role = 'admin' then
      raise exception 'Le rôle admin est attribué par LS Compétences';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_users_protect_fields on users;
create trigger trg_users_protect_fields
  before update on users
  for each row execute function protect_user_fields();

create or replace function forbid_platform_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from platform_admins where user_id = new.id) then
    raise exception 'Un super admin ne peut pas être membre d''un client';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_users_not_platform_admin on users;
create trigger trg_users_not_platform_admin
  before insert or update of id on users
  for each row execute function forbid_platform_admin_profile();

create or replace function forbid_profile_for_platform_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from users where id = new.user_id) then
    raise exception 'Cet utilisateur a déjà un profil client';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_platform_admins_no_profile on platform_admins;
create trigger trg_platform_admins_no_profile
  before insert on platform_admins
  for each row execute function forbid_profile_for_platform_admin();

-- ---- Establishments -------------------------------------------------------------
create policy "Members see their establishments"
  on establishments for select using (auth_can_read_establishment(id));
create policy "Admins create establishments"
  on establishments for insert
  with check (organization_id = auth_organization_id() and auth_is_org_admin());
create policy "Admins update establishments"
  on establishments for update
  using (organization_id = auth_organization_id() and auth_is_org_admin())
  with check (organization_id = auth_organization_id() and auth_is_org_admin());
create policy "Admins delete establishments"
  on establishments for delete
  using (organization_id = auth_organization_id() and auth_is_org_admin());

-- ---- Establishment members -----------------------------------------------------
create policy "Users see their own memberships"
  on establishment_members for select using (user_id = auth.uid());
create policy "Admins see memberships of their client"
  on establishment_members for select
  using (auth_is_org_admin() and exists (
    select 1 from establishments e
    where e.id = establishment_id and e.organization_id = auth_organization_id()
  ));
create policy "Admins manage memberships"
  on establishment_members for all
  using (auth_is_org_admin() and exists (
    select 1 from establishments e
    where e.id = establishment_id and e.organization_id = auth_organization_id()
  ))
  with check (auth_is_org_admin() and exists (
    select 1 from establishments e
    where e.id = establishment_id and e.organization_id = auth_organization_id()
  ) and exists (
    select 1 from users u
    where u.id = user_id and u.organization_id = auth_organization_id() and u.role in ('editor', 'reader')
  ));

-- ---- Audits -----------------------------------------------------------------------
create policy "Read audits of accessible establishments"
  on audits for select
  using (
    auth_can_read_establishment(establishment_id)
    or (auth_user_role() = 'client' and auth_org_active() and id in (select client_audit_ids()))
  );
create policy "Editors create audits"
  on audits for insert
  with check (organization_id = auth_organization_id() and auth_can_write_establishment(establishment_id));
create policy "Editors update audits"
  on audits for update
  using (auth_can_write_establishment(establishment_id))
  with check (organization_id = auth_organization_id() and auth_can_write_establishment(establishment_id));
create policy "Editors delete audits"
  on audits for delete using (auth_can_write_establishment(establishment_id));

-- ---- Audit indicators --------------------------------------------------------------
create policy "Read indicators of accessible audits"
  on audit_indicators for select using (auth_can_read_audit(audit_id));
create policy "Editors write indicators"
  on audit_indicators for all
  using (auth_can_write_audit(audit_id))
  with check (organization_id = auth_organization_id() and auth_can_write_audit(audit_id));

-- ---- Mini-app data ------------------------------------------------------------------
create policy "Read miniapp data of accessible audits"
  on miniapp_data for select using (auth_can_read_audit(audit_id));
create policy "Editors write miniapp data"
  on miniapp_data for all
  using (auth_can_write_audit(audit_id))
  with check (organization_id = auth_organization_id() and auth_can_write_audit(audit_id));

-- ---- Attachments ----------------------------------------------------------------------
create policy "Read attachments of accessible audits"
  on attachments for select using (auth_can_read_audit(audit_id));
create policy "Editors write attachments"
  on attachments for all
  using (auth_can_write_audit(audit_id))
  with check (organization_id = auth_organization_id() and auth_can_write_audit(audit_id));
create policy "Clients add attachments to their dossiers"
  on attachments for insert
  with check (
    auth_user_role() = 'client'
    and auth_org_active()
    and uploaded_by = auth.uid()
    and organization_id = auth_organization_id()
    and audit_id in (select client_audit_ids())
  );

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'attachments_external_url_http') then
    alter table attachments
      add constraint attachments_external_url_http
      check (external_url is null or external_url ~* '^https?://') not valid;
  end if;
end
$$;

-- ---- Certifications -----------------------------------------------------------------
create policy "Active members see certifications"
  on certifications for select
  using (organization_id = auth_organization_id() and auth_org_active() and auth_user_role() <> 'client');
create policy "Editors manage certifications"
  on certifications for all
  using (organization_id = auth_organization_id() and auth_org_active() and auth_user_role() = 'editor')
  with check (organization_id = auth_organization_id() and auth_org_active() and auth_user_role() = 'editor');

-- ---- Client requests ------------------------------------------------------------------
create policy "Members create requests for their client"
  on client_requests for insert
  with check (
    organization_id = auth_organization_id()
    and auth_user_role() in ('admin', 'editor', 'reader')
    and created_by = auth.uid()
    and kind <> 'ouverture_compte'
    and status = 'a_traiter'
    and response is null
    and handled_at is null
    and handled_by is null
  );
create policy "Members see their requests, admins see all of their client"
  on client_requests for select
  using (
    organization_id = auth_organization_id()
    and (created_by = auth.uid() or auth_user_role() = 'admin')
  );
create policy "Platform admins see requests"
  on client_requests for select using (is_platform_admin());
create policy "Platform admins handle requests"
  on client_requests for update using (is_platform_admin()) with check (is_platform_admin());

-- ---- Accès client à un dossier (rôle `client`, inchangé) ------------------------
create policy "Staff manage client access of their organization"
  on audit_access for all
  using (
    audit_organization_id(audit_access.audit_id) = auth_organization_id()
    and auth_user_role() in ('admin', 'editor')
  );
create policy "Clients see their own access"
  on audit_access for select
  using (user_id = auth.uid() and status = 'active');

-- ---- Notifications ----------------------------------------------------------------------
create policy "Active users see their notifications"
  on notifications for select using (user_id = auth.uid() and auth_org_active());
create policy "Active users mark notifications read"
  on notifications for update
  using (user_id = auth.uid() and auth_org_active())
  with check (user_id = auth.uid());

-- Seul le statut de lecture est modifiable depuis l'application
create or replace function notifications_read_only_update()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated'
     and (to_jsonb(new) - 'read_at') is distinct from (to_jsonb(old) - 'read_at') then
    raise exception 'Seul le statut de lecture d''une notification est modifiable';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifications_read_only on notifications;
create trigger trg_notifications_read_only
  before update on notifications
  for each row execute function notifications_read_only_update();

create policy "Users manage their own prefs"
  on notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =============================================================================
-- 8. STORAGE — chemin <organization_id>/<audit_id>/<fichier>
-- =============================================================================
create policy "Read files of accessible audits"
  on storage.objects for select
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth_organization_id()::text
    and auth_can_read_audit(try_uuid((storage.foldername(name))[2]))
  );

create policy "Editors and clients upload files"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth_organization_id()::text
    and (
      auth_can_write_audit(try_uuid((storage.foldername(name))[2]))
      or (
        auth_user_role() = 'client'
        and auth_org_active()
        and try_uuid((storage.foldername(name))[2]) in (select client_audit_ids())
      )
    )
  );

create policy "Editors delete files"
  on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth_organization_id()::text
    and auth_can_write_audit(try_uuid((storage.foldername(name))[2]))
  );

-- =============================================================================
-- 9. PILOTAGE PLATEFORME — agrégats sans accès aux dossiers
-- =============================================================================
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
    (select count(*) from client_requests where status = 'a_traiter'),
    (select count(*) from client_requests where status = 'traite'),
    (select count(*) from organizations where subscription_status = 'active'),
    (select count(*) from organizations where subscription_status = 'suspended'),
    (select count(*) from organizations where subscription_status = 'cancelled');
end;
$$;

create or replace function platform_client_stats()
returns table (
  organization_id      uuid,
  establishments_count bigint,
  users_count          bigint
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
  return query
    select o.id,
      (select count(*) from establishments e where e.organization_id = o.id),
      (select count(*) from users u where u.organization_id = o.id)
    from organizations o;
end;
$$;

-- =============================================================================
-- 10. INSCRIPTION — fin de l'auto-création de client
-- Les comptes sont ouverts par LS Compétences (client + admin) et par l'admin
-- (editors, readers) : les Server Actions créent la ligne `users` avec la
-- service role. Une inscription publique ne donne accès à rien.
-- =============================================================================
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

commit;
