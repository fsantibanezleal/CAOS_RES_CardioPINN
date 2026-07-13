// Prebuild: copy the committed CONTRACT-2 artifacts into the SPA's public/ so the static site serves them.
// The offline GPU bake commits data/derived (traces + manifests) and models/*.onnx; the browser fetches the
// traces (replay) and re-runs the ONNX nets (live, onnxruntime-web). public/ is a build-time overlay (git-
// ignored); the canonical copies live in ../data and ../models.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const PUB = join(HERE, 'public');

// 1) data/derived -> public/data (traces under <case>/trace.json + manifests/ incl. index.json)
const derived = join(ROOT, 'data', 'derived');
if (existsSync(derived)) {
  mkdirSync(join(PUB, 'data'), { recursive: true });
  cpSync(derived, join(PUB, 'data'), { recursive: true });
  console.log('[copy-data] data/derived -> public/data');
} else {
  console.warn('[copy-data] no data/derived, run scripts/precompute first');
}

// 2) models/*.onnx -> public/models (the exported PINNs the browser re-runs live via onnxruntime-web)
const models = join(ROOT, 'models');
if (existsSync(models)) {
  mkdirSync(join(PUB, 'models'), { recursive: true });
  cpSync(models, join(PUB, 'models'), { recursive: true });
  console.log('[copy-data] models -> public/models');
}
