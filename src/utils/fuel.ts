import type { FuelType, Station } from '../types';

export const FUEL_COLORS: Record<FuelType, string> = {
  SP95: '#22c55e',
  SP98: '#3b82f6',
  E10: '#14b8a6',
  Gazole: '#f97316',
  E85: '#8b5cf6',
  GPLc: '#6b7280',
};

export const FUEL_LABELS: Record<FuelType, string> = {
  SP95: 'SP95',
  SP98: 'SP98',
  E10: 'SP95-E10',
  Gazole: 'Gazole',
  E85: 'E85',
  GPLc: 'GPLc',
};

export const ALL_FUELS: FuelType[] = ['Gazole', 'SP95', 'E10', 'SP98', 'E85', 'GPLc'];

export function getFuelPrice(station: Station, fuel: FuelType): number | null {
  return station.fuels[fuel]?.p ?? null;
}

export function sortByFuelPrice(stations: Station[], fuel: FuelType): Station[] {
  return [...stations].sort((a, b) => {
    const pa = getFuelPrice(a, fuel);
    const pb = getFuelPrice(b, fuel);
    if (pa === null && pb === null) return 0;
    if (pa === null) return 1;
    if (pb === null) return -1;
    return pa - pb;
  });
}

export function formatPrice(price: number): string {
  return price.toFixed(3).replace('.', ',') + ' \u20AC';
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `il y a ${diffD}j`;
}

export function getCheapestFuel(station: Station): FuelType | null {
  let cheapest: FuelType | null = null;
  let minPrice = Infinity;
  for (const [fuel, info] of Object.entries(station.fuels)) {
    if (info && info.p < minPrice) {
      minPrice = info.p;
      cheapest = fuel as FuelType;
    }
  }
  return cheapest;
}
