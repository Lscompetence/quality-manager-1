-- =============================================================================
-- Quality Manager — Schéma initial complet
-- Multi-tenant via organizations + Row-Level Security
-- =============================================================================

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================
create type user_role as enum ('admin', 'editor', 'reader');
create type plan_tier as enum ('essentiel', 'pro', 'reseau');
create type billing_cycle as enum ('monthly', 'annual');
create type audit_type as enum ('initial', 'surveillance', 'renouvellement');
create type audit_status as enum ('en_cours', 'cloture', 'archive');
create type category as enum ('AF', 'BC', 'VAE', 'CFA');
create type indicator_status as enum ('a_traiter', 'en_cours', 'complet', 'non_applicable');
create type attachment_type as enum ('upload', 'ref');
create type notification_category as enum ('echeance', 'alerte', 'equipe', 'system', 'success');

-- =============================================================================
-- ORGANIZATIONS (le tenant)
-- =============================================================================
create table organizations (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  legal_form      text,
  siret           text,
  declaration_nb  text,
  address         text,
  phone           text,
  email           text,
  website         text,
  logo_url        text,
  -- branding
  accent_color    text default 'violet',
  default_theme   text default 'dark',
  -- abonnement
  plan            plan_tier not null default 'essentiel',
  billing_cycle   billing_cycle not null default 'annual',
  billing_email   text,
  vat_number      text,
  next_billing_at timestamptz,
  -- audit fields
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_organizations_siret on organizations(siret);

-- =============================================================================
-- USERS (profils internes — lié à auth.users)
-- =============================================================================
create table users (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  email           text not null unique,
  first_name      text not null,
  last_name       text not null,
  role            user_role not null default 'reader',
  avatar_url      text,
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_users_organization on users(organization_id);
create index idx_users_email on users(email);

-- =============================================================================
-- CERTIFICATEURS (référence par OF)
-- =============================================================================
create table certifications (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  code            text,           -- RNCP/RS code
  issuer          text,           -- certificateur
  level           text,           -- niveau RNCP
  categories      category[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_certifications_organization on certifications(organization_id);

-- =============================================================================
-- AUDITS (= dossiers de conformité)
-- =============================================================================
create table audits (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  audit_type      audit_type not null,
  categories      category[] not null default '{}',
  status          audit_status not null default 'en_cours',
  audit_date      date,
  certificateur   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_audits_organization on audits(organization_id);
create index idx_audits_status on audits(status);

-- =============================================================================
-- INDICATEURS (état par dossier d'audit)
-- =============================================================================
create table audit_indicators (
  id              uuid primary key default uuid_generate_v4(),
  audit_id        uuid not null references audits(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  indicator_code  text not null,            -- ex: 'I11', 'I23'
  critere_num     int not null,             -- 1..7
  status          indicator_status not null default 'a_traiter',
  notes           text,
  updated_by      uuid references users(id),
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique(audit_id, indicator_code)
);

create index idx_audit_indicators_audit on audit_indicators(audit_id);
create index idx_audit_indicators_org on audit_indicators(organization_id);

-- =============================================================================
-- MINI-APP DATA (générique — payload JSONB versionné)
-- Chaque mini-app stocke son état dans une ligne par audit
-- =============================================================================
create table miniapp_data (
  id              uuid primary key default uuid_generate_v4(),
  audit_id        uuid not null references audits(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  miniapp_key     text not null,            -- ex: 'tableau-veille', 'suivi-assiduite'
  data            jsonb not null default '{}',
  schema_version  int not null default 1,
  updated_by      uuid references users(id),
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique(audit_id, miniapp_key)
);

create index idx_miniapp_data_audit on miniapp_data(audit_id);
create index idx_miniapp_data_key on miniapp_data(miniapp_key);
create index idx_miniapp_data_org on miniapp_data(organization_id);

-- =============================================================================
-- PIÈCES JOINTES (uploads OU références externes)
-- =============================================================================
create table attachments (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  audit_id        uuid references audits(id) on delete cascade,
  miniapp_key     text,                     -- contexte mini-app
  context_path    text,                     -- ex: "registre.2.pj" (row index + col)
  context_label   text,                     -- libellé humain (ex: "CR du 20/03/2026")
  -- type
  kind            attachment_type not null,
  -- pour kind='upload'
  file_name       text not null,
  file_size       bigint,
  mime_type       text,
  storage_path    text,                     -- chemin dans supabase storage
  -- pour kind='ref'
  external_url    text,
  -- meta
  uploaded_by     uuid references users(id),
  created_at      timestamptz not null default now()
);

create index idx_attachments_org on attachments(organization_id);
create index idx_attachments_audit on attachments(audit_id);
create index idx_attachments_miniapp on attachments(miniapp_key);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
create table notifications (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  category        notification_category not null,
  title           text not null,
  source_label    text,                     -- ex: "Suivi assiduité · I12"
  source_url      text,                     -- lien de navigation
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_notifications_user_unread on notifications(user_id, read_at);
create index idx_notifications_org on notifications(organization_id);

-- =============================================================================
-- NOTIFICATION PREFERENCES (par user)
-- =============================================================================
create table notification_preferences (
  user_id         uuid primary key references users(id) on delete cascade,
  preferences     jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now()
);

-- =============================================================================
-- TRIGGER : updated_at automatique
-- =============================================================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_organizations_updated_at before update on organizations
  for each row execute function set_updated_at();
create trigger trg_users_updated_at before update on users
  for each row execute function set_updated_at();
create trigger trg_certifications_updated_at before update on certifications
  for each row execute function set_updated_at();
create trigger trg_audits_updated_at before update on audits
  for each row execute function set_updated_at();
create trigger trg_audit_indicators_updated_at before update on audit_indicators
  for each row execute function set_updated_at();
create trigger trg_miniapp_data_updated_at before update on miniapp_data
  for each row execute function set_updated_at();

-- =============================================================================
-- HELPER : récupérer l'organization_id du user courant
-- =============================================================================
create or replace function auth_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from users where id = auth.uid()
$$;

create or replace function auth_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from users where id = auth.uid()
$$;

-- =============================================================================
-- ROW-LEVEL SECURITY
-- =============================================================================
alter table organizations enable row level security;
alter table users enable row level security;
alter table certifications enable row level security;
alter table audits enable row level security;
alter table audit_indicators enable row level security;
alter table miniapp_data enable row level security;
alter table attachments enable row level security;
alter table notifications enable row level security;
alter table notification_preferences enable row level security;

-- Organizations : un user voit/édite son organization uniquement
create policy "Users see their own organization"
  on organizations for select
  using (id = auth_organization_id());

create policy "Admins can update their organization"
  on organizations for update
  using (id = auth_organization_id() and auth_user_role() = 'admin');

-- Users : on voit les membres de son organization
create policy "Members see their team"
  on users for select
  using (organization_id = auth_organization_id());

create policy "Users can update their own profile"
  on users for update
  using (id = auth.uid());

create policy "Admins can manage team"
  on users for all
  using (organization_id = auth_organization_id() and auth_user_role() = 'admin');

-- Pattern générique : org-scoped tables
-- Certifications
create policy "Org members see certifications"
  on certifications for select using (organization_id = auth_organization_id());
create policy "Editors+ manage certifications"
  on certifications for all
  using (organization_id = auth_organization_id() and auth_user_role() in ('admin','editor'));

-- Audits
create policy "Org members see audits"
  on audits for select using (organization_id = auth_organization_id());
create policy "Editors+ manage audits"
  on audits for all
  using (organization_id = auth_organization_id() and auth_user_role() in ('admin','editor'));

-- Audit indicators
create policy "Org members see indicators"
  on audit_indicators for select using (organization_id = auth_organization_id());
create policy "Editors+ manage indicators"
  on audit_indicators for all
  using (organization_id = auth_organization_id() and auth_user_role() in ('admin','editor'));

-- Mini-app data
create policy "Org members see miniapp data"
  on miniapp_data for select using (organization_id = auth_organization_id());
create policy "Editors+ manage miniapp data"
  on miniapp_data for all
  using (organization_id = auth_organization_id() and auth_user_role() in ('admin','editor'));

-- Attachments
create policy "Org members see attachments"
  on attachments for select using (organization_id = auth_organization_id());
create policy "Editors+ manage attachments"
  on attachments for all
  using (organization_id = auth_organization_id() and auth_user_role() in ('admin','editor'));

-- Notifications : personnelles à l'utilisateur
create policy "Users see their own notifications"
  on notifications for select using (user_id = auth.uid());
create policy "Users can mark their notifications read"
  on notifications for update using (user_id = auth.uid());

-- Notification preferences
create policy "Users manage their own prefs"
  on notification_preferences for all using (user_id = auth.uid());

-- =============================================================================
-- STORAGE : bucket pour pièces jointes
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  5242880,    -- 5 Mo max par fichier
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

-- RLS sur storage : un user ne lit/écrit que dans le dossier de son org
create policy "Org members read their attachments"
  on storage.objects for select
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth_organization_id()::text
  );

create policy "Editors+ write attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth_organization_id()::text
    and auth_user_role() in ('admin','editor')
  );

create policy "Editors+ delete attachments"
  on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth_organization_id()::text
    and auth_user_role() in ('admin','editor')
  );
