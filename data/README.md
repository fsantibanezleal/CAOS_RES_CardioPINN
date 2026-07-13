# data/, the data contract + layout

Governed by the two data contracts of ADR-0057, specialized to cardiac electroanatomical data.

## Layout

| Path | What | Git |
|---|---|---|
| `raw/` | private/large source inputs (imaging, full electroanatomical maps) | git-ignored (staged via `scripts/fetch-data`) |
| `examples/` | a tiny standard-format sample that PASSES CONTRACT 1 (clone-verify) | committed |
| `derived/<case>/trace.json` | the compact mesh-field artifact the web replays | committed |
| `derived/manifests/` | per-case `<case>.json` (CONTRACT 2) + the flat `index.json` inventory | committed |

## CONTRACT 1, ingestion (raw -> pipeline), the bring-your-own-data gate

Defined in `data-pipeline/cardiopinnlab/io/contract.py`. An ingested electroanatomical-map row (a
mapping-catheter site) is accepted iff it satisfies the schema; rejected with a reason otherwise (never
silently coerced); a plausible-but-suspicious row is flagged (accepted, flag recorded in the manifest).

Schema (local activation times):

| Column | Unit | Range | Notes |
|---|---|---|---|
| `x_mm`, `y_mm`, `z_mm` | mm | [-500, 500] | endocardial coordinates (z = 0 for a 2D patch) |
| `t_ms` | ms | [0, 1000] | local activation time |

Outlier policy: missing/empty column -> reject; non-numeric -> reject; NaN/Inf -> reject; out-of-range ->
reject; `t_ms > 400` (a long single-beat window) -> flag (accepted, recorded in the manifest).

## CONTRACT 2, artifact (pipeline -> web)

Each vertical writes a compact trace (`derived/<case>/trace.json`, schema `cardiopinn.trace/v1`: a decimated
render mesh + per-method scalar fields + sensors + isochrones) and a manifest
(`derived/manifests/<case>.json`, schema `cardiopinn.manifest/v1`: identity, physics ladder, engine, ONNX
block, lane/gate verdict, metrics, real DOI references). Exported ONNX nets live under `../models/*.onnx`.
`frontend/src/lib/contract.types.ts` mirrors these schemas so any drift fails the web build.

## Provenance / license

The current cases are synthetic (fast-marching Eikonal ground truth on a realistic conduction map). As
real public data is wired in (OpenEP electroanatomical maps, Roney atrial fibre atlas, EDGAR ECGi, Stanford
4D-flow), this file records the exact source, license and redistribution terms per case; only compact derived
artifacts are committed, raw inputs stay out of git.
