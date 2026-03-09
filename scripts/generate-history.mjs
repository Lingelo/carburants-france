#!/usr/bin/env node

/**
 * Generates a national daily average fuel price history.
 *
 * Modes:
 *   --bootstrap   Download the full 2026 annual archive and compute daily averages
 *   --daily       Download yesterday's daily flux and append one data point
 *
 * Output: public/data/history.json
 * Format: { fuels: { Gazole: [[epoch, price], ...], SP95: [...], ... } }
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync, createWriteStream } from 'fs';
import { createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'public', 'data');
const HISTORY_PATH = join(DATA_DIR, 'history.json');
const TMP_ZIP = join(ROOT, '.tmp-history.zip');
const TMP_XML = join(ROOT, '.tmp-history.xml');

const FUEL_MAP = {
  1: 'Gazole',
  2: 'SP95',
  3: 'E85',
  4: 'GPLc',
  5: 'E10',
  6: 'SP98',
};

const FUELS_TO_TRACK = ['Gazole', 'SP95', 'SP98', 'E10', 'E85'];

const ANNUAL_URL = 'https://donnees.roulez-eco.fr/opendata/annee/2026';
const DAILY_URL = 'https://donnees.roulez-eco.fr/opendata/jour';

// ─── Helpers ─────────────────────────────────────────────

async function downloadFile(url, dest) {
  console.log(`Downloading ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const fileStream = createWriteStream(dest);
  await import('stream/promises').then(m => m.pipeline(res.body, fileStream));
  console.log(`Downloaded to ${dest}`);
}

async function unzipFile(zipPath, outPath) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  try {
    await execAsync(`unzip -o -p "${zipPath}" > "${outPath}"`);
  } catch {
    throw new Error('unzip failed. Ensure unzip is available.');
  }
}

/**
 * Stream-parse the XML and collect prices grouped by date + fuel.
 * Returns Map<dateStr, Map<fuelName, number[]>> (arrays of prices)
 */
function parseXMLForAverages(xmlPath) {
  console.log('Parsing XML for daily averages...');

  return new Promise((resolve, reject) => {
    // date -> fuel -> prices[]
    const dailyPrices = new Map();
    let lineCount = 0;

    const stream = createReadStream(xmlPath, { encoding: 'latin1' });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    rl.on('line', (line) => {
      lineCount++;
      if (lineCount % 500_000 === 0) console.log(`  ...${lineCount} lines`);

      const priceMatch = line.match(/<prix\s+nom="[^"]*?"\s+id="(\d+)"\s+maj="([^"]*?)"\s+valeur="([^"]*?)"/);
      if (!priceMatch) return;

      const [, fuelId, majStr, valeur] = priceMatch;
      const fuelName = FUEL_MAP[parseInt(fuelId)];
      if (!fuelName || !FUELS_TO_TRACK.includes(fuelName)) return;

      const price = parseFloat(valeur);
      if (isNaN(price) || price <= 0 || price > 5) return; // sanity check

      // Extract date (YYYY-MM-DD)
      const dateStr = majStr.split(/[T ]/)[0];
      if (!dateStr || dateStr.length !== 10) return;

      if (!dailyPrices.has(dateStr)) dailyPrices.set(dateStr, new Map());
      const dayMap = dailyPrices.get(dateStr);
      if (!dayMap.has(fuelName)) dayMap.set(fuelName, []);
      dayMap.get(fuelName).push(price);
    });

    rl.on('close', () => {
      console.log(`Parsed ${lineCount} lines, ${dailyPrices.size} unique dates.`);
      resolve(dailyPrices);
    });
    rl.on('error', reject);
  });
}

/**
 * Convert dailyPrices map to the output format:
 * { fuels: { Gazole: [[epoch, avgPrice], ...], ... }, updated: ISO }
 * Sorted by date ascending.
 */
function computeAverages(dailyPrices) {
  const fuels = {};
  for (const fuel of FUELS_TO_TRACK) {
    fuels[fuel] = [];
  }

  // Sort dates
  const sortedDates = [...dailyPrices.keys()].sort();

  for (const dateStr of sortedDates) {
    const epoch = new Date(dateStr + 'T12:00:00Z').getTime();
    const dayMap = dailyPrices.get(dateStr);

    for (const fuel of FUELS_TO_TRACK) {
      const prices = dayMap.get(fuel);
      if (!prices || prices.length < 10) continue; // need enough data points
      const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
      fuels[fuel].push([epoch, Math.round(avg * 1000) / 1000]);
    }
  }

  return fuels;
}

function loadExistingHistory() {
  if (!existsSync(HISTORY_PATH)) return null;
  try {
    return JSON.parse(readFileSync(HISTORY_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

function saveHistory(history) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(HISTORY_PATH, JSON.stringify(history));
  const sizeKB = (Buffer.byteLength(JSON.stringify(history)) / 1024).toFixed(1);
  console.log(`Saved history.json (${sizeKB} KB)`);
}

function cleanup() {
  try { unlinkSync(TMP_ZIP); } catch {}
  try { unlinkSync(TMP_XML); } catch {}
}

// ─── Bootstrap: full annual archive ──────────────────────

async function bootstrap() {
  console.log('=== Bootstrap: generating history from 2026 archive ===\n');

  await downloadFile(ANNUAL_URL, TMP_ZIP);
  await unzipFile(TMP_ZIP, TMP_XML);

  const dailyPrices = await parseXMLForAverages(TMP_XML);
  const fuels = computeAverages(dailyPrices);

  const totalPoints = Object.values(fuels).reduce((s, arr) => s + arr.length, 0);
  console.log(`\nComputed ${totalPoints} data points across ${FUELS_TO_TRACK.length} fuels.`);

  const history = { fuels, updated: new Date().toISOString() };
  saveHistory(history);
  cleanup();
  console.log('Done!');
}

// ─── Daily: append yesterday's average ───────────────────

async function daily() {
  console.log('=== Daily: appending latest data ===\n');

  await downloadFile(DAILY_URL, TMP_ZIP);
  await unzipFile(TMP_ZIP, TMP_XML);

  const dailyPrices = await parseXMLForAverages(TMP_XML);
  const newFuels = computeAverages(dailyPrices);

  // Load existing history and merge
  const existing = loadExistingHistory();
  if (!existing) {
    console.error('No existing history.json — run with --bootstrap first.');
    cleanup();
    process.exit(1);
  }

  let added = 0;
  for (const fuel of FUELS_TO_TRACK) {
    const existingDates = new Set(existing.fuels[fuel]?.map(([e]) => e) ?? []);
    for (const [epoch, avg] of (newFuels[fuel] ?? [])) {
      if (!existingDates.has(epoch)) {
        if (!existing.fuels[fuel]) existing.fuels[fuel] = [];
        existing.fuels[fuel].push([epoch, avg]);
        added++;
      }
    }
    // Keep sorted
    existing.fuels[fuel]?.sort((a, b) => a[0] - b[0]);
  }

  existing.updated = new Date().toISOString();
  saveHistory(existing);
  cleanup();
  console.log(`Added ${added} new data points. Done!`);
}

// ─── CLI ─────────────────────────────────────────────────

const mode = process.argv[2];
if (mode === '--bootstrap') {
  bootstrap().catch(err => { console.error('FATAL:', err); process.exit(1); });
} else if (mode === '--daily') {
  daily().catch(err => { console.error('FATAL:', err); process.exit(1); });
} else {
  console.log('Usage: node scripts/generate-history.mjs [--bootstrap|--daily]');
  process.exit(1);
}
