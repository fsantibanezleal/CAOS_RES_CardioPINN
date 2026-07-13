# data-pipeline/, the offline engine (`cardiopinnlab`)

The single source of physics/algorithm truth; `frontend/` consumes its baked artifacts, never re-implements
them. Its own venv: **`.venv-pipeline`** (heavy GPU stack, local-only; `data-pipeline/requirements.txt`).

## Layout (the package lives directly under `data-pipeline/`)

- `cardiopinnlab/pipeline.py`, orchestrator + CLI (`python -m cardiopinnlab.pipeline [all|<vertical>] [--seed N]`)
- `cardiopinnlab/registry.py`, verticals grouped by CATEGORY
- `cardiopinnlab/io/`, `contract.py` (CONTRACT 1: LAT ingestion) - `formats.py` (readers/writers) - `schema.py` (types)
- `cardiopinnlab/core/`, the shared engine spine:
  - `rng.py` (seeded determinism) - `gate.py` (ONNX lane gate) - `manifest.py` / `trace.py` (CONTRACT 2)
  - `pinn.py` (MLP + Adam->L-BFGS loop) - `eikonal.py` (residual) - `groundtruth.py` (scikit-fmm Eikonal)
  - `geometry.py` (grid mesh) - `baselines.py` (linear + Gaussian-process) - `onnx_export.py` (torch->ONNX + parity)
- `cardiopinnlab/stages/`, `export.py` (the one uniform CONTRACT-2 writer)
- `cardiopinnlab/cases/`, `base.py` (CaseSpec) + one module per research vertical

## Run

```bash
py -3.12 -m venv ../.venv-pipeline
../.venv-pipeline/Scripts/python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cu121
../.venv-pipeline/Scripts/python.exe -m pip install -r requirements.txt -e ..
../.venv-pipeline/Scripts/python.exe -m cardiopinnlab.pipeline           # bakes all verticals
```

The bake is a pure function of `(vertical, seed)`; artifacts (`../data/derived` + `../models/*.onnx`) are
committed, so neither CI nor the web ever runs this stack.
