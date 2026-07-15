# CardioPINN App quality defects: the record Felipe raised, and how each was resolved

This is the persisted, honest registry of the App-quality defects Felipe raised about the CardioPINN frontend,
plus the resolution of each. It exists because he asked for his findings to be registered, not paraphrased away,
and because the App had shipped hollow (static non-reactive 3D, walls of prose, scroll-clipped equations,
mis-placed global controls, layout voids) while being described as done. Findings are stated in his terms.

Status legend: OPEN (not addressed), RESOLVED (fixed and screenshot-verified), STANDING (a working rule, not a
one-off fix).

## D-000 (meta, STANDING): I over-claimed quality and cannot auto-evaluate a rendered app
Felipe caught me calling the work "impressive / advanced" and claiming a beyond-SOTA advance that did not exist,
and not validating every view before declaring done. The honest beyond-SOTA result (see
`research/beyond-sota-pinn-2026-07-14/findings.md`) is that ONE advance was confirmed and shipped (analytic-vs-FD
source gate, ~63x on a known answer) and the rest are honest nulls; the App redesign is a UX/quality fix, NOT a
new scientific advance. Rule: never self-certify quality; screenshot-verify EVERY view (both cases, both themes,
every tab); the honest record is the product. This is why the 0.21.001 chart bug (D-008) was caught: by looking
at the live deploy, not by trusting the build being green.

## D-001 (RESOLVED, 0.19.000 / 0.20.000): broken tab + reference styling, invalid citations
The tab styles were "trash", the references were malformed (e.g. a bare "Aras K... doi:..." that is not a valid
citation), and the header/footer did not honor the ADRs. Resolved by adopting the shared shell
`@fasl-work/caos-app-shell` (ADR-0016): the shell owns the header, footer, nav, Tabs/SubTabs, and the Cite/Refs
primitives, so tabs and references render to the ADR standard and citations are structured, not hand-typed.

## D-002 (RESOLVED, 0.21.000): the App page itself is poorly built
His words, from `stupid_cardio_pinn/001.png` at 100% scale: the footer is not visible; the layout is badly
designed; the full width is not used properly; the left column is inconsistent in height and does not reach the
lower area (a void); it is dirty; the "Play beat" button has no proper style; and the 3D viz is poor and not
dynamic at all. Resolved:
- full width: `.cardiopinn-layout` is a `300px + minmax(0,1fr)` grid capped at 1520px; the main column fills it.
- left-column void: `.cp-side` stretches the full main-column height with a right border; the sticky scrollable
  part is `.cp-side-inner`, so the rail reaches the bottom (no short-column void).
- Play button: `.play-btn` styled (border, hover, active `.on`) and paired with a real range scrubber `.scrub`.
- 3D viz: replaced the static mesh with `FieldView3D` (orbit + zoom, click/keyboard node-pick, pinned picked +
  argmax markers, perceptually-uniform colormap legend, value readout); picking a node drives a linked chart.

## D-003 (RESOLVED, 0.21.000): the footer does not follow the ADR standard
From `002.png`: the disclaimer is fine but the footer must be a maximum of two lines with relevant content,
following the standard (ADR-0016 section 2). Resolved by shortening the provenance string so the shell footer
renders as two compact lines (verified at 100% in `001.png`-equivalent screenshots, light and dark).

## D-004 (RESOLVED, 0.21.000): the-problem tab is a wall of text
From `003.png`: "is that problem prose attractive for anyone?" It was a prose wall. Resolved: the problem tabs
are now a `StatStrip` of sourced figures (each tile carries its citation) coupled to an annotated many-to-one
clinical SVG and a `ClinicalStepper` that walks the clinical story one step at a time. The prose wall is gone.

## D-005 (RESOLVED, 0.21.000): controls that drive one tab were in the global left column
His point: Beat / sinus rhythm / Field / Uncertainty only change the Reconstruction tab, so allocating them to
the global left column is poor organization; likewise changing the dataset. A left column for controls and a
right area for the reconstruction image is not better. Resolved: the per-view controls (field toggle, beat
play/scrub, node-pick) now live INSIDE the tab they drive (the `.hero-rail-side` next to the 3D view). The left
rail keeps only the genuinely global case/dataset/beat selectors and the live-diagnosis readout.

## D-006 (RESOLVED, 0.21.000): methodology sub-tabs rendered at the left
From `004.png`: "tabs at left? why don't you follow the ADRs?" The App tabs are horizontal per the shell. The doc
pages use the shell SubTabs. The App tab bar is horizontal and ADR-conformant; the empty-right-of-lede that read
as "tabs at left" is addressed by the full-width main column (D-002).

## D-007 (RESOLVED, 0.21.000): keep the tabs, but make each one rich, dynamic and attractive; not RotorVitals
The explicit brief for the redo: keep the exact tab set, do not restructure; make each tab genuinely rich,
dynamic and attractive; do not copy RotorVitals; ground it in external SOTA UX. Resolved: the redesign is
grounded in `research/app-redesign-2026-07-14/` (an external-SOTA UX dossier), the tab set is unchanged, and each
tab is a composition of the interactive kit (FieldView3D, UPlotChart, HoverMathEq, StatStrip, ClinicalStepper,
DerivationStepper, Juxtapose, PipelineSvg, SmallMultipleStrip). Verified tab-by-tab, both cases, both themes.

## D-008 (RESOLVED, 0.21.001): every linked chart shipped blank (caught on the live deploy)
0.21.000 shipped with every `UPlotChart` drawing nothing (recovered-vs-measured over the beat, speed-over-cycle,
the Bernoulli parabola). Caught by looking at the live deploy and sampling the chart-canvas pixels (0 coloured
pixels), not by the green build. Two shared-kit bugs: the x-scale never ranged (chart built with empty data
before the async trace load; `setData` did not re-range), and the series stroke was a CSS `var(--accent)` that a
canvas `strokeStyle` cannot resolve. Fixed with explicit `range` functions over a live `dataRef`, `time:false`
on x, and a `resolveColor` helper. Re-verified: all traces draw, on the live site, at v0.21.001. This is D-000 in
practice: the build being green is not the same as the view being correct.

## D-009 (RESOLVED, 0.21.003): App tab prose and content did not use the full column width (dead voids)
Felipe flagged (screenshot `cardia_issue.png`, the How-the-PDE-arises tab) that "some text doesn't use the full
width", with a dead void beside it. A parallel per-tab audit (one agent per tab, screenshot + code) found 30
layout defects across ALL 12 tabs in three classes: (1) lone `.measure` paragraphs capped at 70ch leaving ~475px
dead space to their right (~14 instances, the dominant defect); (2) `dl.def-grid` symbol lists rendering with
one-word terms scattered far from their definitions and empty trailing cells (disperse/broken look); (3)
`.hero-rail` height-imbalance voids where a short column left a big dead rectangle beside a tall one (secondary
content stuffed into a narrow rail). This is D-000 again: I had "verified" the redo without scrutinizing every
tab, and missed voids on the derivation/target/traditional/pinn tabs. Resolved: App-scoped CSS so tab prose fills
the column (`.cp-main .measure { max-width:none }`) and def-grids pair term+definition adjacently
(`max-content minmax(0,1fr)`); JSX moves so secondary content (glossary, StatStrip, brackets) leaves the narrow
rails for balanced full-width rows below; standalone schematics fill the column. Re-verified by a SECOND parallel
audit pass over fresh screenshots of all 12 tabs.

## Where the redo lives
- Research: `research/app-redesign-2026-07-14/` (00 build plan, 01 SOTA UX, 02 ECGi tabs, 03 flow tabs, 04
  footer/layout).
- Kit: `frontend/src/kits/` (FieldView3D, UPlotChart, HoverMathEq, StatStrip, ClinicalStepper, DerivationStepper,
  Juxtapose, PipelineSvg, SmallMultipleStrip, colormap).
- Pages: `frontend/src/pages/RealEcgi.tsx`, `frontend/src/pages/Flow4d.tsx`.
- Shipped: 0.21.000 (redo) and 0.21.001 (chart fix); live at cardiopinn.fasl-work.com.
