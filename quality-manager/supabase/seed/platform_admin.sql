-- =============================================================================
-- Créer un super admin LS Compétences
--
-- 1. Supabase → Authentication → Users → « Add user » → Create new user
--    (email + mot de passe, cocher « Auto Confirm User »)
-- 2. Remplacer SUPER_ADMIN_EMAIL ci-dessous, puis exécuter dans le SQL Editor.
--
-- Un super admin n'a PAS de ligne dans public.users : il n'appartient à aucun
-- client, et n'a aucun accès aux dossiers ni aux documents.
-- =============================================================================
insert into public.platform_admins (user_id)
select id from auth.users where email = 'SUPER_ADMIN_EMAIL'   -- ← REMPLACER ICI
on conflict do nothing;

select case when count(*) = 1 then 'Super admin créé' else 'Aucun utilisateur Auth avec cet email' end as resultat
from public.platform_admins pa join auth.users u on u.id = pa.user_id
where u.email = 'SUPER_ADMIN_EMAIL';
