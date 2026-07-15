# CardioPINN App redesign: one ordered, implementable build plan

**Dossier:** `research/app-redesign-2026-07-14/00-build-plan.md`
**Date:** 2026-07-14
**Synthesizes:** `01-sota-ux.md` (external SOTA per section-type), `02-ecgi-tabs.md` (ECGi
per-tab spec), `03-flow-tabs.md` (4D-flow per-tab spec), `04-footer-layout.md` (footer +
void CSS). This file is the single build plan the implementer executes.

**Goal.** Make every existing App tab rich, dynamic and attractive over baked data + hand
built SVG/canvas + existing 3D traces, and fix the footer and the layout voids. The tab set
is FIXED: both cases keep exactly six tabs in the same order. No tab is added or removed. No
RotorVitals or other internal CAOS app is copied; the SOTA basis is external (distill,
Ciechanowski, Transformer/CNN Explainer, VTK.js, 4D-flow RadioGraphics, Tufte, ONVZ).

**Ground truth (verified in the tree 2026-07-14).**
- Pages: `frontend/src/pages/RealEcgi.tsx` (ECGi, 6 tabs, `CageMesh` + `ForwardSvg`) and
  `frontend/src/pages/Flow4d.tsx` (4D-flow, 6 tabs, `LumenCloud` + `PpeSvg`). Both wrapped by
  `pages/Workbench.tsx` which injects the top `selector` into the left `aside.cp-side`.
- Both pages carry an ad-hoc `playOnce` rAF (must migrate to the shell `usePausedViz`).
- Shell `@fasl-work/caos-app-shell` exports (confirmed in `dist/index.d.ts`): `Tabs`,
  `SubTabs`, `Figure`, `Callout`, `Equation`, `InlineMath`, `Cite`, `Refs`, `usePausedViz`,
  `createVizLoop`, `PausedVizController`, `VizFrame`. Footer is shell CHROME; the app only
  feeds `config.footer.provenance` + `config.footer.disclaimer` in `main.tsx`.
- Colormap kit `src/kits/colormap.ts`: `seq/seqCss` (magma, unsigned), `div/divCss`
  (coolwarm, signed). Convention: signed potentials + relative pressure -> diverging; error,
  uncertainty, speed, divergence -> sequential. KEEP verbatim.
- `uplot` is NOT installed. `npm i uplot` into `frontend/node_modules` (local only) is a
  required first step. Everything else in the stack is already present (three, r3f, drei,
  katex).
- Data on disk: `public/data/real-ecgi-catalogue/catalogue.json`
  (`cardiopinn.ecgi-catalogue/v2`, human-tank + dog-insitu) and
  `public/data/real-flow4d-pressure/trace.json` (`cardiopinn.flow4d-pressure/v3`).

**Two rules that govern every tab (01-sota-ux §7).** (1) The figure carries the meaning,
prose is a caption: no body paragraph wider than its figure column, every tab opens on the
hero visual, not a paragraph. (2) Every interactive ships a static poster, full keyboard
operation, an `.sr-summary` live-region sentence, a perceptually-uniform theme-aware colormap
with an always-visible legend, and bilingual EN/ES via `pick(lang, en, es)`. No em-dash, no
emoji, no autoplay. All honesty callouts stay.

---

## 1. Strategy: build the shared kit first, then wire tabs vertically

Do NOT rebuild tab by tab from scratch. The ECGi and 4D-flow specs deliberately share the
SAME layout shells, the SAME `UPlotChart`, the SAME `usePausedViz` loop, the SAME colormap
convention, and the SAME reusable interactive pieces. Build the shared kit ONCE, verify it on
one tab of one case, then apply it across both cases. Order of the whole job:

- **Phase A (independent quick wins):** footer strings + layout-void CSS (`04`). No new deps,
  no data. Ship first so the app already looks intentional.
- **Phase B (bakes):** extend the two data files with the arrays the rich tabs read. Bake and
  read only; nothing computes client-side. Do this early because tabs are gated on it.
- **Phase C (reusable kit):** the 8 shared components in `src/kits/`. This is the bulk of the
  engineering; every tab is then a thin composition.
- **Phase D (ECGi tabs):** rebuild the six ECGi tabs vertically (one tab fully done, code +
  content transcribed from `02`, before the next).
- **Phase E (4D-flow tabs):** rebuild the six 4D-flow tabs, reusing the SAME kit.
- **Phase F (verify + ship):** screenshot every tab in light+dark, EN+ES, exercise every
  control, keyboard + SR pass, then commit + deploy.

Vertical discipline (global rule): finish each tab COMPLETELY (interactive + real data wiring
+ captions + a11y + honesty callout) in its own commit before starting the next. Never all
scaffolding first, content last.

---

## 2. File / component map

### 2.1 New reusable kit (`frontend/src/kits/`) — build once, used by both pages

| File | Export(s) | Purpose | Used by |
|---|---|---|---|
| `UPlotChart.tsx` | `UPlotChart` | Theme-aware uPlot wrapper: axis/grid colors from CSS vars, external cursor sync (`cursorX`), keyboard focus, `role="img"` + `aria-label` summary. One wrapper, never forked. | every linked chart in both cases |
| `FieldView3D.tsx` | `FieldView3D` | Generic orbit + pick + scrub 3D field host. Takes a geometry builder (`CageMesh` or `LumenCloud`), a `values[node]` array, a colormap+range, a picked-node marker, an argmax marker, and emits `onPick(node)` + a `readout`. Wraps `<Canvas>` + `OrbitControls` + a `Raycaster` pick. | Recon/Target/Traditional (ECGi), Pressure/Target (flow) |
| `Juxtapose.tsx` | `Juxtapose` | Draggable-divider comparison of two aligned panels (each a `FieldView3D` or an SVG poster) sharing one camera; cursor readout on both; linked brushing. | Target + Traditional (both cases) |
| `DerivationStepper.tsx` | `DerivationStepper` | Reader-controlled Prev/Next stepper of KaTeX lines; highlights the changed term; per-step caption; emits `activeStep` so a coupled SVG can highlight in sync; keyboard arrows; SR reads the caption. | How-the-PDE (both cases) |
| `HoverMathEq.tsx` | `HoverMathEq` | Colorized KaTeX where each symbol is a focusable/hoverable span revealing meaning + units in a side callout. Self-documenting equation. | How-the-PDE, Target, PINN (both) |
| `PipelineSvg.tsx` | `PipelineSvg` | Sankey/block data-flow SVG primitive: nodes with hover-inspect role strings, animated edge flow (`usePausedViz` play-once), click-to-expand a node's equation. `ForwardSvg`/`PpeSvg` become instances of its vocabulary. | PINN (both cases) |
| `SmallMultipleStrip.tsx` | `SmallMultipleStrip` | Horizontal shared-scale strip (phase snapshots, lambda regimes, method ladder) inside an `overflow-x:auto` container; click a panel to drive the hero; annotated callout arrows. | every tab's overview band |
| `StatStrip.tsx` | `StatStrip` | Stakes-as-data tile row: value + one-line annotation + source chip. Kills adjective paragraphs. | The problem (both) |
| `ClinicalStepper.tsx` | `ClinicalStepper` | Pinned 3-4 step narrative rail that swaps the hero highlight; Prev/Next; per-step SR caption. | The problem (both) |
| `AnatomyHero.tsx` (ECGi) / extend `PpeSvg` (flow) | `AnatomyHero` | Hover-region anatomical SVG hero (ONVZ pattern): each structure focusable, reveals a one-line clinical stake. ECGi = torso+heart+electrode ring; flow = aorta+valve+narrowing slider. | The problem (both) |

`colormap.ts` is REUSED unchanged. `fieldStats` (currently inline in `RealEcgi.tsx`) and
`lumenStats` (inline in `Flow4d.tsx`) move into `colormap.ts` as shared exports so
`FieldView3D` and `Juxtapose` share one range convention.

### 2.2 Edited existing files

| File | Change |
|---|---|
| `src/pages/RealEcgi.tsx` | Replace each of the 6 tab bodies with kit compositions (§5.1). Migrate `playOnce` -> `usePausedViz`. Wrap the aside body in `.cp-side-inner` (void fix). Keep `CageMesh`; promote it to a geometry builder consumed by `FieldView3D`. |
| `src/pages/Flow4d.tsx` | Same for the 6 flow tabs (§5.2). Migrate `playOnce` -> `usePausedViz`. Wrap aside in `.cp-side-inner`. Keep `LumenCloud`; feed it to `FieldView3D`. |
| `src/main.tsx` | Replace the `footer` block with the SHORT strings (§3.1). Only app-controllable footer edit. |
| `src/styles.css` | Void fixes (§3.2): `.cp-side` rail + `.cp-side-inner` sticky; responsive `.canvas-wrap` (`aspect-ratio`); `.page-head.split` + `.page-head-aside`; add `.small-mult`, `.stat-strip`, `.hovermath`, `.stepper`, `.juxtapose` styles. Never redefine a shell class. |
| doc pages (`Introduction/Methodology/Implementation/Experiments/Benchmark.tsx`) | Add the `page-head split` wrapper + a `.page-head-aside` key-facts column (§3.2 D). Geometry only; per-page facts already exist in each page's prose. |
| `package.json` | Add `"uplot": "^1.6.x"` to dependencies (installed locally). |
| data-pipeline `real/flow4d_*.py` + the ECGi bake script | Emit the new arrays (§4). |

---

## 3. Phase A: footer + layout voids (do first, no deps)

### 3.1 Footer (max 2 lines) — `main.tsx` only

Replace the `footer` block (lines 35-44) with the trimmed strings from `04-footer-layout.md`:

```ts
footer: {
  provenance: { en: 'EDGAR + 4D-flow aorta MRI', es: 'EDGAR + MRI de aorta 4D-flow' },
  disclaimer: { en: 'reads baked traces, not for clinical use', es: 'lee traces horneados, sin uso clinico' },
},
```

This collapses the shell footer to two visual lines at both the 1200px doc width and the
1520px app width (line 1 = name . org . right-aligned version; line 2 = attribution .
provenance . GitHub . license . disclaimer, ~142 glyphs). Drops no material claim
(`open-access`, `runs offline` were decorative/entailed). Do NOT touch the shell CSS.

### 3.2 Layout voids — `styles.css` + tiny markup

- **B. Control column reaches the bottom.** Wrap the aside body in `<div className="cp-side-inner">`
  in both pages; give `.cp-side` `align-self:stretch` + a right rail border, move
  `position:sticky` onto `.cp-side-inner` (`top:74px; max-height:calc(100dvh - 90px); overflow:auto`).
  Add one real "what am I looking at" legend/provenance mini-card at the bottom of
  `.cp-side-inner` so the rail carries meaning. Exact CSS in `04 §3B`.
- **C. Responsive 3D.** Replace fixed `.canvas-wrap { height:460px }` with
  `aspect-ratio:16/10; min-height:360px; max-height:min(72dvh,620px)` (r3f refits the renderer
  on resize automatically; the absolute `.legend`/`.readout` overlays keep working). Exact CSS
  in `04 §3C`.
- **D. Doc-page lede void.** Add `.page-head.split` grid (`minmax(0,62ch) minmax(0,1fr)`) with
  a `.page-head-aside` key-facts column on the five doc pages. Exact CSS in `04 §3D`. Not
  needed on the App page (`.cp-main .lede { max-width:none }` already fills it).
- **A. App full width.** Already correct (`.cardiopinn-layout` max-width 1520 outside
  `.page-body`); keep the App page rendering `.cardiopinn-layout` directly, never inside
  `.page-body`.

---

## 4. Phase B: bake additions (data pipeline, bake-and-read, no client solver)

All are static arrays read in the browser. Where an array is not yet baked, the tab renders
the scalar/point-cloud fallback and flags the field-level panel as "pending bake" (honest,
matching the existing pattern). Nothing blocks on a bake: the base hero of every tab works
from data already on disk.

### 4.1 ECGi `catalogue.json` (per beat) — `02 §0.5`
- `forward_comparison`: `{ single_layer:{re,corr,body_field[192]}, bem:{re,corr,body_field}, applicable, note }`
  (populate for dog-insitu; `applicable:false` for human-tank). Enables Tab 4 / Recon-Forward field panels.
- `lambda_sweep`: `{ lambdas[~9], residual_norm[9], solution_norm[9], relative_error[9], oracle_index, heart_field_at_lambda[9][~256] }`.
  Enables Tab 5 L-curve + regime small-multiples.
- `calibration`: `{ pred_2sigma_bins[~12], empirical_coverage[12], nominal:0.95 }` (binned from
  existing per-node `uncertainty_mV` vs `abs_error_mV`). Overlay curve for Tab 1e reliability.

### 4.2 4D-flow `trace.json` — `03 §0.5`
- `centerline`: `{ s_mm[~50], xyz[~50][3], pressure_mmHg[~50], speed_ms_peak[~50] }`.
  The clinical payload: pressure + speed vs distance-along-vessel (Tabs 1b, 5).
- `flow_lines`: `{ lines[K~40][P~60][3], speed[K][P] }` (streamlines/pathlines, peak systole).
- `vectors_peak`: `{ xyz[M~800][3], vec[M][3] }` (optional glyph layer).
- `analytic_gate`: `{ x[~40], p_exact[~40], p_recovered[~40], correlation, drop_exact_mmHg, drop_recovered_mmHg }`.
  Turns the gate into a two-curve figure (Tab 6d).
- `divergence`: `{ raw[N'~2000], denoised[N'] }` (before/after div-free denoise, Tab 6b).
- `ensemble_spread`: `{ std_mmHg[N'] }` (per-point pressure std, Tabs 1e/6).
- `aliasing`: `{ wrapped_mask[9000], speed_prewrap[9000] }` (venc unwrap, Tabs 3c/6).

Bernoulli/pressure-recovery curves (flow Tab 5) are closed-form arithmetic computed live from
slider inputs; no bake beyond one literature point (Baumgartner 1999).

---

## 5. Phase C+D+E: reusable pieces and per-tab wiring

### 5.0 The four load-bearing reusable interactives (build in this order)

1. **`FieldView3D` (3D field with pick + scrub).** Props: `buildGeometry` (returns a centred
   `THREE.BufferGeometry` with a color attribute — `CageMesh`/`LumenCloud` refactored to this
   shape), `values:number[]`, `signed:boolean`, `pickedNode|null`, `markers` (picked sphere +
   argmax ring), `onPick(node)`, `renderKind:'mesh'|'points'`. Internals: `<Canvas>` +
   `OrbitControls` + a click/keyboard `Raycaster` that maps the hit to the nearest vertex,
   pins it, and calls `onPick`. Emits the legend (from `colormap` range) + a `.readout`
   string + an `.sr-summary`. This is the engine of Recon/Target/Traditional (ECGi) and
   Pressure/Target (flow).
2. **`UPlotChart` (linked 2D chart).** Props: `series`, `data`, `cursorX` (external frame/phase
   cursor driven by the scrubber), `onHover(x)`, `markers` (oracle/corner points, y=x line),
   theme colors from CSS vars, `aria-label`. Reused for: node potential-vs-time, L-curve,
   reliability scatter, speed-over-cycle, pressure-along-centerline, divergence histogram,
   Bernoulli curves, loss/metric bars, analytic-gate overlay. The scrubber and the chart cursor
   move in lockstep (linked representations).
3. **`DerivationStepper` (animated SVG derivation).** Props: `steps:[{tex, caption, highlight, svgKey}]`,
   controlled `activeStep`, `onStep`. Reveals one KaTeX line at a time, highlights the changed
   term, emits `svgKey` so the coupled control-volume SVG greys/highlights the matching
   arrow/surface. Prev/Next + keyboard arrows + SR caption. Optional `usePausedViz` auto-advance
   (play-once, never autoplay).
4. **`Juxtapose` (interactive comparison).** Props: `left`, `right` (each a `FieldView3D` sharing
   one camera, or an SVG poster), `dividerX` state, `onBrush(loc)` for linked cursor readout on
   both sides. The measured-vs-recovered / classical-vs-truth device.

Supporting pieces (`HoverMathEq`, `PipelineSvg`, `SmallMultipleStrip`, `StatStrip`,
`ClinicalStepper`, `AnatomyHero`) are simpler and built alongside the tab that first needs them.

### 5.1 ECGi tabs (`RealEcgi.tsx`) — from `02-ecgi-tabs.md`

Layout per tab: HERO+RAIL (`grid minmax(0,1.6fr) minmax(240px,0.9fr)`), a SMALL-MULTIPLE strip
as the overview band, `SubTabs` for analytical add-ons (never new top-level tabs).

| # | Tab | Hero interactive | Secondary (SubTabs / strip) | Data | Library |
|---|---|---|---|---|---|
| 1 | Reconstruction | `FieldView3D` orbit+pick + linked `UPlotChart` of recovered vs measured at the picked node over 40 frames + beat scrubber (cursor synced) + field toggle | phase strip (5 shared-scale snapshots); SubTab Methods (tik/graph/ensemble grouped bars + 3-panel small-multiple); SubTab Forward (single-layer vs BEM juxtapose); SubTab Uncertainty (magma heart + live reliability scatter, linked brushing) | `fields_over_time`, `metrics`, `forward_comparison`, `calibration` | three + uPlot |
| 2 | The problem | `AnatomyHero` hover-region torso+heart+192-ring SVG | 12-lead-cannot-localize predict-the-focus widget (tiny baked lookup); `StatStrip` (52M AF, ~5x stroke, 10mm/20ms); `ClinicalStepper` 4 steps | clinical numbers (dossier) + tiny focus->lead lookup | SVG + canvas |
| 3 | The target | `Juxtapose` measured (torso ring) vs recovered (cage) at frame, shared coolwarm, linked brushing | input->operator->output small-multiple (`ForwardSvg` upgraded as operator glyph); FIGURE-ROW with `HoverMathEq` of `phi_body = A phi_heart` + def-grid; beat chips | `measured_mV`, `recovered_mV` | three + SVG |
| 4 | How the PDE arises | `DerivationStepper` (6 steps: quasi-static -> charge conservation -> generalized Laplace -> BCs -> single matrix A -> SVD ill-posedness) coupled to a control-volume SVG | `HoverMathEq` colorized symbols; forward small-multiple (single-layer vs BEM + SVD-decay uPlot log-plot); predict-the-cancellation disclosure | KaTeX + `forward_comparison` | SVG + KaTeX + uPlot |
| 5 | Traditional approach | `FieldView3D` heart at current lambda + `UPlotChart` L-curve (log-log, corner + oracle marked, bidirectional click) + lambda slider | regime small-multiples (~5 lambda, annotated "plausible but wrong"); classical-vs-truth `Juxtapose` | `lambda_sweep` | three + uPlot |
| 6 | Physics-informed proposal | `PipelineSvg` (phi_body -> A -> reg-inverse + L_mesh prior -> K-ensemble -> mean + recalibrated spread), animated flow, hover-inspect nodes | what-if toggles (prior identity|mesh-graph, UQ off|on) reading baked triple; term-by-term objective (`HoverMathEq` + mini uPlot bars); honest next-steps card | `metrics` + `fields_over_time` triple | SVG + three + uPlot |

Honesty callouts kept verbatim in substance: EDGAR attribution / not clinically deployed
(Tab 1), living patient has no gold standard -> torso tank (Tab 2), oracle-lambda baseline
(Tab 5), BEM does not beat single-layer (Tab 4), UQ is the real payload not accuracy (Tab 6).

### 5.2 4D-flow tabs (`Flow4d.tsx`) — from `03-flow-tabs.md`

Same shells, same kit. `LumenCloud` feeds `FieldView3D` (renderKind points). Convention:
pressure -> diverging, speed/divergence -> sequential.

| # | Tab | Hero interactive | Secondary (SubTabs / strip) | Data | Library |
|---|---|---|---|---|---|
| 1 | Pressure recovery | `FieldView3D` orbit+pick cloud + linked `UPlotChart` speed-over-cycle at picked point + cardiac-phase scrubber + field toggle | SubTab Along-the-vessel (centerline dual-axis uPlot + moving bead); SubTab Flow-lines (streamlines/pathlines/glyphs, pending-bake note until baked); phase strip; SubTab Robustness (ensemble-std cloud + spread band) | `points_mm`, `pressure_mmHg`, `speed_ms_over_time`, `centerline`, `flow_lines`, `ensemble_spread` | three + uPlot |
| 2 | The problem | `AnatomyHero`(aorta) with draggable narrowing slider (valve / isthmus) + vena-contracta + recovery zone, hover clinical stakes | one-number-crosses-threshold self-explanation (Vmax + aorta-diameter sliders, `4Vmax^2` vs net catheter gradient, severe-AS band); `StatStrip` (>=4m/s / >=40mmHg / <=1cm2; coarctation >=20mmHg; 12.4%/3.4%; 0.4mmHg vs FSI); `ClinicalStepper` 4 steps | clinical numbers + closed-form Bernoulli/recovery + 1 baked lit point | SVG + uPlot |
| 3 | The target | `Juxtapose` measured speed (seq) vs recovered pressure (div) on the same cloud at peak systole, linked brushing | input->operator->output small-multiple (`PpeSvg` upgraded operator glyph); FIGURE-ROW `HoverMathEq` of `v => p` + def-grid; venc/aliasing mini-explorable (before/after) | `speed_ms_peak`, `pressure_mmHg`, `aliasing` | three + SVG + uPlot |
| 4 | How the PDE arises | `DerivationStepper` (6 steps: incompressible NS -> momentum balance -> take divergence [predict-the-cancellation] -> pressure-Poisson `lap p = S(v)` -> quadratic source amplifies noise -> Neumann wall flux) coupled to a fluid-parcel control-volume SVG (accel/viscous arrows grey out at step 3) | `HoverMathEq` (rho, mu, v, p, grad/lap/div, S(v), d_n p); unsteady-term small-multiple (3-frame FD vs space-time analytic dv/dt, Hardy 2025) | KaTeX + `unsteady_term` prose | SVG + KaTeX |
| 5 | Traditional approach | live simplified-Bernoulli explorable (Vmax + V1 sliders, `4Vmax^2` vs `4(V2^2-V1^2)` vs net-after-recovery, severe-AS band, uPlot curves, anchored to this scan's 0.791 m/s -> 2.51 mmHg) | pressure-recovery demo SVG (drag aorta diameter, Baumgartner 66mmHg/~80% marked); discarded-terms ledger rail; Bernoulli-vs-physics two-bar bracket (2.51 vs 0.79) | closed-form + `bernoulli_mmHg`, `ppe_pressure_drop_mmHg`, `peak_velocity_ms` | SVG + uPlot |
| 6 | Physics-informed proposal | `PipelineSvg` (noisy v -> div-free PINN denoise -> analytic derivatives -> Poisson source + Neumann flux -> sparse solve -> p), animated flow, hover-inspect nodes | denoise before/after (|div v| cloud + uPlot histogram, 25.37->11.19 /s); what-if stage toggles (FD|analytic, denoise off|on, aliasing raw|corrected); term-by-term objective + analytic-gate figure (two overlaid curves, corr 1.00, 4.74 vs 4.73); method-ladder chip strip | `divergence`, `analytic_gate`, `metrics` (div_*), objective eq | SVG + three + uPlot |

Honesty callouts kept: no invasive gold standard (Tab 3), unobstructed aorta -> small gradient
is correct (Tab 1/2), ensemble bounds noise not method uncertainty (Tab 1 Robustness),
Bernoulli is a bracket not a straw man (Tab 5), analytic gate before real data (Tab 6),
different physics from ECGi (Tab 2 step 4). DICOMs not redistributed.

---

## 6. Ordered implementation checklist (the deliverable)

Each numbered item is one focused commit. Verify before moving on. Vertical: a tab's item
includes its interactive + real-data wiring + captions + a11y + honesty callout, all in that
commit.

**Phase A — footer + voids (no deps, ship first)**
1. `main.tsx`: replace footer strings with the trimmed EN/ES pair; verify the footer renders on 2 lines at desktop width (light + dark).
2. `styles.css` + both pages: wrap aside body in `.cp-side-inner`, apply the `.cp-side` rail + sticky-inner CSS, add the bottom "what am I looking at" mini-card; verify the left column reaches the bottom with no void.
3. `styles.css`: responsive `.canvas-wrap` (`aspect-ratio`), verify the 3D view fills the column width and never overflows the viewport, on a wide and a narrow window.
4. Five doc pages + `styles.css`: add `.page-head.split` + `.page-head-aside` key-facts column; verify the doc-page lede no longer leaves the right half blank.

**Phase B — dependency + bakes**
5. `npm i uplot` locally; add to `package.json` dependencies; confirm the build still passes.
6. Extend the ECGi bake script -> `catalogue.json`: `forward_comparison`, `lambda_sweep`, `calibration`; re-bake; assert shapes in the browser network tab.
7. Extend `real/flow4d_*.py` -> `trace.json`: `centerline`, `analytic_gate`, `divergence`, `ensemble_spread`, `aliasing`, then `flow_lines` + `vectors_peak`; re-bake; assert shapes.

**Phase C — reusable kit (build once, verify on one tab)**
8. `colormap.ts`: move `fieldStats`/`lumenStats` in as shared exports.
9. `kits/UPlotChart.tsx`: theme-aware wrapper with external cursor sync, keyboard focus, `aria-label`. Unit-smoke on a static series.
10. Refactor `CageMesh` + `LumenCloud` into geometry builders; build `kits/FieldView3D.tsx` (orbit + pick + argmax marker + legend + `.sr-summary`); verify pick + keyboard-cycle on the ECGi Recon hero.
11. `kits/DerivationStepper.tsx` + `kits/HoverMathEq.tsx`; verify Prev/Next, term highlight, coupled-SVG highlight, keyboard, SR caption.
12. `kits/Juxtapose.tsx`; verify the divider drag + linked cursor readout on two shared-camera panels.
13. `kits/PipelineSvg.tsx`, `kits/SmallMultipleStrip.tsx`, `kits/StatStrip.tsx`, `kits/ClinicalStepper.tsx`, `kits/AnatomyHero.tsx`; verify each in isolation (hover-inspect, click-to-drive, keyboard).

**Phase D — ECGi tabs (one commit each, vertical)**
14. ECGi Tab 1 Reconstruction: `FieldView3D` + linked node uPlot + `usePausedViz` scrubber + phase strip + Methods/Forward/Uncertainty SubTabs; keep the EDGAR callout; a11y + SR pass.
15. ECGi Tab 2 The problem: `AnatomyHero` + 12-lead widget + `StatStrip` + `ClinicalStepper`; keep the torso-tank callout.
16. ECGi Tab 3 The target: measured-vs-recovered `Juxtapose` + input/operator/output small-multiple + `HoverMathEq` FIGURE-ROW + beat chips.
17. ECGi Tab 4 How the PDE arises: `DerivationStepper` (6 steps) + coupled control-volume SVG + `HoverMathEq` + forward small-multiple + SVD-decay uPlot; keep the BEM-honesty callout.
18. ECGi Tab 5 Traditional approach: lambda slider over `lambda_sweep` + interactive L-curve uPlot + regime small-multiples + classical-vs-truth `Juxtapose`; keep the oracle-lambda callout.
19. ECGi Tab 6 Physics-informed proposal: `PipelineSvg` + what-if prior/UQ toggles + term-by-term objective + honest next-steps card; UQ-is-the-payload callout.

**Phase E — 4D-flow tabs (reuse the kit, one commit each)**
20. Flow Tab 1 Pressure recovery: `FieldView3D` cloud + linked speed-over-cycle uPlot + `usePausedViz` phase scrubber + Along-the-vessel / Flow-lines / Robustness SubTabs + phase strip; keep the robustness-limit callout.
21. Flow Tab 2 The problem: `AnatomyHero`(aorta narrowing slider) + one-number-threshold self-explanation + `StatStrip` + `ClinicalStepper`; different-physics callout.
22. Flow Tab 3 The target: speed-vs-pressure `Juxtapose` + input/operator/output small-multiple + `HoverMathEq` + venc/aliasing mini-explorable; no-gold-standard callout.
23. Flow Tab 4 How the PDE arises: `DerivationStepper` (NS -> pressure-Poisson, 6 steps) + fluid-parcel control-volume SVG + `HoverMathEq` + unsteady-term small-multiple.
24. Flow Tab 5 Traditional approach: live Bernoulli explorable + pressure-recovery demo + discarded-terms ledger + Bernoulli-vs-physics bracket; keep the small-gradient-is-correct callout.
25. Flow Tab 6 Physics-informed proposal: `PipelineSvg` + denoise before/after + what-if stage toggles + term-by-term objective + analytic-gate figure + method-ladder chips; analytic-gate callout.

**Phase F — verify + ship**
26. Remove both ad-hoc `playOnce` rAFs; confirm every animation is `usePausedViz` (default paused, halts on hidden tab, no autoplay).
27. Screenshot-verify every tab of both cases in light + dark and EN + ES; exercise every control, SubTab, slider, pick, toggle; confirm no full-width prose paragraph remains, no layout void, footer <= 2 lines.
28. Keyboard + screen-reader pass on every interactive (arrows scrub/step, Tab to controls, Enter/Space toggle, `.sr-summary` states field/frame/range/headline metric).
29. Reconcile docs/DOIs: every claim in a caption matches the engine output and the baked arrays; DOIs verbatim from `citations.ts`. Bump version, update CHANGELOG, tag, commit, deploy.

---

## 7. Sources

External SOTA patterns, exemplars and DOIs are enumerated in `01-sota-ux.md §Sources`
(distill.pub Hohman 2020; Ciechanowski; ScrollyVis arXiv 2207.03616; Garrison C&G 2023; ONVZ;
3b1b/Manim arXiv 2510.01187; setosa.io; Tufte small multiples; scientific-figure checklist
arXiv 2408.16007; Transformer Explainer 10.1145/3772318.3791725; CNN Explainer IEEE VIS 2020;
GAN Lab; TF Playground; VTK.js / itk-vtk-viewer; 4D-flow RadioGraphics 10.1148/rg.2019180091).
Layout-technique sources (position-sticky-in-grid, r3f responsive canvas, side-figure lede) in
`04-footer-layout.md §Sources`. Domain citations (ECGi + 4D-flow, real DOIs) live in
`frontend/src/data/citations.ts` and are enumerated in `02 §8` and `03 §8`.

*Persisted 2026-07-14. One build plan reconciling 01/02/03/04 against the CardioPINN frontend
at v0.20.000. Tab set is fixed at six per case; the job is depth, interaction and void repair,
not restructuring.*
