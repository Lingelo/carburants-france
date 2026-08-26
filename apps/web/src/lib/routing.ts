import type { Coords } from '../types';

export interface RouteResult {
  /** Route geometry as Leaflet-friendly [lat, lng] pairs. */
  coords: [number, number][];
  /** Total distance in meters. */
  distanceM: number;
  /** Total driving duration in seconds. */
  durationS: number;
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';
const TIMEOUT_MS = 8000;

/**
 * Fetch a driving route from the public OSRM demo server.
 * No SLA on that endpoint — always guarded by an 8 s abort and callers must
 * surface the error to the user (i18n `route.error`).
 */
export async function fetchRoute(from: Coords, to: Coords): Promise<RouteResult> {
  const url =
    `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?overview=full&geometries=geojson`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const json = (await res.json()) as {
      code?: string;
      routes?: {
        distance: number;
        duration: number;
        geometry?: { coordinates?: [number, number][] };
      }[];
    };
    const route = json.routes?.[0];
    const coordinates = route?.geometry?.coordinates;
    if (json.code !== 'Ok' || !route || !coordinates || coordinates.length < 2) {
      throw new Error('OSRM: no route');
    }
    return {
      coords: coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
      distanceM: route.distance,
      durationS: route.duration,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** "8 min", "1 h 05" — compact duration for the route chip. */
export function formatDuration(durationS: number): string {
  const totalMin = Math.max(1, Math.round(durationS / 60));
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return `${h} h ${String(min).padStart(2, '0')}`;
}
