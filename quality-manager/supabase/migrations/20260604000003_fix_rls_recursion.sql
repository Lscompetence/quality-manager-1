-- =============================================================================
-- FIX : Résolution de la boucle de récursion infinie (Infinite Recursion)
-- =============================================================================

-- 1. On supprime les anciennes politiques de la table 'users' qui causaient la boucle
drop policy if exists "Les membres voient leur propre profil et leur équipe" on users;
drop policy if exists "Seuls les admins gèrent l'équipe" on users;

-- 2. On les remplace par une politique très stricte qui ne génère AUCUNE boucle
create policy "Les membres voient leur propre profil"
on users for select
using (id = auth.uid());

create policy "Les membres modifient leur propre profil"
on users for update
using (id = auth.uid());

-- (Note : Pour la future fonctionnalité "Gestion d'équipe", nous injecterons
-- l'organization_id directement dans le JWT (app_metadata) de Supabase pour 
-- éviter définitivement toute récursion SQL).
