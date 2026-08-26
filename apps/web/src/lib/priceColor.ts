/** Compute robust min/max bounds (1st/99th percentile) for color scaling. */
export function getPriceBounds(prices: number[]): { pMin: number; pMax: number } {
  if (prices.length === 0) return { pMin: 0, pMax: 1 };
  const sorted = [...prices].sort((a, b) => a - b);
  const pMin = sorted[Math.floor(sorted.length * 0.01)] ?? sorted[0];
  const pMax = sorted[Math.ceil(sorted.length * 0.99) - 1] ?? sorted[sorted.length - 1];
  return { pMin, pMax };
}

/**
 * Green→yellow→orange→red gradient stops. These colors are used as TEXT on
 * dark surfaces (#121212–#2A2A2A), so lightness stays in the 55–65 % band
 * for AA-ish contrast (spec §2).
 */
const STOPS: [number, number, number, number][] = [
  [0.0, 142, 69, 58],
  [0.12, 120, 62, 58],
  [0.25, 90, 65, 56],
  [0.38, 65, 80, 56],
  [0.5, 48, 92, 58],
  [0.62, 35, 92, 60],
  [0.75, 20, 90, 62],
  [0.88, 5, 88, 64],
  [1.0, 0, 90, 66],
];

/** Map a price to a color (green→yellow→orange→red) based on bounds. */
export function getPriceColor(price: number, pMin: number, pMax: number): string {
  if (pMax === pMin) return 'hsl(142, 69%, 58%)';
  const t = Math.max(0, Math.min(1, (price - pMin) / (pMax - pMin)));
  let i = 0;
  while (i < STOPS.length - 2 && STOPS[i + 1][0] < t) i++;
  const [pos0, h0, s0, l0] = STOPS[i];
  const [pos1, h1, s1, l1] = STOPS[i + 1];
  const local = (t - pos0) / (pos1 - pos0);
  const h = h0 + (h1 - h0) * local;
  const s = s0 + (s1 - s0) * local;
  const l = l0 + (l1 - l0) * local;
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}
