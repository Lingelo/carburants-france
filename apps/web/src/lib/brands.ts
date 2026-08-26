/**
 * Brand identity table shared with the Android app
 * (apps/android/…/ui/common/BrandLogo.kt is the reference — keep in sync).
 *
 * Logos are fetched at runtime through Google's favicon service; when the
 * fetch fails the UI falls back to a monogram on the brand color.
 */

/** Brand-name fragment (lowercase) → canonical slug. Order matters: first match wins. */
const BRAND_SLUGS: [pattern: string, slug: string][] = [
  ['totalenergies', 'total'],
  ['total', 'total'],
  ['leclerc', 'leclerc'],
  ['intermarché', 'intermarche'],
  ['intermarche', 'intermarche'],
  ['système u', 'systemeu'],
  ['systeme u', 'systemeu'],
  ['super u', 'systemeu'],
  ['carrefour', 'carrefour'],
  ['auchan', 'auchan'],
  ['bp', 'bp'],
  ['shell', 'shell'],
  ['esso', 'esso'],
  ['casino', 'casino'],
  ['avia', 'avia'],
  ['repsol', 'repsol'],
  ['cepsa', 'cepsa'],
  ['moeve', 'moeve'],
  ['galp', 'galp'],
  ['prio', 'prio'],
  ['ballenoil', 'ballenoil'],
  ['plenergy', 'plenoil'],
  ['plenoil', 'plenoil'],
];

/** Canonical slug → domain (favicon lookup — domains verified in BrandLogo.kt). */
const BRAND_DOMAINS: Record<string, string> = {
  total: 'totalenergies.com',
  leclerc: 'e-leclerc.com',
  intermarche: 'intermarche.com',
  systemeu: 'magasins-u.com',
  carrefour: 'carrefour.fr',
  auchan: 'auchan.fr',
  bp: 'bp.com',
  shell: 'shell.com',
  esso: 'esso.fr',
  casino: 'casino.fr',
  avia: 'avia.fr',
  repsol: 'repsol.com',
  cepsa: 'cepsa.com',
  moeve: 'moeve.com',
  galp: 'galp.com',
  prio: 'prio.pt',
  ballenoil: 'ballenoil.es',
  plenoil: 'plenoil.com',
};

/** Canonical slug → brand color (monogram background). */
const BRAND_COLORS: Record<string, string> = {
  total: '#E3001B',
  leclerc: '#0066B3',
  intermarche: '#E2001A',
  systemeu: '#E2001A',
  carrefour: '#004E9E',
  auchan: '#E2001A',
  bp: '#009900',
  shell: '#DD1D21',
  esso: '#1D4F91',
  casino: '#00954C',
  avia: '#E2001A',
  repsol: '#F29100',
  cepsa: '#009639',
  moeve: '#00A19A',
  galp: '#EF7D00',
  prio: '#8BC63F',
  ballenoil: '#1B3A6B',
  plenoil: '#E2001A',
};

/** Deterministic fallback palette for unknown brands (mirrors BrandLogo.kt). */
const FALLBACK_PALETTE = ['#006A60', '#006399', '#006B2F', '#8E24AA', '#B8860B', '#C62828'];

export function slugForBrand(brand: string | null | undefined): string | null {
  if (!brand) return null;
  const b = brand.toLowerCase();
  for (const [pattern, slug] of BRAND_SLUGS) {
    if (b.includes(pattern)) return slug;
  }
  return null;
}

export function brandDomain(brand: string | null | undefined): string | null {
  const slug = slugForBrand(brand);
  return slug ? BRAND_DOMAINS[slug] ?? null : null;
}

export function brandColor(brand: string | null | undefined): string {
  const slug = slugForBrand(brand);
  if (slug && BRAND_COLORS[slug]) return BRAND_COLORS[slug];
  const b = brand?.toLowerCase() ?? '';
  if (!b) return FALLBACK_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < b.length; i++) hash = (hash * 31 + b.charCodeAt(i)) | 0;
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
}

/** Runtime logo URL (128 px favicon via Google's public service). */
export function brandLogoUrl(brand: string | null | undefined): string | null {
  const domain = brandDomain(brand);
  return domain
    ? `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(domain)}`
    : null;
}

/** First letter of the brand for the monogram fallback ('' when unknown). */
export function monogramLetter(brand: string | null | undefined): string {
  return brand?.trim().charAt(0).toUpperCase() ?? '';
}
