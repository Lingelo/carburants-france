# Regression checklist — UI redesign

Joindre cette checklist (cochée) à chaque PR de Vague 1 et Vague 2 du plan `docs/plans/2026-04-30-001-feat-ui-redesign-service-public-plan.md`. Pas de test runner dans ce projet — ces flows sont la garantie principale contre les régressions fonctionnelles.

## Flows utilisateur critiques

### Recherche ville (mobile + desktop)

- [ ] Saisir 2 chars : pas de requête (debounce 300ms respecté)
- [ ] Saisir 3+ chars : spinner s'affiche, dropdown apparaît avec résultats
- [ ] Cliquer un résultat : la carte fly-to la ville, les stations dans 15km s'affichent comme marqueurs
- [ ] Saisir un nom inconnu : message « Aucune ville trouvée »
- [ ] Désactiver le réseau et taper : message « Erreur réseau » + bouton retry
- [ ] Cliquer retry après réactivation réseau : la requête repart, les résultats s'affichent
- [ ] Escape ferme le dropdown, focus reste sur l'input
- [ ] Click hors dropdown ferme le dropdown
- [ ] (Vague 2 R13) Flèche bas + Enter sélectionne la 1ère ville et déclenche flyTo
- [ ] Cas commune nouvelle (ex : « Saint-Aubin-Routot ») : retrouvée correctement (régression du fix #6)

### Géolocalisation

- [ ] Cliquer le bouton géolocate : prompt navigateur s'affiche
- [ ] Autoriser : carte fly-to la position, stations proches affichées
- [ ] Refuser : message « Autorisation refusée — tapez une ville ci-dessus » sous l'input search
- [ ] (Vague 2 R14) Pendant requesting : bouton affiche spinner + texte « Localisation… », `aria-label` = « Localisation en cours »
- [ ] (Vague 2 R14) Après denial : message en `role="alert"` annoncé par screen reader

### Sélection station

- [ ] Cliquer un marqueur : popup s'ouvre avec le prix, marque, adresse, fraîcheur
- [ ] Cliquer la CTA Itinéraire : ouvre Google/Apple Maps avec direction
- [ ] Cliquer une station dans la liste latérale : panneau station s'ouvre, carte centre sur la station
- [ ] Sur mobile : panneau station = bottom sheet, swipe-down (ou bouton X) ferme
- [ ] (Vague 2 R9) Hero affiche le prix du carburant filtré, pas le cheapest si filtre actif
- [ ] (Vague 2 R9) Liste secondaire affiche les autres carburants (cachée si station ne vend qu'un seul)
- [ ] (Vague 2 R9) Stale indicator (>72h) : prix gris + warning. Desktop hover/focus → tooltip. Mobile → microcopy inline

### Filtre carburant

- [ ] Toggle un pill (Gazole, SP95-E10, SP98, SP95, E85, GPLc) : marqueurs filtrés affichent ce carburant
- [ ] Toggle multi-select : plusieurs carburants actifs simultanément
- [ ] Désactiver tous les pills : fallback « show all » (tous marqueurs visibles)
- [ ] (Vague 2 R15) Pill actif : remplissage `#000091`, texte blanc (contraste AAA)
- [ ] (Vague 2 R15) Mobile : pills wrap multi-lignes (pas de scroll horizontal)
- [ ] (Vague 2 R15) Keyboard : Tab navigue entre pills, Space/Enter toggle, `aria-pressed` correct

### Modales

- [ ] Modale **À propos** s'ouvre depuis le footer, contenu lisible, bouton fermer fonctionne
- [ ] Modale **Évolution des prix** s'ouvre, le graphique d'historique s'affiche
- [ ] Escape ferme la modale, focus retourne au déclencheur
- [ ] (Vague 2 R10) `role="dialog"` + `aria-modal="true"` + focus management testé manuellement
- [ ] (Vague 2 R10) Click sur l'overlay ferme la modale

### Feature « coût d'un plein selon véhicule » (StationPanel)

- [ ] Toggle « Coût réel » dans le panneau station : la liste se re-trie selon le coût total (carburant + temps × tarif horaire)
- [ ] Cliquer settings : panneau collapsible s'ouvre avec tankSize / consumption / hourlyRate / avgSpeed
- [ ] Modifier tankSize : recalcul immédiat des coûts réels
- [ ] Saisir un véhicule dans l'autocomplete : dropdown affiche les véhicules matching le filtre carburant actif
- [ ] Sélectionner un véhicule : conso + tank mis à jour automatiquement, coûts recalculés
- [ ] Changer de filtre carburant après sélection véhicule : le véhicule actif est re-matché en cross-fuel (logique L138-160 de `StationPanel.tsx`). Vérifier qu'un véhicule essence sélectionné reste pertinent ou est remplacé par un équivalent quand on passe à diesel
- [ ] (Vague 2 U8) Screen recording joint au PR exerçant les 3 derniers points

### Install PWA

- [ ] Sur Android Chrome : « Ajouter à l'écran d'accueil » disponible, icône de l'app correcte
- [ ] Sur iOS Safari : Partager → Sur l'écran d'accueil disponible, apple-touch-icon correcte
- [ ] Lancement depuis l'écran d'accueil : mode standalone, pas de chrome browser
- [ ] (Vague 2 R12) Couleur barre browser Android = `#000091` (theme-color)
- [ ] (Vague 2 U10) Icônes PWA reflètent le nouveau logo R4

### Carte (R1 / U1)

- [ ] Tuiles MapTiler positron raster avec labels FR à zoom 5 (vue France entière)
- [ ] Idem zoom 8 (région)
- [ ] Idem zoom 12 (ville)
- [ ] Idem zoom 16 (rues)
- [ ] Si MapTiler 4xx : fallback CARTO actif automatiquement (pas de map blanche). Vérifier en simulant 401/403 (clé invalide en local)
- [ ] DevTools Network : requêtes vers `api.maptiler.com` avec `lang=fr`

## Performance

- [ ] Lighthouse Performance mobile : ≥ baseline A2 −5 points
- [ ] Lighthouse Performance desktop : ≥ baseline A2 −5 points
- [ ] LCP : pas de régression > 2 points vs baseline. Sinon → triage rollback U5 (preload off → Inter swap → tokens partiel)
- [ ] CLS : pas de régression notable (le nouveau panneau permanent ou modal ne crée pas de layout shift)

## Cohérence visuelle (R11)

- [ ] `grep -rn "blue-" src/` : aucun résultat (sauf commentaires)
- [ ] `grep -rn "#3b82f6" src/` : aucun résultat
- [ ] `grep -n "#[0-9a-fA-F]\{6\}" src/components/MapView.tsx` : seuls les FUEL_COLORS via `getPriceColor` restent
- [ ] `grep -n "font-family:" src/components/MapView.tsx` : uniquement `var(--font-sans)` (sauf fallback `system-ui`)
- [ ] Pas de Google Fonts résiduel : `grep -rn "fonts.google" .` (sauf commentaires)
- [ ] DevTools Application > Manifest : `theme_color = #000091`, icônes PWA correctes
- [ ] `<meta name="theme-color">` dans index.html = `#000091`

## Accessibility (Vague 2)

- [ ] Skip-nav link visible au premier Tab depuis le top de la page
- [ ] Test manuel screen reader (NVDA ou VoiceOver) : recherche ville flow complet annoncé correctement (combobox, options, no-results, error)
- [ ] Test manuel screen reader : pills carburant annoncées avec `aria-pressed`, dot décoratif `aria-hidden`
- [ ] Test manuel screen reader : message « Autorisation refusée » annoncé via `role="alert"` à l'arrivée
- [ ] WebAIM Contrast Checker : blanc sur `#000091` ≥ 7:1 (AAA)
- [ ] Stale indicator : tooltip s'affiche aussi sur focus (pas seulement hover) en desktop

## Captures avant/après

À joindre au PR final de chaque vague :

- [ ] Capture **modal d'accueil** (avant/après)
- [ ] Capture **panneau station avec station sélectionnée** (avant/après)
- [ ] Capture **popup de marqueur ouvert** (avant/après)
- [ ] Capture **modale Historique des prix** (avant/après)
- [ ] Capture **header + footer** (avant/après)

## Test pastiche full-surface (post-Vague 2)

- [ ] N=3 testeurs (idéalement non recouvrants avec A1 et la Gate U3)
- [ ] Surfaces couvertes : home modal, panneau station, popup marqueur, modale historique, install PWA
- [ ] Question 1 : « est-ce que tu fais confiance à cette app pour des prix à jour ? » (1-5, requis ≥ 4 pour ≥2/3 testeurs)
- [ ] Question 2 : « est-ce que tu penses que c'est un site officiel ? » (oui/non/pas-sûr, requis non/pas-sûr pour ≥2/3 testeurs)
- [ ] Win zone : trust ≥ 4 ET officialité ≠ « oui » pour ≥ 2/3
- [ ] Si ≥1/3 répond clairement « oui » à officialité → ajustements (atténuer aplat bleu, déplacer disclaimer en haut, simplifier pictogramme)
