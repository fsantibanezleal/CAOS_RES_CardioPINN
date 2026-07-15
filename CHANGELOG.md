# Changelog

All notable changes to CardioPINN. Format: `X.XX.XXX` (display), see `cardiopinnlab.__version__`. Keep `0.x`
while cases are synthetic / in-silico-validated and the at-bar review is open. Tag every release.

## [0.21.000], 2026-07-14

### Changed (App redo: every tab rebuilt to be interactive, dynamic and dense, per ADR-0017 and the interactive-visualization rubric)
The App was a set of hollow tabs: static 3D views that did not react, walls of prose, incomplete equations that
needed scrolling, controls in the global left rail that only drove one tab, and voids in the layout. All of it is
documented as findings D-000..D-007 in `plans/cardiopinn/quality-defects.md`. This release rebuilds the two case
workbenches (ECGi, 4D-flow), keeping the exact tab set but replacing the content with a reusable interactive kit.
The redesign is grounded in an external-SOTA UX dossier (`research/app-redesign-2026-07-14/`), not in another
CAOS product. Every tab was screenshot-verified in both cases and both themes (viz fills its stage, no void, no
wall of text, footer 2 lines).
- **Reusable interactive kit** (`frontend/src/kits/`): `FieldView3D` (orbit + click/keyboard node-pick with a
  pinned marker + argmax marker + a perceptually-uniform colormap legend + value readout, mesh or point cloud),
  `UPlotChart` (theme-aware uPlot wrapper with an external cursor, markers, identity line, hover/click), plus
  `HoverMathEq`, `StatStrip`, `ClinicalStepper`, `DerivationStepper`, `Juxtapose`, `PipelineSvg`,
  `SmallMultipleStrip`. Shared `colormap.ts` helpers (`fieldStats`, `colorFor`): diverging for signed fields,
  sequential for unsigned.
- **Reconstruction / Pressure-recovery tabs**: the 3D field is now the interactive hero. Click or key-select a
  node to read its recovered-vs-measured trace over the cardiac cycle in a linked chart; field-toggle chips, a
  phase scrubber and a play button drive the baked frames. The static heart/cloud is gone.
- **The-problem tabs**: `StatStrip` of sourced figures + an annotated many-to-one clinical SVG coupled to a
  `ClinicalStepper`, replacing the prose wall (D-004).
- **The-target / How-the-PDE-arises tabs**: `HoverMathEq` (focusable symbol chips reveal meaning + units) and a
  `DerivationStepper` that walks the derivation one equation at a time, replacing the scroll-clipped equations.
- **Traditional-approach tabs**: a live Bernoulli / Tikhonov explorable (sliders drive a uPlot chart), a
  discarded-terms ledger and Bernoulli-vs-physics bracket bars.
- **Physics-informed-proposal tabs**: an inspectable `PipelineSvg` (hover/select a stage, play the flow) with
  what-if chips that read the baked reconstruction each choice produces.
- **Layout / controls / footer** (D-002, D-003, D-005): the control rail stretches the full main-column height
  (no short-left-column void), per-tab controls (field/beat/scrub/pick) moved into the tab they drive, the
  responsive `.canvas-wrap` fills the stage, and the footer is a compact 2 lines (ADR-0016 section 2).

## [0.20.000], 2026-07-14

### Added (adversarial beyond-SOTA evaluation of the 4D-flow PINN, on known-answer benchmarks)
Four candidate advances over the 4D-flow pressure engine were implemented and evaluated ADVERSARIALLY (each
tried to REFUTE the claimed advance) on analytic flows with exact ground truth, the honest way to decide a
"beyond SOTA" claim when the real scan has no invasive pressure gold standard. Persisted in the dated dossier
`research/beyond-sota-pinn-2026-07-14/` (design, per-experiment JSON, `findings.md`). GPU: RTX 4070.
- **CONFIRMED and shipped**: the engine's analytic-autograd source/flux beats a finite-difference source (what a
  standard PPE/WERP pipeline uses) by ~63x on a known answer (median pressure-drop error 0.066 vs 4.19 mmHg,
  6/6 configs). Graduated into the engine as a gate, `flow4d_denoise.gate_analytic_vs_fd`, with
  `tests/test_flow4d_analytic_source.py`, and documented in `docs/frameworks/02_pytorch.md`.
- **Honest NULLs (refuted, not shipped)**: (1) hard divergence-free by construction (velocity as the curl of a
  learned vector potential) drives the divergence residual ~6x lower but does NOT improve pressure (marginally
  worse), the residual divergence was not the bottleneck; (2) end-to-end differentiable coupling of the denoiser
  to the elliptic solve, a correct implicit-differentiation Poisson solve was built (reproduces `spsolve`
  exactly) but coupling is subsumed by the two-stage pipeline for a linear elliptic solve; (3) a structural-
  perturbation pressure UQ is calibrated but small on a clean, well-defined lumen (would need a real ambiguous
  segmentation to show value).

## [0.19.001], 2026-07-14

### Fixed (coherence sweep, remove inconsistencies)
- **License standardized on MIT.** The repo declared Apache-2.0 (LICENSE, pyproject, README, STRUCTURE) while the
  shared shell footer renders "MIT licensed". Reviewed the whole CAOS product line (16 shell consumers): the
  license was split and internally inconsistent (some products even had an Apache LICENSE file but a MIT
  pyproject). Standardized the entire line on MIT (the dominant signal: shell footer + 13/15 pyprojects + half the
  LICENSE files were already MIT). CardioPINN's LICENSE, pyproject, README and STRUCTURE now all say MIT, matching
  the footer.
- **Removed dead code + orphaned assets.** Deleted the unused zustand store (all per-view state is local component
  state; only `useLang`/`pick` remain, `useLang` delegating to the shell) and dropped the `zustand` dependency;
  deleted 5 orphaned `public/svg/tech/*.svg` files (the previous architecture-modal assets, replaced by the inline
  `architecture.ts`; two still showed the purged onnxruntime-web / replay lane).
- **Version reconciled.** `cardiopinnlab.__version__` and `pyproject` were stale at 0.17; bumped to track the
  product version. Fixed a stale docs claim that an `onnxruntime-web` dependency "remains listed in package.json"
  (it was removed).
- **EDGAR data terms corrected.** The footer described EDGAR as "CC-attribution"; verified against the EDGAR site,
  it is open-access with an acknowledgement request, not a formal Creative Commons license, so the footer now reads
  "open-access, attribution requested".

## [0.19.000], 2026-07-14

### Added (deep, primary-source-verified problem statements)
The "The problem" statements were generic textbook framing. A 4-topic deep-research pass (persisted as a dated
dossier under `research/content-depth-2026-07-14/`, 40 primary-source-verified facts, a completeness/honesty
critic) rewrote both problem statements and the 4D-flow message tabs to real clinical + methodological depth,
every number tied to a guideline or DOI.
- **4D-flow "The problem"**: aortic-stenosis severity thresholds (peak jet >= 4.0 m/s, mean gradient >= 40 mmHg,
  AVA <= 1.0 cm2; Otto 2020 ACC/AHA, Vahanian 2021 ESC/EACTS) and coarctation intervention threshold
  (peak-to-peak >= 20 mmHg Class I; Stout 2018 AHA/ACC), prevalence (Osnabrugge 2013), the simplified-Bernoulli
  failure modes and the pressure-recovery Doppler overestimation (up to 66 mmHg / 80%; Baumgartner 1999), and the
  honest 4D-flow accuracy vs an FSI reference (~0.4 mmHg bias; Saitta 2019). The "traditional" and "physics-informed"
  tabs now carry the pressure-recovery / expanded-Bernoulli critique and the PPE / WERP-vWERP / PINN SOTA family
  (Ebbers 2001, Krittian 2012, Donati 2015, Marlevi 2019, Hardy 2025, Ong 2015, Kissas 2020, Fathi 2020).
- **ECGi "The problem"**: AF/VT stakes with the Framingham independent near-fivefold stroke risk (Wolf 1991), why
  the 12-lead cannot localize (8 independent leads), what ECGi does (Ramanathan 2004, ~10 mm), and the HONEST
  in-patient validation reality (mean activation-time error ~20 ms, near-zero overall correlation, breakthrough
  sites mislocated by tens of mm, worst over scar; Duchateau 2019), motivating the EDGAR torso-tank ground truth.
- **Citations**: added 18 verified DOIs to the registry. Applied the critic's honesty fixes: dropped the
  unsourced "double by 2050" and the "~23% misclassification" claims, softened the un-primary-sourced US SCD
  figure, and corrected a memory-recalled Bissell entry to the dossier's verified citation.
- Verified: content-standards guard green (no em-dash/emoji), tsc clean, build green, screenshot-verified both
  enriched problem tabs in the App.

## [0.18.000], 2026-07-14

### Changed (adopt the shared CAOS app shell, ADR-0016)
The frontend had hand-rolled its own `Tabs`, `SubTabs`, `Callout`, `Equation`, `Cite`/`Refs`, header/footer
(`Layout`) and `ArchitectureModal` instead of the shared `@fasl-work/caos-app-shell` (v0.3.0) that RotorVitals
and every other CAOS product uses. That was the root cause of the tab styling, the reference style, and the
header/footer not matching the ADRs. This release deletes the 8 hand-rolled components and adopts the shell.
- **Shell chrome**: `main.tsx` now wraps the routes in the shell `AppShell` (sticky header: brand + nav +
  external links + the ⓘ Architecture button + language/theme toggles) and its footer (provenance + honest
  disclaimer). Language and theme are owned by the shell; `store.useLang` re-exports `useShellLang` so every
  page and the chrome stay in lockstep.
- **Content primitives from the shell**: every page now imports `Tabs`, `SubTabs`, `Callout`, `Equation`,
  `InlineMath`, `Cite`, `Refs` from the shell. The controlled Tabs were converted to the shell's declarative
  `TabDef[]`/`SubTabDef[]` API (Methodology's per-domain SubTabs remount on domain switch via `key`).
- **References now render in the ADR style**: the shell `<Refs ids label="Refs">` renders a compact inline
  `Refs: a · b · c` row (linked to each DOI), replacing the previous full per-section bibliography block.
- **Architecture modal (ADR-0058)**: the 5 hand-authored themed SVGs + bilingual bodies are ported into an
  `architecture.ts` `ArchitectureConfig` consumed by the shell's `ArchitectureModal`.
- **CSS**: `styles.css` reduced to app-specific residue only (workbench layout, case selector, viz); the shell
  owns the design system. App `--*` tokens are aliased to the shell `--color-*`/`--font-*` tokens so the
  hand-authored SVGs and app CSS follow the shell's light/dark theme with no per-element edits.
- **Deps**: added `@fasl-work/caos-app-shell@^0.3.0`; aligned `lucide-react` to `^0.469.0` (the shell needs the
  `Github` icon export, absent in the legacy 1.x line); dropped unused `i18next`/`react-i18next`.
- Verified: `tsc` clean, production build green, screenshot-verified every page + the architecture modal in
  light and dark; the EDGAR citation (Aras et al. 2015, doi:10.1016/j.jelectrocard.2015.08.008) confirmed correct.

## [0.17.000], 2026-07-14

### Fixed / Added (multi-agent ADR-audit remediation)
A 9-standard adversarial audit (ADR-0016/0017/0056/0057/0058, visual-standards,
product-quality-bar, product-depth-rubric, interactive-visualization-rubric) surfaced 34 confirmed gaps;
this release closes them.
- **Perceptually-uniform colormaps** (interactive-visualization-rubric law 4): replaced the non-uniform Turbo
  map with magma (sequential, for magnitude fields) and coolwarm (diverging, for the SIGNED potential/pressure
  fields); added numeric min/mid/max legend ticks and a detected-feature readout (max |error| node / argmax voxel).
- **3D-view accessibility**: canvases marked aria-hidden with a text summary caption carrying the headline
  metrics (screen-reader fallback); Architecture modal gets Esc-to-close + focus management + aria-label;
  Tabs/SubTabs get roving tabindex + arrow-key navigation.
- **docs/ wiki (ADR-0056)**: authored 19 deep markdowns across architecture/, frameworks/, guides/ and a new
  data-contract/ theme (the bring-your-own-data ingestion + artifact contracts), all transcribed from the real
  engine code; rewrote the stale landings that still described a Pyodide/ONNX/live-recompute architecture.
- **Methodology 4D-flow family**: added a physics-domain switch and five deep 4D-flow method sub-tabs
  (Navier-Stokes to Poisson / divergence-free PINN / space-time unsteady term / pressure-Poisson solve /
  analytic gates), each with equations + a themed SVG + callout + Refs; the Introduction overview SVG is now two-lane.
- **Data contracts (ADR-0057)**: rewrote frontend contract.types.ts to mirror the two REAL committed schemas
  (deleting the phantom ONNX Trace/manifest types + the dead api/artifacts.ts); added the Python ingestion
  contract data-pipeline/cardiopinnlab/io/contract.py with validators.
- **Honesty/coherence**: fixed a WRONG citation DOI (bear2018 was a Sensors-journal DOI, now the verified Bear
  2015 Circ Arrhythm Electrophysiol 10.1161/CIRCEP.114.001573); reconciled README + docs 4D-flow numbers to the
  current space-time artifact (0.791 m/s, 0.79 mmHg, Bernoulli 2.51); removed stale ONNX/manifests references
  from copy-data.mjs + deploy comment; removed the unused onnxruntime-web dependency; added the missing --bad
  palette token.

## [0.16.000], 2026-07-14

### Added
- **Frontend ADR-compliance overhaul.** Header/footer to ADR-0016 §1/§2 (lucide brand, the three external
  icon-links, provenance for both domains); the App to a full-width workbench with a left case-selection column
  (ADR-0017 §1.2); the Architecture modal to ADR-0058 (tab strip + five hand-authored themed SVGs); and all five
  doc pages to the ADR-0017 §2 content-depth floors (Introduction equations + glossary; a themed SVG per
  Methodology tab; Implementation 9 tabs + architecture SVG; Experiments 6 tabs + protocol SVG + datasets table;
  Benchmark artifact-driven comparisons + robustness curve). Result-first tabs; compact dropdown sidebar.

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
