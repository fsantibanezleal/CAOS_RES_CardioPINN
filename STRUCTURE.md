# CardioPINN, repository structure

Instantiated from the CAOS product-repo template (ADR-0057) and specialized to the cardiac PINN -> ONNX ->
onnxruntime-web lane. Two worlds joined by one artifact contract: a heavy offline GPU pipeline bakes the
artifacts; a static web app consumes only the committed artifacts.

## Tree

```
CAOS_RES_CardioPINN/
+- README.md - CHANGELOG.md (X.XX.XXX + tags) - LICENSE (Apache-2.0) - CODE_OF_CONDUCT - CONTRIBUTING - SECURITY
+- pyproject.toml - requirements.txt (light: contracts + tests) - .env.example - .gitignore - .gitattributes
+- data-pipeline/
|  +- requirements.txt              # OFFLINE GPU stack (torch, scikit-fmm, onnx, robust-laplacian, ...)
|  +- cardiopinnlab/                # the engine + staged pipeline (the instantiated product package)
|     +- __init__.py (version) - pipeline.py (orchestrator + CLI) - registry.py (verticals by category)
|     +- io/     contract.py (CONTRACT 1: LAT ingestion) - formats.py (readers/writers) - schema.py (types)
|     +- core/   rng - gate (ONNX lane gate) - manifest (CONTRACT 2) - trace (mesh+field artifact)
|     |          pinn (MLP + Adam->L-BFGS loop) - eikonal (residual) - groundtruth (scikit-fmm)
|     |          geometry (grid mesh) - baselines (linear + GP) - onnx_export (torch->ONNX + parity)
|     +- stages/ export (the one uniform CONTRACT-2 writer; per-vertical steps live in cases/)
|     +- cases/  base.py (CaseSpec) + one module per research vertical
+- models/                          # exported ONNX nets (small, committed); the browser re-runs them live
+- data/
|  +- raw/ (git-ignored) - examples/ (a tiny CONTRACT-1 sample) - derived/<case>/trace.json (committed)
|  +- derived/manifests/<case>.json + index.json (CONTRACT 2)
+- tests/  test_contract - test_manifest (gate/manifest/trace) - test_artifacts (committed) - test_bake (slow GPU)
+- docs/   README (wiki landing) - architecture/ - cases/ - frameworks/ - guides/   (ADR-0056, authored per vertical)
+- frontend/  Vite + React + TS SPA; onnxruntime-web live inference + baked-trace replay; 3D cardiac-mesh render
+- app/       optional FastAPI backend (dormant; the product is static-first)
+- scripts/   setup - precompute - dev - smoke (.sh + .ps1) + the CI guards (check_*.py)
+- .github/workflows/  ci.yml (light tests + guards + frontend build) - deploy-pages.yml (frontend-only)
```

## The lanes

- **Offline (precompute)**: `cardiopinnlab/` on the local GPU. Trains, validates, exports ONNX, bakes the
  trace + manifest. Heavy deps (`data-pipeline/requirements.txt`), never shipped.
- **Live (client-side)**: onnxruntime-web re-runs the exported PINN in the browser when the case passes the
  measured lane gate (small ONNX, browser-drivable coordinate input, parity within tolerance).
- **Replay**: the SPA animates the committed field trace under a "precomputed" banner when a case is not
  live-drivable. Deterministic replay = truth (a case is a function of its seed).

## The staged pipeline

For each vertical the six conceptual stages (preprocess, feature_extraction, train, infer, evaluate, export)
run inside its `build(seed)` because the physics differs per vertical; the one uniform stage is `export`
(CONTRACT 2). The per-vertical steps use the shared `core/` engine.

## What CI enforces

`ruff` - pure-python contract tests - committed manifest/artifact consistency (`check_artifacts.py`) - no
template residue (`check_template_residue.py`) - no em-dash / emoji (`check_content_standards.py`) -
base-integrity guards (no tracked `.env`/venv/heavy-data/leaked-path) - the frontend type-check + build
(contract drift fails it).
