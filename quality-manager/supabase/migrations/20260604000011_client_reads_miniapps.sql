-- =============================================================================
-- Mini-apps visibles par le client, en LECTURE SEULE, sur ses dossiers confiés.
--
-- Décision produit : le client consulte ce que son organisme a saisi dans les
-- mini-apps (veille, check-lists, grilles…), sans pouvoir le modifier. On ajoute
-- donc uniquement une politique SELECT : aucune politique d'écriture n'existe
-- pour le client, toute tentative d'enregistrement est refusée par la base.
-- =============================================================================

drop policy if exists "Le client consulte les mini-apps de ses dossiers confies" on miniapp_data;

create policy "Le client consulte les mini-apps de ses dossiers confies"
  on miniapp_data for select
  using (
    auth_user_role() = 'client'
    and audit_id in (select client_audit_ids())
  );
