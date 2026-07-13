# CardioPINN, repository structure

Real-data-first. The reconstruction of a real cardiac inverse problem is produced offline from real measured
data and committed; a static web app shows it. No synthetic ground truth.

```
CAOS_RES_CardioPINN/
+- README.md - CHANGELOG.md - LICENSE (Apache-2.0) - CODE_OF_CONDUCT - CONTRIBUTING - SECURITY
+- data-pipeline/cardiopinnlab/
|  +- real/ecgi_edgar.py     # REAL ECGi case: load EDGAR (real torso + cage geometry + measured potentials)
|  |                         #   -> forward operator on real geometry -> Tikhonov / graph-regularized /
|  |                         #   deep-ensemble node UQ -> validate vs REAL heart potentials -> bake artifact
|  +- real/ns_pinn.py        # REAL Navier-Stokes pressure engine for the 4D-flow case (in progress)
|  +- real/flow4d_dicom.py   # 4D-flow DICOM adapter (awaiting the real velocity data)
|  +- core/pinn.py, core/rng.py, io/formats.py   # shared helpers
+- data/
|  +- raw/                   # real datasets, GITIGNORED (data-use agreements; not redistributed)
|  +- derived/real-ecgi-edgar/trace.json   # the committed reconstruction the web reads
+- tests/test_real_ecgi.py   # validates the committed real artifact (no raw data / no torch needed)
+- docs/                     # the wiki: the real case, the method, data governance
+- frontend/                 # Vite + React + three.js SPA; lands on the real ECGi case (renders the recovered
|                            #   heart-surface potential on the REAL cage geometry over the beat)
+- scripts/                  # setup / guards (check_artifacts validates the real artifact; content + residue guards)
+- .github/workflows/        # ci.yml (guards + tests + frontend build) - deploy-pages.yml (frontend-only)
```

## What CI enforces

`ruff` - the real-artifact validity guard (`check_artifacts.py`) - no template residue - no em-dash / emoji -
base-integrity guards (no tracked `.env` / venv / heavy data / raw datasets / leaked paths) - the real-artifact
test - the frontend type-check + build.
