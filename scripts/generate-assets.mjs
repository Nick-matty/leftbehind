// Generates minimal placeholder PNG assets for local development.
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '..', 'assets');
mkdirSync(assetsDir, { recursive: true });

// 1x1 teal PNG — Expo scales it; replace with real assets before release.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

for (const name of ['icon.png', 'splash.png', 'adaptive-icon.png', 'favicon.png']) {
  writeFileSync(join(assetsDir, name), png);
  console.log(`Created assets/${name}`);
}
