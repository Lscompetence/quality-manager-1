-- =============================================================================
-- Quality Manager — Seed de données démo
-- À exécuter APRÈS les migrations et APRÈS avoir créé un compte via signup.
-- Met à jour l'organisation du premier user créé pour la transformer en démo.
-- =============================================================================
-- ⚠ Usage : remplacer ADMIN_EMAIL ci-dessous par l'email du compte créé.

do $$
declare
  v_admin_id    uuid;
  v_org_id      uuid;
  v_audit_id    uuid := uuid_generate_v4();
begin
  -- Récupérer l'admin (le 1er user créé)
  select id, organization_id
  into v_admin_id, v_org_id
  from public.users
  where email = 'ADMIN_EMAIL'   -- ← REMPLACER ICI
  limit 1;

  if v_admin_id is null then
    raise notice 'Aucun user trouvé avec ADMIN_EMAIL. Créez un compte via /signup puis remplacez ADMIN_EMAIL dans ce fichier.';
    return;
  end if;

  -- Mettre à jour l'organisation
  update public.organizations
  set
    name = 'LS Compétences (démo)',
    legal_form = 'SAS',
    siret = '93291042000019',
    declaration_nb = '76 33 12345 33',
    address = '12 rue de l''Avenir, 33000 Bordeaux',
    phone = '05 56 00 00 00',
    email = 'contact@ls-competences.fr',
    website = 'https://ls-competences.fr',
    plan = 'pro',
    billing_cycle = 'annual',
    billing_email = 'compta@ls-competences.fr'
  where id = v_org_id;

  -- Créer un dossier d'audit de démo
  insert into public.audits (id, organization_id, name, audit_type, categories, status, audit_date, certificateur)
  values (
    v_audit_id,
    v_org_id,
    'Audit de surveillance 2026',
    'surveillance',
    array['AF', 'BC', 'CFA']::category[],
    'en_cours',
    (current_date + interval '90 days')::date,
    'ICPF'
  );

  -- Renseigner quelques indicateurs
  insert into public.audit_indicators (audit_id, organization_id, indicator_code, critere_num, status, notes, updated_by)
  values
    (v_audit_id, v_org_id, 'I1', 1, 'complet', 'Site refondu en janvier 2026, toutes les mentions vérifiées.', v_admin_id),
    (v_audit_id, v_org_id, 'I2', 1, 'complet', 'Indicateurs de résultats publiés en page dédiée + reprise dans plaquette.', v_admin_id),
    (v_audit_id, v_org_id, 'I3', 1, 'en_cours', 'Mise à jour suite à V9 en cours sur la nouvelle certification.', v_admin_id),
    (v_audit_id, v_org_id, 'I4', 2, 'complet', 'Procédure d''analyse besoin formalisée par catégorie.', v_admin_id),
    (v_audit_id, v_org_id, 'I7', 2, 'en_cours', 'Mise à jour mapping RNCP→modules en cours.', v_admin_id),
    (v_audit_id, v_org_id, 'I11', 3, 'complet', 'Grille d''évaluation pondérée déployée sur toutes les promos.', v_admin_id),
    (v_audit_id, v_org_id, 'I12', 3, 'en_cours', 'Suivi assiduité hebdomadaire opérationnel.', v_admin_id),
    (v_audit_id, v_org_id, 'I21', 5, 'complet', 'Matrice compétences mise à jour, sous-traitance documentée.', v_admin_id),
    (v_audit_id, v_org_id, 'I23', 6, 'complet', 'Veille tri-thématique tenue mensuellement.', v_admin_id),
    (v_audit_id, v_org_id, 'I30', 7, 'complet', 'Satisfaction 4.6/5 sur 12 sessions Q1 2026.', v_admin_id),
    (v_audit_id, v_org_id, 'I31', 7, 'complet', '3 réclamations traitées dans les délais.', v_admin_id),
    (v_audit_id, v_org_id, 'I32', 7, 'en_cours', '12 actions d''amélioration en cours.', v_admin_id);

  -- Renseigner le Cockpit C7 avec des données réalistes
  insert into public.miniapp_data (audit_id, organization_id, miniapp_key, data, updated_by)
  values (
    v_audit_id,
    v_org_id,
    'cockpit-c7',
    jsonb_build_object(
      'tables', jsonb_build_object(
        'satisfaction', jsonb_build_array(
          jsonb_build_object(
            'session', 'BTS MCO 2026 — Promo A',
            'date', '2026-04-15',
            'nb_participants', '18',
            'nb_reponses', '17',
            'note_global', '4.6',
            'note_contenu', '4.7',
            'note_animateur', '4.8',
            'note_organisation', '4.4',
            'commentaires', 'Très bonne dynamique de groupe, supports clairs.'
          ),
          jsonb_build_object(
            'session', 'Bilan de compétences — janvier',
            'date', '2026-02-10',
            'nb_participants', '8',
            'nb_reponses', '8',
            'note_global', '4.8',
            'note_contenu', '4.9',
            'note_animateur', '4.9',
            'note_organisation', '4.6',
            'commentaires', 'Accompagnement personnalisé apprécié.'
          )
        ),
        'reclamations', jsonb_build_array(
          jsonb_build_object(
            'date', '2026-03-20',
            'source', 'apprenant',
            'emetteur', 'M. D. (apprenti BTS MCO)',
            'objet', 'Problème de planning sur la dernière période',
            'gravite', 'modere',
            'statut', 'traite',
            'date_traitement', '2026-03-22',
            'reponse', 'Replanification de 2 demi-journées + ajustement convention.'
          )
        ),
        'ameliorations', jsonb_build_array(
          jsonb_build_object(
            'date', '2026-02-01',
            'origine', 'satisfaction',
            'action', 'Renforcer les supports vidéo sur le module Marketing',
            'responsable', 'Sofiane S.',
            'echeance', '2026-06-30',
            'statut', 'en_cours',
            'evaluation', ''
          ),
          jsonb_build_object(
            'date', '2026-03-25',
            'origine', 'reclamation',
            'action', 'Mettre en place rappel planning J-3 systématique',
            'responsable', 'Admin',
            'echeance', '2026-04-15',
            'statut', 'realisee',
            'evaluation', 'Aucune nouvelle réclamation planning depuis avril.'
          )
        )
      ),
      'schemaVersion', 1
    ),
    v_admin_id
  );

  -- Tableau de veille (rempli)
  insert into public.miniapp_data (audit_id, organization_id, miniapp_key, data, updated_by)
  values (
    v_audit_id,
    v_org_id,
    'tableau-veille',
    jsonb_build_object(
      'tables', jsonb_build_object(
        'legale', jsonb_build_array(
          jsonb_build_object(
            'date', '2024-03-08',
            'source', 'loi',
            'info', 'RNQ V9 opposable depuis le 08/03/2024 — encadrement sous-traitance',
            'impact', 'majeur',
            'action', 'Revoir contrats sous-traitants CPF, ajouter clauses Qualiopi',
            'statut', 'faite'
          ),
          jsonb_build_object(
            'date', '2025-09-12',
            'source', 'rncp',
            'info', 'Nouvelle nomenclature blocs pour BTS MCO',
            'impact', 'modere',
            'action', 'Actualiser tableau correspondance RNCP',
            'statut', 'en_cours'
          )
        ),
        'metiers', jsonb_build_array(),
        'pedago', jsonb_build_array(
          jsonb_build_object(
            'date', '2026-02-20',
            'source', 'reseau',
            'info', 'Retours formateurs sur classes inversées',
            'impact', 'modere',
            'action', 'Tester sur 1 session pilote au S2',
            'statut', 'a_faire'
          )
        )
      ),
      'schemaVersion', 1
    ),
    v_admin_id
  );

  -- Quelques notifications
  insert into public.notifications (organization_id, user_id, category, title, source_label, source_url)
  values
    (v_org_id, v_admin_id, 'echeance', 'Audit dans 90 jours', 'Audit de surveillance 2026',
     '/audits/' || v_audit_id::text),
    (v_org_id, v_admin_id, 'success', 'Critère 1 (Information du public) complet à 100%', 'C1', null),
    (v_org_id, v_admin_id, 'system', 'Bienvenue dans Quality Manager !', 'Onboarding', null);

  raise notice 'Seed démo terminée : 1 dossier, 12 indicateurs renseignés, Cockpit + Veille remplis, 3 notifications.';
end $$;
