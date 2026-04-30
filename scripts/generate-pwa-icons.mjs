// One-shot icon raster generation. Run after editing public/pwa-icon-source.svg.
// Generates pwa-{64,192,512}.png + maskable-icon-512x512.png + apple-touch-icon-180x180.png.
// Does NOT regenerate favicon.ico (legacy multi-resolution format) — modern browsers
// pick up favicon.svg directly so the .ico stays as a stale artifact for very old clients.
//
// Requires sharp (not in deps to avoid bloat):
//   $ npm install --no-save sharp && node scripts/generate-pwa-icons.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve('public/pwa-icon-source.svg');
const svg = readFileSync(SRC);

const TARGETS = [
  { out: 'public/pwa-64x64.png', size: 64 },
  { out: 'public/pwa-192x192.png', size: 192 },
  { out: 'public/pwa-512x512.png', size: 512 },
  { out: 'public/maskable-icon-512x512.png', size: 512 },
  { out: 'public/apple-touch-icon-180x180.png', size: 180 },
];

for (const { out, size } of TARGETS) {
  await sharp(svg).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
  console.log(`✓ ${out} (${size}×${size})`);
}
