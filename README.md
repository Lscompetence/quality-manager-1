# Quality Manager — LS Compétences

SaaS de préparation à l'audit Qualiopi (référentiel RNQ V9) pour les organismes de formation et les CFA.

## Organisation du dépôt

| Dossier | Contenu |
|---|---|
| `quality-manager/` | **Le projet.** Application Next.js + Supabase, sprints 1 à 7 réunis. |
| `Prototype/Mini app/` | Les maquettes HTML qui servent de référence visuelle. |
| `docs/sprints/` | La documentation de chaque sprint (README et notes de conception). |
| `archives/` | Les anciens dossiers `qm-app-sprint1` à `qm-app-sprint7`, conservés pour mémoire. |
| `BLUEPRINT.md`, `ONBOARDING.md` | Vision produit et prise en main. |

Les sept dossiers de sprint étaient des copies successives du même projet : chacun reprenait
le précédent et y ajoutait. Ils ont été réunis dans `quality-manager/`, qui contient donc la
totalité du travail — y compris les 37 mini-apps et le moteur de calcul du sprint 7.

## Démarrer

```bash
cd quality-manager
npm install          # la première fois seulement
npm run dev          # http://localhost:3000
```

Copiez `.env.example` vers `.env.local` et renseignez vos clés Supabase.

## Commandes utiles

```bash
npm run dev          # serveur de développement
npm run build        # build de production (bien plus rapide à l'usage que le mode dev)
npm start            # sert le build de production
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test:run     # tests Vitest
```

## Design

L'interface suit les maquettes de `Prototype/Mini app/` : fond aurore animé, verre dépoli,
mode clair en dégradé bleu vers sable, typographie Raleway et JetBrains Mono. Le logo officiel
vit dans `quality-manager/public/brand/`.
