import type { Coords } from '../types';

interface Feature {
  geometry: { coordinates: [number, number] };
  properties: {
    label: string;
    name: string;
    postcode: string;
    city: string;
    citycode: string;
    context: string;
  };
}

export interface AddressResult {
  label: string;
  city: string;
  postcode: string;
  lat: number;
  lng: number;
}

/** Forward-geocode via api-adresse.data.gouv.fr (free, no key). */
export async function searchAddress(query: string, limit = 8): Promise<AddressResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data: { features: Feature[] } = await res.json();
  return data.features.map((f) => ({
    label: f.properties.label,
    city: f.properties.city,
    postcode: f.properties.postcode,
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
}

/** Reverse-geocode lat/lng to a postal code + city. */
export async function reverseGeocode(coords: Coords): Promise<AddressResult | null> {
  const url = `https://api-adresse.data.gouv.fr/reverse/?lat=${coords.lat}&lon=${coords.lng}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data: { features: Feature[] } = await res.json();
  const f = data.features[0];
  if (!f) return null;
  return {
    label: f.properties.label,
    city: f.properties.city,
    postcode: f.properties.postcode,
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  };
}

/** Reverse-geocode coords to a SearchBar-friendly label, with lat/lng fallback. */
export async function reverseGeocodeLabel(coords: Coords): Promise<string> {
  const addr = await reverseGeocode(coords);
  return addr
    ? `${addr.postcode} ${addr.city}`
    : `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`;
}

export type LocationResult =
  | { coords: Coords; denied: false }
  | { coords: null; denied: boolean };

/** Browser geolocation as a Promise. Surfaces whether the user denied access. */
export function getBrowserLocation(): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve({ coords: null, denied: false });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          denied: false,
        }),
      (err) =>
        resolve({
          coords: null,
          denied: err.code === err.PERMISSION_DENIED,
        }),
      { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 10_000 },
    );
  });
}
