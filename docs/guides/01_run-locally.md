# 01, Run CardioPINN locally

This guide takes you from a clean clone to the app running in a browser. CardioPINN keeps its Python in TWO
virtual environments, split by LANE (offline bake vs thin runtime), not by physics case:

- `.venv-pipeline` is the heavy OFFLINE bake lane and the only one that reproduces the physics. It installs
  the whole `cardiopinnlab` package editable (`pip install -e .`) plus `data-pipeline/requirements.txt`
  (numpy, scipy, torch, pydicom) and the dev tools. BOTH real cases bake from here: the **ECGi case**
  (recovering heart-surface potentials by quasi-static volume conduction, pure NumPy/SciPy linear algebra on
  the CPU, no deep-learning framework) and the **4D-flow case** (recovering aortic pressure by incompressible
  Navier-Stokes, PINNs in PyTorch, meant for a local NVIDIA GPU).
- `.venv` is the thin runtime/live lane: the root `requirements.txt` only (numpy, scipy), enough to import the
  data contracts and run the pure-python tests. It is what ships; it does NOT get the editable package or
  torch, so it cannot run the bake.

If you only want the app to render the already-committed results, you need neither environment: the traces are
committed under `data/derived/`, so `npm run dev` alone renders everything.

## 0. What actually needs to run

The product is BAKE-AND-READ. The heavy physics runs OFFLINE on your machine and writes a compact JSON trace;
the static web only reads it. Nothing trains or infers in the browser. So the environments below are only
needed when you want to REBAKE an artifact (see guide 03) or explore the engine. To just view the site, jump
to section 4.

```
raw data (gitignored)  --bake-->  data/derived/*.json (committed)  --read-->  the static web app
   EDGAR .mat / DICOM       Python, offline           the only thing            three.js render
                            (CPU or local GPU)         that crosses the boundary
```

## 1. Clone

```bash
git clone https://github.com/fsantibanezleal/CAOS_RES_CardioPINN.git
cd CAOS_RES_CardioPINN
```

The repo ships the committed derived artifacts (`data/derived/real-ecgi-catalogue/catalogue.json` and
`data/derived/real-flow4d-pressure/trace.json`), so the app is renderable immediately. The raw datasets are
NOT in the repo (they carry data-use agreements and are gitignored); you only need them to rebake.

## 2. The offline bake environment (`.venv-pipeline`)

Both cases bake from one environment. Create it and install the offline requirements, the dev tools, and the
package itself editable (so `cardiopinnlab` is importable from anywhere):

```bash
py -3.12 -m venv .venv-pipeline
./.venv-pipeline/Scripts/python.exe -m pip install -r data-pipeline/requirements.txt -r requirements-dev.txt
./.venv-pipeline/Scripts/python.exe -m pip install -e .
```

This is exactly what `scripts/setup.ps1` / `scripts/setup.sh` do for this lane (see the note at the end of the
section). For the CUDA build of PyTorch on a local NVIDIA GPU, install it first from the PyTorch index, before
the rest (the CPU wheel also works; the cardiac PINNs are small MLPs that train in minutes):

```bash
./.venv-pipeline/Scripts/python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cu121
./.venv-pipeline/Scripts/python.exe -m pip install -r data-pipeline/requirements.txt -r requirements-dev.txt
```

### The ECGi case (NumPy/SciPy, CPU)

The ECGi reconstruction (forward operator, Tikhonov, graph-Laplacian prior, deep-ensemble node UQ) is pure
linear algebra, no deep-learning framework. Point the loader at your local EDGAR data with `EDGAR_ROOT` (its
default is `D:/_Datos/cardiopinn`). The catalogue loader (`cardiopinnlab/real/ecgi_catalogue.py`) reads each
dataset from a subfolder of that root (`edgar/` for the human torso tank, `edgar_maastricht/` for the in-situ
dog).

A quick smoke test that the environment resolves and `cardiopinnlab` imports (needs no raw data, just prints
the first catalogue case id):

```bash
./.venv-pipeline/Scripts/python.exe -c \
  "from cardiopinnlab.real import ecgi_catalogue as C; print(C.CASES[0]['id'])"
```

This prints `human-tank`. To actually reconstruct that first case you need the `edgar/` human torso-tank data
under `EDGAR_ROOT`:

```bash
EDGAR_ROOT=/path/to/your/edgar-data \
  ./.venv-pipeline/Scripts/python.exe -c \
  "from cardiopinnlab.real import ecgi_catalogue as C; print(C.bake_case_beat(C.CASES[0], 'sinus')['metrics'])"
```

Note that `C.bake_catalogue()` (used by the full rebake, guide 03) is NOT a single-case test: it reconstructs
EVERY beat of EVERY dataset and runs the forward comparison, so it requires BOTH `edgar/` and
`edgar_maastricht/` present. If you have only the human torso-tank data (a common partial EDGAR download), use
the single-case command above. If you have no raw EDGAR data at all, skip this: the committed catalogue is
already in `data/derived/` and the app reads it.

## 3. Baking the 4D-flow case (PyTorch, local GPU)

The 4D-flow pressure pipeline (divergence-free velocity PINN denoiser, space-time net for the analytic
unsteady term, pressure-Poisson sparse solve) runs from the same `.venv-pipeline` created above (torch is
pinned in `data-pipeline/requirements.txt`; for the CUDA build see the note in section 2). It is designed to
bake on a local NVIDIA GPU, though the CPU wheel also works.

Point the DICOM loader at your local raw 4D-flow series with `AORTA4D_DIR` (its default is the local scan
path baked into `flow4d_bake._root()`), then run the bake, which decodes the velocity, corrects phase-wrap
aliasing, segments the lumen, denoises, and solves the pressure-Poisson equation:

```bash
AORTA4D_DIR=/path/to/your/4dflow/dicoms \
  ./.venv-pipeline/Scripts/python.exe -m cardiopinnlab.real.flow4d_bake
```

It writes `data/derived/real-flow4d-pressure/trace.json` and prints the honest metrics (peak velocity, PPE
pressure range, Bernoulli reference, lumen voxels). Full rebake details are in guide 03.

### A note on the setup scripts

`scripts/setup.ps1` / `scripts/setup.sh` create BOTH environments for you (idempotent, no global installs).
Into `.venv-pipeline` they install `data-pipeline/requirements.txt`, `requirements-dev.txt`, and the editable
package (the offline bake lane, exactly the section-2 commands). Into `.venv` they install only the root
`requirements.txt` (the thin runtime/tests lane, no editable package and no torch). They are the
archetype-standard entry point; run them instead of the manual commands unless you want to understand the two
lanes by hand.

## 4. The frontend (Vite + React + three.js)

The web app is a Vite SPA. It fetches the committed traces from `public/data/` (a build-time overlay populated
from `data/derived/` by `frontend/copy-data.mjs`). Install and start the dev server:

```bash
cd frontend
npm install
npm run dev
```

`npm run dev` runs `copy-data.mjs` first (copying `data/derived/` into `public/data/`), then starts Vite. Open
the printed local URL (default `http://localhost:5173`). You land on the App workbench with the top-level
research-case selector (ECG imaging | 4D-flow pressure); see guide 04 for how to read it.

To produce a production build (type-check plus the copy-data overlay plus the Vite build, which is exactly
what CI and the Pages deploy run):

```bash
npm run build
```

## Summary of the environment variables

| Variable | Read by | Points at | Default |
|---|---|---|---|
| `EDGAR_ROOT` | `real/ecgi_catalogue.py` | the folder holding `edgar/` and `edgar_maastricht/` | `D:/_Datos/cardiopinn` |
| `EDGAR_DIR` | `real/ecgi_edgar.py` (single-dataset path) | the single human torso-tank EDGAR folder | `D:/_Datos/cardiopinn/edgar` |
| `AORTA4D_DIR` | `real/flow4d_bake.py` | the raw 4D-flow DICOM velocity series | the local undistorted-velocity DICOM path |

None of these are needed to run the frontend, only to rebake from raw data.

## Scope and honesty

Neither environment is needed to view the site: the committed traces render on their own. The environments
exist so the offline physics is reproducible from the real raw data, which is never redistributed. This is a
validated methodological result on real experimental data, not a clinically deployed tool.

## References

- Aras K, Good W, Tate J, et al. (2015). Experimental Data and Geometric Analysis Repository (EDGAR).
  Journal of Electrocardiology 48(6):975-981. DOI 10.1016/j.jelectrocard.2015.08.008.
- Raissi M, Yazdani A, Karniadakis GE (2020). Hidden fluid mechanics. Science 367(6481):1026-1030.
  DOI 10.1126/science.aaw4741.
