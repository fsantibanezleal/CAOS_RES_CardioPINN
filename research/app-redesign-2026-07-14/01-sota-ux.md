# SOTA UX for interactive scientific explainers — per-section-type patterns

**Dossier:** `research/app-redesign-2026-07-14/01-sota-ux.md`
**Date:** 2026-07-14
**Scope:** External SOTA only (distill.pub, Observable/explorables, medical & 3D field
viewers, ML-paper interactive figures). No CAOS internal apps referenced.
**Goal:** How the best interactive explainers make each of the six CardioPINN App tab
types RICH, DYNAMIC and ATTRACTIVE instead of a wall of text. The tab set is FIXED
(6 tabs per case: Reconstruction/Pressure-recovery, The problem, The target,
How the PDE arises, Traditional approach, Physics-informed proposal). This is about
making each tab a composed interactive VIEW, over baked JSON, hand-built SVG/canvas
diagrams, and existing 3D traces.

---

## 0. Cross-cutting principles (apply to EVERY tab)

These are the field's validated defaults; each specific tab below draws from them.

- **Shneiderman mantra as the layout spine:** "Overview first, zoom and filter, then
  details-on-demand." Every tab opens with a single legible hero visual, not a
  paragraph; detail is revealed on interaction. (distill.pub,
  *Communicating with Interactive Articles*, Hohman et al. 2020.)
- **Details-on-demand / hover-to-explain** beats up-front prose. Distill's canonical
  cases: colorized math equations with mouseover term explanations, "Image Kernels"
  computing on hover, "How does the eye work?" selectable anatomy. Pattern: the figure
  IS the text; hovering a symbol/region surfaces its one-line meaning.
- **Multiple linked representations:** show the same object as equation + geometry +
  numbers simultaneously, coupled so interacting with one highlights the others
  (Multimedia Principle: words+pictures > either alone).
- **Segmentation & pacing control:** break content into steps the reader can
  play/pause/scrub; "learners perform better when information is segmented." Prefer a
  **stepper/slideshow** over free-scroll for comprehension tasks — Zhi et al. found
  comprehension was *better* in slideshow layouts than vertical scroll; McKenna et al.
  found readers prefer step/scroll over static with no engagement penalty. For
  bake-and-read this is ideal: discrete baked frames map to discrete steps.
- **Self-explanation / belief elicitation:** ask the reader to predict before revealing
  (NYT "You Draw It"). Even one "guess the pressure gradient, then reveal" beat lifts
  recall.
- **Aesthetics are load-bearing, not decoration:** "an audience which finds content
  aesthetically pleasing is more likely to have a positive attitude toward it"; time-on-
  page and emotion predict learning. Fill the width with figure+text rows, side figures,
  small-multiple grids; never stretched full-width body paragraphs.
- **Gold-standard authorship model — Bartosz Ciechanowski (ciechanow.ski):** builds each
  concept "from the ground up" with 100+ bespoke interactive canvases, no framework, each
  widget draggable/scrubbable and self-contained. His articles (Watch, Cameras and Lenses,
  Color Spaces, Airfoil, GPS) are the bar for "every idea gets its own manipulable figure."
  This is the target texture for CardioPINN tabs: many small purposeful interactives, not
  one big viewer plus prose.
- **Accessibility is mandatory, not optional** (distill flags dynamic media *exacerbates*
  a11y): every interactive needs keyboard operation, a screen-reader text fallback, a
  static poster frame, and a perceptually-uniform colormap that survives grayscale.

---

## 1. "The problem" / clinical-motivation section

**Failure mode to kill:** 4 full-width paragraphs, no figure, no hierarchy.

**Proven patterns**

- **Hover-to-explore anatomical hero (the ONVZ pattern).** Dutch insurer ONVZ's brain
  guide replaces prose with one illustrated organ where hovering each region reveals its
  function; scroll-triggered sections layer sleep/nutrition/stress on top. This is the
  canonical clinical-motivation move: a labeled heart/torso SVG where hovering a
  structure (epicardium, torso electrodes, aortic valve) surfaces a one-line clinical
  stake. Turns readers into explorers, "keeps attention longer and makes medical content
  feel approachable rather than clinical."
- **Scrollytelling / stepper for the clinical journey.** ScrollyVis (Morth et al., IEEE
  VIS) and the Garrison/Mittenentzwei medical-visualization studies show
  narrative-medicine framing (patient -> symptom -> what the clinician cannot see ->
  why it matters) is validated for lay comprehension and *reduces anxiety / improves
  informed decisions*. Implement as a 3-5 step pinned narrative, each step swapping the
  hero figure, not stacked paragraphs.
- **Stakes as data, not adjectives.** Replace "arrhythmia is dangerous" prose with a
  small annotated stat panel / unit-visualization (a la NYT unit-viz): incidence,
  catheter-mapping time, spatial resolution gap. Numbers with one-line annotations read
  faster and are more credible than adjective-laden text.
- **Self-explanation beat:** "Where do you think the arrhythmia focus is?" — let the
  reader click a point on the torso before the real focus is revealed.

**Cited exemplars:** ONVZ brain guide (Maglr/lifesciencesmarketing case study);
ScrollyVis (arXiv 2207.03616); Garrison et al., *Investigating user behavior in
slideshows and scrollytelling in medical visualization* (Computers & Graphics 2023);
distill self-explanation (NYT "You Draw It").

**CardioPINN application:** hero = theme-aware annotated SVG torso+heart with
hover-labeled structures and electrode ring; a 3-step "why we can't just measure it"
stepper; a 3-tile stat strip; one "guess the focus" click beat. No paragraph wider than
its figure column.

---

## 2. "The target" / what-we-measure-vs-what-we-recover

**Core idea:** this tab is fundamentally a *contrast* — surface signals (body-surface
potentials; velocity field) vs the hidden quantity we recover (epicardial potentials;
pressure field). The whole SOTA vocabulary for contrast applies.

**Proven patterns**

- **Before/after drag slider (juxtapose pattern).** A draggable divider overlays two
  pixel-aligned fields so "even subtle changes are immediately visible" — the standard
  scientific ground-truth-vs-reconstruction device. Left = measured/observable, right =
  recovered/hidden, one handle. More legible than two separate figures because the eye
  compares in place.
- **Small multiples for the input->output map (Tufte).** "For a wide range of problems in
  data presentation, small multiples are the best design solution." A labeled grid —
  measured signal | forward operator | hidden target — with a shared color scale lets the
  reader compare in parallel at a glance. Pew and InfoVis-wiki document the shared-scale +
  per-panel-label rules.
- **Linked brushing between "what we measure" and "what we recover".** Selecting/hovering
  a location on the measured panel highlights the corresponding location and value on the
  recovered panel (multiple linked representations). Makes the many-to-one / ill-posed
  mapping tangible.
- **Value readout at the cursor** on both panels (the birdsong-map tooltip pattern):
  hovering shows the measured value and the recovered value at that coordinate, with units.

**Cited exemplars:** before/after juxtapose (Knight Lab Juxtapose lineage; SSIM
ground-truth-vs-reconstruction convention); Tufte small multiples (Visual Display 1983,
InfoVis-wiki, Pew Research "How we use small multiple charts"); distill linked-tooltip
birdsong map.

**CardioPINN application:** a two-panel linked view (measured vs recovered) with a
drag-slider mode toggle and a small-multiples strip (input | operator | target) on a
shared perceptually-uniform scale; cursor readout of both values + units; keyboard arrow
navigation across panels.

---

## 3. "How the governing PDE arises" — the derivation

**Failure mode to kill:** a static block of equations dumped as text.

**Proven patterns**

- **Animated / stepped derivation (the Manim/3Blue1Brown grammar) but interactive.**
  3b1b's core method: transform an equation term-by-term with paced pauses
  (`2x+5=13 -> 2x=8 -> x=4`), each step visually motivated. On the web, make it a
  **reader-controlled stepper**: Prev/Next reveals one line at a time, the changed term
  highlighted, a plain-language caption per step. This is exactly distill's
  "segmentation & pacing" + the reader controls the animation (as in Distill's
  "Visualizing Quaternions", narration + reader-scrubbed animation).
- **Colorized math with hover-to-explain (Distill canonical).** Each symbol is color-
  coded and mousing over it reveals its physical meaning and units. For a PDE derivation
  (conservation of charge -> bidomain; Navier-Stokes -> pressure Poisson), hovering
  \(\nabla\), \(\sigma\), \(\rho\), each term shows what it physically represents. The
  equation becomes self-documenting; no surrounding paragraph needed.
- **Coupled equation <-> geometry / control volume.** Show the physical picture (a control
  volume, a flux across a boundary) beside the algebra, linked so highlighting a term
  highlights the corresponding arrow/surface in the diagram (multiple linked
  representations). Setosa.io's applets (PCA, image kernels; Bret-Victor-inspired) are the
  reference for "manipulate the geometry, watch the math update."
- **Self-explanation checkpoint:** collapse the next step behind "what cancels here?"
  progressive disclosure so the reader predicts before the reveal (testing effect).

**Cited exemplars:** Manim / 3Blue1Brown stepped transforms (github.com/3b1b/manim;
arXiv 2510.01187 Manim-for-STEM); Distill colorized equations & "Visualizing
Quaternions"; setosa.io explorables (Bret Victor's Explorable Explanations lineage).

**CardioPINN application:** a Prev/Next derivation stepper, one line per step with the
changed term highlighted and a one-sentence caption; every symbol hover-explained
(meaning + units, KaTeX); a side control-volume/flux SVG that highlights in sync;
optional "predict the cancellation" disclosure. Keyboard-driven, SR-readable step
captions.

---

## 4. "Traditional approach and why it falls short"

**Core idea:** a *comparison* tab — classical solver (e.g. Tikhonov-regularized inverse;
finite-difference pressure) vs its failure mode (noise amplification, regularization
bias, mesh/boundary sensitivity).

**Proven patterns**

- **Interactive parameter demo showing the failure live (distill "Interactive
  Simulations").** The strongest pattern: a slider over the very knob that breaks the
  classical method — e.g. a regularization-strength (\(\lambda\)) slider that sweeps from
  over-smoothed to noise-amplified, or a noise-level slider — reading from *baked frames*
  (no solver in-browser). "Playing with parameters to see their effect" is distill's most
  effective documented device (t-SNE, UMAP explainers built entirely on this). Bake a
  parameter sweep, let the slider scrub it.
- **Side-by-side / small multiples of parameter regimes.** A small-multiple row of the
  classical result at 4-5 \(\lambda\) values with a shared color scale makes the
  bias-variance tradeoff visible in parallel (Tufte small multiples). Annotate the
  "best-looking but wrong" panel.
- **Before/after slider: classical result vs ground truth.** Reuse the juxtapose divider
  to show where the traditional reconstruction diverges from truth, region by region.
- **Annotated-figure callouts.** Point arrows + short labels directly onto the failure
  (ringing at the boundary, smeared focus) rather than describing it in a paragraph —
  the "from zero to figure hero" scientific-figure checklist (arXiv 2408.16007) and
  distill annotated figures.

**Cited exemplars:** distill *How to Use t-SNE Effectively* / *Understanding UMAP*
(parameter-sweep explorables); Tikhonov L-curve as the classical bias-variance object;
small multiples (Tufte); scientific-figure checklist (arXiv 2408.16007).

**CardioPINN application:** a \(\lambda\)/noise slider scrubbing a baked classical sweep
with a live error readout; a small-multiples strip of regimes on a shared scale with the
"plausible but wrong" panel flagged; a classical-vs-truth juxtapose slider; arrow
callouts on the failure modes. All from committed JSON.

---

## 5. "Physics-informed method" — the pipeline

**Core idea:** communicate a data-flow (inputs -> network -> physics residual /
PDE loss -> recovered field). The ML-explainer community has a mature, cited grammar for
exactly this.

**Proven patterns**

- **Sankey-style flow with hover-inspectable tensors (Transformer Explainer, CHI 2026).**
  Poloclub's Transformer Explainer "draws inspiration from the Sankey diagram to
  communicate how input data flows through the model, with gradient-colored paths
  illustrating transformations… vectors visualized as vertical bars, a 1D heatmap revealed
  on hover." This is the reference pattern for a PINN pipeline: nodes = stages (coords,
  MLP, autodiff derivatives, PDE residual, data loss), animated flow along edges, hover a
  node to reveal what tensor/quantity flows there.
- **Layered interactive architecture diagram (CNN Explainer, IEEE VIS 2020).** Poloclub's
  CNN Explainer (Svelte + D3, TF.js) lets users click any layer to expand its operation,
  with fluid overview<->detail transitions — the model for a clickable PINN block diagram
  where each block expands to its role and equation.
- **"Play with the model" sandbox (TensorFlow Playground / GAN Lab).** Playground and GAN
  Lab (poloclub) let readers toggle inputs and watch the network respond in-browser. For
  bake-and-read the analog is a *what-if over baked traces*: toggle which loss terms are
  on (data-only vs data+physics), scrub training epoch, and read the recovered field / loss
  curve from committed frames — the interaction feel of Playground without in-browser
  training.
- **Progressive disclosure of the loss.** Reveal the composite loss term-by-term (data
  misfit, PDE residual, boundary/IC) with each term hover-explained and its contribution
  plotted — details-on-demand over the objective.

**Cited exemplars:** Transformer Explainer (Cho/Wang/Chau, dl.acm.org/10.1145/3772318.3791725,
poloclub.github.io/transformer-explainer); CNN Explainer (Wang et al., IEEE VIS 2020,
poloclub.github.io/cnn-explainer); GAN Lab (Kahng et al., poloclub.github.io/ganlab);
TensorFlow Playground (playground.tensorflow.org).

**CardioPINN application:** a Sankey/block pipeline SVG (coords -> MLP -> autodiff
-> PDE residual + data loss -> recovered field), animated flow, hover each node for its
tensor/role, click to expand the block's equation; a "what-if" toggle over baked runs
(data-only vs physics-informed, epoch scrubber) with linked loss-curve and field; loss
revealed term-by-term. Play/pause, keyboard, SR fallbacks.

---

## 6. Interactive 3D field-over-time result (Reconstruction / Pressure recovery)

**Failure mode to kill:** poor, static reconstruction viz.

**Proven patterns**

- **Orbit + zoom + pick + linked chart (the medical-3D-viewer standard, VTK.js / itk-vtk-
  viewer).** Kitware's VTK.js and ITK/VTK Viewer are the web reference for interactive 3D
  scientific/medical fields: surface + scalar coloring, camera orbit/zoom, widgets for
  picking/annotating, and a **timestep animation handler** for 4D data. The validated
  interaction set: orbit/zoom the mesh, pick a point to pin its value, and drive a linked
  time-series chart of that point. (VTK.js v24; itk-vtk-viewer; Kitware "Modern Scientific
  Visualizations on the Web", Informatics 2020.)
- **4D-flow visual grammar (radiology SOTA).** For the pressure/flow case the domain
  standard (RSNA RadioGraphics; PMC 4D-flow reviews; the ISO X3D-in-browser 4D-flow
  pipeline, ACM 2024) is: **streamlines** (instantaneous, at peak systole),
  **pathlines** (trajectory over time), velocity vectors, and a scalar pressure/velocity
  colormap, all scrubbable over the cardiac cycle. Offer these as toggleable layers.
- **Time scrubber with play/pause, NOT autoplay.** A cardiac-cycle scrubber (systole
  <-> diastole) the reader controls; segmentation/pacing evidence says reader-controlled
  beats auto. (Also a hard perf/UX rule: no runaway animation, halt when tab hidden.)
- **Linked value readout + small-multiple phase strip.** Picking a point streams its
  value over the cycle to a coupled uPlot-style chart; a row of small-multiple phase
  snapshots (early-systole, peak, diastole) gives instant temporal overview (Tufte).
- **Perceptually-uniform, theme-aware colormap with an always-visible legend**; grayscale-
  safe; colorblind-safe. (Scientific-figure checklist arXiv 2408.16007.)

**Cited exemplars:** VTK.js / itk-vtk-viewer (Kitware, github.com/Kitware/vtk-js,
github.com/Kitware/itk-vtk-viewer); *Modern Scientific Visualizations on the Web*
(Informatics 2020, MDPI 2227-9709/7/4/37); 4D-flow MRI viz (RadioGraphics
10.1148/rg.2019180091; RSNA Radiology 10.1148/radiol.242972; X3D 4D-flow pipeline ACM
10.1145/3665318.3677155; Lattido 4D-flow platform).

**CardioPINN application:** the existing baked 3D trace rendered with orbit/zoom, a
cardiac-cycle scrubber (play/pause, not autoplay), point-pick that pins a value and drives
a linked time-series chart, toggleable field/streamline/vector layers for the 4D-flow case,
a small-multiple phase strip, perceptually-uniform theme-aware colormap + legend, and full
keyboard + SR-poster fallback.

---

## 7. Consolidated pattern -> tab matrix

| Tab | Primary SOTA pattern | Secondary | Key cited exemplar |
|---|---|---|---|
| The problem | Hover-region anatomical hero + clinical stepper | stat tiles, predict-the-focus | ONVZ brain guide; ScrollyVis; Garrison 2023 |
| The target | Before/after juxtapose + linked brushing | small multiples, cursor readout | Juxtapose/SSIM; Tufte; distill birdsong tooltip |
| How the PDE arises | Stepped animated derivation + colorized hover math | coupled geometry, predict-the-cancel | 3b1b/Manim; distill colorized eqs; setosa.io |
| Traditional approach | Parameter-sweep slider over baked failure | small-multiple regimes, annotated callouts | distill t-SNE/UMAP; Tufte; fig-hero checklist |
| Physics-informed proposal | Sankey/block pipeline, hover-inspect nodes | what-if toggle, term-by-term loss | Transformer Explainer; CNN Explainer; TF Playground |
| Reconstruction / Pressure recovery | Orbit+pick+linked-chart 3D + cycle scrubber | streamline/pathline layers, phase strip | VTK.js/itk-vtk-viewer; 4D-flow RadioGraphics |

**Two rules that recur across ALL six:** (1) the figure carries the meaning, prose is a
caption — kill full-width paragraphs; (2) every interactive needs a static poster,
keyboard control, SR text, and a perceptually-uniform theme-aware colormap.

---

## Sources

- distill.pub — *Communicating with Interactive Articles*, Hohman et al. 2020.
  https://distill.pub/2020/communicating-with-interactive-articles/
- Bartosz Ciechanowski — https://ciechanow.ski/ (Watch, Cameras and Lenses, Color Spaces);
  CSS-Tricks feature https://css-tricks.com/bartosz-ciechanowskis-interactive-blog-posts/
- ScrollyVis — Morth et al., arXiv 2207.03616 https://arxiv.org/pdf/2207.03616
- Garrison/Mittenentzwei et al. — *Investigating user behavior in slideshows and
  scrollytelling as narrative genres in medical visualization*, Computers & Graphics 2023.
  https://www.sciencedirect.com/science/article/abs/pii/S0097849323001061
- ONVZ interactive brain guide — case study,
  https://www.lifesciencesmarketing.nl/scrollytelling/ ; https://www.maglr.com/blog/best-scrollytelling-examples
- Manim / 3Blue1Brown — https://github.com/3b1b/manim ; *Manim for STEM Education*,
  arXiv 2510.01187 https://arxiv.org/html/2510.01187v1
- setosa.io explorables — https://setosa.io/ ; Explorable Explanations (Nicky Case)
  https://explorabl.es/ , https://ncase.me/
- Tufte small multiples — InfoVis-wiki https://infovis-wiki.net/wiki/Small_Multiples ;
  Pew Research https://www.pewresearch.org/decoded/2018/12/20/how-pew-research-center-uses-small-multiple-charts/
- Scientific-figure checklist — *From zero to figure hero*, arXiv 2408.16007
  https://arxiv.org/pdf/2408.16007
- Transformer Explainer — CHI 2026, https://dl.acm.org/doi/10.1145/3772318.3791725 ;
  demo https://poloclub.github.io/transformer-explainer/
- CNN Explainer — Wang et al., IEEE VIS 2020, https://poloclub.github.io/cnn-explainer/ ;
  paper https://poloclub.github.io/papers/20-vis-cnnexplainer.pdf
- GAN Lab — https://poloclub.github.io/ganlab/ ; TensorFlow Playground —
  https://playground.tensorflow.org/
- VTK.js / itk-vtk-viewer — https://github.com/Kitware/vtk-js ;
  https://github.com/Kitware/itk-vtk-viewer ; *Modern Scientific Visualizations on the Web*,
  Informatics 2020, https://www.mdpi.com/2227-9709/7/4/37/htm
- 4D-flow MRI viz — RadioGraphics 10.1148/rg.2019180091
  https://pubs.rsna.org/doi/abs/10.1148/rg.2019180091 ; RSNA Radiology
  10.1148/radiol.242972 ; X3D-in-browser 4D-flow pipeline, ACM 2024,
  https://dl.acm.org/doi/fullHtml/10.1145/3665318.3677155 ; Lattido http://www.lattido.com/
