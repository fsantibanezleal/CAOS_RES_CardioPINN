# 4D-flow case: concrete rich/dynamic/attractive content for each of the six App tabs

**Dossier:** `research/app-redesign-2026-07-14/03-flow-tabs.md`
**Date:** 2026-07-14
**Case:** Real thoracic-aorta 4D-flow pressure recovery (`frontend/src/pages/Flow4d.tsx`).
**Companion:** `01-sota-ux.md` (external SOTA per section-type) and `02-ecgi-tabs.md` (the
sibling ECGi spec; identical layout/a11y grammar, do not diverge). This file turns those
patterns into a buildable spec for the SIX 4D-flow tabs, wired to the REAL baked trace.
**Hard constraint (Felipe):** the six tabs stay exactly as they are, in order:
`[Pressure recovery] [The problem] [The target] [How the PDE arises] [Traditional approach]
[Physics-informed proposal]`. The job is to make each a composed interactive VIEW over baked
JSON + hand-built SVG/canvas, never a wall of text. No CAOS internal app referenced; patterns
cited from `01-sota-ux.md`.

---

## 0. Shared infrastructure (read once, applies to all six tabs)

### 0.1 The REAL data actually on disk (verified 2026-07-14)

`frontend/public/data/real-flow4d-pressure/trace.json`
(`schema: cardiopinn.flow4d-pressure/v3`), one real thoracic-aorta 4D-flow MRI scan
(Philips, venc 120 cm/s), used under its data agreement (raw DICOMs not redistributed):

| key | shape | meaning |
|---|---|---|
| `points_mm` | `[9000][3]` | aortic-lumen point cloud (mm), render-decimated from the full lumen |
| `pressure_mmHg` | `[9000]` | recovered RELATIVE pressure at peak systole, per point (signed) |
| `speed_ms_peak` | `[9000]` | measured speed magnitude at peak systole, per point |
| `speed_ms_over_time` | `[16][9000]` | measured speed magnitude, per frame per point |
| `times_ms` | `[16]` | `0,62,125,…,937 ms` (one cardiac cycle, 16 phases) |
| `peak_frame` | `5` | index of peak systole -> `t = 312 ms` |
| `unsteady_term` | string | `"space-time PINN (analytic dv/dt over the whole cycle)"` |

`metrics` (drive every readout; no invented values):

```
n_lumen_voxels          47902     (full lumen; points_mm is the 9000-pt render decimation)
peak_velocity_ms         0.791
bernoulli_mmHg           2.51      (simplified Bernoulli 4·Vmax^2 on this scan)
ppe_pressure_drop_mmHg   0.79      (recovered relative-pressure span)
noise_sensitivity_mmHg   0.0       (ensemble move under 0.01 mmHg -> displays as < 0.01)
ensemble_members         4
aliasing_corrected_samples  27863
div_raw_per_s            25.37
div_denoised_per_s       11.19
div_reduction_x          2.3
venc_cm_s              120.0
n_frames                16
```

Derived facts already computable from the arrays (used in readouts, not invented):
peak-systole recovered pressure spans **-0.70 to +0.15 mmHg** (span 0.85, rounded to the
baked `0.79`); speed at peak reaches **1.44 m/s** at the fastest voxel (the reported
`peak_velocity_ms 0.791` is the robust 98th-pct value the metrics use). Analytic gate
(from the validated pipeline, cited in prose, not yet a baked field): converging-duct flow,
**correlation 1.00, 4.74 vs 4.73 mmHg, under 1% error**.

**Three data-contract facts that constrain the redesign (the 4D-flow analogue of the ECGi
`forward_comparison: null` gap):**

1. `speed_ms_over_time` is **scalar speed magnitude only**; the committed trace carries NO
   3D velocity vectors. So streamlines, pathlines, and vector-glyph layers (the 4D-flow
   visual grammar, 01-sota-ux §6) REQUIRE a bake addition (0.5 `flow_lines` / `vectors_peak`).
   Until baked, the hero renders the point cloud + scalar colormap (as today) and flags the
   streamline layer as pending bake.
2. There is no baked centerline, so the single most clinically legible object, **pressure vs
   distance along the vessel**, cannot be plotted yet. Add `centerline` (0.5); it is ~50
   points and unlocks the linked uPlot that carries Tab 1 and Tab 5.
3. There is no baked analytic-gate field, no per-voxel divergence field, and no per-voxel
   ensemble spread; the numbers exist as scalars in `metrics` and prose. Tabs 4/5/6 render
   the scalar-level view from those, and the field-level panels come online with the 0.5
   bake additions. Everything else in this spec is buildable from data already on disk.

### 0.2 Libraries / primitives (already in the repo, identical to the ECGi case)

- **three.js + @react-three/fiber + drei `OrbitControls`** for every 3D view. Reuse the
  existing `LumenCloud` point-cloud builder (per-point color buffer, robust 2nd-98th-pct
  range). Extend it with a `Line`/`tube` layer for baked flow lines (0.5) and an
  `instancedMesh` cone layer for baked vector glyphs.
- **KaTeX** via shell `<Equation>` / `<InlineMath>` for all math.
- **Hand-authored theme-aware SVG** (colors via `var(--fg|--accent|--accent-2|--good|
  --border|--panel|--panel-2)`) for every diagram; the existing `PpeSvg` is the pattern to
  extend, not replace.
- **Colormap kit** `src/kits/colormap.ts`: `seq`/`seqCss` (sequential, unsigned: speed,
  divergence, |ensemble spread|), `div`/`divCss` (diverging, signed: RELATIVE pressure).
  Perceptually-uniform, grayscale-safe. Keep this exact convention: **pressure is signed ->
  diverging; speed/magnitude -> sequential** (already enforced in `Flow4d.tsx`).
- **Shell components** (`@fasl-work/caos-app-shell`): `Tabs`, `SubTabs` (organise a tab's
  multiple views without adding top-level tabs), `Figure`, `Callout`, `Equation`,
  `InlineMath`, `Cite`, `Refs`, and the no-autoplay animation hook **`usePausedViz` /
  `createVizLoop`** (halts on hidden tab, runs once, never autoplays). The existing
  `playOnce` rAF in `Flow4d.tsx` MUST be migrated onto `usePausedViz` for consistency with
  the shell and the no-compute-bomb rule.
- **uPlot MUST be added** (`npm i uplot` into `frontend/node_modules`, local only) for the
  linked 2D charts (speed-over-cycle at a point, pressure-along-centerline, Bernoulli curve,
  divergence-reduction bars, ensemble-spread band). It is named in the stack but is not yet a
  dependency. Wrap it in the SAME local `src/kits/UPlotChart.tsx` the ECGi spec introduces
  (theme-aware axis/grid from CSS vars, keyboard focus, `role="img"` + `aria-label` summary);
  reuse it verbatim, do not fork.

### 0.3 Layout system that fills the width (kills the voids)

Identical three responsive shells to the ECGi spec (CSS grid, collapse to 1 col < 780px):

- **HERO + RAIL** (`grid-template-columns: minmax(0,1.6fr) minmax(240px,0.9fr)`): big
  interactive left, a readout/legend/step rail right. Used by Pressure recovery, The target,
  Traditional, PINN. The current page already has a left `aside.cp-side`; keep it as the
  GLOBAL selector/readout rail and add a PER-TAB right rail inside the hero grid for the
  tab-local legend and stepper.
- **FIGURE-ROW** (existing `.fig-row`, two equal columns): equation/def-list beside its
  diagram. Used inside The target and How-the-PDE.
- **SMALL-MULTIPLE STRIP** (`grid-auto-flow: column; overflow-x:auto` inside an
  `overflow-x:auto` container): a row of shared-scale panels (cardiac-phase snapshots,
  stenosis-grade cards, derivation steps, method ladder). Used by every tab as the overview
  band.

Rule from `01-sota-ux.md`: no body paragraph wider than its figure column; prose is a
caption, the figure carries the meaning. Every tab opens with the hero visual, not a
paragraph (Shneiderman "overview first"). The current tabs (3-4 full-width paragraphs each)
are REJECTED; every paragraph below becomes a caption or a hover-string.

### 0.4 Accessibility + honesty contract (every interactive)

Static poster frame; full keyboard operation (arrows scrub the cardiac phase / walk the
centerline / step the derivation, Tab to controls, Enter/Space to toggle field); an
`.sr-summary` live-region sentence stating the current field, phase (`t = … ms`), value
range, and the headline metric (the existing Pressure-recovery tab already models this,
KEEP and extend it to every tab); perceptually-uniform theme-aware colormap with an
always-visible legend + numeric ticks; bilingual EN/ES on every label, caption, and SR string
via `pick(lang, en, es)`. The existing honesty callouts STAY, verbatim in substance: no
invasive gold standard (that absence is why the method exists); the aorta in THIS scan is
unobstructed so the recovered gradient is correctly small; noise-robustness is a strength
that also means the ensemble does NOT bound the dominant (method/segmentation) uncertainty;
analytic gate passed before any real data is trusted; not clinically deployed; data used
under agreement, DICOMs not redistributed. No em-dash, no emoji, no autoplay.

### 0.5 Additions to the bake required by this redesign (small, bake-and-read safe)

Add to `trace.json` (data-pipeline change in `data-pipeline/cardiopinnlab/real/flow4d_*.py`,
committed once). All are static arrays read in the browser: NO solver runs client-side.

- `centerline`: `{ s_mm[~50], xyz[~50][3], pressure_mmHg[~50], speed_ms_peak[~50] }` — the
  aortic centerline arc-length + the recovered pressure and measured speed sampled along it.
  Unlocks the linked "pressure and speed vs distance along the aorta" uPlot (Tabs 1, 5), the
  single most clinically legible object. Cheap (~50 points).
- `flow_lines`: `{ lines[K][P][3], speed[K][P] }` — K seeded streamlines (peak systole) and/or
  pathlines integrated through the denoised velocity, as polylines colored by speed. Needs the
  denoised 3D velocity that `flow4d_denoise.py` already produces internally; bake the integral
  curves, not the full vector field, to keep JSON small (K~40, P~60).
- `vectors_peak`: `{ xyz[M][3], vec[M][3] }` — decimated 3D velocity glyphs at peak systole
  (M~800) for the optional vector-arrow layer (the classic 4D-flow glyph view).
- `analytic_gate`: `{ x[~40], p_exact[~40], p_recovered[~40], correlation, drop_exact_mmHg,
  drop_recovered_mmHg }` — the converging-duct validation curve (exact vs recovered pressure),
  so Tab 6's gate is a FIGURE (two overlaid curves, corr 1.00, 4.74 vs 4.73) not a sentence.
- `divergence`: `{ raw[N'], denoised[N'] }` decimated per-point divergence before/after the
  div-free denoiser (N'~2000), so Tab 6 shows WHERE incompressibility was violated and the
  `div_reduction_x 2.3` becomes a before/after field + a uPlot histogram, not one number.
- `ensemble_spread`: `{ std_mmHg[N'] }` decimated per-point pressure std across the 4 ensemble
  members, so Tab 1/6's robustness claim ("< 0.01 mmHg") is a visible near-flat band, not a
  scalar.
- `aliasing`: `{ wrapped_mask[9000] (bool), speed_prewrap[9000] }` — which voxels were phase-
  unwrapped (27863 samples) and the pre-correction speed, for Tab 4/6's aliasing before/after
  toggle.

Bernoulli/pressure-recovery curves (Tab 5) are CLOSED-FORM arithmetic (`4V^2`,
`4(V2^2-V1^2)`, Gorlin-style recovery), computed live in the browser from slider inputs; that
is didactic algebra, not a solver, so no bake is needed there beyond one literature reference
point (Baumgartner 1999: 66 mmHg Doppler vs the catheter truth at moderate stenosis).

---

## 1. Pressure recovery  (the hero 3D result)

**Failure killed:** a single static point cloud, one scalar toggle, no linked chart, no
along-vessel readout, no streamlines, huge void under the canvas. Pattern set (01-sota-ux
§6): VTK.js/itk-vtk-viewer orbit+pick+linked-chart + cardiac-cycle scrubber + 4D-flow
streamline/pathline/vector layers + phase small-multiples + perceptually-uniform colormap.

**Layout:** HERO + RAIL, with a SMALL-MULTIPLE phase strip under the hero and a SubTabs band
for the analytical add-ons (along-vessel / streamlines / robustness) so the tab is rich
without new top-level tabs. The existing global `cp-side` readout (peak velocity, pressure
range, Bernoulli, lumen voxels) STAYS as the rail spine.

### 1a. Hero: orbit + pick + linked time-series (primary)
- **Data:** `points_mm`, `pressure_mmHg` (signed, `div`), `speed_ms_over_time[frame]`
  (unsigned, `seq`), `times_ms`, `peak_frame`.
- **Library:** three (extend `LumenCloud`) + uPlot.
- **Interactions:** orbit/zoom (`OrbitControls`, already present); **point-pick** via a three
  `Raycaster` on click/keyboard-cycle that pins point `j` and drives a linked uPlot of
  `speed_ms_over_time[·][j]` across the 16 phases (the speed pulse at that location, systolic
  peak visible); a **cardiac-phase scrubber** (`usePausedViz` play-once + range input, replacing
  the ad-hoc `playOnce`) moving a vertical cursor on the uPlot in lockstep with the cloud
  frame; the **field toggle** (recovered relative pressure at peak systole / measured speed
  over the cycle) reusing the left rail select that already exists.
- **Marking:** the picked point is marked with a small three sphere + label; the auto-detected
  argmax voxel of the current field (already computed in code) stays marked with a contrasting
  ring; the uPlot marks the current phase with a cursor + a value dot.
- **Readout:** on the cloud, `t = {ms} · point j · p = X mmHg · speed = Y m/s`; on the uPlot,
  hover shows the speed at that ms. The rail keeps the four live metrics
  (0.791 / 0.79 / 2.51 / 47902).

### 1b. Along-vessel pressure (SubTab "Along the vessel", the clinical payload)
- **Data:** baked `centerline` (0.5): `s_mm`, `pressure_mmHg`, `speed_ms_peak`.
- **Library:** uPlot (dual-axis) + a moving marker on the 3D centerline.
- **Interaction:** a uPlot of recovered pressure (left axis, `div` band) AND measured speed
  (right axis) vs arc-length `s`; scrubbing `s` moves a bead along the centerline in the 3D
  hero and reads out `p(s)` and `v(s)`. This is the object a clinician actually wants: WHERE
  along the aorta the pressure changes, and by how much, which the single Bernoulli scalar
  cannot give. On this unobstructed aorta the curve is nearly flat (span ~0.8 mmHg); the
  caption states that a stenosis would show as a step down at the throat plus partial recovery
  downstream (ties to Tab 5's pressure-recovery demo).

### 1c. Streamlines / pathlines (SubTab "Flow lines", 4D-flow grammar)
- **Data:** baked `flow_lines` (0.5): polylines colored by speed; `vectors_peak` for the
  optional glyph layer.
- **Library:** three `Line`/tube instances + `instancedMesh` cones.
- **Interaction:** toggle streamlines (instantaneous, peak systole) vs pathlines (trajectory
  over the cycle) vs vector glyphs; the cardiac scrubber advances pathline seeding; hover a
  line to read its peak speed. This is the RadioGraphics 4D-flow visual standard
  (streamline/pathline/vector layers over a scalar map). Until `flow_lines` is baked, this
  SubTab shows the point cloud + a "pending bake" note (honest, matching the ECGi pattern).

### 1d. Phase strip (overview, Tufte small multiples)
Row of 5 shared-scale speed snapshots at early-systole / peak-systole (312 ms) / early-
diastole / mid / late (indices from `times_ms`), each a lightweight static three thumbnail
(or pre-rendered canvas poster) with its ms label. Clicking a snapshot jumps the hero scrubber
to that frame. Instant temporal overview + doubles as the keyboard/poster fallback.

### 1e. Robustness band (SubTab "Robustness")
- **Data:** baked `ensemble_spread.std_mmHg` (0.5) + scalar `noise_sensitivity_mmHg`,
  `ensemble_members 4`.
- **Build:** the cloud colored by per-point ensemble std (`seq`), beside a uPlot of the
  recovered pressure with a shaded +/- spread band along the centerline; headline "ensemble
  spread < 0.01 mmHg under 5%-venc phase-contrast noise". The honesty callout is the payload:
  this near-flat band is a STRENGTH (denoiser makes pressure insensitive to velocity noise)
  that also proves the dominant uncertainty is NOT measurement noise and is therefore NOT
  bounded by this ensemble (it is the absent invasive truth, the lumen segmentation, and the
  unsteady-term approximation). Keep the existing Callout text.

**Refs:** `raissi2020`, `krittian2012`, `bissell2023`, `rengier2014`. **SOTA basis:** VTK.js /
itk-vtk-viewer, 4D-flow RadioGraphics streamline/pathline grammar, distill linked-tooltip
(01-sota-ux §6).

---

## 2. The problem  (kill the 3-paragraph wall)

**Failure killed:** 3 full-width paragraphs + a callout, no figure, no hierarchy, guideline
numbers buried in prose. Pattern set (01-sota-ux §1): hover-region anatomical hero + clinical
stepper + stakes-as-data stat tiles + a predict-the-gradient self-explanation beat.

**Layout:** HERO + RAIL; hero = interactive stenosis/coarctation SVG, rail = the clinical
stepper. No paragraph wider than its figure column.

### 2a. Interactive stenosis / coarctation grading hero (SVG, ONVZ pattern)
- **Library:** hand-authored theme-aware SVG (extend `PpeSvg` vocabulary): an aorta with the
  valve and the arch, a draggable **narrowing slider** at either the valve (aortic stenosis)
  or the isthmus (coarctation), and a catheter/pressure-wire glyph.
- **Interaction:** dragging the narrowing tightens the throat; the SVG live-updates a jet with
  a vena contracta and, downstream, a partial pressure-recovery zone; hovering each structure
  reveals a one-line clinical stake in a side callout ("valve: aortic stenosis, gradient
  decides valve replacement"; "isthmus: coarctation, Class I repair at >= 20 mmHg peak-to-
  peak"; "pressure wire: the invasive reference, threaded across the narrowing"). The figure
  IS the text: the current paragraph 1 becomes these hover strings. Keyboard-tabbable regions;
  each has an SR label.

### 2b. "One number can cross a threshold the wrong way" (self-explanation, the core idea)
- **Idea:** show, don't assert, that simplified Bernoulli `4·Vmax^2` can OVER-estimate the net
  catheter gradient because of pressure recovery, worst in a small aorta (Baumgartner 1999).
- **Build:** a small linked SVG+uPlot where the reader drags Vmax and the ascending-aorta
  diameter; the widget plots the Doppler `4Vmax^2` estimate AND the net catheter gradient
  after recovery, and marks the severe-AS threshold band (>= 40 mmHg mean). It reveals the
  documented case: at moderate stenosis + small aorta the Doppler estimate reaches ~66 mmHg
  while the true net gradient is far lower (an ~80% overestimate). Closed-form arithmetic +
  one baked literature point; fully bake-and-read. Punchline readout: "a single peak-velocity
  number moved this case across the treatment threshold."

### 2c. Stakes-as-data stat strip (NYT unit-viz, not adjectives)
Four tiles with one-line annotations and source chips, real numbers from the clinical dossier:
severe-AS definition `>= 4.0 m/s / >= 40 mmHg / <= 1.0 cm^2` (three concordant criteria,
otto2020vhd / vahanian2021esc); coarctation repair Class I at `>= 20 mmHg` peak-to-peak
(stout2018achd); AS prevalence past 75 `12.4% any / 3.4% severe` (osnabrugge2013); physics-
based pressure agrees with an FSI ground truth to `~0.4 mmHg` at peak systole (saitta2019).
Numbers replace the adjective-laden paragraphs; each tile carries a micro-annotation.

### 2d. Clinical stepper (ScrollyVis / Garrison, 4 steps)
A pinned narrative rail, each step swaps the hero highlight, no stacked paragraphs:
`(1) the aorta narrows (valve or arch) -> (2) the pressure drop decides the treatment ->
(3) the reference is invasive (a pressure wire at catheterization); the routine substitute is
one Doppler number through 4Vmax^2, blind to inflow velocity, viscosity, unsteady
acceleration and pressure recovery -> (4) 4D-flow measures the full 3D velocity non-invasively,
and Navier-Stokes ties velocity to a spatially resolved pressure field this scan recovers`.
Prev/Next, keyboard, per-step SR caption. The existing "genuinely different physics from ECGi
(Laplace vs Navier-Stokes), both inverse problems on real data; this aorta is unobstructed so
the engine is what matters" callout becomes step 4's reveal.

**Refs:** `otto2020vhd`, `vahanian2021esc`, `stout2018achd`, `baumgartner1999`,
`osnabrugge2013`, `saitta2019`. **SOTA basis:** ONVZ hover-region guide, ScrollyVis, Garrison
2023, distill self-explanation.

---

## 3. The target  (what we measure vs what we recover)

**Core:** this tab is a CONTRAST (measured velocity/speed, observable, vs relative pressure,
hidden). Pattern set (01-sota-ux §2): before/after juxtapose + small multiples + linked
brushing + cursor readout.

**Layout:** HERO + RAIL over a FIGURE-ROW (the map equation + def-list beside the operator
diagram), then the SMALL-MULTIPLE input->operator->output strip. Keep the existing
`v(x,t) => p(x,t)` equation and the `v / p / venc` def-grid; they move INTO the FIGURE-ROW,
each symbol hover-explained.

### 3a. Speed-vs-pressure juxtapose (hero, Knight-Lab juxtapose lineage)
- **Data:** `speed_ms_peak` (measured, observable, `seq`) and `pressure_mmHg` (recovered,
  hidden, `div`) on the SAME `points_mm` cloud at peak systole.
- **Build:** two three panels sharing one camera with a draggable vertical divider
  (left = measured speed / what the scanner records, right = recovered relative pressure /
  what never appears in the scan). The cardiac scrubber sweeps the speed side; pressure is the
  peak-systole recovery.
- **Marking + readout:** cursor readout on both sides shows the value + units at the hovered
  point; picking a point highlights the same point on the other panel (linked brushing makes
  the velocity->pressure map tangible: fast jet core on the left, its pressure signature on
  the right).

### 3b. input -> operator -> target small-multiple (Tufte)
Three labeled panels on a shared frame: `v (3-component velocity, measured, 47902 voxels)` |
`Navier-Stokes / pressure-Poisson operator (the fluid physics)` | `p (relative pressure,
recovered)`. Reuse an upgraded `PpeSvg` as the middle operator glyph; hovering it shows
`div^2[(v·grad)v] -> lap p`. The map equation
`v(x,t) in R^3 (measured) => p(x,t) (recovered, relative)` and the def-grid (`v`, `p`, `venc`)
sit in the FIGURE-ROW beside it, each symbol hover-explained (v = 3 components/voxel/frame;
p = relative, only differences physical; venc = 120 cm/s encoding limit, speeds above alias).

### 3c. venc / aliasing mini-explorable (the measurement caveat, honest)
- **Data:** baked `aliasing` (0.5): `wrapped_mask`, `speed_prewrap`; scalar
  `aliasing_corrected_samples 27863`, `venc_cm_s 120`.
- **Build:** a small before/after toggle on the cloud, or a 1D phase-wrap diagram, showing the
  27863 voxels whose phase exceeded +/- venc and were unwrapped before reconstruction. Caption:
  "velocity is encoded as a phase shift up to the venc; above it, phase wraps and must be
  corrected first." Ties the def-grid `venc` entry to a visible correction, not just a word.

The existing "no non-invasive pressure gold standard; honest validation is threefold (exact
analytic gate, physiological real-scan range, brackets the clinical Bernoulli)" Callout STAYS
as the tab's closing card.

**Refs:** `krittian2012`, `bissell2023`, `rengier2014`. **SOTA basis:** Juxtapose/SSIM
ground-truth-vs-recon, Tufte small multiples, distill linked tooltip.

---

## 4. How the PDE arises  (kill the static equation block)

**Failure killed:** two equations + `PpeSvg` + three paragraphs dumped as text. Pattern set
(01-sota-ux §3): stepped animated derivation (3b1b/Manim grammar, reader-controlled) +
colorized hover math + coupled equation<->geometry + predict-the-cancellation disclosure.

**Layout:** HERO + RAIL: left = the coupled control-volume SVG (a fluid parcel in the aorta
with pressure-gradient, viscous and acceleration arrows), right = the derivation stepper; the
upgraded `PpeSvg` pipeline strip below. Keep the existing two `<Equation>` blocks and the
`rho,mu / S(v) / dp/dn` def-grid; they become the stepper's revealed lines and the persistent
reference.

### 4a. Reader-controlled derivation stepper (Manim-as-stepper)
- **Build:** a Prev/Next stepper revealing ONE line at a time, the changed term highlighted, a
  plain-language caption per step. Sequence:
  1. Blood in a large artery = incompressible Newtonian fluid -> incompressible Navier-Stokes.
  2. Momentum balance: `rho(d_t v + (v·grad)v) = -grad p + mu lap v`, with `div v = 0`.
  3. Take the divergence of the momentum equation; incompressibility kills `div(d_t v)` and
     the viscous term's divergence -> the unsteady and viscous parts drop out. (Predict-the-
     cancellation disclosure here: "what survives when you take the divergence?")
  4. Result: the pressure-Poisson equation `lap p = -rho·div[(v·grad)v] = S(v)`, a well-posed
     elliptic problem whose source is built ENTIRELY from the measured velocity's spatial
     derivatives.
  5. The source `S(v)` is a QUADRATIC form of velocity gradients -> noise in v is amplified ->
     motivates the divergence-free denoising (forward pointer to Tab 6).
  6. Boundary flux `d_n p = b(v)·n` set by the momentum equation at the vessel wall (Neumann).
- **Library:** KaTeX `<Equation>` per step; stepper `usePausedViz`-driven or manual Prev/Next;
  keyboard arrows step; SR reads each caption. The two equations already in the code are
  steps 2 and 4 verbatim.

### 4b. Colorized hover-math (distill canonical)
Each symbol color-coded; hover/focus reveals meaning + units: `rho` (blood density
1060 kg/m^3), `mu` (dynamic viscosity 0.0035 Pa·s), `v` (measured velocity, m/s), `p`
(relative pressure, mmHg), `grad / lap / div` (spatial operators), `S(v)` (Poisson source, a
product of velocity derivatives), `d_n p` (Neumann wall flux). The equation becomes self-
documenting; the existing def-grid stays as the persistent reference.

### 4c. Coupled control-volume SVG (setosa.io / Bret Victor)
A hand-authored SVG fluid parcel inside the aortic lumen with three labeled force arrows
(pressure gradient, viscous friction, unsteady + convective acceleration); when a term is
highlighted in the stepper, the matching arrow highlights in the SVG (multiple linked
representations). At step 3 the acceleration and viscous arrows visibly grey out as the
divergence removes them, leaving the pressure-source arrow.

### 4d. The unsteady-term reality check (small-multiple, honesty)
The `unsteady_term = "space-time PINN (analytic dv/dt over the whole cycle)"` is the honest
differentiator: a two-panel small-multiple contrasts a coarse 3-frame finite-difference
`dv/dt` (noisy, biased low at the transient peak) vs the space-time network's analytic time
derivative over all 16 phases. Caption cites Hardy 2025 (all estimators underestimate the
transient peak when temporal resolution is too coarse to resolve `dv/dt`), the exact term this
build makes analytic. A "predict which one resolves the peak" disclosure hides the conclusion
behind a click (testing effect).

**Refs:** `krittian2012`, `raissi2020`, `hardy2025`, `ebbers2001`. **SOTA basis:** 3b1b/Manim
stepped transforms, distill colorized equations, setosa.io explorables.

---

## 5. Traditional approach  (interactive simplified-Bernoulli + pressure-recovery demo)

**Core:** a COMPARISON tab, the clinical `4·Vmax^2` scalar vs everything it discards (inflow
velocity, viscosity, unsteady term, pressure recovery). Pattern set (01-sota-ux §4): a
parameter slider over the very knob that breaks the method + small-multiple regimes + a
classical-vs-truth juxtapose + annotated callouts. Keep the existing `dp ~ 4Vmax^2` equation
and the "on this scan 0.79 m/s -> 2.5 mmHg, a small gradient is correct here" Callout.

**Layout:** HERO + RAIL: left = the live Bernoulli explorable, right = the discarded-terms
readout; SMALL-MULTIPLE regime strip below.

### 5a. Live simplified-Bernoulli explorable (distill parameter-demo device)
- **Build:** sliders for peak jet velocity `Vmax` and inflow velocity `V1` (closed-form
  arithmetic, no solver): the widget shows `4·Vmax^2` (simplified) vs `4(Vmax^2 - V1^2)`
  (expanded) vs the net gradient after pressure recovery, all in mmHg, with the severe-AS
  threshold band marked. As `V1` rises past ~1.5 m/s the simplified form visibly overstates
  the gradient; the reader FEELS why the expanded form is required. A uPlot plots the three
  curves vs `Vmax`; a marker tracks the sliders.
- **Anchor:** the sliders default to THIS scan's `Vmax = 0.791 m/s` -> `4Vmax^2 = 2.51 mmHg`
  (the baked `bernoulli_mmHg`), so the demo is grounded in the real datum before the reader
  explores the stenosed regime.

### 5b. Pressure-recovery demo (the counter-intuitive failure, annotated)
- **Build:** an SVG throat + downstream expansion where the reader drags the aorta diameter;
  the widget animates jet kinetic energy partially reconverting to pressure downstream and
  reads out how much MORE the Doppler `4Vmax^2` overestimates the NET catheter gradient as the
  ascending aorta shrinks. Reproduces the Baumgartner 1999 case (up to 66 mmHg Doppler, ~80%
  overestimate, at moderate stenosis + small aorta) as one annotated marked point. Arrow
  callouts label "reversible convective acceleration recovered as pressure" vs "irreversible
  viscous/turbulent loss".

### 5c. Discarded-terms ledger (rail, stakes-as-data)
A four-row rail listing what `4·Vmax^2` drops and each one's documented failure mode: inflow
velocity (overstates gradient once outflow > ~1.5 m/s), viscous friction, unsteady
acceleration (`d_t v`, the term Hardy 2025 shows is lost at coarse temporal resolution),
pressure recovery (Doppler overestimates the net gradient, worst in a small aorta). Plus the
structural limit: the result is ONE scalar, not a map, so it cannot localize the vena
contracta or separate reversible from irreversible energy loss.

### 5d. Bernoulli-vs-physics bracket (closing juxtapose)
On THIS unobstructed scan, a two-bar readout: simplified Bernoulli `2.51 mmHg` vs the
recovered relative-pressure span `0.79 mmHg`, same order of magnitude, bracketing each other.
The existing Callout STAYS: this is the reference the physics map is bracketed against, not a
straw man; a small gradient is exactly right for a clean aorta, and Bernoulli's comparison
value grows in the stenosed regime where the discarded terms dominate.

**Refs:** `baumgartner1999`, `otto2020vhd`, `krittian2012`, `hardy2025`. **SOTA basis:**
distill parameter-sweep explorables, Tufte small multiples, scientific-figure checklist.

---

## 6. Physics-informed proposal  (interactive denoise -> analytic-source -> solve pipeline)

**Core:** communicate the data-flow and WHAT each stage buys: a divergence-free denoiser makes
the noise-amplifying Poisson source clean, analytic derivatives (not finite differences at the
lumen edge) build the source and wall flux, then a sparse direct solve returns pressure; gated
on an analytic case before real data is trusted. Pattern set (01-sota-ux §5): Sankey/block
pipeline with hover-inspectable nodes (Transformer/CNN Explainer) + what-if toggle over baked
runs (TF Playground analog) + term-by-term objective.

**Honest framing:** this IS an iteratively-trained PINN (unlike the ECGi case, which is a
regularized linear inverse). But bake-and-read means NO in-browser training: the pipeline
animates the DATA FLOW and the what-if toggles read BAKED fields, never a live epoch scrubber
that retrains. Keep the existing objective `<Equation>`, the "hidden fluid mechanics made
robust by separating well-posed velocity denoising from the elliptic pressure solve" prose (as
captions), the method-family paragraph (PPE / WERP / vWERP / PINN / solenoidal projection), and
the analytic-gate Callout.

**Layout:** HERO + RAIL: hero = the pipeline diagram, rail = the term-by-term objective; a
what-if result strip below.

### 6a. Block/Sankey pipeline (Transformer/CNN Explainer grammar)
- **Build:** a hand-authored theme-aware SVG data-flow (extend `PpeSvg`):
  `measured velocity v (noisy, div v != 0)` -> `divergence-free PINN denoise (min data misfit
  + lambda·||div v||^2)` -> `analytic derivatives -> Poisson source S(v) + Neumann flux
  b(v)·n` -> `sparse direct pressure-Poisson solve` -> `relative pressure p(x)`.
- **Interaction:** animated flow along edges (`usePausedViz`, play-once, halts on hidden tab);
  hover/focus a node reveals its role + why it is there ("div-free denoise: velocity is
  strongly data-constrained so this is well-posed, unlike pressure; a plain momentum-residual
  net is gauge-free and cannot recover pressure at all"; "analytic derivatives at the wall:
  removes the boundary artifacts finite differences at the lumen edge would create"); click a
  node to expand its equation via `SubTabs`/disclosure. CNN-Explainer overview<->detail feel.

### 6b. Denoise before/after (the well-posed step made visible)
- **Data:** baked `divergence` (0.5): `raw`, `denoised`; scalars `div_raw_per_s 25.37`,
  `div_denoised_per_s 11.19`, `div_reduction_x 2.3`.
- **Build:** the cloud colored by `|div v|` before vs after the denoiser (toggle or juxtapose),
  plus a uPlot histogram of the two divergence distributions; headline "incompressibility
  residual cut 2.3x (25.37 -> 11.19 /s)". Shows WHERE the raw measurement violated `div v = 0`
  and how the denoiser fixes it, which is exactly what keeps the quadratic Poisson source from
  amplifying noise.

### 6c. What-if over the pipeline stages (TF Playground analog, baked)
Toggles that read BAKED fields, no training: "source derivatives: finite-difference | analytic"
and "denoise: off | div-free" (and, if `aliasing` is baked, "aliasing: raw | corrected"). Each
combination reads a baked pressure field/metric and updates the hero + rail. Honest annotation:
the div-free analytic path is what makes the real-scan pressure physiological; the naive path
produces boundary ringing. Links back to Tab 1e's robustness band (ensemble spread < 0.01 mmHg).

### 6d. Term-by-term objective + analytic gate (progressive disclosure + the FIGURE gate)
- **Objective:** the existing `<Equation>`
  `min_theta ||v_theta - v_measured||^2 + lambda·||div v_theta||^2 => lap p = S(v_theta),
  d_n p = b(v_theta)·n`, revealed term-by-term (data misfit that must reproduce the measured
  velocity; the incompressibility penalty; then the Poisson solve). Each term hover-explained;
  a mini uPlot bar shows each term's role.
- **Gate as a figure:** baked `analytic_gate` (0.5) rendered as two overlaid uPlot curves,
  exact vs recovered pressure along the converging duct, annotated `correlation 1.00,
  4.74 vs 4.73 mmHg, < 1% error`. The existing gate Callout ("only after passing that gate is
  it applied to the real scan") becomes this figure's caption, not a bare sentence.

The method-family paragraph (PPE: Ebbers 2001 / Krittian 2012; WERP + vWERP: Donati 2015 /
Marlevi 2019; head-to-head Hardy 2025; PINN line Kissas 2020 / Fathi 2020; solenoidal
projection Ong 2015 made analytic; hidden fluid mechanics Raissi 2020) becomes a small
horizontal "method ladder" strip of labeled chips with one-line roles, not a paragraph.

**Refs:** `ebbers2001`, `krittian2012`, `donati2015`, `marlevi2019`, `hardy2025`, `kissas2020`,
`fathi2020`, `ong2015`, `raissi2020`, `raissi2019`. **SOTA basis:** Transformer Explainer, CNN
Explainer, GAN Lab, TensorFlow Playground.

---

## 7. Tab -> content -> data -> library matrix (build checklist)

| Tab | Hero interactive | Secondary | Data source | Library | New bake? |
|---|---|---|---|---|---|
| Pressure recovery | orbit+pick cloud + linked speed-over-cycle uPlot + phase scrubber | along-vessel pressure, streamlines/pathlines, phase strip, robustness band | `points_mm`, `pressure_mmHg`, `speed_ms_over_time`, `centerline`, `flow_lines`, `ensemble_spread` | three + uPlot | centerline, flow_lines, vectors_peak, ensemble_spread |
| The problem | interactive stenosis/coarctation grading SVG | one-number-crosses-threshold self-explanation, stat tiles, 4-step clinical stepper | clinical numbers (dossier) + closed-form Bernoulli/recovery + 1 baked lit point | SVG + uPlot | none (arithmetic) |
| The target | speed-vs-pressure juxtapose cloud | input->operator->output small-multiple, venc/aliasing mini-explorable | `speed_ms_peak`, `pressure_mmHg`, `aliasing` | three + SVG + uPlot | aliasing (for 3c) |
| How the PDE arises | reader-controlled NS->pressure-Poisson stepper | colorized hover-math, coupled control-volume SVG, unsteady-term small-multiple | KaTeX + `unsteady_term` prose | SVG + KaTeX | none |
| Traditional approach | live simplified-Bernoulli explorable | pressure-recovery demo, discarded-terms ledger, Bernoulli-vs-physics bracket | closed-form + `bernoulli_mmHg`, `ppe_pressure_drop_mmHg`, `peak_velocity_ms` | SVG + uPlot | none (arithmetic) |
| Physics-informed proposal | denoise->analytic-source->solve pipeline SVG | denoise before/after, what-if stage toggles, term-by-term objective + analytic-gate figure | `divergence`, `analytic_gate`, `metrics` (div_*), objective eq | SVG + three + uPlot | divergence, analytic_gate |

**Two rules recurring across all six (01-sota-ux §7):** (1) the figure carries the meaning,
prose is a caption, kill full-width paragraphs; (2) every interactive needs a static poster,
keyboard control, SR text, and a perceptually-uniform theme-aware colormap (pressure ->
diverging, speed/magnitude -> sequential).

**Cross-case consistency:** this file and `02-ecgi-tabs.md` share the SAME layout shells,
`UPlotChart.tsx`, `usePausedViz` loop, colormap convention, a11y/honesty contract, and bake-
and-read discipline. Both cases must feel like one product; only the physics (Laplace vs
Navier-Stokes) and the baked payload differ.

---

## 8. Sources

External SOTA patterns and exemplars are enumerated with URLs/DOIs in `01-sota-ux.md §Sources`
(distill.pub interactive-articles Hohman 2020; Ciechanowski; ScrollyVis arXiv 2207.03616;
Garrison Computers & Graphics 2023; ONVZ brain guide; 3b1b/Manim + arXiv 2510.01187; distill
colorized equations; setosa.io; Tufte small multiples; scientific-figure checklist arXiv
2408.16007; Transformer Explainer 10.1145/3772318.3791725; CNN Explainer IEEE VIS 2020; GAN
Lab; TF Playground; VTK.js / itk-vtk-viewer; 4D-flow RadioGraphics 10.1148/rg.2019180091;
RSNA Radiology 10.1148/radiol.242972; X3D 4D-flow pipeline ACM 10.1145/3665318.3677155).

4D-flow domain citations (already in `frontend/src/data/citations.ts`, real DOIs):
Krittian 2012 pressure-Poisson (10.1007/s10237-011-0346-7); Ebbers 2001 PPE
(10.1002/mrm.1252); Donati 2015 WERP (10.1109/TMI.2015.2427639); Marlevi 2019 vWERP
(10.1109/TMI.2019.2896957); Hardy 2025 relative-pressure head-to-head; Kissas 2020 ML in
cardiac flows (10.1016/j.cma.2019.112623); Fathi 2020 super-resolution 4D-flow
(10.1016/j.cma.2020.113173); Ong 2015 divergence-free interpolation (10.1002/mrm.25415);
Raissi 2020 hidden fluid mechanics (10.1126/science.aaw4741); Raissi 2019 PINNs
(10.1016/j.jcp.2018.10.045); Baumgartner 1999 pressure recovery (10.1016/S0735-1097(99)00318-0);
Saitta 2019 4D-flow pressure vs FSI (10.1016/j.jbiomech.2019.05.024); Otto 2020 ACC/AHA VHD
guideline (10.1161/CIR.0000000000000923); Vahanian 2021 ESC/EACTS valve guideline
(10.1093/eurheartj/ehab395); Stout 2018 ACHD guideline (10.1161/CIR.0000000000000603);
Osnabrugge 2013 AS prevalence (10.1016/j.jacc.2013.05.015); Bissell 2023 4D-flow consensus
update (10.1186/s12968-023-00942-z); Rengier 2014 4D-flow review (10.1007/s10554-013-0290-y).
(DOIs above should be reconciled against `citations.ts` at build time; where the file already
carries the DOI, use its stored value verbatim.)
