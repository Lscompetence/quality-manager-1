# Quality Manager — Blueprint technique

> Vue d'ensemble de l'architecture pour comprendre **comment c'est fait** avant de plonger dans le code.
> Si tu cherches **comment démarrer**, lis d'abord [`ONBOARDING.md`](./ONBOARDING.md).

---

## 1. Vision produit en une phrase

**Quality Manager structure la conformité Qualiopi (RNQ V9) des organismes de formation et CFA, en remplaçant l'accompagnement consultant ponctuel par un consultant intégré 24/7, avec 19 mini-apps métier qui industrialisent la production des preuves d'audit.**

## 2. Décisions architecturales clés

Pour chaque grande décision, le **pourquoi** est expliqué. Si tu envisages de revenir dessus, lis le pourquoi avant.

### Stack

| Choix | Pourquoi |
|---|---|
| **Next.js 14 App Router** (pas Pages Router) | Server Components par défaut → moins de JS côté client, meilleur SEO, données pré-fetched. App Router est l'avenir documenté de Next |
| **TypeScript strict** | `noUncheckedIndexedAccess` notamment — évite les `undefined` non gérés sur les accès tableau/objet. Coût initial faible, gain long-terme énorme |
| **Supabase** (pas Firebase, ni stack maison) | Postgres natif (= SQL, RLS, JSONB), Auth + Storage + Realtime inclus, open-source, self-hostable plus tard si besoin. Free tier confortable pour démarrer |
| **shadcn/ui** (pas Material UI, ni Chakra) | Composants **copiés** dans le projet (pas une dépendance externe). On édite/customize sans surcharge. Compatible Tailwind |
| **Server Actions Next.js** (pas API routes pour le CRUD) | Type-safe end-to-end (signature TS partagée client/server), pas de boilerplate `fetch` + JSON, validation Zod centralisée |
| **Zod** (pas Yup, ni Joi) | Excellente inférence TypeScript, discriminated unions natives, écosystème Next/React |
| **react-hook-form + zodResolver** | RHF = formulaires non-controlled (perfs) + Zod resolver = validation client/serveur cohérente |
| **Tailwind + jsx style scopé** | Tailwind pour 95% du styling, `<style jsx global>` pour les patterns spécifiques aux mini-apps (`.cell-input`, `.miniapp-table`) |

### Modèle de données

| Décision | Pourquoi |
|---|---|
| **Dossier d'audit = unité de travail centrale** | C'est l'angle métier : un OF passe en audit **initial**, puis **surveillance** (à 14-22 mois), puis **renouvellement** (à 3 ans). Chaque dossier a un cycle de vie indépendant |
| **Mini-app data = un blob JSONB par audit × mini-app** | Évite 20 tables relationnelles fragiles. Le moteur générique consomme/écrit du JSON, et un schéma versionné permet la migration |
| **RLS multi-tenant via `organization_id` partout** | Garantie d'isolation côté **base de données** (pas seulement côté app). Une fuite d'app = un seul tenant impacté |
| **Trigger Postgres pour création auto de l'organization à l'inscription** | Logique critique placée au plus près de la donnée, ne peut pas être contournée par un client malveillant |
| **PJ = `attachments` table unique, discriminée par `kind`** | Une seule table pour upload (Storage) ET référence externe (URL Drive/SharePoint), simplifie les requêtes croisées (Vue Documents) |
| **`context_path` textuel sur les PJ** | Format `indicator:I11` ou `miniapp:tableau-veille:registre:0:pj`. Permet d'attacher des PJ à n'importe quoi sans table de jointure |

### Architecture mini-apps

| Décision | Pourquoi |
|---|---|
| **Moteur générique `<MiniApp schema={...} />` + composants custom** | 15/19 mini-apps sont des registres CRUD → générique. 4/19 ont une UI métier spécifique (KPI dashboards, grilles 2D, calculs) → composants dédiés. Garde le code lisible des deux côtés |
| **Pas de type `computed` dans le moteur générique** | Pour ne pas transformer le moteur en couteau suisse fourre-tout. Si la mini-app a des calculs, c'est un composant custom |
| **Persistance JSONB avec debounce 800ms** | UX : pas de "Save" button explicite, sauvegarde transparente. 800ms = balance entre réactivité et nombre de requêtes |
| **Seed déclaratif dans le schema** | Une nouvelle organisation voit les mini-apps avec des exemples → adoption facilitée |

### Pricing & business model

| Décision | Pourquoi |
|---|---|
| **3 plans : 35€ / 75€ / sur devis** | TCO petit OF = ~250€/mois stack logiciel total. À 75€ Pro, QM = 30% du stack → acceptable |
| **Conformité Qualiopi accessible en Essentiel** | Différenciateur : on ne vend **pas** la conformité (c'est légalement obligatoire), on vend l'**industrialisation** via les mini-apps |
| **Toggle annuel/mensuel : -2 mois en annuel** | Incitatif clair sans nécessiter de calcul mental ("2 mois offerts") |
| **Encart ROI consultant** | Comparaison concrète : 1750€ HT économisés vs consultant ponctuel (~2500€ HT) |

---

## 3. Schéma des dépendances entre modules

```
┌─────────────────────────────────────────────────────────────────┐
│                         app/                                     │
│  (Pages Next.js — Server Components par défaut)                  │
└──────────────┬──────────────────────┬───────────────────────────┘
               │                      │
               ▼                      ▼
       ┌──────────────┐       ┌──────────────────┐
       │ components/  │       │  lib/actions/    │  ← Server Actions
       │ ("use client│       │  (mutations DB)  │
       │  " quand    │       └────────┬─────────┘
       │  interactif)│                │
       └──────┬───────┘                │
              │                        ▼
              │              ┌────────────────────┐
              │              │  lib/schemas/      │  ← Validation Zod
              │              │  (Zod validators)  │
              │              └─────────┬──────────┘
              │                        │
              ▼                        ▼
       ┌─────────────────────────────────────┐
       │  lib/supabase/                       │
       │  (clients server/browser/middleware) │
       └─────────────────┬───────────────────┘
                         │
                         ▼
              ┌────────────────────┐
              │  Supabase          │
              │  Postgres + Auth + │
              │  Storage + RLS     │
              └────────────────────┘

           ┌──────────────────────────┐
           │  lib/constants/rnq.ts    │  ← Référentiel RNQ V9
           │  (32 indicateurs, 7      │     (utilisé partout en lecture)
           │   critères, 19 mini-apps)│
           └──────────────────────────┘

           ┌──────────────────────────┐
           │  lib/miniapps/           │  ← Schémas + registry mini-apps
           │  - schema-types.ts       │
           │  - registry.ts (19)      │
           │  - schemas/ (19 fichiers)│
           └──────────────────────────┘
```

**Règles de dépendance** :
- `app/` peut tout importer
- `components/` peut importer `lib/`, `lib/actions/`, `lib/schemas/`, autres composants
- `lib/actions/` peut importer `lib/schemas/`, `lib/supabase/`, `lib/constants/`
- `lib/schemas/` ne dépend que de `zod` (purement déclaratif)
- `lib/constants/rnq.ts` ne dépend que de TS pur (référentiel statique)

**Jamais l'inverse** : `lib/schemas/` n'importe pas de `components/`.

---

## 4. Flux de données : 3 cas types

### Cas 1 : créer un dossier d'audit

```
1. Client : <CreateAuditDialog />
   - react-hook-form recueille les données
   - zodResolver valide côté client (UX immédiate)
   - Submit → appel server action createAudit(input)

2. Server : lib/actions/audits.ts → createAudit
   - createAuditSchema.safeParse(input) [validation server-side]
   - supabase.auth.getUser() pour récupérer l'user
   - SELECT users WHERE id = user.id → organization_id
   - INSERT INTO audits (organization_id, ...)

3. RLS Postgres :
   - Policy "Editors+ manage audits" vérifie auth_organization_id() + rôle
   - Si OK → insertion. Sinon → erreur silencieuse côté PG.

4. Retour : { ok: true, data: { id } }
5. Client : router.push(`/audits/${id}`)
6. Next : revalidatePath("/dashboard") avait été appelé → la liste se rafraîchit
```

### Cas 2 : uploader une preuve sur un indicateur

```
1. Client : <AttachmentList /> → user clique "Ajouter une preuve" → onglet "Fichier"
   - File picker, sélection PDF

2. Étape A : générer le path Storage côté server
   - generateUploadPath({ audit_id, file_name })
   - Server : SELECT organization_id du user → construit
     "<org_id>/<audit_id>/<uuid>_<safeName>"
   - Retour au client

3. Étape B : upload direct au Storage depuis le client
   - supabase.storage.from("attachments").upload(path, file)
   - RLS Storage policy "Editors+ write attachments" vérifie :
     - bucket = "attachments"
     - storage.foldername[0] = auth_organization_id()::text
     - rôle in ('admin','editor')

4. Étape C : enregistrer la row en DB
   - createAttachment({ kind: "upload", storage_path, ...metadata })
   - Server : INSERT INTO attachments (organization_id, audit_id, kind, ...)

5. Pour ouvrir le fichier plus tard :
   - getAttachmentSignedUrl(storage_path)
   - Server : supabase.storage.from("attachments").createSignedUrl(path, 3600)
   - URL valide 1h, partageable temporairement
```

**Pourquoi ce flow en 3 étapes ?** Upload direct au Storage = pas de passage du fichier par notre server (économie de bande passante + latence). Mais on garde un INSERT côté server qui matérialise la PJ et applique nos règles métier.

### Cas 3 : remplir une mini-app

```
1. Client : <MiniApp schema={...} initialData={...} attachments={...} />
   - State local React pour les données (tables : Record<tableId, Row[]>)
   - Cellules typées (text/textarea/date/select/number/attachments)

2. User édite une cellule :
   - onChange → updateCell(tableId, rowIndex, colId, value)
   - setTables(next) → re-render
   - queueSave(next) → setTimeout 800ms

3. Si une autre frappe arrive < 800ms :
   - clearTimeout(saveTimerRef.current)
   - Nouveau setTimeout 800ms

4. Après 800ms sans frappe :
   - startTransition → saveMiniAppData({ audit_id, miniapp_key, data })
   - Server : upsert dans miniapp_data (table)
   - RLS : auth_organization_id() vérifie

5. Si la cellule est de type "attachments" :
   - context_path = `miniapp:${miniappKey}:${tableId}:${rowIndex}:${colId}`
   - AttachmentList branché → flow PJ (cas 2) avec ce context_path
```

---

## 5. Sécurité — où c'est vérifié quoi

| Endroit | Quoi |
|---|---|
| **middleware.ts** (Next) | Redirige vers `/login` si pas connecté sur route protégée. Redirige vers `/dashboard` si connecté sur page auth |
| **Server actions** | `supabase.auth.getUser()` → si null, refuse. Pour admin-only : check `role === 'admin'` |
| **Zod (server)** | Re-valide TOUTES les entrées même si le client a déjà validé. Jamais confiance dans les données client |
| **RLS Postgres** | Filet de sécurité final. Même si une server action est bypass, RLS bloque l'accès à la donnée d'un autre tenant |
| **Storage RLS** | Path = `<organization_id>/...`, policy vérifie que le 1er segment du path == `auth_organization_id()::text` |
| **URLs signées** | PJ Storage non publiques. Accès via URL signée 1h générée par la server action (donc soumise aux mêmes checks) |

**Principe : défense en profondeur.** Chaque couche fait sa vérif, indépendamment des autres.

---

## 6. Conventions de code

### Naming
- **Fichiers** : `kebab-case.tsx` / `kebab-case.ts`
- **Composants** : `PascalCase` (export nommé)
- **Hooks personnalisés** : `useXxx`
- **Server Actions** : verbe à l'infinitif (`createAudit`, `updatePlan`)
- **Schémas Zod** : `xxxSchema`, type associé `XxxInput`
- **Constantes** : `SCREAMING_SNAKE_CASE` pour les vraies constantes (options de select, etc.)

### Structure d'un composant Client
```tsx
"use client";

import * as React from "react";
// ... autres imports

export function MonComposant({ propA, propB }: Props) {
  // 1. State local (en haut)
  const [state, setState] = React.useState(...);

  // 2. Effets / transitions
  const [pending, startTransition] = useTransition();

  // 3. Calculs dérivés via useMemo
  const computed = React.useMemo(() => ..., [deps]);

  // 4. Handlers
  const handleClick = () => { ... };

  // 5. JSX
  return ( ... );
}

// 6. Sous-composants privés en dessous (pas exportés)
function SousComposant() { ... }
```

### Structure d'une Server Action
```ts
"use server";

import { ... } from "...";
import type { ActionResult } from "./types";

export async function maAction(input: MonInput): Promise<ActionResult<{ id: string }>> {
  // 1. Validation Zod
  const parsed = monSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  // 2. Auth check
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "Non authentifié" };

  // 3. Resolve organization (pour scope tenant)
  const { data: profile } = await supabase.from("users").select("organization_id").eq("id", userData.user.id).single();
  if (!profile) return { ok: false, error: "Profil introuvable" };

  // 4. Mutation DB
  const { data, error } = await supabase.from("...").insert({ ...parsed.data, organization_id: profile.organization_id });
  if (error) return { ok: false, error: error.message };

  // 5. Revalidation cache Next
  revalidatePath("/path/to/revalidate");
  return { ok: true, data: { id: data.id } };
}
```

### Quand "use client" et quand pas ?

- **Server Component par défaut** (pas de "use client")
- **"use client" SI** : `useState`, `useEffect`, event handlers (`onClick`, `onChange`), browser APIs, react-hook-form
- **Pattern courant** : page = Server Component (récupère les données via Supabase server) → passe les données en props à un Client Component qui gère l'interactivité

---

## 7. Évolutions futures sans casser l'archi

### Ajouter une mini-app generic

1. Créer `lib/miniapps/schemas/ma-mini-app.ts` (déclaratif, ~50 lignes)
2. Enregistrer dans `lib/miniapps/registry.ts`
3. (Optionnel) Ajouter `miniappKeys: ["ma-mini-app"]` à l'indicateur concerné dans `lib/constants/rnq.ts`

C'est tout. Le moteur fait le reste : routing, UI, persistance, PJ.

### Ajouter une mini-app custom

1. Créer le schéma léger avec `kind: "custom"` dans `lib/miniapps/schemas/`
2. Créer le composant dans `components/miniapps/custom/`
3. L'enregistrer dans le `CustomMiniAppRouter` (switch dans `app/(app)/audits/[id]/miniapps/[key]/page.tsx`)

### Ajouter un nouveau type de cellule au moteur

1. Ajouter le type dans `Column` union dans `lib/miniapps/schema-types.ts`
2. Ajouter le rendu dans `components/miniapps/engine/cell.tsx`

### Ajouter une nouvelle entité (ex: certifications gérées)

1. SQL : créer table + RLS dans une nouvelle migration `supabase/migrations/2026MMDD_xxx.sql`
2. Régénérer types : `pnpm db:types`
3. Schéma Zod : `lib/schemas/xxx.ts` + tests
4. Server actions : `lib/actions/xxx.ts`
5. UI : composants + page

### Étendre les rôles (ex: ajouter `superadmin`)

1. Modifier l'enum `user_role` dans une migration
2. Mettre à jour les policies RLS
3. Adapter `auth_user_role()` si besoin
4. Mettre à jour le mapping `ROLE_LABEL` dans `components/settings/team-section.tsx`

### Connecter un payment provider (Stripe)

1. Ajouter `stripe_customer_id`, `stripe_subscription_id` dans `organizations`
2. Webhook handler dans `app/api/webhooks/stripe/route.ts`
3. Server action `createCheckoutSession` qui appelle Stripe
4. Brancher le bouton "Basculer" dans `PlanSection`

---

## 8. Pièges connus & comment les éviter

| Piège | Symptôme | Solution |
|---|---|---|
| Oublier `"use client"` sur un composant avec hooks | Erreur build "useState only works in client components" | Ajouter `"use client";` en haut |
| Importer une server action dans un Server Component | "Cannot use server function in server component" | Les server actions sont **appelées** par des Client Components, pas importées par des Server Components |
| Mutation DB sans `revalidatePath` | UI ne reflète pas le changement | Toujours `revalidatePath` à la fin d'une action qui change l'UI |
| Ne pas régénérer `types/database.ts` après une migration | TypeScript ignore les nouveaux champs | `pnpm db:types` après chaque migration |
| RLS policy oubliée sur nouvelle table | `select` retourne `[]` même connecté | Ne pas oublier `enable row level security` + au moins 1 policy |
| Trigger `handle_new_user` qui plante au signup | Inscription échoue silencieusement | Vérifier les logs Supabase. Souvent un champ requis manquant côté `raw_user_meta_data` |
| File trop gros pour le bucket | "Payload too large" | Le bucket est à 5 Mo max. Côté client, on vérifie avant l'upload |
| URL Storage publique au lieu de signée | Lien partagé qui ne marche pas après 1h | Toujours `getAttachmentSignedUrl`, jamais d'URL directe |
| Cellule de mini-app qui ne sauve pas | Frappe trop rapide ? | Le debounce est 800ms — c'est attendu. Si vraie casse, vérifier la console pour erreur toast |

---

## 9. Métriques & monitoring

**Non inclus dans le MVP, à ajouter** :
- Plausible / PostHog pour l'analytics produit (pas de Google Analytics — anti-GDPR par défaut)
- Sentry pour les erreurs runtime (free tier suffit pour démarrer)
- Supabase Logs explorer pour les requêtes lentes / erreurs RLS
- Vercel Analytics (déjà gratuit avec le déploiement)

**Indicateurs business à instrumenter** :
- Taux de conversion signup → premier dossier créé
- Mini-apps les plus / moins utilisées
- Taux d'usage moyen des PJ par dossier
- Conversion Essentiel → Pro

---

## 10. À retenir en 30 secondes

- **Stack** : Next.js 14 + TS strict + Tailwind + Supabase + Vercel
- **Pattern** : Server Components par défaut, "use client" uniquement pour interactivité
- **Sécurité** : RLS Postgres + Zod server-side + URLs signées
- **Mini-apps** : 15 generic (schéma JSON) + 4 custom (composants React)
- **Multi-tenant** : `organization_id` partout, isolation au niveau base
- **Sauvegarde** : Server Actions + JSONB debouncé 800ms pour les mini-apps
- **Convention** : `lib/actions/types.ts` exporte `ActionResult<T>` partagé

**Pour démarrer concrètement** : [`ONBOARDING.md`](./ONBOARDING.md).
