# Changelog

All notable changes to CardioPINN. Format: `X.XX.XXX` (display), see `cardiopinnlab.__version__`. Keep `0.x`
while cases are synthetic / in-silico-validated and the at-bar review is open. Tag every release.

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
