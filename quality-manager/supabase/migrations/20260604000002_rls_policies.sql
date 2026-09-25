-- =============================================================================
-- Sécurisation de la base de données : RLS (Row Level Security)
-- =============================================================================

-- 1. Fonction sécurisée (bypasse RLS grâce à security definer) 
-- pour récupérer l'ID de l'organisme de l'utilisateur connecté sans créer de boucle infinie.
create or replace function get_current_org_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from users where id = auth.uid();
$$;

-- =============================================================================
-- ACTIVATION DE LA SÉCURITÉ SUR TOUTES LES TABLES
-- =============================================================================
alter table organizations enable row level security;
alter table users enable row level security;
alter table audits enable row level security;
alter table audit_indicators enable row level security;
alter table miniapp_data enable row level security;
alter table attachments enable row level security;
alter table certifications enable row level security;
alter table notification_preferences enable row level security;
alter table notifications enable row level security;

-- =============================================================================
-- POLITIQUES D'ACCÈS (POLICIES)
-- =============================================================================

-- ORGANIZATIONS
create policy "Les membres voient leur propre organisme"
on organizations for select
using (id = get_current_org_id());

create policy "Seuls les admins modifient l'organisme"
on organizations for update
using (
  id = get_current_org_id() 
  and exists (select 1 from users where id = auth.uid() and role = 'admin'::user_role)
);

-- USERS (Équipe)
create policy "Les membres voient leur propre profil et leur équipe"
on users for select
using (organization_id = get_current_org_id() or id = auth.uid());

create policy "Seuls les admins gèrent l'équipe"
on users for all
using (
  organization_id = get_current_org_id()
  and exists (select 1 from users where id = auth.uid() and role = 'admin'::user_role)
);

-- AUDITS & INDICATEURS & DOCUMENTS (Toutes les tables métiers avec organization_id)
create policy "Accès métier exclusif à l'organisme (audits)"
on audits for all using (organization_id = get_current_org_id());

create policy "Accès métier exclusif à l'organisme (audit_indicators)"
on audit_indicators for all using (organization_id = get_current_org_id());

create policy "Accès métier exclusif à l'organisme (miniapp_data)"
on miniapp_data for all using (organization_id = get_current_org_id());

create policy "Accès métier exclusif à l'organisme (attachments)"
on attachments for all using (organization_id = get_current_org_id());

create policy "Accès métier exclusif à l'organisme (certifications)"
on certifications for all using (organization_id = get_current_org_id());

create policy "Accès métier exclusif à l'organisme (notifications)"
on notifications for all using (organization_id = get_current_org_id());

-- PRÉFÉRENCES (Liées à l'utilisateur)
create policy "Gestion de ses propres préférences"
on notification_preferences for all
using (user_id = auth.uid());
