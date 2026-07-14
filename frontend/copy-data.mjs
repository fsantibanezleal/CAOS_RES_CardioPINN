// Prebuild: copy the committed artifacts into the SPA's public/ so the static site serves them.
// The offline pipeline commits data/derived (the JSON traces the web reads); no model runs in the browser, so
// there is nothing else to overlay. public/ is a build-time overlay (gitignored); the canonical copy lives in
// ../data/derived.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PUB = join(HERE, 'public');

// data/derived -> public/data (traces under <case>/*.json)
const derived = join(ROOT, 'data', 'derived');
if (existsSync(derived)) {
  mkdirSync(join(PUB, 'data'), { recursive: true });
  cpSync(derived, join(PUB, 'data'), { recursive: true });
  console.log('[copy-data] data/derived -> public/data');
} else {
  console.warn('[copy-data] no data/derived, run the offline bake first');
}
