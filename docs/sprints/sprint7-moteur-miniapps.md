# Sprint 7 — Base documentaire → mini-apps

**TL;DR** — Les 18 classeurs Excel ajoutés lors de la refonte de la base documentaire sont désormais des mini-apps. Le moteur générique gagne une couche de calcul déclarative (colonnes calculées, synthèses, contrôles automatiques). On passe de 19 à **37 mini-apps**, dont 30 indicateurs outillés par un calcul.

---

## Ce qui change dans le moteur

Le moteur v1 rendait des tables éditables. Il ne savait ni calculer, ni agréger, ni alerter. Or c'est précisément ce qui fait la valeur des classeurs : 1 383 formules réparties sur 18 fichiers, dont chaque bloc « contrôles automatiques » est *le* livrable pour l'auditeur.

Trois hooks ajoutés à `MiniAppSchema`, tous optionnels et rétrocompatibles :

| Hook | Équivalent Excel | Rendu |
|---|---|---|
| `Column` de type `computed` | formule de cellule | pastille colorée en lecture seule, marquée `ƒ` dans l'en-tête |
| `TableSchema.summary` | feuille Synthèse | bande de KPI au-dessus du registre |
| `MiniAppSchema.controls` | bloc « contrôles automatiques » | bandeau d'alertes en tête de mini-app |

Deux champs de métadonnées : `docRef` (référence base documentaire, ex. `M27c`) et `categories` (filtrage AF/BC/VAE/CFA).

Le code couleur des classeurs est repris tel quel : vert conforme, orange à surveiller, rouge non conforme, gris sans objet.

### Écrire une formule

Les schémas sont du TypeScript, pas du JSON : une formule est une fonction. `lib/miniapps/helpers.ts` fournit le vocabulaire (dates, horaires, agrégats, lookups inter-tables, tonalités).

```ts
{
  id: "delai",
  type: "computed",
  label: "Délai",
  compute: ({ row }) => {
    const jours = daysBetween(row.date_diffusion, row.date_demarrage);
    if (jours === null) return danger("Diffusion non tracée");
    if (jours < 0) return danger(`Après démarrage (J+${Math.abs(jours)})`);
    if (jours < 7) return warn(`J-${jours} — moins de 7 j`);
    return ok(`J-${jours} — conforme`);
  },
}
```

`firstMatch` remplace les SI imbriqués quand les règles s'empilent :

```ts
compute: ({ row }) =>
  firstMatch([
    [!has(row.resultat), pending("Résultat à saisir")],
    [str(row.signature) === "non", danger("Grille non signée")],
    [nonValide(row) && !has(row.motivation), danger("Non-validation non motivée")],
  ], ok("Évaluation complète")),
```

**Attention au piège** : le tableau de règles est évalué avant `firstMatch`, donc TypeScript ne narrow pas les `number | null` à l'intérieur. Écrire `Math.abs(x ?? 0)`, pas `Math.abs(x)`.

---

## Choses à savoir avant de toucher

**Le moteur reçoit `schemaKey`, plus `schema`.** C'était un bug latent : `page.tsx` est un Server Component et passait le schéma complet à `<MiniApp>` qui est `"use client"`. Les schémas contiennent des fonctions (`rowLabel` existait déjà) et Next.js refuse de sérialiser une fonction à travers cette frontière — toute mini-app générique plantait au rendu. Le moteur résout maintenant le schéma lui-même via le registry, côté client. **Ne repasse jamais un objet schéma en prop.**

**`MINIAPPS` est dérivé du registry.** Il était recopié à la main dans `rnq.ts` : deux sources de vérité pour la même chose. `rnq.ts` importe désormais `listMiniAppSchemas()` et construit la map. Ajouter une mini-app = un fichier de schéma + une ligne dans `registry.ts`, rien d'autre.

**`IndicatorMeta.miniappKeys` a disparu**, pour la même raison : le rattachement mini-app → indicateur vit dans le schéma (`indicators: ["I11"]`), pas dans le référentiel.

**`schemaVersion` passe à 2** dans les payloads sauvegardés. Aucune migration nécessaire : les colonnes calculées ne sont pas persistées, et les données v1 se relisent telles quelles.

**Les colonnes `computed` sont exclues de `addRow`.** Elles n'existent pas en base, elles se recalculent à chaque rendu.

**Les liaisons inter-tables se font sur un libellé texte**, pas sur un id. Ex. : dans M32b, une sollicitation est rattachée à un partenaire par son nom exact. C'est fragile mais c'est le comportement du classeur d'origine, et ça évite d'imposer une saisie en deux temps. Les schémas concernés affichent un placeholder « Nom identique à l'onglet X » et une alerte quand la correspondance échoue.

**Une formule ne doit jamais casser la saisie.** `cell.tsx`, `summary` et `controls` sont tous enveloppés dans un try/catch qui retombe sur une valeur neutre. Le test de registry vérifie qu'aucune formule ne lève sur ligne vide ou sur ligne bruitée.

---

## Correction du référentiel

`rnq.ts` intitulait l'indicateur 15 « Maître d'apprentissage ». C'est faux : **I15 porte sur l'information des apprentis sur leurs droits, devoirs et les règles de santé-sécurité** en milieu professionnel (modèle M32c de la base). Corrigé.

---

## Les 18 mini-apps ajoutées

| Réf. | Clé | Crit. | Ind. | Catégories |
|---|---|---|---|---|
| M12b | `adequation-poste` | 2 | I4 · I13 | CFA |
| M16 | `alignement-objectifs` | 2 | I5 | toutes |
| M17b | `sequencier-pedagogique` | 2 | I6 | AF |
| M18a | `adequation-certification` | 2 | I7 | AF · VAE · CFA |
| M18b | `veille-certifications` | 2 | I7 | AF · VAE · CFA |
| M19a | `registre-positionnements` | 2 | I8 | toutes |
| M24g | `diffusion-accueil` | 3 | I9 | toutes |
| M27c | `registre-abandons` | 3 | I12 · I32 | toutes |
| M28a | `registre-adaptations` | 3 | I10 | toutes |
| M29a | `registre-evaluations` | 3 | I11 | toutes |
| M29b | `evaluations-blocs` | 3 | I11 · I16 | AF · VAE · CFA |
| M32a | `maitres-apprentissage` | 3 | I13 | CFA |
| M32b | `registre-partenariats` | 3 | I14 | CFA |
| M32d | `jurys-amenagements` | 3 | I16 | AF · VAE · CFA |
| M33a | `locaux-verifications` | 4 | I17 | toutes |
| M33b | `registre-plateformes` | 4 | I17 · I19 | toutes |
| M33c | `registre-epi` | 4 | I17 | CFA · AF |
| M34b | `registre-sous-traitants` | 4 | I18 · I27 | toutes |

Toutes en `generic` : la couche de calcul a suffi, aucun composant custom supplémentaire n'a été nécessaire.

### Seuils codés en dur, à vérifier avant mise en service

Ces valeurs viennent des classeurs ou de l'usage courant. Elles ne sont pas réglementaires au sens strict et peuvent devoir être ajustées :

- **M12b** — couverture pondérée : couverte 1 pt, partielle 0,5, non couverte 0. Lecture : ≥ 80 % solide, 60–80 % compensation, < 60 % poste à réexaminer.
- **M24g** — seuil de 7 jours entre diffusion des documents d'accueil et démarrage.
- **M27c** — taux d'abandon : ≤ 10 % vert, ≤ 20 % orange, au-delà rouge.
- **M32a** — plafond de 2 apprentis par maître d'apprentissage. Des dérogations de branche existent.
- **M32d** — 50 % de professionnels au jury ; conservation des productions 36 mois par défaut, réglable ligne par ligne.
- **M33a** — périodicités par défaut : électricité 12 mois, alarme 6, ascenseur 6, commission de sécurité 36, accessibilité 60, qualité de l'air 48. La catégorie ERP fait foi.
- **M34b** — évaluation sur 9 critères notés 1–4 ; en dessous de 2, axe de progrès et décision exigés.

---

## Rattachement aux indicateurs

Les 32 indicateurs sont traitables dans l'app : la page indicateur porte un dépôt de preuves, et chaque mini-app ajoute une colonne PJ par ligne. Le chiffre à retenir n'est donc pas un taux de couverture.

30 indicateurs disposent en plus d'une mini-app. **I15** (droits et devoirs des apprentis) et **I28** (AFEST) n'en ont pas, et n'en ont pas besoin : ni l'un ni l'autre n'a de classeur Excel dans la base, seulement des modèles Word (M32c, M47x). Un module à animer et un livret à faire signer ne se calculent pas. Ne pas fabriquer de check-list pour ces deux-là : ce serait construire pour le chiffre.

## Tests

- `lib/miniapps/helpers.test.ts` — 40+ cas sur les helpers de calcul (dates, horaires, agrégats, lookups, tonalités). Une régression ici fausse silencieusement des alertes de conformité.
- `lib/miniapps/registry.test.ts` — intégrité des 37 schémas : unicité des ids, onglets pointant sur des tables existantes, options de select non vides, et surtout : aucune formule ne lève et aucun contrôle ne se déclenche à tort sur des tables vides.
- `lib/constants/rnq.test.ts` — étendu : cohérence registry ↔ référentiel, unicité des `docRef`, rattachement mini-app ↔ indicateur, filtrage par catégories.
