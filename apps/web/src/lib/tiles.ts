/**
 * Fond de carte sombre (spec §4).
 *
 * En production le build injecte `VITE_MAPTILER_KEY` (secret `MAPTILER_KEY`,
 * voir .github/workflows/deploy.yml) → style MapTiler `dataviz-dark`.
 * Sans clé (dev local, fork sans secret), repli sur CARTO `dark_all` :
 * fonctionnel sur localhost mais **watermarké « API KEY REQUIRED » en prod**
 * depuis que CARTO exige une clé hors développement.
 *
 * MapTiler sert des tuiles 512 px → `tileSize: 512` + `zoomOffset: -1`
 * (forme recommandée par leur doc Leaflet), CARTO reste en 256 px.
 */
const maptilerKey: string = import.meta.env.VITE_MAPTILER_KEY ?? '';

export interface TileConfig {
  url: string;
  attribution: string;
  tileSize: number;
  zoomOffset: number;
}

export const darkTiles: TileConfig = maptilerKey
  ? {
      url: `https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${maptilerKey}`,
      attribution:
        '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      tileSize: 512,
      zoomOffset: -1,
    }
  : {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      tileSize: 256,
      zoomOffset: 0,
    };
