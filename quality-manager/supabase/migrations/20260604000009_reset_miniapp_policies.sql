-- =============================================================================
-- CORRECTIF DE SÉCURITÉ : un compte client lisait les données de mini-apps
-- de dossiers qui ne lui étaient pas confiés.
--
-- Après 000008, un test avec la session d'un vrai client montrait encore deux
-- lignes de `miniapp_data` d'un dossier non confié. La politique en cause ne
-- figure dans aucune migration du dépôt (ajoutée directement dans Supabase).
-- On supprime donc TOUTES les politiques de la table, quel que soit leur nom,
-- puis on recrée uniquement les bonnes : les mini-apps sont un outil du staff,
-- le client n'y a aucun accès.
-- =============================================================================

do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'miniapp_data'
  loop
    execute format('drop policy %I on public.miniapp_data', p.policyname);
  end loop;
end
$$;

alter table miniapp_data enable row level security;

-- Lecture : tout le staff de l'organisme (admin, editor, reader), jamais un client.
create policy "Le staff lit les mini-apps de son organisme"
  on miniapp_data for select
  using (organization_id = auth_organization_id() and auth_user_role() <> 'client');

-- Écriture : admin et editor uniquement.
create policy "Admins et editeurs gerent les mini-apps"
  on miniapp_data for all
  using (organization_id = auth_organization_id() and auth_user_role() in ('admin', 'editor'))
  with check (organization_id = auth_organization_id() and auth_user_role() in ('admin', 'editor'));
