# CardioPINN status

Live: https://cardiopinn.fasl-work.com  ·  Version: 0.21.005  ·  Updated: 2026-07-15

## What CardioPINN is
A bake-and-read research app: the physics is computed offline (GPU) into committed JSON traces, and the web reads
those traces (no model runs in the browser). Two physics domains, each a case workbench with the same six App
tabs (Reconstruction/Pressure-recovery, The problem, The target, How the PDE arises, Traditional approach,
Physics-informed proposal), plus the five doc pages (Introduction, Methodology, Implementation, Experiments,
Benchmark):
- ECGi: recover heart-surface potentials from body-surface potentials (ill-posed inverse, Laplace), validated on
  the EDGAR torso-tank + in-situ-dog datasets against the simultaneously measured cage (real gold standard).
- 4D-flow: recover the aortic relative pressure field from a real 4D-flow MRI velocity cloud via the pressure
  Poisson equation (incompressible Navier-Stokes source).

## Current state (shipped)
- 0.19.000: deep, primary-source-verified problem statements.
- 0.20.000: adversarial beyond-SOTA evaluation of the 4D-flow PINN. One advance CONFIRMED and shipped (analytic
  autograd source/flux vs a finite-difference source, ~63x lower pressure-drop error on a known answer, gated in
  `flow4d_denoise.gate_analytic_vs_fd` + `tests/test_flow4d_analytic_source.py`). The other three candidates are
  honest NULLs (curl-based hard divergence-free, differentiable denoiser-solver coupling, structural UQ), see
  `research/beyond-sota-pinn-2026-07-14/findings.md`. The App redesign is a UX/quality fix, not a new advance.
- 0.21.000: App redo. Every tab rebuilt into the interactive kit (see `quality-defects.md` D-001..D-007),
  grounded in `research/app-redesign-2026-07-14/`, tab set unchanged.
- 0.21.001: fixed every linked uPlot chart rendering blank (D-008), caught on the live deploy.
- 0.21.002: fixed the 4D-flow lumen point cloud reading sparse/pale on a light background (diverging-midpoint
  invisible on the page bg); point clouds now render on a fixed mid-slate data viewport, solid in both themes.
- 0.21.003: App tab layout (D-009). A per-tab audit found 30 layout defects (prose not using the full column
  width, disperse symbol lists, hero-rail height voids). Fixed: tab prose fills the column, def-grids pair
  term+definition, secondary content moved out of narrow rails into balanced full-width rows. A second audit pass
  cut defects to 11.
- 0.21.004: fixed the one content-loss residual (ECGi Traditional closed-form equation was clipped in the narrow
  rail; moved full-width) + the PDE schematic caption to full-width. Remaining items are minor transient
  stepper/bracket height bands, accepted (padding a card with filler is disallowed).
- 0.21.005: full adversarial revision (16-reviewer audit + verify pass, 61 confirmed findings; ~55 fixed, all 6
  HIGH). Content-honesty (ensemble-vs-Tikhonov, cage gain/oracle-lambda leakage disclosure, denoised-vs-measured
  velocity, severe-line metric), robustness (error boundary, fetch handling, dataset-aware target tab, coords
  guard, NaN floor), styles + docs. Dossier: revision-2026-07-15.md (with the tracked remainder).

## Verified
tsc + vite build + content-standards green. Every App tab screenshot-verified in both cases and both themes (viz
fills its stage, no void, no wall of text, footer 2 lines). Chart traces confirmed drawing by canvas-pixel
sampling on the live site; point cloud confirmed solid in both themes on the live site.

## Open / next (not blocking)
- The confirmed analytic-gate advance is validated on analytic flows only; the real scan has no invasive pressure
  gold standard, so absolute magnitude carries the method uncertainty honestly (stated in the app).
