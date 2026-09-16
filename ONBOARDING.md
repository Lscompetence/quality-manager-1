# Quality Manager — Onboarding du nouveau dev

> Tu rejoins le projet ? Suis ce guide. Compte **2 à 3 heures** pour être opérationnel.
> Si tu veux comprendre **comment c'est fait** (archi & décisions), lis [`BLUEPRINT.md`](./BLUEPRINT.md) en parallèle.

---

## 📌 Avant de commencer — checklist pré-requis

- [ ] **Node.js ≥ 20** installé (`node -v`)
- [ ] **pnpm ≥ 9** installé (`pnpm -v`) — si non : `npm i -g pnpm`
- [ ] Un éditeur (VS Code recommandé) avec extensions : ESLint, Prettier, Tailwind CSS IntelliSense
- [ ] Un compte **GitHub** (pour cloner et plus tard pusher)
- [ ] Un compte **Supabase** ([supabase.com](https://supabase.com), free tier suffit)
- [ ] (Optionnel pour plus tard) Un compte **Vercel** ([vercel.com](https://vercel.com))

---

## 🚀 Étape 1 — Installer (15 min)

### Récupérer le projet

```bash
# Si le projet est sur GitHub :
git clone <repo-url> qm-app
cd qm-app

# Sinon, à partir du ZIP livré :
unzip qm-app-sprint6.zip
cd qm-app
```

### Installer les dépendances

```bash
pnpm install
```

Ça peut prendre 2-3 minutes la première fois. Si erreur de version Node, vérifier que tu es bien sur Node 20+.

### Vérifier que TypeScript compile

```bash
pnpm typecheck
```

Doit passer sans erreur. Si erreur, c'est probablement un problème d'install (relancer `pnpm install`).

### Vérifier les tests

```bash
pnpm test:run
```

Doit afficher quelque chose comme `Test Files 4 passed, Tests xx passed`.

---

## 🗄️ Étape 2 — Créer le projet Supabase (10 min)

### Créer le projet

1. Aller sur [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project**
3. **Region** : Frankfurt (eu-central-1) — recommandé pour la France
4. Mot de passe DB : génère-en un fort et **note-le** (utile pour la CLI)
5. Attendre 1-2 min que le projet soit provisionné

### Récupérer les clés

Dans le projet → **Settings (engrenage) → API**, copier :
- **Project URL** (ex: `https://abcdef.supabase.co`)
- **anon public key** (commence par `eyJ...`)
- **service_role secret** (commence par `eyJ...`) ⚠ Garder secret !

### Appliquer le schéma SQL

Dans Supabase Dashboard → **SQL Editor** (icône `>_`) → **New query** :

1. Copier le contenu de `supabase/migrations/20260604000000_initial_schema.sql`
2. Coller → **Run** (en bas à droite)
3. Doit afficher "Success. No rows returned"
4. Nouvelle query : copier `supabase/migrations/20260604000001_auth_trigger.sql`
5. **Run**

✅ Tu as maintenant : 9 tables + RLS multi-tenant + bucket Storage `attachments` + trigger auto-création organization.

### Vérifier dans le Table Editor

Dans le menu de gauche → **Database → Tables**. Tu dois voir : `audits`, `attachments`, `audit_indicators`, `certifications`, `miniapp_data`, `notifications`, `notification_preferences`, `organizations`, `users`.

### Configurer l'auth

Dans le menu → **Authentication → URL Configuration** :
- **Site URL** : `http://localhost:3000`
- **Redirect URLs** : ajouter `http://localhost:3000/auth/callback` (clic "Add URL")
- **Save**

---

## ⚙️ Étape 3 — Connecter le projet à Supabase (5 min)

```bash
cp .env.example .env.local
```

Ouvrir `.env.local` et remplir :

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdef.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

⚠ **Ne JAMAIS** commit `.env.local` (déjà dans `.gitignore`).

---

## 🎬 Étape 4 — Lancer le projet (2 min)

```bash
pnpm dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

Tu arrives sur `/login`. **Bravo, ça tourne !**

---

## 👤 Étape 5 — Créer ton compte de test (5 min)

1. Cliquer **"Créer un compte"** sur la page login
2. Remplir :
   - Prénom / Nom : tes infos
   - Nom de l'organisme : `Test OF` (par exemple)
   - Email : un email réel (Supabase envoie un mail de confirmation)
   - Password : 8+ caractères, 1 majuscule, 1 chiffre
3. Cocher CGU → **Créer mon compte**
4. ✅ Compte créé, **mais en attente de confirmation email**

### Confirmer l'email (en dev local)

En mode dev, Supabase envoie un vrai email mais pas toujours fiable. Deux options :

**Option A — Confirmer manuellement (le plus simple)** : dans Supabase Dashboard → **Authentication → Users** → trouver ton user → cliquer "..." → **Confirm email**.

**Option B — Désactiver la confirmation en dev** : Dashboard → **Authentication → Providers → Email** → désactiver "Confirm email". À réactiver en prod !

### Se connecter

Retour sur [http://localhost:3000/login](http://localhost:3000/login), te connecter. Tu arrives sur `/dashboard`. 🎉

---

## 🌱 Étape 6 — (Optionnel) Charger les données démo (5 min)

Tu vois un dashboard vide. Pour explorer l'app avec du contenu réaliste :

1. Ouvrir `supabase/seed/seed.sql`
2. **Remplacer `ADMIN_EMAIL`** (3ème ligne du DO) par l'email du compte que tu viens de créer
3. Dans Supabase SQL Editor → **New query** → coller le contenu → **Run**
4. Tu dois voir "NOTICE: Seed démo terminée"

Rafraichir [http://localhost:3000/dashboard](http://localhost:3000/dashboard) → tu vois :
- 1 dossier "Audit de surveillance 2026"
- Plan basculé en **Pro** (donc accès aux mini-apps)
- 12 indicateurs renseignés
- Cockpit C7 rempli (Satisfaction + Réclamations + Améliorations)
- Tableau de veille rempli
- 3 notifications

---

## 🧭 Étape 7 — Tour du propriétaire (30 min)

Maintenant que tu as une app qui tourne avec des données, explore. Suis cet ordre pour comprendre l'app dans l'ordre logique métier :

### 1. Vue d'ensemble
- `/dashboard` → liste des dossiers. Clique sur celui de démo.

### 2. Dashboard dossier
- Vue d'un dossier d'audit avec ses 7 critères et leur progression.
- Clique sur **C7 — Amélioration continue**.

### 3. Page critère
- Liste des indicateurs du critère (I30, I31, I32).
- Clique sur **I30**.

### 4. Page indicateur
- Statut + notes
- **Mini-apps associées** (avec lien vers Cockpit C7)
- **Preuves attachées** (zone PJ universelle)

### 5. Mini-app
- Retour au dossier → bouton **Mini-apps** dans la sidebar
- Liste des 19 mini-apps groupées par critère
- Ouvre **Cockpit C7** (déjà rempli par le seed)
- Note : les KPI en haut sont **calculés en temps réel** depuis les données

### 6. Vue Documents
- Sidebar → **Documents**
- Toutes les PJ du dossier avec filtres (par critère, par type)
- Au début c'est vide (le seed ne crée pas de PJ). Ajoute-en une :
  - Retour sur un indicateur → "Ajouter une preuve" → uploader un PDF
  - Retour sur Documents → tu la vois apparaître

### 7. Paramètres
- Avatar en haut à droite → **Paramètres organisme**
- 3 onglets : **Profil** (info OF) / **Équipe** (membres avec rôles) / **Abonnement** (toggle annuel/mensuel + cards plans + encart ROI)
- Essaie de basculer du plan Pro vers Essentiel → constate que les mini-apps deviennent inaccessibles (gate)

### 8. Notifications
- Topbar → cloche
- Centre des notifs + onglet préférences avec toggles in-app/email

---

## 📂 Étape 8 — Structure du code, où chercher quoi (15 min)

```
qm-app/
├── app/                  # Pages Next.js (App Router)
│   ├── (auth)/           # Routes auth publiques
│   └── (app)/            # Routes protégées
│
├── components/           # Composants React
│   ├── ui/               # Primitives shadcn (Button, Card...)
│   ├── miniapps/
│   │   ├── engine/       # ⭐ Moteur générique <MiniApp />
│   │   └── custom/       # Composants custom (Cockpit, Matrice...)
│   └── ...
│
├── lib/
│   ├── actions/          # ⭐ Server Actions (mutations)
│   ├── schemas/          # Validators Zod (+ tests)
│   ├── constants/rnq.ts  # ⭐ Référentiel RNQ V9 complet
│   ├── miniapps/
│   │   ├── registry.ts   # Liste des 19 mini-apps
│   │   └── schemas/      # ⭐ 19 fichiers de schémas mini-apps
│   ├── supabase/         # Clients Supabase
│   └── utils/cn.ts
│
├── types/database.ts     # Types Postgres → TS
└── supabase/
    ├── migrations/       # Migrations SQL versionnées
    └── seed/seed.sql     # Données démo
```

### Si tu cherches…

| Tu veux… | Va voir… |
|---|---|
| Ajouter une page | `app/(app)/...` (créer un dossier + `page.tsx`) |
| Ajouter une mini-app | `lib/miniapps/schemas/` + enregistrer dans `registry.ts` |
| Modifier le référentiel Qualiopi | `lib/constants/rnq.ts` |
| Ajouter une mutation DB | `lib/actions/*.ts` + schéma Zod dans `lib/schemas/` |
| Modifier le schéma DB | Nouvelle migration dans `supabase/migrations/` |
| Modifier l'UI globale | `components/layout/*` |
| Ajouter un type de cellule mini-app | `lib/miniapps/schema-types.ts` + `components/miniapps/engine/cell.tsx` |
| Comprendre les rôles | `lib/constants/rnq.ts` + migrations (enum `user_role`) |

---

## 🛠️ Étape 9 — Workflows courants

### Faire une modification simple

```bash
# 1. Brancher
git checkout -b feature/ma-fonctionnalite

# 2. Modifier le code
# 3. Vérifier
pnpm lint
pnpm typecheck
pnpm test:run

# 4. Commit
git add .
git commit -m "feat: description claire"

# 5. Push
git push origin feature/ma-fonctionnalite

# 6. PR sur GitHub
```

### Ajouter une nouvelle table SQL

```bash
# 1. Créer la migration
cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_ma_migration.sql << 'EOF'
-- Description de la migration

create table mes_donnees (...);

alter table mes_donnees enable row level security;

create policy "Org members see their data"
  on mes_donnees for select
  using (organization_id = auth_organization_id());
EOF

# 2. Appliquer en local (via SQL Editor)
# 3. Régénérer les types (si Supabase CLI installée)
pnpm db:types
# Sinon : éditer manuellement types/database.ts

# 4. Tester avant de commit
pnpm typecheck
```

### Ajouter une mini-app generic (rapide)

```bash
# 1. Créer le schéma
cat > lib/miniapps/schemas/ma-mini-app.ts << 'EOF'
import type { MiniAppSchema } from "../schema-types";

export const maMiniAppSchema: MiniAppSchema = {
  key: "ma-mini-app",
  name: "Ma super mini-app",
  shortName: "Ma mini-app",
  description: "...",
  indicators: ["I23"],
  critere: 6,
  tables: [{
    id: "registre",
    label: "Mon registre",
    columns: [
      { id: "date", type: "date", label: "Date", width: "120px" },
      { id: "info", type: "textarea", label: "Information" },
      { id: "pj", type: "attachments", label: "PJ", width: "70px" },
    ],
  }],
};
EOF

# 2. Enregistrer dans le registry
# Éditer lib/miniapps/registry.ts pour ajouter l'import + l'entrée
```

C'est tout. La page existe automatiquement à `/audits/<id>/miniapps/ma-mini-app`.

---

## 🚢 Étape 10 — Déployer en prod (quand tu seras prêt)

### Préparer le repo

1. Pusher le code sur GitHub (repo privé recommandé)
2. Vérifier que `.env.local` n'est **pas** committé

### Vercel

1. [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository**
3. Sélectionner le repo
4. **Environment Variables** : copier celles de `.env.local`
5. **Deploy**

### Mettre à jour Supabase pour la prod

Dans Supabase Dashboard → **Authentication → URL Configuration** :
- Ajouter ton URL Vercel (ex: `https://qm-app.vercel.app`) dans **Site URL**
- Ajouter `https://qm-app.vercel.app/auth/callback` dans **Redirect URLs**

### Réactiver la confirmation email

Si tu l'avais désactivée en dev → la réactiver maintenant. **C'est obligatoire en prod.**

---

## 🆘 Quand ça plante — checklist debug

### "Cannot find module '@/...'"
→ `pnpm install` puis redémarrer le serveur dev.

### "RLS policy violation" en dev
→ Soit ton user n'a pas le bon rôle, soit la policy SQL a un bug. Vérifie dans le SQL Editor : `select * from users where id = auth.uid()` pour voir ton rôle.

### L'auth ne marche pas
→ Vérifier les **3 redirect URLs** dans Supabase Auth Config + que `NEXT_PUBLIC_APP_URL` est bien défini dans `.env.local`.

### Le seed SQL ne fait rien
→ Tu as bien remplacé `ADMIN_EMAIL` par ton email réel ? Le `RAISE NOTICE` te dit si l'admin a été trouvé.

### Upload de PJ qui échoue
→ Vérifier que le bucket `attachments` existe (Database → Storage). Vérifier que le user a un rôle `editor` ou `admin` (pas `reader`).

### "Hydration mismatch" en console
→ Probablement un composant qui utilise `Date` ou `Math.random` côté SSR. Le wrapper dans `useEffect` ou marquer `"use client"`.

### Mini-app qui ne sauvegarde pas
→ Sauvegarde debouncée 800ms. Si après 1s ça toaste rouge "Sauvegarde échouée" → ouvrir la console navigateur pour voir l'erreur Supabase (souvent une policy RLS).

### Erreur de build sur Vercel "Type error in xxx"
→ `pnpm typecheck` en local doit passer **avant** de pusher. Si typecheck OK en local mais Vercel échoue → le code n'a probablement pas été pushé.

---

## 📚 Ressources

### À lire en parallèle
- [`README.md`](../README.md) — Vue produit + démarrage rapide
- [`BLUEPRINT.md`](./BLUEPRINT.md) — Architecture technique détaillée

### Documentation officielle
- [Next.js App Router](https://nextjs.org/docs/app)
- [Supabase Docs](https://supabase.com/docs) — surtout [Auth](https://supabase.com/docs/guides/auth) et [RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [shadcn/ui](https://ui.shadcn.com) — pour ajouter d'autres composants
- [Zod](https://zod.dev) — pour les validators
- [Tailwind CSS](https://tailwindcss.com/docs) — classes utilitaires

### Référentiels métier
- [RNQ V9 — texte officiel](https://travail-emploi.gouv.fr/IMG/pdf/referentiel_national_qualite_v9.pdf)
- [France Compétences](https://www.francecompetences.fr) — RNCP & RS

---

## 👏 Tu es prêt !

Avant de commencer à coder en autonomie :

- [ ] J'ai démarré l'app en local et créé un compte
- [ ] J'ai chargé le seed et exploré toutes les pages
- [ ] J'ai lu le `BLUEPRINT.md` (au moins en diagonale)
- [ ] J'ai compris la différence "Server Component" vs "Client Component"
- [ ] J'ai compris ce qu'est une "Server Action"
- [ ] J'ai identifié l'emplacement du référentiel RNQ (`lib/constants/rnq.ts`)
- [ ] J'ai identifié la différence "mini-app generic" vs "mini-app custom"
- [ ] J'ai testé `pnpm typecheck` et `pnpm test:run` (les deux doivent passer)

Bienvenue dans Quality Manager. 🚀

---

**Une question ? Un truc qui marche pas ?** Le projet est un MVP, des bugs sont possibles. Note-les dans une issue GitHub, ou demande à l'auteur (Sofiane).
