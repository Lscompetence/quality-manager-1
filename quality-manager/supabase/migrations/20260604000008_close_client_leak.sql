-- =============================================================================
-- CORRECTIF DE SÉCURITÉ : un compte client voyait tout son organisme.
--
-- Le schéma initial (000000) a ses propres politiques de lecture « tout
-- l'organisme » (« Org members see ... »), que la migration 000005 n'avait pas
-- retirées — elle ne visait que celles de 000002. Postgres combine les
-- politiques permissives par un OU : ces anciennes règles ouvraient donc à un
-- client les dossiers non confiés, la fiche organisme, les mini-apps, etc.
--
-- Constaté avec la session d'un vrai compte client : il voyait un dossier qui
-- ne lui était pas confié. On garde ces lectures pour le staff (admin, editor,
-- reader) et on en exclut explicitement le client, qui n'accède qu'à ses
-- dossiers confiés via les politiques dédiées (000005 / 000007).
-- =============================================================================

drop policy if exists "Users see their own organization" on organizations;
create policy "Users see their own organization"
  on organizations for select
  using (id = auth_organization_id() and auth_user_role() <> 'client');

drop policy if exists "Org members see certifications" on certifications;
create policy "Org members see certifications"
  on certifications for select
  using (organization_id = auth_organization_id() and auth_user_role() <> 'client');

drop policy if exists "Org members see audits" on audits;
create policy "Org members see audits"
  on audits for select
  using (organization_id = auth_organization_id() and auth_user_role() <> 'client');

drop policy if exists "Org members see indicators" on audit_indicators;
create policy "Org members see indicators"
  on audit_indicators for select
  using (organization_id = auth_organization_id() and auth_user_role() <> 'client');

drop policy if exists "Org members see miniapp data" on miniapp_data;
create policy "Org members see miniapp data"
  on miniapp_data for select
  using (organization_id = auth_organization_id() and auth_user_role() <> 'client');

drop policy if exists "Org members see attachments" on attachments;
create policy "Org members see attachments"
  on attachments for select
  using (organization_id = auth_organization_id() and auth_user_role() <> 'client');

-- (Les politiques « Editors+ manage ... » exigent déjà admin ou editor :
-- elles ne concernent pas le client. Celles de 000002 ont été remplacées en
-- 000005. La lecture de l'équipe « Members see their team » a été retirée en
-- 000006.)
