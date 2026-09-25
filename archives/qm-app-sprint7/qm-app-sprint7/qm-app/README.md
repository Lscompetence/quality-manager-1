# Quality Manager

> SaaS Qualiopi pour OF & CFA — Référentiel RNQ V9
> Stack : Next.js 14 (App Router, TypeScript strict) · Supabase (Postgres + Auth + Storage + RLS) · Tailwind + shadcn/ui · Vercel

---

## ✨ MVP complet — 6/6 sprints livrés

Application **complète et déployable** :

| # | Sprint | Contenu |
|---|---|---|
| ✅ | **Sprint 1** | Fondations : Next.js 14 + TS strict + Tailwind + schéma Supabase complet (9 tables + RLS multi-tenant) + auth complète |
| ✅ | **Sprint 2** | Cœur app : sidebar/topbar + routing dossier/critère/indicateur + composant `<AttachmentList />` universel |
| ✅ | **Sprint 3** | Moteur générique mini-apps `<MiniApp schema={...} />` + 6 mini-apps simples |
| ✅ | **Sprint 4** | 7 mini-apps moyennes (toutes en schémas déclaratifs) |
| ✅ | **Sprint 5** | 6 mini-apps complexes dont 4 composants custom (Cockpit C7, Matrice compétences, Grille évaluation, Suivi assiduité) |
| ✅ | **Sprint 6** | Vue Documents + Paramètres + Notifications + Profile + tests Vitest + seed démo |

**37 mini-apps métier sur les 32 indicateurs RNQ V9.** Les 32 indicateurs se traitent dans l'app : chaque page indicateur porte son dépôt de preuves, et chaque mini-app ajoute une colonne PJ par ligne.

Une mini-app s'ajoute là où il y a quelque chose à calculer ou à recouper — un taux, une échéance, une incohérence entre deux registres. I15 (droits et devoirs des apprentis) et I28 (AFEST) se traitent par modèles documentaires : il n'y a rien à calculer, donc pas de mini-app.

Les 18 mini-apps ajoutées au sprint 7 reprennent les classeurs Excel de la base documentaire Qualiopi (colonne « Base doc » : M12b, M16, M17b…) : leurs formules sont portées par la couche de calcul déclarative du moteur générique.

---

## 🚀 Démarrage rapide

### Prérequis
- Node.js ≥ 20
- pnpm ≥ 9 (`npm i -g pnpm`)
- Compte Supabase (gratuit pour démarrer)
- Compte Vercel (gratuit pour démarrer)

### 1. Installer

```bash
pnpm install
```

### 2. Configurer Supabase

1. Aller sur [supabase.com/dashboard](https://supabase.com/dashboard) → New project
2. Région **Frankfurt (eu-central-1)** recommandée pour la France
3. Récupérer dans Settings → API : `Project URL`, `anon public key`, `service_role secret`

### 3. Variables d'environnement

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

### 4. Appliquer le schéma SQL

Via le SQL Editor de Supabase Dashboard, exécuter dans l'ordre :

1. `supabase/migrations/20260604000000_initial_schema.sql` (schéma complet + RLS + bucket Storage)
2. `supabase/migrations/20260604000001_auth_trigger.sql` (trigger auto-création organization à l'inscription)

### 5. Configurer l'auth Supabase

Dans Supabase Dashboard → Authentication → URL Configuration :
- **Site URL** : `http://localhost:3000`
- **Redirect URLs** : `http://localhost:3000/auth/callback`

### 6. Lancer

```bash
pnpm dev
```

→ http://localhost:3000

Vous arrivez sur `/login` → cliquez "Créer un compte" pour vous inscrire.

### 7. (Optionnel) Charger les données démo

Après avoir créé un compte, ouvrir `supabase/seed/seed.sql`, remplacer `ADMIN_EMAIL` par l'email du compte créé, puis exécuter le script dans le SQL Editor Supabase. Cela bascule l'organisation en plan Pro + crée 1 dossier d'audit + remplit le Cockpit C7 et le Tableau de veille avec des données réalistes.

---

## 📋 Scripts disponibles

| Commande | Description |
|---|---|
| `pnpm dev` | Serveur de dev sur :3000 |
| `pnpm build` | Build production |
| `pnpm start` | Lancer le build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Vérification TypeScript stricte |
| `pnpm test` | Tests Vitest en watch |
| `pnpm test:run` | Tests Vitest one-shot (CI) |
| `pnpm db:types` | Régénérer `types/database.ts` depuis Supabase |
| `pnpm db:push` | Pousser les migrations Supabase |
| `pnpm format` | Prettier sur tout le projet |

---

## 🏗️ Architecture

```
qm-app/
├── app/
│   ├── (auth)/                    # Routes publiques : login / signup / forgot / callback
│   ├── (app)/                     # Routes protégées (middleware redirige sinon)
│   │   ├── dashboard/             # Liste des dossiers + bouton création
│   │   ├── audits/[id]/
│   │   │   ├── page.tsx           # Dashboard dossier (7 cartes critères)
│   │   │   ├── critere/[num]/
│   │   │   │   ├── page.tsx       # Liste indicateurs du critère
│   │   │   │   └── indicateur/[code]/page.tsx   # Détail indicateur
│   │   │   ├── miniapps/
│   │   │   │   ├── page.tsx       # Liste des mini-apps applicables
│   │   │   │   └── [key]/page.tsx # Page mini-app (router custom/generic)
│   │   │   └── documents/page.tsx # Vue Documents (agrégation PJ)
│   │   ├── settings/page.tsx      # Paramètres (3 onglets)
│   │   ├── notifications/page.tsx # Centre + préférences
│   │   └── profile/page.tsx       # Profil utilisateur
│   └── layout.tsx                 # Layout racine (fonts, Toaster)
│
├── components/
│   ├── ui/                        # shadcn primitives (Button, Card, Dialog...)
│   ├── layout/                    # Sidebar, Topbar, Breadcrumb, ThemeToggle
│   ├── auth/                      # LoginForm, SignupForm, BrandPanel
│   ├── audits/                    # CreateAuditDialog
│   ├── indicator/                 # IndicatorStatusForm
│   ├── attachments/               # AttachmentList universel ⭐
│   ├── documents/                 # DocumentsView (filtres + groupement)
│   ├── settings/                  # ProfileSection, TeamSection, PlanSection
│   ├── notifications/             # NotificationsCenter, NotificationsPreferences
│   └── miniapps/
│       ├── engine/                # Moteur générique (cell + miniapp)
│       └── custom/                # Composants custom (Cockpit, Matrice, etc.)
│
├── lib/
│   ├── supabase/                  # Clients server / browser / middleware SSR
│   ├── actions/                   # Server Actions (CRUD + auth)
│   ├── schemas/                   # Zod validators (+ tests)
│   ├── constants/rnq.ts           # Référentiel RNQ V9 complet
│   ├── miniapps/
│   │   ├── schema-types.ts        # Types des MiniAppSchema
│   │   ├── registry.ts            # 37 mini-apps enregistrées
│   │   └── schemas/               # 19 fichiers de schémas déclaratifs
│   └── utils/
│
├── types/database.ts              # Types Postgres → TS
├── supabase/
│   ├── migrations/                # SQL versionné (2 migrations)
│   └── seed/seed.sql              # Démo data
└── middleware.ts                  # Refresh sessions + protection routes
```

### Conventions

- **Server Components par défaut** — `"use client"` uniquement pour interactivité (formulaires, mini-apps)
- **Server Actions** pour toute mutation — pas d'API routes pour le CRUD
- **Zod** systématique pour valider entrées Server Actions
- **TypeScript strict** : `noUncheckedIndexedAccess`, `noImplicitOverride`, etc.
- **Import via alias `@/*`** depuis la racine

---

## 🗄️ Modèle de données

| Table | Rôle |
|---|---|
| `organizations` | Le tenant. 1 OF = 1 organization |
| `users` | Profils utilisateurs liés à `auth.users` (rôle admin/editor/reader) |
| `certifications` | Référentiel certifications RNCP/RS portées par l'OF |
| `audits` | Dossiers d'audit (= unités de travail) |
| `audit_indicators` | État de chaque indicateur (32) par dossier |
| `miniapp_data` | Données mini-apps (JSONB versionné par audit × mini-app) |
| `attachments` | PJ (upload Storage ou référence externe) |
| `notifications` | Notifications par user |
| `notification_preferences` | Préférences par user |

**Multi-tenant** : toutes les tables ont `organization_id` + policy RLS filtrant via `auth_organization_id()`.

**Rôles** :
- `admin` : tous les droits + gestion équipe + facturation
- `editor` : peut créer/modifier dossiers et mini-apps
- `reader` : consultation uniquement

---

## 🧩 Mini-apps

### Pattern "generic" (15 mini-apps)

Une mini-app generic = **un fichier de schéma JSON** déclaratif. Le moteur générique `<MiniApp schema={...} />` produit l'UI complète automatiquement : onglets, tables, ajout/édition/suppression de lignes, persistence JSONB debouncée (800ms), PJ scoped par cellule.

Exemple minimal :

```ts
// lib/miniapps/schemas/ma-mini-app.ts
export const monSchema: MiniAppSchema = {
  key: "ma-mini-app",
  name: "Ma mini-app",
  shortName: "Ma mini-app",
  description: "...",
  indicators: ["I23"],
  critere: 6,
  tables: [{
    id: "registre",
    label: "Registre",
    columns: [
      { id: "date", type: "date", label: "Date" },
      { id: "info", type: "textarea", label: "Information" },
      { id: "pj", type: "attachments", label: "PJ", width: "70px" },
    ],
  }],
};
```

→ L'enregistrer dans `lib/miniapps/registry.ts` et c'est fini.

### Pattern "custom" (4 mini-apps)

Pour les UI métier spécifiques (KPI dashboards, grilles 2D, calculs pondérés) : composant React dédié dans `components/miniapps/custom/`. Suit toujours le pattern :
1. État local React typé
2. `queueSave` debouncée 800ms qui appelle `saveMiniAppData`
3. Calculs via `useMemo`
4. UI structurée en `<Tabs>` + `<Card>`

### Types de cellules disponibles (moteur generic)

- `text`, `textarea` (auto-resize), `date`, `number`, `select` (avec options), `attachments` (PJ scoped par cellule)

---

## 📎 Composant `<AttachmentList />` universel

Cœur du système des preuves. Utilisable depuis :
- **Page indicateur** (`context_path: "indicator:I11"`)
- **Cellule de mini-app** (`context_path: "miniapp:<key>:<tableId>:<rowIndex>:<colId>"`)
- **Page mini-app globale** (`miniapp_key` seul)

Supporte deux modes (discriminated union Zod) :
- **upload** : fichier uploadé vers Supabase Storage (PDF, JPG, PNG, WebP, max 5 Mo)
- **ref** : lien externe (Drive, SharePoint, etc.)

Upload en 3 étapes : `generateUploadPath` (server) → upload direct au Storage (client) → `createAttachment` (server). Ouverture via URL signée 1h.

---

## 💰 Tarifs

| | Essentiel | Pro | Réseau |
|---|---|---|---|
| Tarif mensuel | **35 €/mois HT** | **75 €/mois HT** | Sur devis |
| Tarif annuel équivalent | **29 €/mois HT** | **62 €/mois HT** | — |
| Audits gérés en simultané | 1 | 3 | ∞ |
| Catégories max (AF/BC/VAE/CFA) | 2 | 3 | 4 |
| Stockage | 1 Go | 10 Go | ∞ |
| Mini-apps métier | ❌ | ✅ Les 19 | ✅ Les 19 |
| Indicateurs Qualiopi | ✅ Tous | ✅ Tous | ✅ Tous |
| Vue Documents | ✅ | ✅ | ✅ |
| Exports PDF | ✅ | ✅ | ✅ |

**Angle commercial** : "Votre consultant Qualiopi intégré, disponible 24/7, à 1/3 du prix". Économie estimée vs accompagnement consultant : **1 750 € HT par cycle**.

---

## 🚢 Déploiement Vercel

1. Pusher le repo sur GitHub
2. [vercel.com/new](https://vercel.com/new) → Import du repo
3. Framework détecté : Next.js
4. Variables d'env : copier depuis `.env.local`
5. **Important** : ajouter `https://your-domain.vercel.app/auth/callback` dans Supabase → Redirect URLs
6. Deploy

CI/CD GitHub Actions inclus (lint + typecheck + test + build).

---

## 🧪 Tests

```bash
pnpm test
```

Tests inclus :
- `lib/schemas/auth.test.ts` — schémas auth (login, signup, password rules)
- `lib/schemas/audits.test.ts` — schémas audits (catégories min, ISO date)
- `lib/schemas/organization.test.ts` — schémas org (email, URL)
- `lib/constants/rnq.test.ts` — référentiel (7 critères, 32 indicateurs, filtrage CFA, mapping mini-apps)

À étendre selon les besoins (tests d'intégration Supabase, tests composants).

---

## 🎨 Design system "Aurora"

- **Palette brand** : Marine `#0F2A47` · Améthyste `#6B4FBB` / `#9474FF` · Crème `#FBFAF6`
- **7 couleurs critères** : C1 corail · C2 émeraude · C3 ambre · C4 indigo · C5 vert · C6 violet · C7 rose
- **Typo** : Raleway (100-600) + JetBrains Mono (400-500) pour les meta/labels
- **Signatures** : glassmorphism subtil, soft 3D, fond aurore boréale (blobs blur)
- **Theming** : dark/light via `data-theme="dark"|"light"` sur `<html>` + variables HSL

---

## 📜 Crédits

Conçu et structuré par **Sofiane Saidi** (LS Compétences).
Référentiel National Qualité (RNQ) V9 en vigueur depuis le 08/01/2024.

---

## 📚 Roadmap post-MVP

Pistes pour de futures itérations :
- Exports PDF audit (synthèse + dossier de preuves)
- Exports Excel des mini-apps remplies
- Invitation membres équipe (admin)
- Multi-organisme (plan Réseau)
- API publique pour intégrations
- App mobile (consultation)
- Synthèse hebdo automatique par email
- Notifications push web
