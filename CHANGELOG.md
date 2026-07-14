# Changelog

All notable changes to CardioPINN. Format: `X.XX.XXX` (display), see `cardiopinnlab.__version__`. Keep `0.x`
while cases are synthetic / in-silico-validated and the at-bar review is open. Tag every release.

## [0.15.000], 2026-07-14

### Added (BL-018 deepening: space-time PINN + jet anti-aliasing)
- **Space-time velocity PINN** `v(x,y,z,t)` (`real/flow4d_spacetime.py`): trained divergence-free over the
  WHOLE cardiac cycle, so the pressure-Poisson source AND the unsteady acceleration `dv/dt` are both ANALYTIC
  (autograd), replacing the earlier three-frame finite difference. Gated on an analytic time-varying Poiseuille
  flow whose exact `dw/dt` is known: recovered at correlation 0.995 (`tests/test_flow4d_spacetime.py`).
- **Phase-wrap anti-aliasing** (`flow4d_dicom.unwrap_aliasing`): velocity components that wrap above the venc
  are detected against a robust local estimate and unwrapped by 2*venc before reconstruction (27863 samples
  corrected on this scan).
- **Result:** the analytic unsteady term takes the recovered relative-pressure range from 14.87 mmHg (noisy
  3-frame FD) to **0.79 mmHg**, small and physiological for this unobstructed aorta and the same order as the
  clinical Bernoulli estimate (2.51 mmHg) from the same scan. The physics engine now has two analytic gates in
  CI (steady converging-duct + unsteady time-varying-Poiseuille). Artifact schema v3; App result prose + docs
  case page updated to the new numbers and the space-time / anti-aliasing method.

## [0.14.000], 2026-07-14

### Added (BL-018: 4D-flow noise-robustness ensemble, with an honest negative outcome)
- **A deep-ensemble noise-robustness analysis for the 4D-flow pressure**, the analogue of the ECGi per-node
  UQ: each member perturbs the measured velocity with realistic phase-contrast noise (5% of the venc),
  re-denoises (divergence-free PINN) and re-solves the pressure-Poisson equation.
- **Honest outcome (a null result, reported not hidden):** the recovered pressure moves by under 0.01 mmHg
  under that noise (metric `noise_sensitivity_mmHg`). The divergence-free denoiser makes the pressure
  essentially insensitive to velocity measurement noise, which is a strength but also means an ensemble over
  that noise gives a near-zero, uninformative per-voxel uncertainty. A per-voxel pressure-uncertainty map is
  therefore deliberately NOT shown (it would be a misleading uniform ~0 field). The robustness is reported as
  a scalar, and the App callout + docs state plainly that the dominant uncertainty is the absent invasive gold
  standard, the lumen segmentation, and the unsteady-term approximation, which such an ensemble cannot
  capture. The validated claims stay: the exact analytic gate, the physiological range, the noise-robustness,
  and the Bernoulli bracket.

## [0.13.000], 2026-07-14

### Added (BL-017: boundary-element forward operator)
- **A physically-correct boundary-element (BEM) forward operator for ECGi** (`real/ecgi_bem.py`), replacing
  the single-layer point-source approximation with the discretized boundary-integral equation: exact triangle
  solid angles (Van Oosterom-Strackee 1983) for the double layer, triangle 1/r integrals for the single layer,
  the c(p) jump folded into a deflated diagonal, and the heart-surface normal current eliminated to give the
  transfer matrix Z (phi_body = Z phi_heart).
- **Analytic gate (in CI):** on two concentric spheres, where the heart-to-body transfer of each spherical
  harmonic is known in closed form, the BEM recovers it with correlation 1.00 and an error that halves with
  each mesh refinement (first-order convergence). `tests/test_ecgi_bem.py`.
- **Honest comparison baked into the catalogue** (schema v2, `forward_comparison` per case): where both
  surfaces are closed 2-manifolds the BEM is applied and compared to the calibrated single-layer. Finding: on
  the real electrode geometry the BEM does NOT beat the single-layer. The human torso-tank surface is open (32
  boundary edges) so the BEM applies only to the dog case; and there the coarse 140-node torso makes the
  reconstruction regularization-dominated (dog: single-layer RE 0.54 vs BEM RE 0.63), so forward-operator
  fidelity is not the bottleneck. The single-layer stays the default; the BEM matters as electrode density and
  mesh closure improve. This null result is reported, not hidden (App "How the PDE arises" tab + docs).

## [0.12.001], 2026-07-14

### Fixed (documentation + dependency coherence)
- **Dependency manifests reconciled with the real application.** `data-pipeline/requirements.txt` now declares
  exactly what the code imports (torch, numpy, scipy, pydicom) and drops seven stale packages left over from
  the purged synthetic verticals that no source file imports (scikit-fmm, onnx, onnxruntime, trimesh, meshio,
  robust-laplacian, potpourri3d). Added the missing `pydicom` (the 4D-flow DICOM loader needs it). An
  experimental `h5py` install (probing the ischemia BEM matrices, which turned out not to be HDF5) was removed,
  not declared.
- **Removed stale ONNX / browser-inference claims** that no longer match the real architecture: the in-app
  Architecture modal, `cardiopinnlab/__init__.py`, and `core/pinn.py` docstrings previously described exporting
  to ONNX and re-running the network in the browser (onnxruntime-web) with a live/replay gate. The real app
  bakes every result offline (ECGi on CPU with NumPy/SciPy, 4D-flow on GPU with torch) and the static web reads
  committed JSON traces; no model runs in the browser.
- **README + docs wiki brought current:** README now documents both cases (multi-dataset ECGi + 4D-flow
  pressure) with the real file layout and run commands; `docs/README.md` lists both cases; added
  `docs/cases/real-flow4d-pressure.md`; the ECGi case page now includes the in-situ dog dataset.

## [0.12.000], 2026-07-14

### Added
- **Real 4D-flow aortic pressure case (a second physics domain: Navier-Stokes).** The App is now a catalogue
  of real applied cases across DIFFERENT physics, with a top-level research-case selector: ECG imaging (volume
  conduction / Laplace) and 4D-flow pressure (incompressible Navier-Stokes). The new case recovers the aortic
  relative pressure field from a real 4D-flow MRI velocity scan and answers the four questions per case
  (problem / target / how the PDE arises / traditional Bernoulli / physics-informed proposal / result).
- **Validated pressure pipeline.** The measured Philips velocity (venc 120, physiological peak 0.77 m/s) is
  denoised by a divergence-free velocity PINN (data fit + div v = 0), and the relative pressure is recovered
  by the pressure-Poisson equation from the network's ANALYTIC derivatives (no finite-difference edge
  artifact). Computing the source and Neumann flux analytically was the fix that took the real-scan map from a
  non-physiological ~thousands of mmHg (FD boundary artifact) to a physiological range: PPE pressure range
  14.87 mmHg, bracketing the clinical simplified-Bernoulli estimate 2.37 mmHg from the same scan. The engine
  is gated on an analytic converging duct (corr 1.00, 4.74 vs 4.73 mmHg) before any real data is trusted.
- Committed artifact `data/derived/real-flow4d-pressure/trace.json` (1.6 MB: 9000-point lumen cloud, pressure
  at peak systole + pulsatile speed over 16 frames). Frontend: `Flow4d.tsx` per-case workbench with a 3D
  point-cloud pressure/speed viz, `Workbench.tsx` top-level case selector. Real Navier-Stokes / HFM / PPE
  citations (Raissi 2020 Science, Krittian 2012 Med Image Anal) verified against primary sources. Artifact
  validator + test guard the pressure is physiological (range < 60 mmHg, velocity < 6 m/s). Screenshot-verified
  both cases and all tabs, light + dark, 0 console errors.

### Honesty
- No invasive pressure gold standard exists for a 4D-flow scan (the reason the method exists); the validated
  claims are the exact analytic gate, the physiological range, the divergence-free denoising, and the bracket
  of the clinical Bernoulli reference. The absolute magnitude carries the method's uncertainty. Not clinically
  deployed.

## [0.11.000], 2026-07-14

### Added
- **Multi-dataset real ECGi catalogue.** The reconstruction now runs across a catalogue of independent real
  EDGAR experiments instead of a single torso tank, answering the "catalogue is too poor" review: a config
  driven loader (`real/ecgi_catalogue.py`) handles the differing field names and mesh layouts per lab. Two
  real datasets ship, 4 beats total, all validated against a real gold standard with the identical pipeline
  (no per-heart retuning): the Utah human explanted heart in a torso tank (192 body -> 256 cage; sinus + PVP
  + AVP paced) and the Maastricht in-situ dog heart (140 body -> 1321-node epicardium; sinus). Measured
  quality: human RE 0.54-0.65 / CC 0.72-0.85, dog RE 0.54 / CC 0.78, node-UQ ~0.90 throughout. The App
  Reconstruction tab, Experiments coverage table, and Benchmark method comparison gained a live dataset/beat
  selector; the committed artifact is `data/derived/real-ecgi-catalogue/catalogue.json` (2.44 MB). Artifact
  validator + test rewritten with a completeness floor (>= 2 cases, >= 4 beats) so a partial bake cannot
  silently shrink the catalogue.

### Investigated (not shipped)
- **4D-flow aortic pressure (NS-PINN).** The real Philips 4D-flow velocity field was decoded (40 slices x 16
  frames, magnitude + 3 phase encodings, venc 120 cm/s -> physiological peak ~2 m/s) and the aortic lumen
  segmented from the pulsatile flow. Pressure recovery is NOT shipped: an analytic-Poiseuille gate showed the
  NS-PINN recovers only ~1% of the true pressure gradient (pressure is weakly coupled / gauge-free, a known
  PINN failure mode), and the scan's jet core is phase-wrap aliased. Shipping a fabricated pressure field
  would violate the honesty bar, so the case is deferred to the validated work-energy / pressure-Poisson
  route (must pass the analytic gate before inclusion). Findings persisted in the CAOS_MANAGE plan.

## [0.10.000], 2026-07-14

### Added
- Deep content to the ADR-0016/0017 bar. The App is now a per-case WORKBENCH with a Tabs strip that walks the
  full pedagogy: The problem, The target, How the PDE arises (torso volume conduction -> the linear forward
  operator), Traditional approach (Tikhonov), Physics-informed proposal, and the interactive Reconstruction.
  Each content tab carries bilingual EN/ES prose, captioned KaTeX equations with symbol glossaries, a
  theme-aware SVG, an honest-scope callout, and inline <Cite> + a per-section <Refs> with real DOIs (never a
  bibliography dump). The five doc pages were rewritten to the ADR floors: Introduction (>=5 sections +
  10-item glossary + pipeline SVG), Methodology (6 method SubTabs: forward operator, Tikhonov, parameter
  choice, graph-Laplacian prior, physics-constrained, ensemble UQ), Implementation (architecture SVG +
  pipeline + artifact contract + data governance), Experiments (design + leakage-safe protocol + coverage +
  real results), Benchmark (fair method comparison, honest finding). Centered .page-body (ADR-0017 layout
  contract), ADR-0016 footer. A citation registry (real DOIs) + Cite/Refs/Callout/SubTabs/Equation-caption
  components. Screenshot-verified every page + App tab, light+dark, 0 console errors.

## [0.08.000], 2026-07-14

### Added
- REAL-DATA PIVOT. The synthetic cases were the wrong premise (a PINN validated against a field a solver
  produced answers no real question). This adds the first REAL applied case: `real-ecgi-edgar`, where the
  physics fits REAL measured body-surface potentials (192 EDGAR torso electrodes) and recovers the
  heart-surface potentials, validated against the REAL measured heart-cage potentials (256 electrodes),
  the gold standard a torso tank provides. Results vs REAL heart potentials: sinus RE 0.65 CC 0.72, paced
  PVP RE 0.58 CC 0.80, AV-paced RE 0.54 CC 0.85; calibrated per-node uncertainty ~0.90. Data: EDGAR
  (Consortium for ECG Imaging), used under its data-use agreement with attribution (raw data not
  redistributed, gitignored). The app now lands on this real case, animating the recovered heart-surface
  potential on the real cage geometry over the beat, with the real validation metrics.
- Real Navier-Stokes pressure engine (`real/ns_pinn.py`) for the 4D-flow case (verified on analytic
  Poiseuille); the Stanford AS4DF real geometry is secured (velocity download pending on this network).

## [0.07.000], 2026-07-14

### Added
- Per-case medical, biological and physical context, so a viewer understands what is shown and why. Every
  vertical now carries a three-layer context triad (the clinical picture, the underlying cardiac physiology,
  and the physics being modeled), color-coded in the app Context tab (bilingual EN/ES) and added to each
  docs/cases/*.md as a "Medical, biological and physical context" section.

## [0.06.000], 2026-07-14

### Added
- Vertical 9 (stretch, beyond SOTA), `inverse-ecgi`: the inverse ECG imaging problem. A single-layer forward
  operator, an oracle-best Tikhonov baseline (fair), and a physics-constrained ensemble reconstruction with a
  recalibrated per-node uncertainty. Baked: PINN relative error ~0.16 vs oracle-Tikhonov ~0.20, correlation
  ~0.99 vs ~0.98, node UQ ~0.91 within 2 sigma; live. The honest win is the calibrated node uncertainty
  (Tikhonov is a strong baseline). Sensors 23:1841; generative direction arXiv:2601.18615.
- Vertical 10 (stretch, beyond SOTA), `amortized-operator`: amortized inference for instant personalization. A
  heteroscedastic encoder trained once on a 700-patient simulated Eikonal population maps a new patient's
  sparse activation times in one ~1 ms forward pass to a calibrated parameter posterior. Baked: substrate
  location error ~0.12 mm, posterior calibration ~0.93 within 2 sigma, ~60000x faster than a per-patient fit;
  replay. Neural-operator direction arXiv:2512.01702.
- Custom domain cardiopinn.fasl-work.com wired (Felipe created the DNS CNAME 2026-07-14).
- Frontend: verticals 9 and 10 wired. This completes all 10 planned verticals (8 core + 2 stretch).

## [0.05.000], 2026-07-13

### Added
- Vertical 7 (beyond SOTA), `flow4d-ns-pressure`: a Navier-Stokes PINN recovers pressure from noisy velocity
  (4D-flow-like) on the Kovasznay analytic flow, with a hematocrit-dependent viscosity setting the Reynolds
  number, and a calibrated per-voxel pressure uncertainty. Baked: velocity rel-L2 ~0.004, pressure rel-L2
  ~0.008, pressure reliability within 2 sigma ~0.94 (recalibrated); Re ~40 at hematocrit 0.45; pressure net
  live. Reproduces Sierpe et al. arXiv:2508.03326 (2025) + adds the calibrated pressure UQ.
- Vertical 8 (beyond SOTA), `pa-pressure-1dns`: non-invasive pulmonary-artery pressure via a 1D reduced-order
  Navier-Stokes PINN across a normal-to-pulmonary-hypertension cohort with uncertainty. Baked: normal ~11,
  elevated ~20, pulmonary-hypertension ~33 mmHg predicted (true ~10.5 / ~18.3 / ~28.1), mean absolute error
  ~2.6 mmHg, normal-vs-PH classification correct; replay. Reproduces the Valparaiso 1D-NS PA-pressure PINN
  (Jara et al., Biomedicines 2025, DOI 10.3390/biomedicines13092058) + adds the cohort and UQ.
- Frontend: verticals 7 and 8 wired (bilingual Context + registry). This completes the eight core research
  verticals across cardiac electrophysiology and cardiovascular hemodynamics.

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
