# 03, Rebake and validate the artifacts

CardioPINN is bake-and-read: the physics runs offline and writes a compact JSON trace under `data/derived/`,
and the static web only reads it. This guide covers regenerating those traces from the real raw data, the
analytic gates that must pass before any real data is trusted, the validators and pytest floors, and the
re-verify-before-commit discipline that keeps a bad bake from shipping.

There are two committed artifacts:

| Case | Artifact | Baked by | Lane |
|---|---|---|---|
| ECGi | `data/derived/real-ecgi-catalogue/catalogue.json` | `real/ecgi_catalogue.py` `bake_catalogue()` | light `.venv` (NumPy/SciPy, CPU) |
| 4D-flow | `data/derived/real-flow4d-pressure/trace.json` | `real/flow4d_bake.py` `main()` | heavy `.venv-pipeline` (PyTorch, GPU) |

You need the corresponding environment and the raw data (guide 01) only when you rebake. To just validate the
already-committed artifacts, you need neither the raw data nor torch: the validator and the trace tests are
stdlib-only and run in CI without the raw datasets.

## The gate-before-real-data rule

Every physics engine must recover a known analytic answer before it is allowed near a real scan. The gates run
in CI and are the honesty backbone of the product:

- **ECGi BEM gate** (`tests/test_ecgi_bem.py`): on two concentric spheres, where the heart-to-body transfer of
  each spherical harmonic is known in closed form, the boundary-element operator recovers it with correlation
  1.00 and an error that halves with each mesh refinement (first-order convergence).
- **4D-flow steady gate** (`tests/test_flow4d_ppe.py`): on an analytic converging-duct flow whose exact
  pressure drop is known, the pressure-Poisson solve recovers it to within 1 percent (correlation > 0.99,
  magnitude scale within 10 percent, pressure drop within 0.2 mmHg). This is exactly the gate the
  momentum-residual NS-PINN failed (it recovered only about 1 percent of the true gradient), which is why the
  shipped method is the pressure-Poisson route, not the momentum residual.
- **4D-flow unsteady gate** (`tests/test_flow4d_spacetime.py`, marked slow, trains a PINN): on a time-varying
  Poiseuille flow $w(r,t) = U_0(1 + A\sin\omega t)(1 - (r/R)^2)$, whose exact axial unsteady acceleration is
  $\partial_t w = U_0 A\,\omega\cos\omega t$, the space-time net recovers $\partial_t w$ at correlation 0.995
  (amplitude within 20 percent). This is what makes the unsteady pressure term analytic rather than a noisy
  three-frame finite difference.

Run the fast gates (everything except the slow GPU/PINN tests) with:

```bash
./.venv-pipeline/Scripts/python.exe -m pytest -q -m "not slow"
```

## Rebaking the ECGi catalogue

The ECGi lane is CPU-only (NumPy/SciPy). With `EDGAR_ROOT` pointing at your raw EDGAR data (guide 01),
`bake_catalogue()` reconstructs every dataset and beat, evaluates each against its real cage recording, and
returns the catalogue dict. Write it to the committed path:

```bash
EDGAR_ROOT=/path/to/edgar-data \
  ./.venv/Scripts/python.exe -c "import json, pathlib; \
from cardiopinnlab.real import ecgi_catalogue as C; \
out = pathlib.Path('data/derived/real-ecgi-catalogue/catalogue.json'); \
out.parent.mkdir(parents=True, exist_ok=True); \
out.write_text(json.dumps(C.bake_catalogue(), separators=(',', ':')), encoding='utf-8'); \
print('wrote', out)"
```

`bake_catalogue()` produces schema `cardiopinn.ecgi-catalogue/v2`: per case, the real cage mesh, the decimated
frames of the recovered / measured / absolute-error / per-node-uncertainty fields, the validated metrics
(relative error, correlation, node-UQ calibration, electrode counts), and the honest single-layer-vs-BEM
`forward_comparison`. Run from the `data-pipeline/` directory (or with the editable package installed) so
`cardiopinnlab` imports.

## Rebaking the 4D-flow pressure trace

The 4D-flow lane trains PINNs in PyTorch and is meant for a local GPU. With `AORTA4D_DIR` pointing at your raw
DICOM velocity series, run the bake module (it has its own `main()` that writes the trace):

```bash
AORTA4D_DIR=/path/to/4dflow/dicoms \
  ./.venv-pipeline/Scripts/python.exe -m cardiopinnlab.real.flow4d_bake
```

`flow4d_bake` runs the full validated pipeline: decode the measured velocity, correct phase-wrap aliasing
(`unwrap_aliasing`, 27863 samples corrected on this scan), segment the aortic lumen (pulsatile-flow threshold,
largest connected component), pick the peak-systolic frame (max lumen kinetic energy), train the space-time
divergence-free velocity PINN over the whole cycle to get the analytic source, Neumann flux and unsteady term
$\partial_t\mathbf{v}$, solve the pressure-Poisson equation $\nabla^2 p = S(\mathbf{v})$ by a sparse direct
solve, run the velocity-noise robustness ensemble, and decimate the lumen to a browser-sized point cloud. It
writes schema `cardiopinn.flow4d-pressure/v3` to `data/derived/real-flow4d-pressure/trace.json` and prints the
metrics. The physical constants are fixed in `flow4d_ppe.py`: blood density $\rho = 1060\ \mathrm{kg/m^3}$,
dynamic viscosity $\mu = 0.0035\ \mathrm{Pa\,s}$, $1\ \mathrm{mmHg} = 133.322\ \mathrm{Pa}$.

Expected honest numbers on this scan: peak velocity 0.791 m/s, PPE relative-pressure range 0.79 mmHg (with the
space-time analytic unsteady term; the earlier three-frame finite difference inflated it to about 15 mmHg),
clinical Bernoulli $4V_{\max}^2 = 2.51$ mmHg, and a velocity-noise sensitivity under 0.01 mmHg.

## Validate the committed artifacts

`scripts/check_artifacts.py` is the drift gate (stdlib only, runs in CI). It enforces both a completeness floor
and a physiological floor:

```bash
python scripts/check_artifacts.py
```

- **ECGi completeness floor:** at least `MIN_CASES = 2` datasets and `MIN_BEATS = 4` beats, every beat carries
  `mesh` / `times_ms` / `fields_over_time` / `metrics`, correlation in [-1, 1], relative error non-negative.
  This is what stops a partial bake from silently shrinking the catalogue.
- **4D-flow physiological floor:** the point cloud is non-degenerate (>= 1000 points, pressure length matches),
  the recovered pressure range is physiological (`0 < ppe_pressure_drop_mmHg < 60`, the guard against the
  finite-difference boundary artifact that once produced thousands of mmHg), and the peak velocity is
  physiological (`0.1 < peak_velocity_ms < 6.0`).

The pytest trace tests assert the same and more: `tests/test_real_ecgi.py` re-checks the completeness floor and
each beat's physical sanity; `tests/test_flow4d_trace.py` re-checks the physiological pressure and velocity and
that the noise-robustness scalar is small (`0 <= noise_sensitivity_mmHg < 2.0`, `ensemble_members >= 3`). Run
them with `pytest -q -m "not slow"`.

The CI pipeline (`.github/workflows/ci.yml`) runs, on every push to `develop`/`main`: ruff lint, `pytest -m
"not slow"`, then `python scripts/check_artifacts.py`; a separate job type-checks and builds the SPA; a guards
job forbids tracked `.env` / venvs / native binaries / raw data (`.mat`, `.npy`, etc.) / leaked local paths,
checks for template residue, and runs the content-standards check (no em-dash, no emoji, ADR-0067). The slow
GPU/PINN bake tests are local-only.

## Re-verify before `git add`

The committed trace is the only thing that crosses into the web, so treat the bake as a boundary and verify the
Actual committed bytes, not the run you remember:

1. Rebake into `data/derived/` with the correct environment and data path.
2. Run `python scripts/check_artifacts.py` and `pytest -q -m "not slow"` against the files on disk.
3. Eyeball the printed metrics against the expected honest numbers above (peak velocity 0.791 m/s, range 0.79
   mmHg, Bernoulli 2.51 mmHg; ECGi RE 0.54-0.65, CC 0.72-0.85, node-UQ ~0.90).
4. Only then `git add data/derived/...`. Never let a test or a smoke run write a canonical artifact: the bake
   is deliberate and gated; the validators re-read the committed file so a partial or non-physiological bake
   fails CI instead of shipping.

If you changed the schema (added a metric, changed the field layout), bump the schema string in the bake and
update both the validator and the frontend interface that reads it, or the SPA type-check will fail the build.

## References

- Raissi M, Yazdani A, Karniadakis GE (2020). Hidden fluid mechanics: Learning velocity and pressure fields
  from flow visualizations. Science 367(6481):1026-1030. DOI 10.1126/science.aaw4741.
- Krittian SBS, Lamata P, Michler C, et al. (2012). A finite-element approach to the direct computation of
  relative cardiovascular pressure from time-resolved MR velocity data. Medical Image Analysis
  16(5):1029-1037. DOI 10.1016/j.media.2012.04.003.
- Van Oosterom A, Strackee J (1983). The solid angle of a plane triangle. IEEE Transactions on Biomedical
  Engineering 30(2):125-126. DOI 10.1109/TBME.1983.325207.
