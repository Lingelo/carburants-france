#!/usr/bin/env node

/**
 * Fetches vehicle data from two sources and merges them:
 *
 * 1. ADEME Car Labelling — current new vehicles with detailed consumption by speed phase
 *    Source: https://data.ademe.fr/datasets/ademe-car-labelling
 *
 * 2. EEA CO2 Monitoring — all cars registered in France (2012–2024), with CO2 emissions
 *    Source: https://www.eea.europa.eu/en/datahub/datahubitem-view/fa8b1229-3db6-495d-b18e-9c9b3267c02b
 *    API: https://discodata.eea.europa.eu
 *
 * For EEA data, fuel consumption is derived from NEDC/WLTP CO2 emissions:
 *   Diesel: L/100km = CO2 (g/km) / 26.4
 *   Petrol: L/100km = CO2 (g/km) / 23.2
 *   Urban estimate: combined x 1.3
 *
 * ADEME data takes priority on duplicates (more precise consumption data).
 *
 * Output: public/data/vehicles.json
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'public', 'data');

// --- Helpers ---

function avg(a, b) {
  if (!isNaN(a) && !isNaN(b)) return (a + b) / 2;
  if (!isNaN(a)) return a;
  if (!isNaN(b)) return b;
  return null;
}

function round(v) {
  return v != null ? Math.round(v * 10) / 10 : null;
}

function titleCase(s) {
  return s
    .toLowerCase()
    .replace(/(^|\s|-)(\S)/g, (_, pre, c) => pre + c.toUpperCase());
}

// Estimate fuel tank capacity (liters) from curb weight (kg).
// Based on typical French/European vehicle segments:
//   City cars  (<1100kg): ~42L    Compact (1100-1300kg): ~47L
//   Family     (1300-1500kg): ~52L    SUV/Large (>1500kg): ~58L
function estimateTankFromWeight(weightKg) {
  if (!weightKg || weightKg <= 0) return 50;
  if (weightKg < 1100) return 42;
  if (weightKg < 1300) return 47;
  if (weightKg < 1500) return 52;
  if (weightKg < 1700) return 58;
  return 65;
}

// --- ADEME ---

const ADEME_API =
  'https://data.ademe.fr/data-fair/api/v1/datasets/ademe-car-labelling/lines';

async function fetchADEME() {
  const rows = [];
  let page = 1;
  let total = Infinity;

  while (rows.length < total) {
    const url = `${ADEME_API}?page=${page}&size=1000&format=json`;
    console.log(`  ADEME page ${page}...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ADEME HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    total = data.total;
    rows.push(...data.results);
    page++;
  }

  console.log(`  ADEME: ${rows.length} rows fetched.`);
  return rows;
}

function normalizeADEME(rows) {
  const vehicles = [];
  const seen = new Set();

  for (const r of rows) {
    const energie = (r.Energie || '').trim().toUpperCase();
    if (energie === 'ELECTRIC' || energie === 'HYDROGEN' || energie === '') continue;

    const brand = (r.Marque || '').trim();
    const model = (r['Libellé_modèle'] || r.Modèle || '').trim();
    const desc = (r.Description_Commerciale || '').trim();

    const consoUrbanMin = parseFloat(r.Conso_basse_vitesse_Min);
    const consoUrbanMax = parseFloat(r.Conso_basse_vitesse_Max);
    const consoMixedMin = parseFloat(r.Conso_vitesse_mixte_Min);
    const consoMixedMax = parseFloat(r.Conso_vitesse_mixte_Max);

    const consoUrban = avg(consoUrbanMin, consoUrbanMax);
    const consoMixed = avg(consoMixedMin, consoMixedMax);
    if (!consoUrban && !consoMixed) continue;

    const weight = parseFloat(r['Poids_à_vide']) || null;
    const tank = estimateTankFromWeight(weight);

    let fuel;
    if (energie.includes('ESSENC')) fuel = 'Essence';
    else if (energie.includes('GAZOLE')) fuel = 'Gazole';
    else if (energie.includes('GPL') || energie.includes('GAZ')) fuel = 'GPLc';
    else fuel = 'Essence';

    const hybrid = energie.includes('ELEC+');

    const key = `${brand}|${model}|${fuel}`;
    if (seen.has(key)) continue;
    seen.add(key);

    vehicles.push({
      brand,
      model,
      description: desc,
      fuel,
      hybrid,
      tank,
      consoUrban: round(consoUrban || consoMixed),
      consoMixed: round(consoMixed || consoUrban),
    });
  }

  return vehicles;
}

// --- EEA ---

const EEA_API = 'https://discodata.eea.europa.eu/sql';

// CO2-to-consumption conversion factors (g/km -> L/100km)
const CO2_FACTOR = { Diesel: 26.4, Petrol: 23.2, LPG: 16.4 };
// Urban driving typically uses ~30% more fuel than combined cycle
const URBAN_FACTOR = 1.3;

async function fetchEEA() {
  const query = `SELECT DISTINCT Mk, Cn, Ft, [Ec (cm3)] as Ec, [Ep (KW)] as Ep, [M (kg)] as Mass, [Enedc (g/km)] as CO2nedc, [Ewltp (g/km)] as CO2wltp FROM [CO2Emission].[latest].[co2cars] WHERE MS = 'FR' AND status = 'F' AND Ft IN ('Diesel','Petrol','LPG')`;

  const rows = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${EEA_API}?query=${encodeURIComponent(query)}&p=${page}&nrOfHits=1000`;
    console.log(`  EEA page ${page}...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`EEA HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (!data.results || data.results.length === 0) break;
    rows.push(...data.results);
    hasMore = data.results.length === 1000;
    page++;
  }

  console.log(`  EEA: ${rows.length} distinct variant rows fetched.`);
  return rows;
}

function normalizeEEA(rows) {
  // Group by Mk+Cn+Ft, compute median CO2 and weight, pick most common engine
  const map = new Map();
  for (const r of rows) {
    const ft = (r.Ft || '').trim();
    const ftNorm = ft.charAt(0).toUpperCase() + ft.slice(1).toLowerCase();
    const key = `${r.Mk}|${r.Cn}|${ftNorm}`;
    if (!map.has(key)) map.set(key, { mk: r.Mk, cn: r.Cn, ft: ftNorm, co2s: [], weights: [], engines: [] });
    const entry = map.get(key);
    const co2 = r.CO2nedc || r.CO2wltp;
    if (co2) entry.co2s.push(co2);
    if (r.Mass) entry.weights.push(r.Mass);
    if (r.Ec) entry.engines.push({ ec: r.Ec, ep: r.Ep });
  }

  const vehicles = [];
  for (const [, v] of map) {
    if (v.co2s.length === 0) continue;
    const factor = CO2_FACTOR[v.ft];
    if (!factor) continue;

    v.co2s.sort((a, b) => a - b);
    const medianCO2 = v.co2s[Math.floor(v.co2s.length / 2)];

    const consoMixed = round(medianCO2 / factor);
    const consoUrban = round(consoMixed * URBAN_FACTOR);

    // Median weight for tank estimation
    v.weights.sort((a, b) => a - b);
    const medianWeight = v.weights.length > 0 ? v.weights[Math.floor(v.weights.length / 2)] : null;
    const tank = estimateTankFromWeight(medianWeight);

    // Pick most common engine size for the description
    const ecCount = {};
    for (const e of v.engines) {
      const k = `${e.ec}|${e.ep}`;
      ecCount[k] = (ecCount[k] || 0) + 1;
    }
    const topEngine = Object.entries(ecCount).sort((a, b) => b[1] - a[1])[0];
    const [ec, ep] = topEngine ? topEngine[0].split('|').map(Number) : [null, null];

    const fuel = v.ft === 'Diesel' ? 'Gazole' : v.ft === 'Lpg' ? 'GPLc' : 'Essence';

    const desc = [
      ec ? `${(ec / 1000).toFixed(1)}L` : null,
      ep ? `${ep}kW` : null,
      v.ft,
    ].filter(Boolean).join(' ');

    vehicles.push({
      brand: titleCase(v.mk),
      model: titleCase(v.cn),
      description: desc,
      fuel,
      hybrid: false,
      tank,
      consoUrban,
      consoMixed,
    });
  }

  return vehicles;
}

// --- Merge ---

function merge(ademeVehicles, eeaVehicles) {
  const map = new Map();

  // ADEME first (higher quality consumption data)
  for (const v of ademeVehicles) {
    const key = `${v.brand.toUpperCase()}|${v.model.toUpperCase()}|${v.fuel}`;
    if (!map.has(key)) map.set(key, v);
  }

  // EEA fills in missing models
  for (const v of eeaVehicles) {
    const key = `${v.brand.toUpperCase()}|${v.model.toUpperCase()}|${v.fuel}`;
    if (!map.has(key)) map.set(key, v);
  }

  const vehicles = [...map.values()];
  vehicles.sort((a, b) =>
    a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model),
  );

  return vehicles;
}

// --- Main ---

async function main() {
  console.log('=== Carburants France — Vehicle Data Pipeline ===\n');

  // 1. Fetch from both sources
  console.log('Fetching ADEME Car Labelling...');
  const ademeRows = await fetchADEME();

  console.log('Fetching EEA CO2 Monitoring (France)...');
  const eeaRows = await fetchEEA();

  // 2. Normalize
  console.log('Normalizing...');
  const ademeVehicles = normalizeADEME(ademeRows);
  const eeaVehicles = normalizeEEA(eeaRows);
  console.log(`  ADEME: ${ademeVehicles.length} vehicles`);
  console.log(`  EEA: ${eeaVehicles.length} vehicles`);

  // 3. Merge (ADEME wins on duplicates)
  const vehicles = merge(ademeVehicles, eeaVehicles);

  // 4. Write JSON
  mkdirSync(DATA_DIR, { recursive: true });
  const filePath = join(DATA_DIR, 'vehicles.json');
  writeFileSync(filePath, JSON.stringify(vehicles));

  // 5. Summary
  const fuels = {};
  for (const v of vehicles) {
    fuels[v.fuel] = (fuels[v.fuel] || 0) + 1;
  }
  for (const [fuel, count] of Object.entries(fuels)) {
    console.log(`  ${fuel} → ${count} vehicles`);
  }

  console.log(`\nDone! ${vehicles.length} vehicles written to vehicles.json.`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
