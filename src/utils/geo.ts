import type { Station } from '../types';

const EARTH_RADIUS_KM = 6371;

/** Haversine distance in km between two lat/lng points */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Filter stations within a given radius (km) from a center point */
export function filterByRadius(
  stations: Station[],
  centerLat: number,
  centerLng: number,
  radiusKm: number,
): (Station & { distance: number })[] {
  return stations
    .map((s) => ({
      ...s,
      distance: haversineDistance(centerLat, centerLng, s.lat, s.lng),
    }))
    .filter((s) => s.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Reverse geocode lat/lng to a CityResult via api-adresse.data.gouv.fr */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{ name: string; postcode: string; departmentCode: string; lat: number; lng: number } | null> {
  const res = await fetch(
    `https://api-adresse.data.gouv.fr/reverse/?lon=${lng}&lat=${lat}`,
  );
  if (!res.ok) return null;

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;

  const props = feature.properties;
  const postcode: string = props.postcode ?? '';
  return {
    name: props.city ?? props.name ?? '',
    postcode,
    departmentCode: postcode.startsWith('97') ? postcode.substring(0, 3) : postcode.substring(0, 2),
    lat,
    lng,
  };
}

/** Extract department code from postal code */
export function getDepartmentFromPostalCode(cp: string): string {
  // Corse: 20xxx → 2A or 2B, but data uses "2A"/"2B"
  // DOM-TOM: 97x → 971, 972, etc.
  if (cp.startsWith('97')) return cp.substring(0, 3);
  return cp.substring(0, 2);
}
