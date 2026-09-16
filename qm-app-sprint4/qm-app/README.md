# Quality Manager

> SaaS Qualiopi pour OF & CFA — RNQ V9
> Stack : Next.js 14 (App Router, TS strict) · Supabase (Postgres + Auth + Storage + RLS) · Tailwind · shadcn/ui · Vercel

---

## Sprint 1 — Fondations ✓

Ce premier sprint pose toute la base technique du projet :

- **Setup Next.js 14** App Router + TypeScript strict
- **Supabase** : schéma complet, RLS multi-tenant, trigger auto-création d'organization à l'inscription
- **Auth** : login, signup, forgot password, callback email
- **UI** : layout split branding/form + thème Aurora (dark/light) + composants shadcn de base
- **Validation** : schémas Zod + react-hook-form
- **Server Actions** pour toutes les mutations (pas d'API routes pour le CRUD)
- **CI/CD** : GitHub Actions (lint + typecheck + tests + build) + Vercel
- **Tests** : Vitest configuré, exemples sur les schémas Zod

---

## Prérequis

- Node.js ≥ 20
- pnpm ≥ 9 (`npm i -g pnpm`)
- Compte Supabase (gratuit pour démarrer)
- Compte Vercel (gratuit pour démarrer)
- Compte Supabase CLI (optionnel mais recommandé : `brew install supabase/tap/supabase`)

---

## Démarrage rapide

### 1. Installer les dépendances

```bash
pnpm install
```

### 2. Créer un projet Supabase

1. Aller sur [supabase.com/dashboard](https://supabase.com/dashboard) → New project
2. Choisir région **Frankfurt (eu-central-1)** pour la France
3. Récupérer dans Settings → API : `Project URL`, `anon public key`, `service_role secret`

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Puis remplir :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Appliquer le schéma Supabase

Deux options :

**Option A — Via le SQL Editor (le plus simple)**

1. Aller dans Supabase Dashboard → SQL Editor
2. Coller le contenu de `supabase/migrations/20260604000000_initial_schema.sql`
3. Run
4. Coller `supabase/migrations/20260604000001_auth_trigger.sql`
5. Run

**Option B — Via la CLI (recommandé pour la suite)**

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

### 5. Configurer l'auth dans Supabase

Dans Supabase Dashboard → Authentication → URL Configuration :

- **Site URL** : `http://localhost:3000`
- **Redirect URLs** : ajouter `http://localhost:3000/auth/callback`

### 6. Lancer le projet

```bash
pnpm dev
```

→ http://localhost:3000

Vous arrivez sur `/login`. Cliquez sur "Créer un compte" pour vous inscrire.

---

## Scripts disponibles

| Commande | Description |
|---|---|
| `pnpm dev` | Lancer le serveur de dev sur :3000 |
| `pnpm build` | Build production |
| `pnpm start` | Lancer la version build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Vérification TypeScript stricte |
| `pnpm test` | Tests Vitest en watch |
| `pnpm test:run` | Tests Vitest one-shot (CI) |
| `pnpm db:types` | Régénérer `types/database.ts` depuis le schéma Supabase |
| `pnpm db:push` | Pousser les migrations Supabase |
| `pnpm format` | Prettier sur tout le projet |

---

## Architecture

```
qm-app/
├── app/
│   ├── (auth)/              # Routes auth (login/signup/forgot/callback)
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   ├── callback/        # Route handler pour confirmation email
│   │   ├── actions.ts       # Server actions auth (login, signup, etc.)
│   │   └── layout.tsx       # Layout split branding/form
│   ├── (app)/               # Routes authentifiées (protégées)
│   │   ├── dashboard/
│   │   └── layout.tsx       # Layout app (sidebar à venir Sprint 2)
│   ├── layout.tsx           # Layout racine (fonts, Toaster)
│   ├── page.tsx             # / → redirect login ou dashboard
│   └── globals.css          # Tailwind + variables Aurora
│
├── components/
│   ├── ui/                  # Composants shadcn (Button, Input, Label, Checkbox)
│   ├── auth/                # Forms auth + BrandPanel
│   └── layout/              # ThemeToggle (extensible)
│
├── lib/
│   ├── supabase/            # Clients server / browser / middleware
│   ├── schemas/             # Schémas Zod + tests
│   └── utils/               # cn helper
│
├── types/
│   └── database.ts          # Types Postgres → TS (régénérés via supabase CLI)
│
├── supabase/
│   ├── migrations/          # SQL versionné
│   └── seed/                # Seed data (à venir)
│
└── middleware.ts            # Refresh sessions Supabase + protection routes
```

### Conventions

- **Server Components par défaut**, Client Components avec `"use client"` uniquement quand nécessaire (formulaires, interactivité)
- **Server Actions** pour toute mutation (pas d'API routes pour le CRUD)
- **Zod** systématique pour valider les entrées des Server Actions
- **TypeScript strict** : `noUncheckedIndexedAccess`, `noImplicitOverride`, etc.
- **Import via alias `@/*`** depuis la racine

---

## Modèle de données — Vue d'ensemble

| Table | Rôle |
|---|---|
| `organizations` | Le tenant. 1 OF = 1 organization |
| `users` | Profils utilisateurs (lié à `auth.users`) avec rôle (admin/editor/reader) |
| `certifications` | Référentiel certifications RNCP/RS portées par l'OF |
| `audits` | Dossiers d'audit (= unités de travail) |
| `audit_indicators` | État de chaque indicateur (32) par dossier d'audit |
| `miniapp_data` | Données de chaque mini-app (JSONB versionné par audit) |
| `attachments` | Pièces jointes (upload via Storage ou référence externe) |
| `notifications` | Notifications par user |
| `notification_preferences` | Préférences par user (in-app + email par catégorie) |

**Multi-tenant** : toutes les tables ont une colonne `organization_id` et une policy RLS qui filtre via la fonction `auth_organization_id()`.

**Rôles** :
- `admin` : tous les droits + gestion équipe + facturation
- `editor` : peut créer/modifier dossiers et mini-apps
- `reader` : consultation uniquement

---

## Déploiement Vercel

1. Pusher le repo sur GitHub
2. Aller sur [vercel.com/new](https://vercel.com/new) → Import le repo
3. Framework détecté automatiquement : Next.js
4. Variables d'environnement : copier celles de `.env.local`
5. **Important** : ajouter `https://your-domain.vercel.app/auth/callback` dans Supabase Auth → Redirect URLs
6. Deploy

---

## Roadmap des Sprints

- ✅ **Sprint 1** — Fondations (setup, schéma Supabase, auth, theming)
- ✅ **Sprint 2** — Cœur app : sidebar/topbar + dashboard + dossier d'audit + routing critères/indicateurs + composant Attachment universel
- ✅ **Sprint 3** — Moteur générique mini-apps + groupe 1 (6 simples) : Tableau de veille, Annuaire handicap, Mobilités CFA, CR Réunions, Correspondance RNCP, Accompagnement apprentis
- ✅ **Sprint 4** — Mini-apps groupe 2 (7 moyennes) : Inventaire matériel, Analyse besoin, Suivi insertions, PDC + entretiens, Grille adaptation, Articulation CFA, Check-list session
- ⏭ **Sprint 5** — Mini-apps groupe 3 (complexes : 6) : Cockpit C7, Matrice compétences, Grille évaluation, Suivi assiduité, Check-list site web, Check-list examen
- ⏭ **Sprint 6** — Vue Documents, Paramètres, Notifications, tests critiques, seed data

---

## Support

Conçu et structuré par Sofiane Saidi (LS Compétences).
Stack et architecture documentés dans ce README et dans le code via JSDoc/TSDoc.
