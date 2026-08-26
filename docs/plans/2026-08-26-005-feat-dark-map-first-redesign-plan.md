# Redesign « dark map-first » — spec partagée web + Android

Date : 2026-08-26 · Statut : en cours · Décisions produit validées :
web + Android en parallèle · architecture map-first fusionnée · **sombre uniquement** ·
accent **vert néon**.

Référence visuelle : maquettes « outletbuddy » (sidebar liste + carte sombre, pins
circulaires à logo, badge sous pin, itinéraire néon, popover de détail flottant).

## 1. Transposition FuelRadar

| Élément maquette | Transposition FuelRadar |
|---|---|
| Logo de marque dans le pin | Logo de l'enseigne (TotalEnergies, Leclerc…) — favicon/logo runtime + monogramme couleur marque en secours |
| Badge « 🙂 100 » sous le pin | **Prix du carburant sélectionné** (`1.67 €`), texte coloré par tier de prix |
| « Open 'til 8pm » vert | Métadonnée liste : `distance • prix` (prix coloré par tier) + mini-chip `24h/24` si `h24` (pas d'horaires dans la data) |
| Chips « Open Now / Nearest / Filters » | `Carburant ▾` · `Tri ▾ (Prix/Distance)` · `Filtres` |
| Chips popover « 🙂 100 / Open 'til 6pm / $$$$ » | `Prix sélectionné` / `Distance` / `Fraîcheur (il y a X)` (+ `24h/24` si actif) |
| Route néon verte | Polyline itinéraire : trait large translucide (glow) + trait fin vif `accent` |
| « More Details » | « Plus de détails » → écran détail station |

## 2. Design tokens (contrat commun)

### Couleurs
| Token | Valeur | Usage |
|---|---|---|
| `bg` | `#121212` | Fond app, bord de carte |
| `surface-1` | `#191919` | Sidebar, bottom sheet, bottom nav |
| `surface-2` | `#222222` | Cartes, inputs, chips, popover |
| `surface-3` | `#2A2A2A` | Hover, éléments élevés |
| `border-subtle` | `#FFFFFF` 8 % | Bordures par défaut |
| `border-strong` | `#FFFFFF` 16 % | Bordures actives/hover |
| `text-primary` | `#F5F6F4` | Titres, valeurs |
| `text-secondary` | `#A3A9A6` | Métadonnées, labels |
| `text-tertiary` | `#6E7573` | Placeholder, désactivé |
| `accent` | `#4ADE80` | Sélection, statut positif, route, CTA |
| `on-accent` | `#0B2916` | Texte sur accent |
| `accent-glow` | `#4ADE80` 25–35 % | Halo sélection, glow route |
| `tier-cheap` | `#4ADE80` | Prix bas (texte) |
| `tier-mid` | `#FBBF24` | Prix moyen (texte) |
| `tier-high` | `#F87171` | Prix haut (texte) / erreurs |
| `warning` | `#FBBF24` | Données obsolètes |

Gradient continu des prix (web `priceColor.ts`, Android `domain/Price.kt`) : conserver la
logique percentiles 1/99, **remonter la luminosité** pour lisibilité sur fond sombre
(texte : HSL L 55–65 %).

### Formes & effets
- Radius : `xs 8` · `sm 10` · `md 12` · `lg 16` · `xl 20` · `pill 999`.
- Ombres : noires douces (`0 8px 24px rgba(0,0,0,.45)`), glow accent
  `0 0 12px rgba(74,222,128,.45)`.
- Typo : Inter (déjà en place sur les deux plateformes). Prix en gras, chiffres tabulaires
  si dispo.

### Accessibilité
Sombre uniquement → viser AA : `text-secondary` sur `surface-1` ≥ 4.5:1,
`accent` réservé aux éléments larges/gras sur `bg`. Focus visible (anneau accent 2 px).

## 3. Composants

### Pin carte
Cercle **blanc** 38–40 px, bordure blanche 2 px, ombre douce, logo enseigne centré
(sinon monogramme sur fond couleur marque). En dessous : badge pill `surface-2`
bordure `border-subtle`, radius 8, texte prix 11–12 px semibold coloré par tier.
- Sélectionné : bordure `accent` + glow + scale ~1.1.
- Moins chère : bordure du badge en `accent`.
- Cluster (web) : cercle sombre `surface-2` bordure blanche, prix min + compteur.

### Item liste station
Avatar circulaire 44 px (logo, fond blanc / couleur marque), nom d'enseigne
(`text-primary`, semibold), sous-ligne `0.5 km • 1.679 €` (prix coloré par tier) +
mini-chip `24h/24` éventuel. Actions à droite : favori (étoile) + « voir sur la carte ».
Sélectionné : fond légèrement teinté accent (~8 %), **bordure `accent` 1.5 px**, radius 14.
Badge « Moins chère » conservé (accent).

### Popover station (clic pin)
Carte `surface-2`, radius 16, ombre forte. Desktop web : carte flottante ancrée dans la
zone carte ; mobile/Android : bottom card. Contenu : header (avatar + nom + sous-ligne),
rangée de chips outline (prix sélectionné / distance / fraîcheur), autres carburants en
chips prix, CTA : « Plus de détails » (pill `#FFFFFF` 10 %, texte `text-primary`,
pleine largeur) + « Itinéraire » (accent).

### Itinéraire
Deux polylines superposées : large (~10–12 px) `accent` 25 % + fine (~4–5 px) `accent`.
Android conserve la comète animée (recolorée accent).

## 4. Architecture map-first

### Web
- Desktop (≥ 768 px) : sidebar fixe **340 px** `surface-1` (header logo/titre/info,
  recherche pill, chips carburant/tri/filtres, liste scrollable, footer nav
  Favoris · Tendances · Réglages) + carte pleine hauteur à droite.
  **TopAppBar et vue Stations disparaissent** (redirection hash `#/stations` → carte).
- Mobile (< 768 px) : carte plein écran, recherche flottante en haut, bottom sheet
  draggable (états replié/mi-hauteur/plein) avec la liste, bottom nav **4 onglets** :
  Carte · Favoris · Tendances · Réglages.
- Tiles : CARTO `dark_matter` (même CDN, déjà en cache SW).
- Itinéraire : OSRM public (`router.project-osrm.org`) depuis la position utilisateur →
  station, polyline néon + chip distance/durée, bouton fermer. (Le lien Google Maps reste
  en secours dans le détail.)

### Android
- Bottom nav **4 onglets** (Stations fusionné dans Carte). `startupTab` : migrer la valeur
  `stations` → `map`.
- Écran Carte : brancher le `StationSheet` draggable dormant (liste = mêmes rows que la
  sidebar web). Recherche + chips par-dessus la carte.
- `GoogleMap` : `mapStyleOptions` JSON sombre (`res/raw/map_style_dark.json`) — routes
  gris foncé sur quasi-noir, POI masqués, labels gris.
- Thème : schéma **unique sombre** (plus de `isSystemInDarkTheme()`), tokens complets
  (`surfaceContainer*`, `outlineVariant`…). Splash sombre.
- `LogoFrame` : circulaire, fond blanc conservé (contraste voulu, cf. maquette).
- `PricePin` : remplacé par pin circulaire + badge (cf. §3).
- Route : polylines glow + comète accent.

## 5. Écrans secondaires (les deux plateformes)
Restyle sombre à structure constante : Détail station, Tendances (palette carburants
éclaircie pour fond sombre), Favoris, Réglages (retirer l'option d'écran de démarrage
« Stations »).

## 6. Risques & points de relecture
- **Logos runtime** (favicons Google 128 px / logo.dev optionnel) : qualité variable →
  le monogramme couleur marque doit être irréprochable.
- **Carte Google sans style Cloud** : le JSON `mapStyleOptions` est la seule voie sans
  Map ID ; vérifier le rendu réel.
- **Suppression du mode clair** : assumée (décision produit), tokens structurés pour
  réintroduction ultérieure.
- **Migrations** : hash web `#/stations`, `startupTab=stations` Android, `theme_color`
  manifest PWA (`#a33900` incohérent → `#121212`).
- **OSRM public** : pas de SLA ; timeouts + message d'erreur obligatoires.
