-- =============================================================================
-- Ajoute le rôle "client" : un compte externe à l'organisme, qui ne voit
-- que le ou les dossiers qui lui ont été explicitement confiés (voir la
-- migration suivante pour la table d'accès et les politiques RLS).
--
-- Note : ALTER TYPE ... ADD VALUE ne peut pas être utilisé dans la même
-- transaction que son premier usage — cette migration doit donc rester seule,
-- avant celle qui s'en sert.
-- =============================================================================
alter type user_role add value if not exists 'client';
