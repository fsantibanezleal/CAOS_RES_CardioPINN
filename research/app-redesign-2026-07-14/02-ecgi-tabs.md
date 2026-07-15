# ECGi case: concrete rich/dynamic/attractive content for each of the six App tabs

**Dossier:** `research/app-redesign-2026-07-14/02-ecgi-tabs.md`
**Date:** 2026-07-14
**Case:** Real ECG imaging (`frontend/src/pages/RealEcgi.tsx`).
**Companion:** `01-sota-ux.md` (external SOTA per section-type). This file turns those
patterns into a buildable spec for the SIX ECGi tabs, wired to the REAL baked data.
**Hard constraint (Felipe):** the six tabs stay exactly as they are, in order:
`[Reconstruction] [The problem] [The target] [How the PDE arises] [Traditional approach]
[Physics-informed proposal]`. The job is to make each a composed interactive VIEW over
baked JSON + hand-built SVG/canvas, never a wall of text. No CAOS internal app referenced;
patterns cited from `01-sota-ux.md`.

---

## 0. Shared infrastructure (read once, applies to all six tabs)

### 0.1 The REAL data actually on disk (verified 2026-07-14)

`frontend/public/data/real-ecgi-catalogue/catalogue.json` (`schema: cardiopinn.ecgi-catalogue/v2`),
two independent real experiments:

| case id | name | heart nodes | triangles | torso electrodes | beats | frames | time span |
|---|---|---|---|---|---|---|---|
| `human-tank` | Human torso tank (EDGAR/Utah) | 256 | 508 | 192 | `sinus`, `paced-pvp`, `paced-avp` | 40 | 0..243 ms |
| `dog-insitu` | Dog, in situ (Maastricht) | 1321 | 2638 | 140 | `sinus` | 40 | 0..592 ms |

Per beat: `mesh {vertices[N][3], triangles[M][3], n_vertices, n_triangles}`, `times_ms[40]`,
`fields_over_time { recovered_mV, measured_mV, abs_error_mV, uncertainty_mV }` each
`[40][N]` (value per node per frame), and scalar `metrics`:

```
relative_error_tikhonov / _graph_reg / _ensemble
correlation_tikhonov     / _graph_reg / _ensemble
uq_calibration_2sigma, n_torso_electrodes, n_heart_electrodes, n_time_frames
```

Real numbers (drive every readout; no invented values):

| beat | RE tik | corr tik | RE graph | corr graph | RE ens | corr ens | UQ 2σ |
|---|---|---|---|---|---|---|---|
| human sinus | 0.654 | 0.718 | 0.667 | 0.722 | 0.667 | 0.722 | 0.895 |
| dog sinus | 0.542 | 0.779 | 0.588 | 0.731 | 0.588 | 0.731 | 0.901 |

(paced-pvp / paced-avp carry their own metric sets; the app already reads them per beat.)

**Two data-contract facts that constrain the redesign:**

1. `forward_comparison` (single_layer vs BEM) is currently **`null`** in the committed JSON,
   even though the "How the PDE arises" prose already cites `dog single-layer RE 0.54 vs BEM
   RE 0.63`. The forward-operator small-multiple in Tab 4 REQUIRES this object populated
   (see 0.5). Until then Tab 4 renders the two-panel view from the two scalars in prose and
   flags the field-level panels as pending bake.
2. There is no baked lambda-sweep, no baked L-curve samples, and no baked per-node
   calibration bins. Tabs 5 and 6 need small additions to the bake (0.5). Everything else in
   this spec is buildable from data already on disk.

### 0.2 Libraries / primitives (already in the repo)

- **three.js + @react-three/fiber + drei `OrbitControls`** for every 3D mesh view. Reuse the
  existing `CageMesh` geometry builder (centres the mesh, per-vertex color buffer).
- **KaTeX** via shell `<Equation>` / `<InlineMath>` for all math.
- **Hand-authored theme-aware SVG** (colors via `var(--fg|--accent|--good|--border|--panel)`)
  for every diagram; existing `ForwardSvg` is the pattern.
- **Colormap kit** `src/kits/colormap.ts`: `seq`/`seqCss` = magma (unsigned: error,
  uncertainty), `div`/`divCss` = coolwarm (signed potentials). Both perceptually-uniform,
  grayscale-safe. `fieldStats(vals, signed)` gives the symmetric-about-0 range for signed
  fields. Keep this exact convention.
- **Shell components** (`@fasl-work/caos-app-shell`): `Tabs`, `SubTabs` (organise a tab's
  multiple views without adding top-level tabs), `Figure` (captioned figure block),
  `Callout`, `Equation`, `InlineMath`, `Cite`, `Refs`, and the no-autoplay animation hook
  **`usePausedViz` / `createVizLoop`** (`VizLoop`, `PausedVizController`) which is the
  mandatory play/pause primitive (halts on hidden tab, runs once, never autoplays).
- **uPlot MUST be added** (`npm i uplot` into `frontend/node_modules`, local only) for the
  linked 2D charts (potential-vs-time at a node, L-curve, calibration scatter, loss/metric
  bars). It is named in the stack but is not yet a dependency. Wrap it in one local
  `src/kits/UPlotChart.tsx` (theme-aware axis/grid colors from CSS vars, keyboard focus,
  `role="img"` + `aria-label` summary) reused by every chart below.

### 0.3 Layout system that fills the width (kills the voids)

Every tab uses one of three responsive shells (CSS grid, collapse to 1 col < 780px):

- **HERO + RAIL** (`grid-template-columns: minmax(0,1.6fr) minmax(240px,0.9fr)`): big
  interactive left, a readout/legend/step rail right. Used by Reconstruction, Target,
  Traditional, PINN.
- **FIGURE-ROW** (existing `.fig-row`, two equal columns): equation/def-list beside its
  diagram. Used inside Target and How-the-PDE.
- **SMALL-MULTIPLE STRIP** (`grid-auto-flow: column; overflow-x:auto` inside an
  `overflow-x:auto` container): a row of shared-scale panels (phase snapshots, lambda
  regimes, method ladder). Used by every tab as the "overview" band.

Rule from `01-sota-ux.md`: no body paragraph wider than its figure column; prose is a
caption, the figure carries the meaning. Every tab opens with the hero visual, not a
paragraph (Shneiderman "overview first").

### 0.4 Accessibility + honesty contract (every interactive)

Static poster frame; full keyboard operation (arrows scrub frames/nodes, Tab to controls,
Enter/Space to toggle); an `.sr-summary` live-region sentence that states the current field,
frame, value range, and the headline metric (the existing Reconstruction tab already models
this); perceptually-uniform theme-aware colormap with an always-visible legend + numeric
ticks; bilingual EN/ES on every label, caption, and SR string via `pick(lang, en, es)`.
Honesty callouts stay (EDGAR attribution, "not clinically deployed", oracle-lambda,
BEM-does-not-beat-single-layer). No em-dash, no emoji, no autoplay.

### 0.5 Additions to the bake required by this redesign (small, bake-and-read safe)

Add to each beat in `catalogue.json` (data-pipeline change, committed once):

- `forward_comparison`: `{ single_layer:{re,corr, body_field[192]}, bem:{re,corr, body_field}
  , applicable:bool, note }` populate for `dog-insitu` (BEM applies); `applicable:false` for
  `human-tank` (open surface). Field-level `body_field` lets Tab 4 show WHERE the two
  operators differ, not just two scalars.
- `lambda_sweep`: `{ lambdas[~9], residual_norm[9], solution_norm[9], relative_error[9],
  oracle_index, heart_field_at_lambda[9][N (decimated to ~256)] }` for Tab 5's live L-curve +
  regime small-multiples. Decimate the per-lambda field to keep JSON small.
- `calibration`: `{ pred_2sigma_bins[~12], empirical_coverage[12], nominal:0.95 }` derived
  offline from the already-baked per-node `uncertainty_mV` vs `abs_error_mV` for Tab 1's
  reliability curve. (The scatter itself is built live from the two existing per-node fields;
  only the binned curve is precomputed for a clean overlay.)

All three are static arrays read in the browser: no solver runs client-side.

---

## 1. Reconstruction  (the hero 3D result)

**Failure killed:** poor, static reconstruction viz; single mesh, no linked chart, no method
comparison, no uncertainty view. Pattern set (01-sota-ux §6): VTK.js/itk-vtk-viewer
orbit+pick+linked-chart + cycle scrubber + phase small-multiples + calibrated colormap.

**Layout:** HERO + RAIL, with a SMALL-MULTIPLE phase strip under the hero and a SubTabs band
for the three analytical add-ons (method ladder / forward / uncertainty) so the tab is rich
without new top-level tabs.

### 1a. Hero: orbit + pick + linked time-series (primary)
- **Data:** selected `case/beat/field`, `fields_over_time[field][frame][node]`, `times_ms`.
- **Library:** three (reuse `CageMesh`) + uPlot.
- **Interactions:** orbit/zoom (`OrbitControls`); **node-pick** via a three `Raycaster` on
  click/keyboard-cycle, which pins node `j` and drives a linked uPlot of
  `recovered_mV[·][j]` vs `measured_mV[·][j]` over the 40 frames (two series, the gap between
  them IS the error made visible); a **beat scrubber** (`usePausedViz` play-once + range
  input) that moves a vertical cursor on the uPlot in lockstep with the mesh frame; a
  **field toggle** (recovered / measured / |error| / uncertainty) reusing the left rail.
- **Marking:** the picked node is marked with a small three sphere + label; the
  auto-detected max-|error| node (already computed in the current code) stays marked with a
  contrasting ring; the uPlot marks the current frame with a cursor and a value dot on each
  series.
- **Readout:** on the mesh, `t = {ms} · node j · recovered X mV · measured Y mV · |err| Z mV
  · σ S mV`; on the uPlot, hover shows both potentials + the instantaneous error at that ms.
- **Rail:** the live metric block (RE, corr, UQ-2σ, heart nodes) already present, kept, now
  reacting to the SubTabs method selection (show the tik/graph/ensemble triple, see 1c).

### 1b. Phase strip (overview, Tufte small multiples)
Row of 5 shared-scale snapshots of the current field at early-P / QRS-onset / peak-QRS /
ST / T (indices picked from `times_ms`), each a lightweight static three thumbnail (or a
pre-rendered canvas poster) with its ms label. Clicking a snapshot jumps the hero scrubber
to that frame. Gives instant temporal overview and doubles as the poster/keyboard fallback.

### 1c. Method-ladder view (SubTab "Methods")
- **Data:** `metrics.{relative_error,correlation}_{tikhonov,graph_reg,ensemble}`.
- **Library:** uPlot grouped bars + a 3-panel three small-multiple of the recovered field
  under each method at the current frame (same colormap/scale).
- **Interaction:** pick a method chip -> the hero recolors to that method's field and the
  rail metric updates; bars mark the selected method. Honest annotation: on human-tank the
  three are within 0.01 RE (0.654 / 0.667 / 0.667), so the ladder's value is UQ, not accuracy
  (states it in a caption, matching the existing honesty callout).

### 1d. Forward-operator view (SubTab "Forward")
Single-layer vs BEM, driven by `forward_comparison`. Two-panel juxtapose of the body-surface
field each operator predicts (dog only) + a two-bar RE readout (0.54 vs 0.63). Where
`applicable:false` (human open surface), show the single-layer panel and a one-line note. Ties
directly into Tab 4 without duplicating the derivation.

### 1e. Uncertainty + calibration (SubTab "Uncertainty")
- **Data:** per-node `uncertainty_mV`, `abs_error_mV`; scalar `uq_calibration_2sigma`;
  optional baked `calibration` bins.
- **Left:** the heart colored by `uncertainty_mV` (magma) with the same orbit/pick.
- **Right:** a uPlot **reliability scatter** built live: x = predicted 2σ per node, y =
  realized |error| per node, with the y = x ideal line and the shaded 2σ band; headline
  "measured coverage 0.895 / 0.901 vs nominal 0.95". Picking a node marks it in BOTH the mesh
  and the scatter (linked brushing). This is the tab's genuine payload: the calibrated
  where-can-I-trust-it map that a single Tikhonov point estimate cannot give.

**Refs:** `aras2015`, `cluitmans2018`, `lakshminarayanan2017`. **SOTA basis:** VTK.js /
itk-vtk-viewer, 4D-flow scrubber grammar, distill linked-tooltip (01-sota-ux §6).

---

## 2. The problem  (kill the 4-paragraph wall)

**Failure killed:** 4 full-width paragraphs, no figure, no hierarchy. Pattern set
(01-sota-ux §1): ONVZ hover-region anatomical hero + clinical stepper + stat tiles +
predict-the-focus self-explanation.

**Layout:** HERO + RAIL; hero = interactive SVG anatomy, rail = the clinical stepper.

### 2a. Hover-region anatomical hero (SVG, ONVZ pattern)
- **Library:** hand-authored theme-aware SVG (extend `ForwardSvg` vocabulary): a torso
  cross-section with the heart, the epicardial surface, the 192-electrode body ring, the
  256-node cage, and the 12-lead positions.
- **Interaction:** hovering / focusing each structure reveals a one-line clinical stake in a
  side callout: "epicardium: where ablation burns tissue", "body electrodes: all we can
  measure non-invasively", "12-lead: only 8 independent signals". Keyboard-tabbable regions;
  each region has an SR label. The figure IS the text: the four current paragraphs become
  hover captions, not prose.

### 2b. "12 leads cannot localize" interactive (the core idea, distill self-explanation)
- **Idea:** show, don't assert, that a low-dimensional skin projection cannot pin a 3D focus.
- **Build:** a small canvas/SVG where the reader clicks a candidate focus on a schematic
  heart; the widget then displays the resulting 12-lead-ish morphology and reveals that
  several DIFFERENT foci produce near-identical lead traces (the many-to-one map). Uses a
  tiny baked lookup (a handful of precomputed focus -> lead-morphology pairs), fully
  bake-and-read. This is the "guess the focus, then reveal" beat from 01-sota-ux §1.
- **Readout:** "8 independent signals for a 3D field" stated as the punchline.

### 2c. Stakes-as-data stat strip (NYT unit-viz, not adjectives)
Three-to-four tiles with one-line annotations, real numbers from the clinical dossier:
`~52M` people with AF worldwide; `~5x` stroke risk (Framingham); attributable stroke risk
`1.5% -> 23.5%` across age 50-89; ECGi validated localization `~10 mm` (Ramanathan 2004) but
activation-time error `~20 ms`, correlation `-0.68 to 0.82` vs invasive maps (Duchateau
2019). Numbers replace the adjective-laden paragraphs; each tile has a micro-annotation and a
source chip.

### 2d. Clinical stepper (ScrollyVis / Garrison, 3-4 steps)
A pinned narrative rail, each step swaps the hero highlight, no stacked paragraphs:
`(1) patient has an arrhythmia -> (2) ablation must find the source -> (3) 12-lead can't
resolve it, catheter mapping is invasive/slow -> (4) ECGi reconstructs it non-invasively,
but is ill-posed, so validation needs a torso-tank gold standard`. Prev/Next, keyboard,
per-step SR caption. The existing honesty callout (living patient has no gold standard, hence
the torso tank) becomes step 4's reveal.

**Refs:** `wolf1991`, `ramanathan2004`, `duchateau2019`, `aras2015`, `gharib2024digitaltwin`.
**SOTA basis:** ONVZ brain guide, ScrollyVis, Garrison 2023, distill self-explanation.

---

## 3. The target  (what we measure vs what we recover)

**Core:** this tab is a CONTRAST (body-surface signal, observable, vs heart-surface
potential, hidden). Pattern set (01-sota-ux §2): before/after juxtapose + small multiples +
linked brushing + cursor readout.

**Layout:** HERO + RAIL over a FIGURE-ROW (equation + def-list beside the operator diagram),
then the SMALL-MULTIPLE input->operator->output strip.

### 3a. Measured vs recovered juxtapose (hero, Knight-Lab juxtapose lineage)
- **Data:** `measured_mV` (body-surface, shown on a torso ring/panel) and `recovered_mV`
  (heart cage) at the current frame; both on a shared coolwarm scale.
- **Build:** two three panels sharing one camera, with a draggable vertical divider (left =
  measured/observable, right = recovered/hidden). A frame scrubber (`usePausedViz`) sweeps
  both in lockstep.
- **Marking + readout:** cursor readout on both sides shows the value + units at the hovered
  location; picking a region highlights the corresponding location on the other panel
  (linked brushing makes the many-to-one, ill-posed mapping tangible).

### 3b. input -> operator -> target small-multiple (Tufte)
Three labeled panels on a shared scale: `φ_body (192, measured)` | `A (forward operator, the
torso geometry)` | `φ_heart (256, recovered)`. Reuses the existing `ForwardSvg` as the middle
operator glyph, upgraded so hovering an edge shows "192 -> 256, ill-posed inverse". The
equation `φ_body(t) = A φ_heart(t)` and the def-grid (`φ_body`, `φ_heart`, `A`) sit in the
FIGURE-ROW beside it, each symbol hover-explained.

### 3c. Beat + rhythm contrast
Small chips for the three human beats (sinus / paced-pvp / paced-avp); selecting one updates
both juxtapose panels. Caption states the honest point: paced (focal) rhythms recover with
higher correlation than the diffuse sinus wavefront, and a patient never has the cage, which
is exactly why the reconstruction is needed.

**Refs:** `aras2015`, `barr1977`. **SOTA basis:** Juxtapose/SSIM ground-truth-vs-recon,
Tufte small multiples, distill birdsong linked tooltip.

---

## 4. How the PDE arises  (kill the static equation block)

**Failure killed:** a block of equations dumped as text. Pattern set (01-sota-ux §3):
stepped animated derivation (3b1b/Manim grammar, reader-controlled) + colorized hover math +
coupled equation<->geometry + predict-the-cancellation disclosure.

**Layout:** HERO + RAIL: left = the coupled control-volume SVG, right = the derivation
stepper; a forward-operator small-multiple below.

### 4a. Reader-controlled derivation stepper (Manim-as-stepper)
- **Build:** a Prev/Next stepper revealing ONE line at a time, the changed term highlighted,
  a plain-language caption per step. Sequence:
  1. Maxwell at heartbeat frequencies (wavelength >> body) -> quasi-static, no wave term.
  2. Charge conservation in a passive conductor -> `∇·J = 0`, `J = -σ∇φ`.
  3. Combine -> generalized Laplace `∇·(σ(x)∇φ) = 0` in the torso Ω.
  4. Boundary conditions: `φ = φ_heart` on Γ_H; `σ ∂_n φ = 0` on Γ_B (air insulates).
  5. Linear + unique -> the heart->body map is a single matrix A.
  6. Discretize (single-layer 1/r kernel; or BEM) -> `A = UΣV^T`, `σ_k -> 0` exponentially =
     the ill-posedness.
- **Library:** KaTeX `<Equation>` per step; the stepper is `usePausedViz`-driven or manual
  Prev/Next; keyboard arrows step; SR reads each step caption.

### 4b. Colorized hover-math (distill canonical)
Each symbol color-coded; hover/focus reveals meaning + units: `∇` (spatial gradient), `σ(x)`
(tissue conductivity, piecewise lung/muscle/blood), `φ` (extracellular potential, mV), `Ω,
Γ_H, Γ_B` (torso volume, heart surface, body surface), `∂_n` (outward normal derivative). The
equation becomes self-documenting; the def-grid stays as the persistent reference.

### 4c. Coupled control-volume SVG (setosa.io / Bret Victor)
A hand-authored SVG control volume in the torso with flux arrows across a boundary; when a
term is highlighted in the stepper, the corresponding surface/arrow highlights in the SVG
(multiple linked representations). Shows "no flux through the body surface" as arrows that
vanish at Γ_B.

### 4d. Forward-operator reality check (small-multiple, honesty)
Single-layer vs BEM from `forward_comparison`: two body-surface field panels (dog) + a
two-bar RE readout (single-layer 0.54 vs BEM 0.63) + the SVD singular-value decay as a small
uPlot log-plot (illustrating `σ_k -> 0`). The existing honest callout stays: on the real
coarse geometry the BEM does NOT beat the calibrated single-layer; forward fidelity is not
the bottleneck, regularization is. A "predict the cancellation" disclosure hides step 5's
conclusion behind a click (testing effect).

**Refs:** `barr1977`, `vanoosterom1983`, `rudy1988`, `bear2018`. **SOTA basis:** 3b1b/Manim
stepped transforms, distill colorized equations, setosa.io explorables.

---

## 5. Traditional approach  (interactive Tikhonov + L-curve)

**Core:** a COMPARISON tab, classical Tikhonov vs its failure mode (over-smooth <-> noise
amplification). Pattern set (01-sota-ux §4): parameter-sweep slider over BAKED frames +
small-multiple regimes + classical-vs-truth juxtapose + annotated callouts.

**Layout:** HERO + RAIL: left = the reconstructed heart at the current λ, right = the live
L-curve; SMALL-MULTIPLE regime strip below.

### 5a. Live lambda slider over the baked sweep (distill t-SNE/UMAP device)
- **Data:** baked `lambda_sweep` (0.5): `lambdas`, `relative_error`, `residual_norm`,
  `solution_norm`, `heart_field_at_lambda`, `oracle_index`. NO solver in-browser.
- **Interaction:** a λ slider scrubs the sweep; the hero heart recolors to
  `heart_field_at_lambda[i]`; a live readout shows `λ`, RE, residual norm, solution norm. At
  low λ the field is speckled (noise amplification), at high λ it is washed out
  (over-smoothed); the reader FEELS the bias-variance tradeoff.

### 5b. Interactive L-curve (the classical object, uPlot)
- **Build:** a uPlot log-log scatter of `residual_norm` (x) vs `solution_norm` (y) across the
  swept λ, the canonical L shape. A marker tracks the current slider λ along the curve; the
  **corner** (max-curvature) and the **oracle-λ** points are annotated. Clicking a point on
  the L-curve sets the slider (bidirectional link). This is the Hansen L-curve made
  manipulable.
- **Marking:** corner vs oracle divergence is called out (the L-curve corner is a heuristic,
  not always the true optimum), reinforcing the honesty callout.

### 5c. Regime small-multiples (Tufte, annotated)
A shared-scale strip of the heart at ~5 λ values (under / corner / oracle / over / extreme),
each labeled, with an arrow callout on the "plausible but wrong" over-smoothed panel (smeared
activation focus) and on the noise-amplified panel (boundary ringing). The
"from-zero-to-figure-hero" annotated-callout pattern.

### 5d. Classical-vs-truth juxtapose
Reuse the Tab-3 divider: oracle-λ Tikhonov reconstruction vs the measured cage field, so the
reader sees WHERE even the best classical λ diverges from truth (worst at sharp fronts). The
honesty callout stays: we give Tikhonov its ORACLE-best λ, so the baseline is judged at its
best, a strong baseline, not a strawman.

**Refs:** `tikhonov1977`, `hansen1992`, `ghosh2009`. **SOTA basis:** distill parameter-sweep
explorables, Tufte small multiples, scientific-figure checklist.

---

## 6. Physics-informed proposal  (interactive method pipeline)

**Core:** communicate the data-flow and WHAT the two additions buy (mesh-graph prior; a
recalibrated ensemble = per-node uncertainty). Pattern set (01-sota-ux §5): Sankey/block
pipeline with hover-inspectable nodes (Transformer/CNN Explainer) + what-if toggle over baked
runs (TF Playground analog) + term-by-term loss.

**Honest framing:** for ECGi this is NOT an iteratively-trained PINN (that is the 4D-flow
case). It is a regularized linear inverse with the REAL mesh graph-Laplacian prior plus a
deep ensemble over noise realizations, recalibrated. The pipeline animation reflects exactly
that, no fake "epoch scrubber".

**Layout:** HERO + RAIL: hero = the pipeline diagram, rail = the term-by-term objective; a
what-if result strip below.

### 6a. Block/Sankey pipeline (Transformer/CNN Explainer grammar)
- **Build:** a hand-authored theme-aware SVG data-flow:
  `φ_body (192, measured)` -> `forward operator A` -> `regularized inverse + mesh graph-
  Laplacian prior L_mesh` -> `K ensemble members over noise realizations` ->
  `mean = reconstruction` + `recalibrated spread s = per-node uncertainty`.
- **Interaction:** animated flow along edges (`usePausedViz`, play-once); hover/focus a node
  to reveal its tensor/role + shape (e.g. "L_mesh: graph Laplacian of the 256-node cage
  triangulation, piecewise-smooth prior on the tissue, not an abstract vector space"); click
  a node to expand its equation via `SubTabs`/disclosure. CNN-Explainer overview<->detail
  feel.

### 6b. What-if toggle over the baked method ladder (TF Playground analog)
- **Data:** the three baked reconstructions already in `metrics` +
  `fields_over_time` = the ablation: `tikhonov` (identity prior) / `graph_reg` (+ mesh
  graph-Laplacian) / `ensemble` (+ recalibrated UQ).
- **Interaction:** two toggles, "prior: identity | mesh-graph" and "uncertainty: off | on".
  Each combination reads a baked field + its metric; the hero heart and the rail numbers
  update live. It is the Playground "toggle inputs, watch the model respond" interaction
  without any in-browser training. Honest annotation: the accuracy delta is small (0.654 ->
  0.667 RE on human sinus); the real payload is the calibrated uncertainty that switching UQ
  on unlocks (links to Tab 1e's reliability curve).

### 6c. Term-by-term objective (progressive disclosure, details-on-demand)
`<Equation>` of `L(φ) = ||Aφ - φ_body^measured||² + λ²||L_mesh φ||²`, with the ensemble
mean/spread lines. Reveal each term on demand: data-misfit (must reproduce the REAL measured
body data through A), the mesh-graph physics prior, then the ensemble mean and the
recalibrated spread `s = τ·std_k`. Each term hover-explained (meaning + role); a mini uPlot
bar shows each term's contribution.

### 6d. Honest next-steps panel
The existing callout stays as a small annotated card: a full BEM forward and a learned
generative (diffusion) prior with native UQ are the honest next steps to push accuracy;
what ships here is the physics-plus-graph prior + recalibrated ensemble, self-contained and
honest on real data.

**Refs:** `raissi2019`, `sahli2020`, `lakshminarayanan2017`, `diffusion2026`. **SOTA basis:**
Transformer Explainer, CNN Explainer, GAN Lab, TensorFlow Playground.

---

## 7. Tab -> content -> data -> library matrix (build checklist)

| Tab | Hero interactive | Secondary | Data source | Library | New bake? |
|---|---|---|---|---|---|
| Reconstruction | orbit+pick 3D + linked node uPlot + scrubber | phase strip, method ladder, forward, UQ+reliability | `fields_over_time`, `metrics`, `forward_comparison`, `calibration` | three + uPlot | calibration bins (opt), forward_comparison |
| The problem | hover-region anatomy SVG | 12-lead-cannot-localize widget, stat tiles, 4-step clinical stepper | clinical numbers (dossier) + tiny focus->lead lookup | SVG + canvas | tiny lead lookup |
| The target | measured-vs-recovered juxtapose 3D | input->operator->output small-multiple, beat chips | `measured_mV`, `recovered_mV` | three + SVG | none |
| How the PDE arises | reader-controlled derivation stepper | colorized hover-math, coupled control-volume SVG, forward small-multiple | KaTeX + `forward_comparison` | SVG + KaTeX + uPlot (SVD decay) | forward_comparison |
| Traditional approach | λ slider over baked sweep | interactive L-curve, regime small-multiples, classical-vs-truth juxtapose | `lambda_sweep` | three + uPlot | lambda_sweep |
| Physics-informed proposal | block/Sankey pipeline SVG | what-if prior/UQ toggles, term-by-term loss | `metrics` + `fields_over_time` triple | SVG + three + uPlot | none |

**Two rules recurring across all six (01-sota-ux §7):** (1) the figure carries the meaning,
prose is a caption, kill full-width paragraphs; (2) every interactive needs a static poster,
keyboard control, SR text, and a perceptually-uniform theme-aware colormap.

---

## 8. Sources

External SOTA patterns and exemplars are enumerated with URLs/DOIs in `01-sota-ux.md §Sources`
(distill.pub interactive-articles Hohman 2020; Ciechanowski; ScrollyVis arXiv 2207.03616;
Garrison Computers & Graphics 2023; ONVZ brain guide; 3b1b/Manim + arXiv 2510.01187; distill
colorized equations; setosa.io; Tufte small multiples; scientific-figure checklist arXiv
2408.16007; Transformer Explainer 10.1145/3772318.3791725; CNN Explainer IEEE VIS 2020; GAN
Lab; TF Playground; VTK.js / itk-vtk-viewer; 4D-flow RadioGraphics 10.1148/rg.2019180091).

ECGi domain citations (already in `frontend/src/data/citations.ts`, real DOIs): Barr 1977
(10.1109/TBME.1977.326201); Rudy 1988; Ramanathan 2004 (10.1038/nm1011); Van Oosterom 1983
(10.1109/TBME.1983.325207); Tikhonov 1977; Hansen 1992 (10.1137/1034115); Ghosh 2009
(10.1007/s10439-009-9665-6); Aras 2015 EDGAR (10.1016/j.jelectrocard.2015.08.008); Cluitmans
2018 (10.3389/fphys.2018.01305); Bear 2015 (10.1161/CIRCEP.114.001573); Duchateau 2019; Wolf
1991 Framingham; Raissi 2019 (10.1016/j.jcp.2018.10.045); Sahli Costabal 2020
(10.3389/fphy.2020.00042); Lakshminarayanan 2017 (arXiv 1612.01474); diffusion inverse-ECG
2026 (arXiv 2601.18615).
