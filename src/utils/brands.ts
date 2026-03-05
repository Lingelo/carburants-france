/**
 * Brand normalization and display config for fuel stations.
 * OSM brand names are inconsistent — this maps variants to canonical names.
 */

const BRAND_NORMALIZE: Record<string, string> = {
  'Total': 'TotalEnergies',
  'Total Access': 'TotalEnergies',
  'TotalEnergies Access': 'TotalEnergies',
  'total': 'TotalEnergies',
  'TOTAL': 'TotalEnergies',
  'TOTALENERGIES': 'TotalEnergies',
  'E.Leclerc': 'Leclerc',
  'Leclerc': 'Leclerc',
  'E. Leclerc': 'Leclerc',
  'LECLERC': 'Leclerc',
  'Carrefour': 'Carrefour',
  'Carrefour Market': 'Carrefour',
  'Carrefour Contact': 'Carrefour',
  'Carrefour Express': 'Carrefour',
  'CARREFOUR': 'Carrefour',
  'Intermarché': 'Intermarché',
  'Intermarche': 'Intermarché',
  'INTERMARCHE': 'Intermarché',
  'Intermarché Super': 'Intermarché',
  'Intermarché Contact': 'Intermarché',
  'Super U': 'Système U',
  'Hyper U': 'Système U',
  'U Express': 'Système U',
  'Système U': 'Système U',
  'Systeme U': 'Système U',
  'BP': 'BP',
  'bp': 'BP',
  'Shell': 'Shell',
  'SHELL': 'Shell',
  'Esso': 'Esso',
  'ESSO': 'Esso',
  'Esso Express': 'Esso',
  'Auchan': 'Auchan',
  'AUCHAN': 'Auchan',
  'Casino': 'Casino',
  'CASINO': 'Casino',
  'Géant Casino': 'Casino',
  'Netto': 'Netto',
  'NETTO': 'Netto',
  'Avia': 'Avia',
  'AVIA': 'Avia',
  'Dyneff': 'Dyneff',
  'DYNEFF': 'Dyneff',
  'Elan': 'Elan',
  'ELAN': 'Elan',
  'Vito': 'Vito',
  'VITO': 'Vito',
  'Cora': 'Cora',
  'CORA': 'Cora',
  'Lidl': 'Lidl',
  'LIDL': 'Lidl',
  'Colruyt': 'Colruyt',
  'COLRUYT': 'Colruyt',
};

interface BrandDisplay {
  abbr: string;
  color: string;
}

const BRAND_DISPLAY: Record<string, BrandDisplay> = {
  'TotalEnergies': { abbr: 'TE', color: '#d32f2f' },
  'Leclerc':       { abbr: 'LC', color: '#005baa' },
  'Carrefour':     { abbr: 'CR', color: '#1a56db' },
  'Intermarché':   { abbr: 'IM', color: '#e63312' },
  'Système U':     { abbr: 'SU', color: '#e2001a' },
  'BP':            { abbr: 'BP', color: '#009b3a' },
  'Shell':         { abbr: 'SH', color: '#fbce07' },
  'Esso':          { abbr: 'ES', color: '#1746a2' },
  'Auchan':        { abbr: 'AU', color: '#83b81a' },
  'Casino':        { abbr: 'CA', color: '#ee2e24' },
  'Netto':         { abbr: 'NT', color: '#ffe100' },
  'Avia':          { abbr: 'AV', color: '#003d7c' },
  'Dyneff':        { abbr: 'DY', color: '#e30613' },
  'Elan':          { abbr: 'EL', color: '#0072bc' },
  'Vito':          { abbr: 'VT', color: '#00a651' },
  'Cora':          { abbr: 'CO', color: '#e30613' },
  'Lidl':          { abbr: 'LI', color: '#0050aa' },
  'Colruyt':       { abbr: 'CL', color: '#e30613' },
};

const DEFAULT_COLOR = '#6b7280';

export function normalizeBrand(raw: string): string {
  return BRAND_NORMALIZE[raw] ?? raw;
}

export function getBrandDisplay(brand: string): BrandDisplay {
  const display = BRAND_DISPLAY[brand];
  if (display) return display;
  // Fallback: first letter(s) + grey
  const abbr = brand.length <= 2 ? brand.toUpperCase() : brand.slice(0, 2).toUpperCase();
  return { abbr, color: DEFAULT_COLOR };
}
