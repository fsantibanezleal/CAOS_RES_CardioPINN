# 01, Run CardioPINN locally

This guide takes you from a clean clone to the app running in a browser. CardioPINN has two independent real
cases in two different physics domains, and they have deliberately different toolchains, so there are TWO
virtual environments, not one:

- the **ECGi case** (recovering heart-surface potentials by quasi-static volume conduction) is pure linear
  algebra: NumPy and SciPy on the CPU, no deep-learning framework at all. It lives in a light `.venv`.
- the **4D-flow case** (recovering aortic pressure by incompressible Navier-Stokes) trains PINNs in PyTorch
  and is meant for a local GPU. It lives in a heavier `.venv-pipeline`.

You do NOT need both to work on one case. If you only want the app to render the already-committed results,
you need neither: the traces are committed under `data/derived/`, so `npm run dev` alone renders everything.

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

## 2. The light ECGi environment (`.venv`, NumPy/SciPy, CPU)

The ECGi reconstruction (forward operator, Tikhonov, graph-Laplacian prior, deep-ensemble node UQ) uses only
NumPy and SciPy. Create the environment and install those two packages:

```bash
py -3.12 -m venv .venv
./.venv/Scripts/python.exe -m pip install numpy scipy
```

Point the loader at your local EDGAR data with `EDGAR_ROOT` (its default is `D:/_Datos/cardiopinn`). The
catalogue loader (`cardiopinnlab/real/ecgi_catalogue.py`) reads each dataset from a subfolder of that root
(`edgar/` for the human torso tank, `edgar_maastricht/` for the in-situ dog). A quick smoke test that the
environment and data path resolve, reconstructing the first case and printing its id:

```bash
EDGAR_ROOT=/path/to/your/edgar-data \
  ./.venv/Scripts/python.exe -c \
  "from cardiopinnlab.real import ecgi_catalogue as C; print(C.bake_catalogue()['cases'][0]['id'])"
```

This should print `human-tank`. If you do not have the raw EDGAR data, skip this: the committed catalogue is
already in `data/derived/` and the app will read it.

Run the offline module from the `data-pipeline/` directory (or install the package editable, see below) so
that `cardiopinnlab` is importable.

## 3. The heavy 4D-flow environment (`.venv-pipeline`, PyTorch, local GPU)

The 4D-flow pressure pipeline (divergence-free velocity PINN denoiser, space-time net for the analytic
unsteady term, pressure-Poisson sparse solve) uses PyTorch and is designed to bake on a local NVIDIA GPU. Its
dependencies are pinned in `data-pipeline/requirements.txt` (torch, numpy, scipy, pydicom, nothing else):

```bash
py -3.12 -m venv .venv-pipeline
./.venv-pipeline/Scripts/python.exe -m pip install -r data-pipeline/requirements.txt
```

For the CUDA build of PyTorch, install it first from the PyTorch index, then the rest (the CPU wheel also
works; the cardiac PINNs are small MLPs that train in minutes):

```bash
./.venv-pipeline/Scripts/python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cu121
./.venv-pipeline/Scripts/python.exe -m pip install -r data-pipeline/requirements.txt
```

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

`scripts/setup.ps1` / `scripts/setup.sh` create both environments and install `requirements-dev.txt` and the
editable package for you (idempotent, no global installs). They are the archetype-standard entry point; the
explicit commands above are what they run under the hood, shown so you understand the two lanes.

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
