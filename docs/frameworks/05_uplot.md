# uPlot: the theme-aware linked 2D charts

## What it is

uPlot is a small, fast canvas charting library for time-series and x/y line plots: it draws directly to a
2D canvas rather than building an SVG DOM, which keeps it light and quick even with thousands of points.
CardioPINN pins `uplot@^1.6.32` in the frontend `package.json` and imports its stylesheet
(`uplot/dist/uPlot.min.css`). It is the only 2D-charting engine in the bundle; every line chart the app draws
goes through one wrapper, `frontend/src/kits/UPlotChart.tsx`, and nothing forks or re-implements it.

uPlot draws the LINKED 2D charts that sit beside the three.js 3D views (card 04): the coupled per-point time
series next to the interactive field, and the Bernoulli gradient curves in the 4D-flow explanatory tabs. Like
the rest of the app it is bake-and-read: it plots arrays that came from the committed JSON traces, never a live
computation.

## Why uPlot for these charts

The interactive-visualization-rubric asks each analytical chart for a value readout, zoom/pan, theme
awareness, and a keyboard/screen-reader fallback, without a compute-heavy or autoplay-y render. uPlot fits that
brief: it is a couple of tens of kilobytes, redraws a several-hundred-point series in well under a frame, and
exposes the low-level `draw` and `setCursor` hooks needed to paint a synced cursor and named markers on top of
the plot. A heavier charting stack (a full SVG/React chart library) would add bundle weight and a virtual-DOM
node per point for no gain on these small, dense series, and would make the canvas-level cursor coupling with
the 3D view harder. uPlot gives direct canvas control, which is exactly what the coupling needs.

## How CardioPINN uses it

`UPlotChart` is one theme-aware wrapper used everywhere; the callers pass only data, series styling, axis
labels, an optional synced cursor, and optional pinned markers.

### The coupled per-point time series (`pages/Flow4d.tsx`, `pages/RealEcgi.tsx`)

Beside each 3D field there is a chart of the picked node over the cardiac cycle, and the two move in lockstep.
In the 4D-flow view (`Flow4d.tsx`) the chart plots the speed at the selected lumen point across the cycle, with
a marker pinned at the peak-systole frame; in the ECGi view (`RealEcgi.tsx`) it plots the recovered potential
against the measured potential at the selected cage node over the beat (two series, a solid recovered line and a
dashed measured line). In both, `cursorX` is set to the current phase (`times_ms[currentFrame]`), so as the user
scrubs or plays the 3D field once, a vertical accent line tracks the same instant on the chart. The numeric
readout below the chart (peak velocity and pressure span, or relative error and correlation) comes from the same
trace, so the picture and the numbers cannot disagree.

### The Bernoulli gradient curves (`pages/Flow4d.tsx`, explanatory tabs)

The 4D-flow case explains why a single peak velocity over-simplifies the pressure gradient by plotting the
simplified Bernoulli curve `4*Vmax^2` (and, in the traditional-approach tab, the expanded
`4*(Vmax^2 - V1^2)` alongside it) against a dashed severe-threshold reference line, with a `now` marker pinned
at the current `Vmax`. These are pure explanatory curves computed in the component over a fixed `Vmax` grid, not
trace data, but they use the identical wrapper so the styling, theming, and marker behavior match the data
charts exactly.

## The engineering that makes the wrapper correct

A canvas chart repaints from JavaScript, so the wrapper has to solve three things a naive uPlot mount gets
wrong, each learned the hard way (see the management-repo note on web-viz bugs a green build hides):

- **Theme-aware colors that actually repaint.** Axis, grid, tick, and label colors are read from the shared
  shell CSS variables (`--color-fg`, `--color-fg-subtle`, `--color-border`, `--color-accent`) at build time. A
  canvas `strokeStyle` cannot resolve `var(--x)`, so callers pass series colors as `var(--accent)` and
  `resolveColor` turns them into concrete hex before they reach the canvas. A `MutationObserver` on the root
  `data-theme` attribute rebuilds the chart on a light/dark toggle so every color repaints, rather than leaving
  a chart stroked in the previous theme's palette.

- **Explicit data extents so the scales never go null.** The x and y scales are given `range` callbacks
  (`xExtent`, `yExtent`) that compute the extent from the current data. uPlot's auto-ranging can leave a scale
  null when a chart is first built with empty data and only later fed through `setData`, which draws a blank
  plot that still type-checks and builds green. Ranging explicitly to the data on every draw removes that
  failure mode; `yExtent` also ignores non-finite samples and adds an 8 percent pad so a flat series still gets
  a sensible band.

- **An overlay that redraws without rebuilding.** The synced `cursorX` line, the pinned `markers`, and the
  optional `y = x` identity reference are painted in uPlot's `draw` hook from a ref holding the latest overlay
  props, so a cursor or marker change triggers a cheap `redraw()` rather than a full chart teardown. New data
  goes through `setData` (no rebuild), and a `ResizeObserver` keeps the width in sync with the container. Only a
  height/label/scale-type or theme change rebuilds.

The legend is turned off (the readout list and the figure caption carry the numbers instead), the x-axis
supports drag-to-zoom, and the host element is `role="img"` with a descriptive `ariaLabel` that states the
current values in words, which is the screen-reader fallback the rubric asks for.

## Honest limits and substitutions

- The wrapper also exposes `onHover`, `onClickX`, `logX`, and the `y = x` identity reference, but the charts
  shipped today use only `cursorX` (the synced marker driven by the 3D scrubber) and the pinned `markers`. Those
  hooks are wired and tested in the wrapper for future linked charts, not decorative dead code, but no current
  page drives a chart-to-3D pick through `onClickX`; the coupling flows the other way (the 3D view drives the
  chart cursor).
- The Bernoulli curves are analytic explanatory functions evaluated in the component, not values read from a
  trace; they are labeled as such in the tab and are the one place a chart is not plotting committed data.
- Zoom is x-only (`drag: { x: true, y: false }`); a double-click resets it. There is no data export, brushing,
  or multi-axis overlay, none of which these single-panel charts need.
- uPlot is a pure client-side renderer of baked arrays. It does no computation, no fetching, and no inference;
  every quantity it plots is produced by the offline NumPy/SciPy and PyTorch pipeline (cards 01 and 02) and read
  from the committed JSON trace, exactly like the three.js 3D views (card 04).

## References

- Sorokin L. uPlot: a small, fast chart for time series, lines, areas, ohlc and bars. MIT-licensed.
  Source and API docs: https://github.com/leeoniya/uPlot (npm `uplot`, pinned `^1.6.32`).
- CAOS interactive-visualization-rubric (management repo, `conventions/interactive-visualization-rubric.md`):
  the value-readout, theme-aware, zoom/pan, and keyboard/screen-reader requirements this wrapper implements.
