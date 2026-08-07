# Backlog de recette — App Android (avant publication Play Store)

Retours collectés en testant l'APK release sur appareil réel (Galaxy Z Fold7,
Android 16). À corriger avant la mise en production. Statut au fil de l'eau.

## Décisions produit déjà prises

- **Carburant « 95 » unifié** : fusionner `SP95` et `SP95-E10` (`E10`) en un seul
  choix **« Sans-plomb 95 »**. Motif : même 95 octanes (seul l'éthanol diffère,
  E5 vs E10) ; la France étiquette surtout `E10`, l'Espagne/Portugal `SP95`, donc
  aujourd'hui un voyageur ne voit qu'un pays. Chaque station affichera le prix du
  95 qu'elle possède. Compromis accepté : on ne distingue plus E5/E10 (léger écart
  de prix). **Portée : global** (carte, liste, favoris, trajet), pas juste le trajet.

## Items

| # | Retour | Nature | Statut |
|---|--------|--------|--------|
| 1 | Unifier le 95 (voir ci-dessus) | Produit | Décidé, à implémenter |
| 2 | Filtres carburant repensés : d'abord la **famille** (Essence / Diesel / GPL), puis le détail | Produit / UX | À concevoir |
| 3 | **Refonte : le trajet devient un MODE de la carte** (voir ci-dessous) — absorbe #3 initial | Produit / archi | **Décidé, gros chantier** |
| 4 | Navigation : cliquer un onglet du menu depuis un **détail** ne va pas sur la bonne page | Bug | ✅ Corrigé (lot 1) |
| 5 | « Voir sur la carte » : la station ciblée n'est **pas mise en évidence** (recentre seulement) | UX | À implémenter |
| 6 | Bonus visuel : **animation** le long du tracé du trajet (onde/point qui se propage du départ à l'arrivée, en boucle) | Visuel (nice-to-have) | Idée |
| 7 | Carte « classique » : afficher le **marqueur « ma position »** (où je suis) | UX | À implémenter |
| 8 | Trajet : filtrer sur les **aires d'autoroute** (stations accessibles sans quitter l'autoroute) | Produit / UX | ✅ Implémenté |

### #8 — Aires d'autoroute sur le trajet

Le champ est exposé sous la clé `hw` du JSON partagé, pour **les trois pays**, chacun avec
sa propre source :

| Pays | Source | Aires détectées |
|---|---|---|
| France | attribut `pop="A"` (autoroute) du XML gouvernemental | 435 / 9 672 |
| Portugal | champ `TipoPosto == "Auto-estrada"` de la DGEG | 125 / 3 110 |
| Espagne | **l'adresse** — le flux MINETUR n'a aucun champ de classification | 920 / 11 348 |

France et Portugal ont donc un champ officiel ; seule l'Espagne demande une règle. Les
adresses espagnoles sont écrites *type de voie d'abord* (« CARRETERA A-2 KM. 333,8 »), donc
**le premier token décide** : une adresse urbaine reste urbaine même si elle mentionne une
autoroute plus loin (« POLIGONO … PARCELA A-1 », « CALLE A2 »). Les codes `A-1`…`A-99` et
`AP-1`…`AP-99` sont des autovías/autopistas ; à 3 ou 4 chiffres (`A-333`, `A-8079`) ce sont
des routes régionales, exclues. « JUNTO A » signifie *à côté de*, pas *sur*.

Ce garde-fou n'est pas théorique : les trois flux contiennent les mêmes pièges, des stations
qui *citent* une autoroute sans être dessus — « Bretelle Est Autoroute A9 » (FR), « Ligação
à A8 » et « NÓ A1/A23 » (PT), « ACCESO A-66 » et « PARCELA A-1 » (ES). C'est aussi pourquoi
la France et le Portugal n'ont **aucun repli textuel** : leur champ officiel est plus fiable.

En mode trajet, une puce **« Aires d'autoroute (n) »** restreint la sélection à ces stations.
Elle reste cliquable même à 0 pour pouvoir se désactiver sur un trajet sans autoroute ; un
message explique alors le résultat vide plutôt que de revenir silencieusement à tout afficher.
Chaque station de la liste indique aussi son **écart au tracé** (« À 2,3 km du trajet », ou
« Sur le trajet, sans quitter l'autoroute »), et l'ordre suit la **progression le long du
tracé** et non plus la distance à vol d'oiseau depuis le départ — les deux divergent dès que
l'itinéraire fait une boucle.

Volontairement **sans repli textuel** sur l'adresse : des libellés comme « Bretelle Est
Autoroute A9 » désignent une station *près* d'une sortie, pas une aire.

## Refonte trajet = mode de la carte (décidée)

Le trajet cesse d'être un écran séparé (`route`) et devient un **mode** de la carte —
comme l'itinéraire dans Google Maps. Impacts :
- État « mode trajet » **partagé** entre la carte et la liste (extrait de `RouteViewModel`).
- Saisie départ/arrivée **intégrée à la carte** (indice visuel dans la barre de recherche).
- **Liste** : en mode trajet, stations triées **par progression depuis le départ** (pas par
  prix), avec libellé de tri explicite. Montrer les stations **les plus proches du tracé**.
- Suppression de l'écran `route` dédié → règle la nav à la racine.

## Détails / notes

### #2 — Filtres par famille + détaillés
Regroupement envisagé :
- **Diesel** : Gazole
- **Essence** : Sans-plomb 95 (SP95+E10 fusionnés), SP98, E85 (superéthanol)
- **GPL** : GPLc

UX à deux niveaux : choisir la famille, puis affiner le carburant précis. Englobe
la décision #1.

### #3 — Sélection des stations du trajet
Logique actuelle (`RoutingRepository.alongRoute`) : découpe le trajet en tronçons
et garde **la moins chère de chaque tronçon** (pour répartir sur tout le trajet).
Souhait : mettre en avant la **proximité au tracé**. À cadrer : trier par distance
au tracé ? augmenter le nombre affiché par tronçon ? garder un compromis prix/proximité ?

### #4 — Navigation
`AppNav.kt` : `details/{id}` et `route` sont des destinations **frères** des onglets
dans le même NavHost. Cliquer un onglet depuis ces écrans se comporte mal. Piste :
revoir le `popUpTo` / `restoreState`, ou remonter d'abord à la racine de l'onglet.

### #6 — Animation trajet
Effet type « pulse » se propageant le long de la `Polyline` du trajet (dégradé
animé ou marqueur mobile), en boucle. Purement décoratif.
