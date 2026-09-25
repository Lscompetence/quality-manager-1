-- =============================================================================
-- CORRECTIF : récursion infinie entre les politiques de `audits` et
-- `audit_access` (erreur 42P17), introduite par la migration 000005.
--
-- La politique client de `audits` lisait `audit_access`, et la politique staff
-- de `audit_access` lisait `audits` : Postgres évalue toutes les politiques
-- d'une table, il tournait donc en boucle — et TOUTE lecture des dossiers
-- échouait, y compris pour l'admin.
--
-- Même remède que `get_current_org_id()` : des fonctions `security definer`,
-- qui lisent la table sans repasser par ses politiques.
-- =============================================================================

-- 1. FONCTIONS SANS RLS -------------------------------------------------------

-- Dossiers actuellement confiés au client connecté.
create or replace function client_audit_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select audit_id from audit_access
  where user_id = auth.uid() and status = 'active';
$$;

-- Organisme propriétaire d'un dossier.
create or replace function audit_organization_id(p_audit_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from audits where id = p_audit_id;
$$;

-- 2. AUDIT_ACCESS : le staff ne passe plus par la politique de `audits` --------
drop policy if exists "Le staff gere les acces client de son organisme" on audit_access;

create policy "Le staff gere les acces client de son organisme"
on audit_access for all
using (
  audit_organization_id(audit_access.audit_id) = get_current_org_id()
  and auth_user_role() in ('admin', 'editor')
);

-- (« Le client voit ses propres acces » ne lit que ses propres colonnes :
-- aucune récursion, elle reste en place.)

-- 3. AUDITS / INDICATEURS / PIÈCES JOINTES : le client ne passe plus par la
-- politique de `audit_access` --------------------------------------------------
drop policy if exists "Le client consulte ses dossiers confies" on audits;
create policy "Le client consulte ses dossiers confies"
on audits for select
using (
  auth_user_role() = 'client'
  and id in (select client_audit_ids())
);

drop policy if exists "Le client consulte les indicateurs de ses dossiers confies" on audit_indicators;
create policy "Le client consulte les indicateurs de ses dossiers confies"
on audit_indicators for select
using (
  auth_user_role() = 'client'
  and audit_id in (select client_audit_ids())
);

drop policy if exists "Le client consulte les pieces jointes de ses dossiers confies" on attachments;
create policy "Le client consulte les pieces jointes de ses dossiers confies"
on attachments for select
using (
  auth_user_role() = 'client'
  and audit_id in (select client_audit_ids())
);

drop policy if exists "Le client depose des pieces jointes sur ses dossiers confies" on attachments;
create policy "Le client depose des pieces jointes sur ses dossiers confies"
on attachments for insert
with check (
  auth_user_role() = 'client'
  and uploaded_by = auth.uid()
  and audit_id in (select client_audit_ids())
);

-- 4. STORAGE : même principe pour le deuxième segment du chemin ----------------
drop policy if exists "Lecture des pieces jointes de son organisme ou de ses dossiers" on storage.objects;
create policy "Lecture des pieces jointes de son organisme ou de ses dossiers"
on storage.objects for select
using (
  bucket_id = 'attachments'
  and (storage.foldername(name))[1] = auth_organization_id()::text
  and (
    auth_user_role() <> 'client'
    or (storage.foldername(name))[2] in (select client_audit_ids()::text)
  )
);

drop policy if exists "Depot des pieces jointes par le staff ou sur ses dossiers confies" on storage.objects;
create policy "Depot des pieces jointes par le staff ou sur ses dossiers confies"
on storage.objects for insert
with check (
  bucket_id = 'attachments'
  and (storage.foldername(name))[1] = auth_organization_id()::text
  and (
    auth_user_role() in ('admin', 'editor')
    or (
      auth_user_role() = 'client'
      and (storage.foldername(name))[2] in (select client_audit_ids()::text)
    )
  )
);
