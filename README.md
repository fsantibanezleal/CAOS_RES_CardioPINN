# CardioPINN

Physics-informed neural networks for cardiac electrophysiology and cardiovascular medicine. A research lab
where each case is a real research topic (activation mapping, conduction-velocity and fiber inference,
geometry-aware PINNs on cardiac surfaces, atrial-fibrillation phase mapping, 4D-flow hemodynamics), carrying
its own theory, governing equations, real or realistic data, and a classical / SOTA / beyond-SOTA model
ladder.

The heavy training + validation + ONNX export runs offline on a local NVIDIA GPU; the static web app
re-runs the exported PINNs in the browser (onnxruntime-web) and replays baked field traces on the actual
cardiac geometry. Sibling of [PINN-Lab](https://github.com/fsantibanezleal/CAOS_PINNLAB); instantiated from
the CAOS product-repo template (ADR-0057).

> Status: early build (0.0.x). Cases are validated in-silico against fast-marching / simulator ground truth
> on synthetic and public-atlas geometry; no case is clinically validated. See each case manifest for the
> honest real-or-synthetic flag and the measured metrics.

## Architecture (two worlds, one artifact contract)

- **Offline pipeline** (`data-pipeline/cardiopinnlab/`, `.venv-pipeline`, local GPU): for each research
  vertical it generates or ingests the ground truth, trains the PINN (PyTorch), evaluates against the
  classical baselines, and exports the network to ONNX with a measured PyTorch-vs-onnxruntime parity check.
  It writes a compact field trace + an ONNX net + a manifest (the two data contracts).
- **Static web app** (`frontend/`): loads only the committed artifacts. A case runs **live** (onnxruntime-web
  re-inference of the exported PINN) when it passes the measured lane gate, otherwise it **replays** the
  baked field trace. The cardiac field is rendered on the real triangulated surface.

## The two data contracts

1. **Ingestion (`raw -> pipeline`)**, `cardiopinnlab/io/contract.py`: the schema + outlier policy of an
   ingested electroanatomical map (local activation times: x, y, z, t). The bring-your-own-data gate.
2. **Artifact (`pipeline -> web`)**, `cardiopinnlab/core/{trace,manifest}.py`: the compact mesh-field trace +
   the ONNX net + a manifest (identity, physics ladder, engine, lane/gate verdict, ONNX parity, metrics,
   real DOI references). `frontend/src/lib/contract.types.ts` mirrors the schema so a drift fails the build.

## Quickstart

```bash
# offline pipeline (heavy, local GPU): create the venv, install, bake the verticals
py -3.12 -m venv .venv-pipeline
./.venv-pipeline/Scripts/python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cu121
./.venv-pipeline/Scripts/python.exe -m pip install -r data-pipeline/requirements.txt -e .
./.venv-pipeline/Scripts/python.exe -m cardiopinnlab.pipeline           # all verticals -> data/derived + models/

# tests (pure-python contracts; the slow GPU bake is `-m slow`)
./.venv-pipeline/Scripts/python.exe -m pytest -q -m "not slow"

# web app (reads the committed artifacts)
cd frontend && npm install && npm run dev
```

## Verticals

Each vertical is a `CaseSpec` under `data-pipeline/cardiopinnlab/cases/`, registered in `registry.py`, and
documented in `docs/cases/`. The catalogue grows as verticals are built (docs authored per vertical, ADR-0056).

- **act-eikonal-mapping** (electrophysiology): activation mapping by an Eikonal PINN. From sparse noisy local
  activation times, reconstruct the activation map T(x) and the conduction velocity V(x) under
  `||grad T|| V = 1`. Reproduces Sahli Costabal et al. 2020 (DOI 10.3389/fphy.2020.00042) and its comparison
  against Gaussian-process and linear interpolation. Live (onnxruntime-web).

## Documentation

The `docs/` wiki (ADR-0056) holds the theory, equations, real DOI references, and the per-vertical
write-ups. Start at [docs/README.md](docs/README.md).

## License

Apache-2.0 (see [LICENSE](LICENSE)). Owner: Felipe Santibanez-Leal.
