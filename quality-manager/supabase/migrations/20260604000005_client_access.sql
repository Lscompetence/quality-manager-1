-- =============================================================================
-- Portail client : table d'accès + isolation RLS complète.
--
-- Principe : un compte "client" appartient techniquement à l'organisme (pour
-- que les jointures existantes continuent de fonctionner), mais ne voit RIEN
-- par le seul fait d'appartenir à l'organisme — contrairement au staff
-- (admin/editor/reader). Son accès passe exclusivement par des lignes
-- explicites dans `audit_access`, une par dossier confié.
-- =============================================================================

-- =============================================================================
-- 1. TABLE D'ACCÈS
-- =============================================================================
create table audit_access (
  id                uuid primary key default uuid_generate_v4(),
  audit_id          uuid not null references audits(id) on delete cascade,
  user_id           uuid not null references users(id) on delete cascade,
  invited_email     text not null,
  invited_by        uuid references users(id) on delete set null,
  -- Nom de l'organisme au moment de l'invitation, pour l'afficher côté client
  -- sans jamais avoir besoin d'interroger la table `organizations` (qui reste
  -- hors de portée du client — voir plus bas).
  organization_name text not null,
  status            text not null default 'active' check (status in ('active', 'revoked')),
  created_at        timestamptz not null default now(),
  unique (audit_id, user_id)
);

create index audit_access_user_id_idx on audit_access(user_id);
create index audit_access_audit_id_idx on audit_access(audit_id);

alter table audit_access enable row level security;

create policy "Le staff gere les acces client de son organisme"
on audit_access for all
using (
  exists (
    select 1 from audits a
    where a.id = audit_access.audit_id
      and a.organization_id = get_current_org_id()
      and auth_user_role() in ('admin', 'editor')
  )
);

create policy "Le client voit ses propres acces"
on audit_access for select
using (user_id = auth.uid());

-- =============================================================================
-- 2. TRIGGER D'INSCRIPTION : brancher le cas "invitation client"
-- Un compte invité porte `invited_org_id` dans ses métadonnées (posé par
-- l'appel serveur à `auth.admin.inviteUserByEmail`) : il rejoint directement
-- cet organisme avec le rôle client, sans qu'un nouvel organisme soit créé.
-- =============================================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_org_name text;
  v_first text;
  v_last text;
  v_invited_org_id uuid;
begin
  v_invited_org_id := nullif(new.raw_user_meta_data->>'invited_org_id', '')::uuid;

  if v_invited_org_id is not null then
    -- Compte créé via une invitation client : rattaché à l'organisme existant.
    insert into users (id, organization_id, email, first_name, last_name, role)
    values (
      new.id,
      v_invited_org_id,
      new.email,
      coalesce(new.raw_user_meta_data->>'first_name', ''),
      coalesce(new.raw_user_meta_data->>'last_name', ''),
      'client'
    );
  else
    v_org_name := coalesce(new.raw_user_meta_data->>'organization_name', 'Mon organisme');
    v_first    := coalesce(new.raw_user_meta_data->>'first_name', '');
    v_last     := coalesce(new.raw_user_meta_data->>'last_name', '');

    insert into organizations (name, email)
    values (v_org_name, new.email)
    returning id into v_org_id;

    insert into users (id, organization_id, email, first_name, last_name, role)
    values (new.id, v_org_id, new.email, v_first, v_last, 'admin');
  end if;

  insert into notification_preferences (user_id, preferences)
  values (
    new.id,
    '{"echeance_30j": {"inapp": true, "email": true}, "echeance_7j": {"inapp": true, "email": true}, "alerte_orange": {"inapp": true, "email": true}, "alerte_rouge": {"inapp": true, "email": true}, "weekly_digest": {"email": true}}'::jsonb
  );

  return new;
end;
$$;

-- =============================================================================
-- 3. DURCISSEMENT DES POLITIQUES EXISTANTES : exclure les clients de l'accès
-- large "tout l'organisme", et leur ouvrir un accès étroit "dossier confié
-- uniquement".
-- =============================================================================

-- ORGANIZATIONS : un client n'a aucune raison de voir la fiche organisme
-- (SIRET, email de facturation, etc.) — il ne connaît que le nom, dénormalisé
-- dans audit_access au moment de l'invitation.
drop policy if exists "Les membres voient leur propre organisme" on organizations;
create policy "Le staff voit son propre organisme"
on organizations for select
using (id = get_current_org_id() and auth_user_role() <> 'client');

-- AUDITS
drop policy if exists "Accès métier exclusif à l'organisme (audits)" on audits;

create policy "Le staff gere les audits de son organisme"
on audits for all
using (organization_id = get_current_org_id() and auth_user_role() <> 'client');

create policy "Le client consulte ses dossiers confies"
on audits for select
using (
  auth_user_role() = 'client'
  and exists (
    select 1 from audit_access aa
    where aa.audit_id = audits.id
      and aa.user_id = auth.uid()
      and aa.status = 'active'
  )
);

-- AUDIT_INDICATORS
drop policy if exists "Accès métier exclusif à l'organisme (audit_indicators)" on audit_indicators;

create policy "Le staff gere les indicateurs de son organisme"
on audit_indicators for all
using (organization_id = get_current_org_id() and auth_user_role() <> 'client');

create policy "Le client consulte les indicateurs de ses dossiers confies"
on audit_indicators for select
using (
  auth_user_role() = 'client'
  and exists (
    select 1 from audit_access aa
    where aa.audit_id = audit_indicators.audit_id
      and aa.user_id = auth.uid()
      and aa.status = 'active'
  )
);

-- ATTACHMENTS : le client peut consulter et déposer des preuves sur ses
-- dossiers confiés, mais pas les modifier ni les supprimer (réservé au staff).
drop policy if exists "Accès métier exclusif à l'organisme (attachments)" on attachments;

create policy "Le staff gere les pieces jointes de son organisme"
on attachments for all
using (organization_id = get_current_org_id() and auth_user_role() <> 'client');

create policy "Le client consulte les pieces jointes de ses dossiers confies"
on attachments for select
using (
  auth_user_role() = 'client'
  and audit_id is not null
  and exists (
    select 1 from audit_access aa
    where aa.audit_id = attachments.audit_id
      and aa.user_id = auth.uid()
      and aa.status = 'active'
  )
);

create policy "Le client depose des pieces jointes sur ses dossiers confies"
on attachments for insert
with check (
  auth_user_role() = 'client'
  and audit_id is not null
  and uploaded_by = auth.uid()
  and exists (
    select 1 from audit_access aa
    where aa.audit_id = attachments.audit_id
      and aa.user_id = auth.uid()
      and aa.status = 'active'
  )
);

-- MINIAPP_DATA, CERTIFICATIONS, NOTIFICATIONS : hors périmètre client, aucune
-- exception ajoutée — seul le staff y accède.
drop policy if exists "Accès métier exclusif à l'organisme (miniapp_data)" on miniapp_data;
create policy "Accès métier exclusif à l'organisme (miniapp_data)"
on miniapp_data for all
using (organization_id = get_current_org_id() and auth_user_role() <> 'client');

drop policy if exists "Accès métier exclusif à l'organisme (certifications)" on certifications;
create policy "Accès métier exclusif à l'organisme (certifications)"
on certifications for all
using (organization_id = get_current_org_id() and auth_user_role() <> 'client');

drop policy if exists "Accès métier exclusif à l'organisme (notifications)" on notifications;
create policy "Accès métier exclusif à l'organisme (notifications)"
on notifications for all
using (organization_id = get_current_org_id() and auth_user_role() <> 'client');

-- =============================================================================
-- 4. STORAGE : la portée "dossier de l'organisme" ne suffit plus pour un
-- client — il faut vérifier en plus le deuxième segment du chemin
-- (<organization_id>/<audit_id>/<fichier>) contre ses dossiers confiés.
-- =============================================================================
drop policy if exists "Org members read their attachments" on storage.objects;
drop policy if exists "Editors+ write attachments" on storage.objects;
drop policy if exists "Editors+ delete attachments" on storage.objects;

create policy "Lecture des pieces jointes de son organisme ou de ses dossiers"
on storage.objects for select
using (
  bucket_id = 'attachments'
  and (storage.foldername(name))[1] = auth_organization_id()::text
  and (
    auth_user_role() <> 'client'
    or (storage.foldername(name))[2] in (
      select audit_id::text from audit_access
      where user_id = auth.uid() and status = 'active'
    )
  )
);

create policy "Depot des pieces jointes par le staff ou sur ses dossiers confies"
on storage.objects for insert
with check (
  bucket_id = 'attachments'
  and (storage.foldername(name))[1] = auth_organization_id()::text
  and (
    auth_user_role() in ('admin', 'editor')
    or (
      auth_user_role() = 'client'
      and (storage.foldername(name))[2] in (
        select audit_id::text from audit_access
        where user_id = auth.uid() and status = 'active'
      )
    )
  )
);

create policy "Suppression des pieces jointes reservee au staff"
on storage.objects for delete
using (
  bucket_id = 'attachments'
  and (storage.foldername(name))[1] = auth_organization_id()::text
  and auth_user_role() in ('admin', 'editor')
);
