# Footer + layout-void fixes (CardioPINN app-redesign)

Companion to `01-sota-ux.md` / `02-ecgi-tabs.md` / `03-flow-tabs.md`. This file specifies the two
non-tab fixes Felipe called out: (1) a max-2-line compact footer, and (3) the CSS that removes the
layout voids (short-left-column void, fixed-height 3D box, half-empty doc-page lede). It is a design
spec: it states the exact strings and CSS to apply, grounded in the code as it stands on 2026-07-14.
No RotorVitals or internal-CAOS app is referenced; the layout techniques cite external primary sources.

Ground truth read from the tree (so the spec targets real lines):

- Footer is rendered by the shared shell, not the app: `@fasl-work/caos-app-shell` `dist/index.js`
  lines 285-308. The app can only feed two strings, `config.footer.provenance` and
  `config.footer.disclaimer` (`frontend/src/main.tsx` lines 33-43). Everything else in the footer is
  shell-owned CHROME (`dist/index.js` lines 40-65): product name, `A CAOS research project`, `v` +
  version, `Developed by Felipe Santibanez-Leal`, `Source on GitHub`, `MIT licensed / open source`.
- Footer CSS: `.footer-meta` is `display:flex; flex-wrap:wrap` and `.footer-build` (the version) has
  `margin-left:auto` (shell `styles.css` lines 102-103). So the version is pushed to the right end of
  line 1; attribution onward wraps below it. The 3-4-line overflow is caused purely by the two long
  app strings on that wrapped run.
- App page layout: `.cardiopinn-layout` grid `300px minmax(0,1fr)`, max-width 1520 (`src/styles.css`
  lines 27-34); `.cp-side` is `position:sticky` (line 31); `.canvas-wrap` is a fixed `height:460px`
  (line 94). App page is NOT wrapped in `.page-body`, so it is already full-bleed to 1520.
- Doc pages use `.page-body.prose` (shell, max-width `--maxw` = 1200) with a `.page-head` whose
  `.lede` is capped at `max-width:70ch` (shell `styles.css` lines 137-139) inside the 1200px body:
  that is the half-empty-right void on Introduction/Methodology/Implementation/Experiments/Benchmark.

---

## (1) The max-2-line footer

### Target content and order (unchanged element set, only two strings trimmed)

The shell already emits exactly the eight elements Felipe listed, dot-separated, in this order:

```
CardioPINN . A CAOS research project . v0.20.000 ............ (version right-aligned, ends line 1)
Developed by Felipe Santibanez-Leal . <provenance> . Source on GitHub . MIT licensed / open source . <disclaimer>
```

Nothing is added or removed. The only defect is length: the two app-owned strings are long enough
that the second run wraps twice, giving 3-4 lines. Trimming them to the budgets below collapses the
whole footer to two visual lines at the current 1200px doc width (and the 1520px app width).

### Keep / cut / shorten

| Element | Source | Action | Rationale |
|---|---|---|---|
| `CardioPINN` | shell `config.product.name` | KEEP | product id, one word |
| `A CAOS research project` | shell CHROME `complement` | KEEP | fixed org line |
| `v0.20.000` | shell CHROME `version` + `config.version` | KEEP | right-aligned on line 1 by `margin-left:auto`; costs no line-2 space |
| `Developed by Felipe Santibanez-Leal` | shell CHROME `attribution` | KEEP | authorship, one clause |
| provenance | **app** `config.footer.provenance` | **SHORTEN** 52 -> 25 chars | see below |
| `Source on GitHub` (link) | shell CHROME `github` | KEEP | one honest external link |
| `MIT licensed / open source` | shell CHROME `license` | KEEP | license, already terse |
| disclaimer | **app** `config.footer.disclaimer` | **SHORTEN** 65 -> ~40 chars | see below |

CUT nothing from the element set. Inside the provenance string, CUT the parenthetical `(open-access)`
and the redundant nouns; inside the disclaimer, CUT the `runs offline` clause (it is already implied
by `baked traces`, and the honest, load-bearing half is "not clinical") and fold the rest.

### The exact strings to pass (this is also answer (2))

These are the only two values the app controls, so answer (1) and answer (2) are the same edit. Set
them in `frontend/src/main.tsx`, replacing the current `footer` block (lines 33-43):

```ts
footer: {
  // SHORT provenance: the two real data sources, no parenthetical, no filler.
  provenance: {
    en: 'EDGAR + 4D-flow aorta MRI',
    es: 'EDGAR + MRI de aorta 4D-flow',
  },
  // SHORT disclaimer: keep the two honest, load-bearing facts (baked read + not clinical).
  disclaimer: {
    en: 'reads baked traces, not for clinical use',
    es: 'lee traces horneados, sin uso clinico',
  },
},
```

Before -> after (character counts drive the line budget):

| String | Before | After |
|---|---|---|
| provenance EN | `Data: EDGAR (open-access) + a real 4D-flow aorta MRI` (52) | `EDGAR + 4D-flow aorta MRI` (25) |
| provenance ES | `Datos: EDGAR (acceso abierto) + una resonancia real de aorta 4D-flow` (68) | `MRI de aorta 4D-flow` prefixed by `EDGAR + ` (28) |
| disclaimer EN | `runs offline, the web reads baked traces; not clinically deployed` (65) | `reads baked traces, not for clinical use` (40) |
| disclaimer ES | `corre offline, la web lee traces horneados; no desplegado clinicamente` (70) | `lee traces horneados, sin uso clinico` (37) |

Why this is two lines, not three: line 2 now carries
`Developed by Felipe Santibanez-Leal (35) . EDGAR + 4D-flow aorta MRI (25) . Source on GitHub (16) .
MIT licensed / open source (26) . reads baked traces, not for clinical use (40)` = ~142 glyphs plus
7 separators. At `.footer-meta` font-size 0.85rem (~13.6px, avg glyph ~7px) that is ~1050px of text,
which fits on one wrapped run inside both the 1200px doc container and the 1520px app container. Line
1 holds only name + complement + right-aligned version, so the footer is exactly two lines on desktop
and degrades gracefully (wrap-per-element) on narrow viewports, which is acceptable and honest.

Honesty check: the trims drop no material claim. `open-access` was decorative (EDGAR is well known as
open); `runs offline` is entailed by `reads baked traces` (the browser never computes); `not for
clinical use` is a stronger, clearer safety statement than `not clinically deployed`.

### Optional shell follow-up (out of app scope, note only)

If a shell change is ever in scope: dropping `margin-left:auto` from `.footer-build` (shell
`styles.css` line 103) lets the version flow inline with the rest and removes the forced line-1 break,
which would let the footer collapse to a single line at wide widths. Do NOT change the shell for this
task; the app-only string trim already meets the <=2-line requirement. Recorded for completeness.

---

## (3) Layout-void fixes (App page full width, control column to the bottom, responsive 3D, doc-page lede)

All four are CSS-side edits in `frontend/src/styles.css` plus one tiny markup wrapper for the sticky
rail and one optional side node on the doc-page head. No shell CSS is touched.

### A. App page uses the full width  (already correct, lock it in)

`.cardiopinn-layout` is `max-width:1520px` and is rendered outside `.page-body`, so the App page
already fills far wider than the 1200px doc pages. The lede fill is already handled by
`.cp-main .lede { max-width:none }` (line 33). No change needed except to keep the App page rendering
its own `.cardiopinn-layout` wrapper directly (never inside `.page-body`, which would re-cap it to
1200). Documented so a later refactor does not regress it.

### B. Control column reaches the bottom (kill the short-left-column void)

Cause: the grid cell for `.cp-side` stretches full height (grid default), but the sticky control block
inside it is short, so the left half below the controls is blank while the main column runs long. The
fix is the standard "full-height rail, sticky inner" pattern: keep the column cell stretched and give
IT the panel/rail background so the column visually reaches the bottom, and move `position:sticky`
onto an inner wrapper that scrolls with the reader. This is exactly the align/sticky interaction
documented by Ahmad Shadeed and CSS-Tricks: a sticky child needs a taller, non-stretched-to-content
scroll parent to travel in, and stretch is the grid default (sources below).

Markup: wrap the current aside body in one node.

```tsx
// RealEcgi.tsx / Flow4d.tsx  (same edit in both)
<aside className="cp-side">
  <div className="cp-side-inner">
    {selector}
    {/* ...existing control blocks + readout... */}
  </div>
</aside>
```

CSS: replace the current `.cp-side` rule (line 31) and the 900px override (line 34) with:

```css
/* The column cell fills full height and carries a subtle vertical rail so the left side never
   ends in a blank void; the controls stick inside it. Pattern: stretched parent + sticky child. */
.cardiopinn-layout { align-items: stretch; }      /* default, stated explicitly for intent */
.cp-side {
  align-self: stretch;                            /* the CELL runs the full grid height */
  border-right: 1px solid var(--border);          /* a rail that reaches the bottom */
  padding-right: 20px;
  min-width: 0;
}
.cp-side-inner {
  position: sticky; top: 74px;
  display: flex; flex-direction: column; gap: 12px;
  max-height: calc(100dvh - 90px); overflow: auto;
}
@media (max-width: 900px) {
  .cardiopinn-layout { grid-template-columns: 1fr; }
  .cp-side { border-right: none; padding-right: 0; }
  .cp-side-inner { position: static; max-height: none; overflow: visible; }
}
```

This removes the void two ways at once: the cell rail (border + padding, optionally a
`background: color-mix(in srgb, var(--panel) 55%, transparent)`) draws the column to the bottom, and
the sticky inner keeps the controls in view. Per Felipe's fill-the-column intent, also add one real
content card at the bottom of `.cp-side-inner` (a compact "what am I looking at" legend / provenance
mini-card) so the rail carries meaning, not just a border; that content is specified in
`02-ecgi-tabs.md` / `03-flow-tabs.md`, this file only guarantees the column geometry.

### C. The 3D view fills its area responsively

Cause: `.canvas-wrap { height: 460px }` (line 94) is a fixed box; on a 1520px layout the main column
is ~1180px wide, so the 3D view is a short letterbox with dead space around it. `@react-three/fiber`'s
`<Canvas>` already fills its parent at 100% x 100% and re-fits on resize via a ResizeObserver, and the
r3f/three guidance is to let CSS own the element size and only update the camera aspect on resize
(three.js responsive docs) which r3f does automatically. So the only lever is the wrapper: size it by
aspect-ratio with sensible clamps instead of a magic pixel height.

Replace `.canvas-wrap` (line 94) with:

```css
.canvas-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;                          /* fills the column width, scales with it */
  min-height: 360px;                              /* never collapses on narrow screens */
  max-height: min(72dvh, 620px);                  /* never taller than the viewport */
  border-radius: var(--radius); overflow: hidden;
  border: 1px solid var(--border); background: var(--bg);
}
@media (max-width: 620px) { .canvas-wrap { aspect-ratio: 4 / 3; } }
```

`aspect-ratio` + `max-height` is well supported (Baseline) and needs no JS; r3f resizes the renderer
and camera to the new box on its own. The existing absolutely-positioned `.legend` / `.readout`
overlays (lines 95-97) keep working unchanged because the wrapper stays `position:relative`.

### D. The doc-page lede no longer leaves the right half empty

Cause: `.lede { max-width:70ch }` (shell line 139) inside the 1200px `.page-body` fills only the left
~62% of the head; the right ~38% is blank. Do NOT just widen the lede (a 100+ch measure is unreadable,
which is why 70ch exists). Instead split the head into a readable-measure lede on the left and a
compact fact/figure column on the right, so the width is filled with content, not stretched text. This
is the Tufte-style "put a small figure or key-facts panel beside the intro" move, consistent with the
fill-the-width rubric already used by `.fig-row` in the shell.

CSS (add to `src/styles.css`; app-scoped, overrides nothing in the shell):

```css
/* Doc-page head: readable lede left, a compact key-facts / mini-figure column right, so the
   1200px body is filled instead of leaving the right half blank. */
.page-head.split {
  display: grid;
  grid-template-columns: minmax(0, 62ch) minmax(0, 1fr);
  gap: 2rem; align-items: start;
}
.page-head.split .lede { max-width: none; }        /* the grid column already bounds the measure */
.page-head-aside {
  align-self: stretch;
  border-left: 1px solid var(--border); padding-left: 1.5rem;
  display: grid; gap: 0.75rem; align-content: start;
}
@media (max-width: 820px) {
  .page-head.split { grid-template-columns: 1fr; }
  .page-head-aside { border-left: none; padding-left: 0; }
}
```

Markup (one node added per doc page head; content is real per-page facts, not filler):

```tsx
<div className="page-head split">
  <div>
    <h1>{/* title */}</h1>
    <p className="lede">{/* existing lede */}</p>
  </div>
  <aside className="page-head-aside">
    {/* 3-5 key facts: dataset, method family, what is recovered, validation target, DOI count.
        Or a small theme-aware SVG. Per-page content lives in 02-/03-; this only fixes geometry. */}
  </aside>
</div>
```

On the App page this is not needed: `.cp-main .lede { max-width:none }` already fills the main column,
and the App head already carries the `REAL DATA / N beats` badge on its right (`RealEcgi.tsx` line 388).

---

## Sources (layout techniques; external, primary)

- Position sticky inside CSS Grid needs a non-stretched (or `align-items:start` / `align-self:start`)
  scroll parent, otherwise the item stretches to the cell and cannot travel: Ahmad Shadeed,
  "Using Position Sticky With CSS Grid" https://ishadeed.com/article/position-sticky-css-grid/ ;
  CSS-Tricks mirror https://css-tricks.com/using-position-sticky-with-css-grid/ ; CSS-Tricks,
  "A Dynamically-Sized Sticky Sidebar with HTML and CSS"
  https://css-tricks.com/a-dynamically-sized-sticky-sidebar-with-html-and-css/
- Let CSS own the canvas size; update only camera aspect + projection on resize (r3f does this via its
  ResizeObserver): three.js Fundamentals, "Responsive Design"
  https://threejsfundamentals.org/threejs/lessons/threejs-responsive.html ; three.js forum,
  "Resize canvas with different aspect ratio"
  https://discourse.threejs.org/t/resize-canvas-with-different-aspect-ratio/42439
- Fill the intro width with a small side figure / key-facts panel rather than a stretched text
  measure (Tufte small-multiples / side-figure practice): InfoVis-wiki, "Small Multiples"
  https://infovis-wiki.net/wiki/Small_Multiples (also catalogued in `01-sota-ux.md` Sources).

*Persisted 2026-07-14. Applies to CardioPINN frontend at v0.20.000; footer strings are the only
app-controllable footer fields, all other footer text is shell CHROME.*
