# 05 · Deploy: a static SPA over frozen traces

## What is deployed

The web is a static single-page app: Vite + React, React Router with a hash route (so deep links work on a
GitHub Pages project site without server rewrites), and three.js via react-three-fiber for the 3D
reconstruction views (the ECGi cage potential animation and the 4D-flow lumen point cloud). It is built
frontend-only over the committed traces. There is no server, no API, no database, and no in-browser model: the
app fetches `data/<case>/*.json` at load time and renders it. Every animation is baked, and it is paused by
default (the viewer opts into playback).

`frontend/vite.config.ts` sets `base: './'` so the bundle uses relative asset paths and works when served from
a Pages project subpath or from the custom domain root.

## The `copy-data.mjs` overlay

The canonical traces live in `data/derived/` at the repo root (committed by the offline bake). The web needs
them inside its own served tree, so a prebuild step overlays them:

- `frontend/copy-data.mjs` copies `data/derived/` into `frontend/public/data/` (recursively; traces end up at
  `public/data/<case>/*.json`).
- `frontend/public/` itself is a tracked static-assets directory (it holds the `CNAME` for the custom domain);
  only the overlaid `frontend/public/data/` subtree is gitignored. The canonical copy of the traces is always
  `../data/derived`, never the overlay. This keeps a single source of truth (the committed trace) and avoids a
  second, drifting copy under `frontend/`.

The overlay runs as part of `npm run build`, so a fresh clone plus `npm install && npm run build` reproduces
the exact served bundle from the committed traces. If `data/derived` is missing, `copy-data.mjs` warns and the
build proceeds with no data (the bake must have run first).

## The GitHub Actions Pages workflow

`.github/workflows/deploy-pages.yml` deploys on push to `main` (and on manual dispatch). It is a pure frontend
build: no Python, no torch, no retraining. The steps are:

1. `actions/checkout@v4`.
2. `actions/setup-node@v4` (Node 20, npm cache keyed on `frontend/package-lock.json`).
3. `cd frontend && npm ci && npm run build` (this runs `copy-data.mjs`, then Vite builds the static SPA into
   `frontend/dist`).
4. `actions/upload-pages-artifact@v3` with `path: frontend/dist`.
5. A `deploy` job with `actions/deploy-pages@v4` and the `github-pages` environment.

The workflow has `permissions: pages: write, id-token: write` and a `concurrency: group: pages,
cancel-in-progress: true` so overlapping deploys do not race. Because the physics is a pure function of
(case, seed) baked locally, CI never needs the GPU pipeline stack; the deploy is a frozen build over a frozen
artifact.

## Custom domain

The app is served at the custom domain `cardiopinn.fasl-work.com` (a CNAME under the wildcard
`*.fasl-work.com`); the `github.io` project URL 301-redirects to it. There is no server behind the domain, only
GitHub Pages serving the static bundle.

## The gates that run before a deploy

The deploy job runs on merge to `main`, but the merge itself is gated by CI (`.github/workflows/ci.yml`), which
runs on pushes to `main`/`develop` and on all pull requests (plus manual dispatch):

- `test` job: `ruff` lint, `pytest -q -m "not slow"` (the pure-python contracts and the light analytic gates;
  the slow PINN gate is local-only), and `scripts/check_artifacts.py` (the committed-artifact validator, note
  04).
- `frontend` job: `npm ci && npm run build`, which type-checks and builds the SPA; a contract or type drift
  fails the build.
- `guards` job: base-integrity guards (no tracked `.env`, no venv or native/heavy binary, no raw `.mat`/`.npy`
  data, no leaked local machine paths), `scripts/check_template_residue.py`, and
  `scripts/check_content_standards.py` (the ADR-0067 no-em-dash / no-emoji content guard).

So by the time the Pages workflow runs, the committed traces have been validated, the frontend has type-checked
and built, and the content standards have passed. Both cases and every doc page are additionally
screenshot-verified in light and dark before shipping.

## What is not in the deploy

For the avoidance of doubt, and because earlier revisions of these docs claimed otherwise: there is no ONNX
export, no onnxruntime-web, no Pyodide, no WebAssembly inference, no live recompute, and no live/replay gate in
the deployed app. The bundle is HTML/CSS/JS plus the committed JSON traces plus the three.js render. The
offline physics never ships to the browser; only its frozen output does.

## References

- Aras K, Good W, Tate J, et al. (2015). Experimental Data and Geometric Analysis Repository (EDGAR).
  Journal of Electrocardiology 48(6):975-981. DOI 10.1016/j.jelectrocard.2015.08.008.
- Raissi M, Yazdani A, Karniadakis GE (2020). Hidden fluid mechanics. Science 367(6481):1026-1030.
  DOI 10.1126/science.aaw4741.
</content>
