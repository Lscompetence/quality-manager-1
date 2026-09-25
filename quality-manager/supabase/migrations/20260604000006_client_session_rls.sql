-- =============================================================================
-- Migration 000006 : Hardening RLS pour la session et l'isolation des clients
-- =============================================================================

-- USERS : s'assurer que le client ne voit que son propre profil, alors que le staff voit son équipe et les clients rattachés
drop policy if exists "Members see their team" on users;
drop policy if exists "Les membres voient leur propre profil et leur équipe" on users;

create policy "Lecture des utilisateurs selon le role"
on users for select
using (
  id = auth.uid()
  or (
    organization_id = get_current_org_id()
    and auth_user_role() in ('admin', 'editor', 'reader')
  )
);

-- AUDIT_ACCESS : s'assurer que l'admin peut tout administrer sur son organisme et le client lire ses propres accès
drop policy if exists "Le staff gere les acces client de son organisme" on audit_access;
drop policy if exists "Le client voit ses propres acces" on audit_access;

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
using (
  user_id = auth.uid()
  and status = 'active'
);
