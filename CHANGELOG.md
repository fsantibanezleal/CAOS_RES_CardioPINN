# Changelog

All notable changes to CardioPINN. Format: `X.XX.XXX` (display), see `cardiopinnlab.__version__`. Keep `0.x`
while cases are synthetic / in-silico-validated and the at-bar review is open. Tag every release.

## [0.02.000], 2026-07-13

### Added
- Manifold spine (`core/mesh.py`): a curled/self-overlapping surface generator, the Laplace-Beltrami
  eigenbasis (robust-laplacian + scipy eigsh), an intrinsic per-face gradient operator for the surface
  Eikonal residual, and geodesic-distance activation ground truth (heat method / Dijkstra fallback).
- Vertical 2, `delta-pinn-geometry`: physics-informed activation on a curved cardiac surface, comparing a
  Delta-PINN (Laplace-Beltrami eigenbasis input) against a vanilla (x, y, z) PINN under the same intrinsic
  surface-Eikonal residual, and a 3D interpolation baseline. On a self-overlapping scroll the Delta-PINN
  reconstructs at rel-L2 ~0.11 while the vanilla PINN and interpolation collapse (~0.48, ~0.45), the honest
  regime where the eigenfunction encoding is necessary. Replay-only (the input is the precomputed eigenbasis).
  Reproduces Sahli Costabal, Pezzuto, Perdikaris (2024), DOI 10.1016/j.engappai.2023.107324.
- Frontend: vertical 2 wired (bilingual Context + registry); the Compare tab is now field-generic.

## [0.01.000], 2026-07-13

### Added
- Initial instantiation from the CAOS product-repo template (ADR-0057), specialized to the cardiac
  PINN -> ONNX -> onnxruntime-web lane (mirroring PINN-Lab).
- Offline engine (`data-pipeline/cardiopinnlab/`): the two data contracts (LAT ingestion + mesh-field
  artifact), the ONNX lane gate, the manifest/trace, the per-vertical `CaseSpec`, and the shared spine:
  the PINN training loop (Adam -> L-BFGS), the Eikonal residual, the fast-marching ground-truth solver
  (scikit-fmm), the classical baselines (linear + Gaussian-process interpolation), the grid geometry, and
  the torch -> ONNX exporter with a measured parity check.
- Vertical 1, `act-eikonal-mapping`: cardiac activation mapping by an Eikonal PINN. Two-network T + V with a
  fixed-speed curriculum warm start, Eikonal residual, and a total-variation CV prior. Baked on the local
  GPU: rel-L2(T) 0.079 (vs GP 0.112, linear 0.080), CV RMSE 0.091 mm/ms, ONNX 68 KB, parity 6.1e-5, lane
  live. Reproduces Sahli Costabal et al., Frontiers in Physics 8:42 (2020), DOI 10.3389/fphy.2020.00042.
- Pure-python contract tests (ingestion, gate, manifest, trace, committed-artifact consistency) + a slow
  GPU-bake test; CI (light tests + guards + frontend build) and the Pages deploy workflow (frontend-only,
  artifacts committed).
