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

export const ALL_FUELS: FuelType[] = ['Gazole', 'E10', 'SP98', 'SP95', 'E85', 'GPLc'];

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

export function getPriceBounds(prices: number[]): { pMin: number; pMax: number } {
  const sorted = [...prices].sort((a, b) => a - b);
  const pMin = sorted[Math.floor(sorted.length * 0.01)] ?? sorted[0];
  const pMax = sorted[Math.ceil(sorted.length * 0.99) - 1] ?? sorted[sorted.length - 1];
  return { pMin, pMax };
}

// Color stops evenly spaced for maximum distinguishability
const PRICE_COLOR_STOPS: [number, number, number, number][] = [
  // [position, hue, saturation, lightness]
  [0.0, 142, 71, 40],    // dark green (cheapest)
  [0.12, 120, 65, 42],   // green
  [0.25, 90, 70, 44],    // yellow-green
  [0.38, 65, 80, 46],    // lime
  [0.50, 48, 90, 48],    // yellow
  [0.62, 35, 90, 48],    // amber
  [0.75, 20, 85, 48],    // orange
  [0.88, 5, 75, 45],     // red
  [1.0, 0, 80, 30],      // dark red (most expensive)
];

export function getPriceColor(price: number, pMin: number, pMax: number): string {
  if (pMax === pMin) return 'hsl(142, 71%, 45%)';
  const t = Math.max(0, Math.min(1, (price - pMin) / (pMax - pMin)));

  // Find the two stops to interpolate between
  let i = 0;
  while (i < PRICE_COLOR_STOPS.length - 2 && PRICE_COLOR_STOPS[i + 1][0] < t) i++;
  const [pos0, h0, s0, l0] = PRICE_COLOR_STOPS[i];
  const [pos1, h1, s1, l1] = PRICE_COLOR_STOPS[i + 1];
  const local = (t - pos0) / (pos1 - pos0);

  const h = h0 + (h1 - h0) * local;
  const s = s0 + (s1 - s0) * local;
  const l = l0 + (l1 - l0) * local;
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

export function hasRupture(station: Station, fuel: FuelType): boolean {
  return station.ruptures?.includes(fuel) === true;
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
