-- =============================================================================
-- Trigger : à l'inscription d'un nouvel user, créer son organization
-- ATTENTION : suppose que first_name, last_name et organization_name sont
-- passés dans raw_user_meta_data lors du signup côté client.
-- =============================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_org_name text;
  v_first text;
  v_last text;
begin
  -- Extraire les meta du signup
  v_org_name := coalesce(new.raw_user_meta_data->>'organization_name', 'Mon organisme');
  v_first    := coalesce(new.raw_user_meta_data->>'first_name', '');
  v_last     := coalesce(new.raw_user_meta_data->>'last_name', '');

  -- Créer l'organization
  insert into organizations (name, email)
  values (v_org_name, new.email)
  returning id into v_org_id;

  -- Créer le user comme admin de cette org
  insert into users (id, organization_id, email, first_name, last_name, role)
  values (new.id, v_org_id, new.email, v_first, v_last, 'admin');

  -- Préférences par défaut
  insert into notification_preferences (user_id, preferences)
  values (new.id, '{"echeance_30j": {"inapp": true, "email": true}, "echeance_7j": {"inapp": true, "email": true}, "alerte_orange": {"inapp": true, "email": true}, "alerte_rouge": {"inapp": true, "email": true}, "weekly_digest": {"email": true}}'::jsonb);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
