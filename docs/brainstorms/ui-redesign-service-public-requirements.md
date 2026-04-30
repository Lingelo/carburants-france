---
date: 2026-04-30
topic: ui-redesign-service-public
status: superseded
---

> **Note (2026-04-30, post-livraison)** : la direction « service public moderne »
> a été abandonnée à mi-parcours au profit d'une identité **neutre moderne**
> (charcoal `#171717` + blanc + FUEL_COLORS comme seul système expressif).
> La feature « coût d'un plein selon véhicule » a aussi été supprimée. Ce doc
> reste comme trace historique du raisonnement initial. Voir le commit du pivot
> dans la branche `claude/pwa-conversion-3NXOl` pour les changements concrets.

# Refonte UI — direction « service public moderne »

## Problem Frame

L'app `carburants-france` est jugée « moche » par un retour externe (n=1). L'auto-diagnostic identifie quatre causes plausibles : (a) palette Tailwind générique sans identité, (b) écran d'accueil dispersé (carte centrée Europe + modal flottant), (c) labels de la carte en anglais, (d) typo par défaut. Sans validation, on ne sait pas laquelle est dominante.

L'app contient déjà une feature significative que la première version de ce doc ignorait : un **panneau « coût réel d'un plein selon votre véhicule »** (`src/components/StationPanel.tsx`) qui consomme `public/data/vehicles.json` (~1500 véhicules ADEME+EEA), avec autocomplete véhicule, settings (taille de réservoir, conso, vitesse moyenne, taux horaire), et tri des stations par coût total réel (carburant + temps de trajet × tarif horaire). **Cette feature reste dans le scope** : on la restyle, on ne la supprime pas et on ne la cache pas.

Plutôt qu'engager d'un seul bloc une refonte identitaire complète qui pourrait être surdimensionnée, on **décompose en 2 vagues avec gate de validation** :

- **Vague 1 — quick wins** : labels FR + restyle léger (palette + typo) du modal et du panneau station existants. Coût faible, levier potentiellement élevé si les causes (b) et (c) dominent.
- **Vague 2 — refonte identitaire complète** : logo, échelle typo, tokens, refonte écrans clés. Engagée seulement si la Vague 1 ne dissipe pas le verdict « moche ».

Le projet est un side-project perso (GitHub Pages). **Hard budget** : ~24h cumulées de travail focus, journalisées par session démarrage/fin. Au-delà → coupe immédiate, on livre l'état courant.

⚠️ **Limites assumées de validation** : tous les tests utilisateurs (A1, gates, pastiche) reposent sur n=2-3 personnes (side-project, pas de panel utilisateur). C'est statistiquement faible et sujet au biais de complaisance. On accepte cette limite ; les conclusions sont des indications, pas des preuves. Pas la peine de prétendre à plus de rigueur que ce que le contexte permet.

## Pre-work (Vague 0 — actions de validation préalables)

À exécuter avant la session 1 du planning. Bloque la Vague 1 si A3 ou A4 échouent.

- **A1. Mini-test « moche »** : montrer l'app actuelle à 2 personnes (hors entourage proche si possible). Question ouverte : « qu'est-ce qui te frappe comme moche en premier ? ». Trier les premières mentions en 3 axes — *structure* (carte/modal/empty state) / *identité* (palette/logo/typo) / *contenu* (lisibilité prix, marqueurs). Le seuil 40% est une indication, pas une règle automatique ; le décideur tranche, en documentant son raisonnement.
- **A2. Lighthouse baseline** : capturer les scores Performance mobile + desktop sur la version déployée. Inscrire les valeurs dans le planning. Tolérance R12 : −5 points cumulés.
- **A3. Test parité tile provider** : captures CARTO `light_all` vs **MapTiler positron raster + `?lang=fr`** (URL exacte : `https://api.maptiler.com/maps/positron/{z}/{x}/{y}.png?key=${VITE_MAPTILER_KEY}&lang=fr`, sans `{s}`) à zooms 5/8/12/16. Test en aveugle : tierce personne labellise A/B en ordre aléatoire ; si l'auteur identifie correctement >70% sur 6 essais → MapTiler diffère perceptiblement, fallback Stadia (`https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png?api_key=...`). Si Stadia échoue aussi → bloque la Vague 1 cartographie, retour brainstorm.
- **A4. Lecture licence Marianne (Etalab 2.0)** : 30 min de lecture des clauses d'usage pour valider que self-host sur un side-project hors champ administratif est OK. Si une clause restreint l'usage → R3 pivote sur Inter en P1 et toutes les références Marianne dans R3/R7/R10 sont remplacées avant tout code. Bloquant.

## Requirements

### Vague 1 — Quick wins (faible coût, levier potentiellement élevé)

**Cartographie**
- R1. Labels carte en français en gardant le rendu visuel actuel. Tile provider : MapTiler `positron` raster + `?lang=fr` (drop-in remplacement du `<TileLayer>` de `src/components/MapView.tsx:563`). Stadia `alidade_smooth` en fallback. Le workflow `.github/workflows/deploy.yml` doit injecter la clé via `env: VITE_MAPTILER_KEY: ${{ secrets.MAPTILER_KEY }}`.

**Restyle léger (palette interim, pas de refonte structurelle)**

Pour éviter une dépendance circulaire avec la Vague 2, la Vague 1 utilise une **palette interim minimale** définie maintenant et qui sera reprise telle quelle ou étendue en Vague 2 :
- Primary : `#000091` (bleu Marianne)
- Surfaces : blanc + gris neutres (`#F5F5FE` panel bg, `#3A3A3A` text primary, `#666` text secondary)
- Alerte / hausse : `#E1000F`
- Succès / baisse : `#18753C`
- Typo : Inter (déjà chargée), poids 400 + 600 + 700

- R6. Restyler le modal d'accueil et le panneau station existants avec la palette interim ci-dessus. **Pas de fusion des surfaces.** La fusion en panneau permanent unifié reste un work item séparé (voir L1, hors scope).
- R7-light. Header : applique les couleurs interim et la typo Inter. Pas de redesign de structure dans cette vague (pas de logo intégré tant que R4 n'est pas livré).

**Gate de validation entre Vague 1 et Vague 2**

Critère unique et direct (pas de question de confiance qui prime à « oui ») :
- Montrer le résultat à 2 personnes (idéalement non recouvrantes avec A1). Question ouverte : « qu'est-ce que tu remarques en premier ? ». Si **0/2 mentionne « moche » ou équivalent dans les 3 premiers commentaires spontanés** → stop, on garde l'état Vague 1. Si 1/2 mentionne un point résoluble sans Vague 2 (ex : un marqueur précis, lisibilité prix) → patch ciblé, pas de Vague 2 complète. Si 2/2 ou un point structurel persiste → Vague 2.

### Vague 2 — Refonte identitaire complète (seulement si gate déclenche)

**Identité visuelle**
- R2. Palette signature complète, étendant la palette interim avec :
  - Définition fine des nuances de surface et d'ombres
  - **Coexistence avec `FUEL_COLORS`** (`src/utils/fuel.ts`) : les couleurs par carburant restent inchangées comme système de wayfinding sur la carte. Le panneau station les reflète en accent textuel (badge, dot) sans clash chromatique avec la palette signature.

- R3. Typographie Marianne (sous réserve d'A4) : **3 poids self-hosted** (Regular 400 + SemiBold 600 + Bold 700) téléchargés directement depuis `https://www.systeme-de-design.gouv.fr/fondamentaux/typographie/` (les .woff2 individuels), placés dans `public/fonts/`, déclarés via `@font-face` dans `src/index.css`. **Ne pas installer `@gouvfr/dsfr` via npm** pour éviter d'inclure les composants DSFR par accident. Stratégie : `font-display: swap` + `<link rel=preload>` pour le poids 400. Échelle :
  - Hero price : 2rem / 700 / `tabular-nums`
  - Title : 1.125rem / 600
  - Body : 1rem / 400
  - Data tabular (listes prix) : 0.875rem / 400 / `tabular-nums`
  - Microcopy : 0.75rem / 400
  - **Mesure intermédiaire obligatoire** : capturer LCP sur branche staging avant merge. Si LCP régresse > 2 points vs A2 baseline → fallback Inter (self-host les 3 poids depuis Google Fonts également, pour cohérence ; supprimer le `<link>` Google Fonts d'`index.html` quoi qu'il arrive vu qu'on self-host).

- R4. Logo (work item de production design, **pré-requis aux R7/R10 de Vague 2**). Wordmark « Carburants » + petit pictogramme géométrique abstrait. Conception via Figma / Affinity / AI-assisted, livré en SVG source + 7 variantes raster (`pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`, `favicon.svg`). Time-box : 1 session max, sinon on livre la session avec un wordmark seul (pas de pictogramme custom).

- R5. Tokens CSS : refonte de `src/index.css` en big-bang (estimé ~0.5 session). Tokens référencés par tout le code React. **Triage de rollback si régression performance** : (1) retirer le preload, (2) basculer Marianne → Inter, (3) revert tokens partiel sur les écrans non critiques. Mesurer après chaque catégorie de changement, pas seulement à la fin.

**Refonte des écrans clés**
- R7. Header : redessin sobre avec logo R4 + wordmark. Hauteur cible : 56px desktop / 48px mobile. **Sticky, z-index 1100** (au-dessus de Leaflet panes 400, controls 800, tooltips 700). Vérifier que les offsets actuels du bouton géolocate dans `src/components/MapView.tsx` (`md:right-[300px]`, `bottom-[340px]`, `bottom-16`, `bottom-20`) restent cohérents après changement de hauteur header — sinon ajuster.

- R8. Footer (réintroduit pour porter le disclaimer guardrail anti-pastiche) : ajouter une mention discrète « Site indépendant — non affilié à l'État français ». Cohérent avec la palette + typo de R5. Le reste (liens existants À propos / Évolution des prix / Données gouv.fr / fraîcheur) est mécaniquement traité par R5 + R11.

- R9. Panneau station : hiérarchie type fiche d'identité avec spec :
  - **Hero** : prix du carburant actif filtré (ou cheapest si aucun filtre actif), 2rem / 700 / tabular-nums. Si le filtre actif n'est pas vendu → afficher le cheapest avec un texte « Ce carburant n'est pas vendu ici ».
  - **Liste secondaire** : autres carburants vendus, alignés tabular-nums. Si la station ne vend qu'un seul carburant → liste secondaire entièrement masquée (pas d'empty state).
  - **Métadonnées** : nom · marque · adresse · « MAJ il y a X »
  - **Stale indicator** : prix > 72h en gris + pictogramme warning. Desktop : tooltip on hover. Mobile : microcopy inline « Données non rafraîchies depuis Xh » sous le prix (pas de tooltip).
  - **Bloc véhicule existant** (`useVehicleSearch`, `computeRealCost`, settings tank/conso/vitesse/taux) : préservé et restylé. Autocomplete véhicule, panneau settings collapsible, affichage du « Coût réel » par station — toutes les couleurs et fonts inline doivent passer par les tokens R5. Pas de redesign de cette interaction, juste un re-skin.

- R10. Modales (À propos, Historique des prix) : nouvelle palette + typo, structure inchangée.

### Cross-cutting (s'applique à la Vague 2 uniquement)

**Cohérence**
- R11. Application homogène de la palette + typo. **Tolérance** : composants Leaflet natifs (controls zoom, attribution) gardent leur style minimal. **Inclus explicitement** : les popups custom rendus par `renderPopupHTML`, les DivIcons de prix (`createPriceIcon`), et les cluster icons (`iconCreateFunction`) dans `src/components/MapView.tsx` — toutes les couleurs et fonts inline (`#3b82f6`, `#dc2626`, `#16a34a`, `#374151`, `#9ca3af`, `system-ui`, `Inter`) doivent référencer les tokens R5.

- R12. Zéro régression fonctionnelle. **Inclut PWA install** : régénération des 7 icônes en variantes du nouveau logo R4 + mise à jour de `theme_color` dans `public/manifest.webmanifest` ET `<meta name="theme-color">` dans `index.html` (passe de `#3b82f6` à `#000091`). **Si la gate Vague 1 stoppe → R12 PWA icons est sauté** (logo R4 jamais produit, PWA garde l'identité actuelle). Les utilisateurs ayant déjà installé la PWA peuvent garder leur ancienne icône en cache (acceptable).

**États d'interaction (Vague 2)**
- R13. **Search bar** — 4 états visuels traités en typo + iconographie sobre :
  - typing/debouncing : input + spinner discret aligné droite
  - results : dropdown sous l'input, max-height 240px / overflow-y auto, dismiss sur Escape ou click-outside, navigation clavier (flèches haut/bas + Enter), z-index aligné avec header (1100)
  - no-results : ligne unique « Aucune ville trouvée » microcopy gris
  - API error : « Erreur réseau » + lien retry qui re-fire la dernière requête
- R14. **Géolocalisation** — 3 états :
  - requesting : bouton avec spinner + texte « Localisation… » (le bouton actuel 40x40 icon-only doit s'étendre pour accommoder le label)
  - permission denied : message fallback « Autorisation refusée — tapez une ville ci-dessus » sous l'input search (pas de toast)
  - position acquired : silent flyTo
- R15. **Filtre carburant** — pills toggle multi-select. État actif : remplissage `#000091`, texte blanc (#FFFFFF, contraste WCAG AAA). État inactif : outline gris neutre + dot accent FUEL_COLORS (décoratif uniquement, pas de contrainte contraste). Mobile : pills wrap sur multiple lignes dans le container collapsible (pas de scroll horizontal). Si tous désactivés → traité comme « show all » (comportement actuel conservé).

### Optional follow-up — Layout work item (hors scope)

- L1 (optionnel, hors budget). Fusion empty state + panneau station en panneau permanent unifié. Demande sa propre planification : états du panneau (idle / ville / station / back-nav), snap points + gestes du bottom sheet, autocomplete portal, padding dynamique de `flyToBounds`, repositionnement bouton géoloc. À démarrer seulement si l'usage post-Vague 2 confirme le besoin.

## Success Criteria

- **A1** indique l'axe dominant. Si <40% identité → engager Vague 2 demande une justification écrite.
- **Captures avant/après** côte à côte sur 3 écrans clés (accueil, station sélectionnée, modal historique) — produites à la fin de chaque vague.
- **Gate Vague 1** : 0/2 testeurs ne mentionne « moche » dans les 3 premiers commentaires spontanés → stop. Sinon → patch ciblé ou Vague 2.
- **Carte FR** : labels en français aux zooms 5/8/12/16 (test A3 vérifie 4 zooms, pas 3).
- **Pas de pastiche officiel** (test à 2 axes pour résoudre la tension avec le pari crédibilité) :
  1. Confiance : « est-ce que tu fais confiance à cette app pour des prix à jour ? » — note 1-5, requise ≥ 4.
  2. Officialité : « est-ce que tu penses que c'est un site officiel ? » — requise « non » ou « pas sûr ». Si ≥1/3 répond clairement « oui » → ajustements (atténuer le bleu en aplat, déplacer le footer disclaimer en haut, etc.).
  Win zone = trust ≥ 4 ET officialité = non.
- **Performance** : Lighthouse mobile + desktop ≥ baseline A2 −5 points. Triage de rollback dans R3/R5.
- **Hard budget** : ~24h cumulées (tracker visible). Au-delà → coupe.

## Scope Boundaries

- ❌ Pas de dark mode.
- ❌ Pas de redesign du flow utilisateur. R6 narrow restyle, fusion = L1 hors scope.
- ❌ Pas de design system formel (Storybook, doc composants).
- ❌ Pas d'illustrations narratives custom.
- ❌ Pas de microinteractions avancées.
- ❌ Pas de refonte du pipeline data ou logique métier.
- ❌ Pas de migration des PWA installs existantes.
- ✅ **In scope, à restyler** : feature « coût d'un plein selon véhicule » (déjà live dans `StationPanel.tsx`). Pas de redesign d'interaction, juste re-skin avec les tokens R5.

## Key Decisions

- **Décomposition en 2 vagues avec gate**. Évite l'over-engineering si Vague 1 suffit. Coût ajouté : ~1h de mini-test + ~1h de gate.
- **Direction « service public moderne » conservée** avec tension acknowledged : le même signal (bleu Marianne + Marianne typeface) qui drive la crédibilité peut driver la perception d'officialité. Le test à 2 axes (trust + officialité) sépare les deux signaux. Si on observe corrélation forte entre les deux → revoir vers direction neutre (Inter + palette sobre sans connotation étatique).
- **Vague 1 utilise une palette interim** définie maintenant pour éviter la dépendance circulaire (palette/typo cibles avant Vague 2). Cette palette interim est un sous-ensemble de la palette finale ; elle ne sera pas refaite si Vague 2 démarre.
- **R6 narrowed** : restyle des surfaces existantes, pas de fusion. Fusion en L1 (hors scope budget).
- **R8 réintroduit minimal** pour porter le disclaimer guardrail (« Site indépendant — non affilié à l'État français »). Reste mécaniquement traité par R5 + R11.
- **Logo extrait comme pré-requis Vague 2** (R4) avec time-box 1 session ; débordement → wordmark seul livré, pas de pictogramme.
- **Tile provider : MapTiler positron raster + `?lang=fr`** (URL template précisé dans A3). Stadia en fallback. URL exacte testée en A3.
- **Typo : Marianne 3 poids self-hosted** (téléchargement direct, pas npm @gouvfr/dsfr pour éviter d'importer accidentellement des composants DSFR). Inter en fallback runtime + Google Fonts `<link>` retiré quoi qu'il arrive (on self-host).
- **R12 PWA icons : Vague 2 only**. Si gate stop Vague 1, PWA garde son identité actuelle.
- **Tokens : big-bang `index.css`** avec triage de rollback défini si perf casse.
- **n=2-3 sample sur tests utilisateurs accepté** comme limite de side-project. Documenter mais pas sur-engineerer.

## Dependencies / Assumptions

- **Marianne fonts** : licence Etalab 2.0. **Validation : A4 en Vague 0**. Bloquant.
- **MapTiler API key** : Vite inline les variables `VITE_*` dans le bundle JS public au build. Le `.env` sert seulement à éviter de committer la clé en clair, pas à la cacher au runtime — la clé sera visible dans le JS déployé sur GitHub Pages quoi qu'il arrive. **Vraie mitigation** : restriction par HTTP Referrer côté MapTiler dashboard (allow-list `*.github.io/carburants-france/*`) + alerte de quota. Workflow `.github/workflows/deploy.yml` injectera la clé via `env: VITE_MAPTILER_KEY: ${{ secrets.MAPTILER_KEY }}`. Note : les forks/clones locaux nécessiteront leur propre `VITE_MAPTILER_KEY`.
- **MapTiler free tier** : 100k tile loads/mois (à reconfirmer côté MapTiler avant figeage). Si dépassement → bascule Stadia.
- **DSFR (Système de Design de l'État) — guardrails anti-pastiche** : licence d'usage **réservée aux sites de l'État et entités affiliées**. On s'**inspire** sans copier les composants ni les assets DSFR. Garde-fous concrets :
  1. Ne pas utiliser le bloc-marque Marianne (« RÉPUBLIQUE FRANÇAISE » avec drapeau) ni la cocarde tricolore.
  2. Ne pas reprendre les composants DSFR (boutons, badges, callouts) tels quels — refaire visuellement, ne pas copier le HTML/CSS DSFR. Ne pas `npm install @gouvfr/dsfr`.
  3. Footer R8 mentionne explicitement « Site indépendant — non affilié à l'État français ».
  4. Test à 2 axes en Success Criteria : trust ≥ 4 ET officialité = non.
- **Pipeline data inchangé** : aucune modif sur `scripts/process-data.mjs`, `public/data/*`, hooks de chargement.

## Outstanding Questions

### Resolve Before Planning

- **[A3]** Test parité MapTiler `?lang=fr` raster vs CARTO `light_all` à zooms 5/8/12/16, en aveugle. Si échec → Stadia. Si Stadia échoue → retour brainstorm.
- **[A4]** Lecture licence Marianne (Etalab 2.0). Si restrictive → R3 bascule Inter avant tout code.

### Deferred to Planning

- **[Affects R3][Technical]** Mesure réelle du coût LCP de Marianne 3 poids self-hosted vs Inter. Branche staging avant merge.
- **[Affects R4][Needs research]** Direction du pictogramme du logo. Time-box 1 session, livrable wordmark seul si débordement.
- **[Affects R5][Technical]** Détail exact des tokens (ombres, rayons) à finaliser au moment du big-bang.
- **[Affects R9][Technical]** Comportement back-nav du panneau station sur mobile (swipe down vs bouton X).
- **[Affects L1 — optional]** Si fusion panneau plus tard : spec complète états + snap points + gestes + autocomplete portal.

## Next Steps

→ `/ce:plan` pour découper l'implémentation en sessions, en respectant l'ordre Vague 0 (A1-A4) → Vague 1 (R1+R6+R7-light, gate) → Vague 2 si nécessaire (R2-R5 puis R7-R15) → Cross-cutting. Aucune question bloquante côté produit.
