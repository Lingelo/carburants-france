# Carburants France

Comparez les prix des carburants station par station sur l'ensemble du territoire français. Trouvez la station la moins chère dans un rayon de 15 km autour de votre ville.

**[Accéder à l'application](https://angelolima.github.io/carburants-france/)**

## Fonctionnalités

- Recherche par ville avec autocomplétion (API Adresse data.gouv.fr)
- Géolocalisation pour trouver les stations autour de vous
- Filtrage par type de carburant : Gazole, SP95, SP98, E10, E85, GPLc
- Carte interactive avec clustering des stations et affichage des prix
- Itinéraire vers la station via Google Maps
- Interface responsive (desktop + mobile)

## Source des données

Les prix proviennent de l'open data du gouvernement : [prix-carburants.gouv.fr](https://www.prix-carburants.gouv.fr/). Un pipeline automatisé (GitHub Actions) télécharge et traite les données **toutes les 2 heures**.

## Stack technique

- **React 19** + TypeScript
- **Vite** (build + dev server)
- **Leaflet** + react-leaflet + leaflet.markercluster
- **Tailwind CSS v4**

## Développement

```bash
# Installer les dépendances
npm install

# Lancer le serveur de dev
npm run dev
# → http://localhost:5173/carburants-france/

# Build de production
npm run build

# Lint
npm run lint
```

### Mettre à jour les données localement

```bash
node scripts/process-data.mjs
```

Télécharge le XML depuis `donnees.roulez-eco.fr`, le parse et génère un fichier JSON par département dans `public/data/departments/`.

## Licence

MIT
