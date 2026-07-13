# Changelog

All notable changes to CardioPINN. Format: `X.XX.XXX` (display), see `cardiopinnlab.__version__`. Keep `0.x`
while cases are synthetic / in-silico-validated and the at-bar review is open. Tag every release.

## [0.04.000], 2026-07-13

### Added
- Vertical 5 (beyond SOTA), `active-sensing`: uncertainty-driven next-best-electrode acquisition. An offline
  hold-out study compares active (max GP-posterior-variance) vs random vs uniform placement; active reaches a
  10% rel-L2 target with 15 electrodes vs 30 (random) and 44 (uniform), and the final Eikonal PINN reconstructs
  better on the actively-chosen sites. Live. Closes the acquisition loop the SOTA mapping PINN leaves open.
- Reaction-diffusion spine (`core/reaction_diffusion.py`): Aliev-Panfilov monodomain spiral generator + phase
  field + topological-charge phase-singularity detection.
- Vertical 6 (beyond SOTA), `af-phase-rotor`: atrial-fibrillation phase mapping with probabilistic rotor
  localization. From sparse noisy electrodes (about 3.4% coverage) the complex phasor is interpolated and an
  ensemble produces a probabilistic rotor-location heatmap + confidence radius; the rotor is localized to
  ~0.9 mm with a ~0.9 mm confidence radius. Replay. Aliev-Panfilov DOI 10.1016/0960-0779(95)00089-5;
  EP-PINNs DOI 10.3389/fcvm.2021.768419.
- Frontend: verticals 5 and 6 wired (bilingual Context + registry).

## [0.03.000], 2026-07-13

### Added
- Anisotropic conduction spine (`core/anisotropic.py`): fiber conductivity tensor + graph-based
  anisotropic-Eikonal ground truth.
- Vertical 3, `fiber-conductivity-inverse` (FiberNet / PIEMAP): recovers the myocardial fiber-angle field and
  the along/across conduction velocities from several activation maps (shared fiber-angle net + learnable
  cl, ct, anisotropic Eikonal residual per map) with a deep-ensemble uncertainty. Baked: fiber-angle RMSE
  ~16 deg, cl ~0.65 (true 0.70), anisotropy underestimated (transverse CV weakly observed, stated honestly);
  fiber net live. Reproduces Grandits et al. arXiv:2102.10863 + DOI 10.1007/s00366-022-01709-3.
- Vertical 4 (flagship, beyond SOTA), `joint-cv-scar-uq`: joint activation + conduction-velocity recovery,
  low-conduction-substrate localization, and a deep-ensemble per-node uncertainty with variance recalibration.
  Baked: activation rel-L2 ~0.053, CV RMSE ~0.080, substrate IoU ~0.31, reliability within 2 sigma lifted
  from ~0.34 (raw, overconfident) to ~0.82 (recalibrated); CV net live. The calibrated node uncertainty and
  the substrate map are what the single-field SOTA lacks.
- Frontend: verticals 3 and 4 wired (bilingual Context + registry).

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
