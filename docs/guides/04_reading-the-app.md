# 04, Reading the live app

The App is a workbench, not a slideshow. It shows REAL results, computed offline and committed as JSON traces,
rendered live on the real geometry: nothing trains or infers in your browser. This guide is how to drive it.

Live: https://cardiopinn.fasl-work.com/ (or `npm run dev` locally, guide 01). The layout follows the shared
shell: a sticky header (brand, nav, external links, the ⓘ Architecture button, language and theme toggles), a
LEFT control column, and a wide result area. Everything is bilingual (EN/ES) and theme-aware (light/dark).

## 1. The research-case selector (top of the left column)

CardioPINN is a catalogue across TWO different physics domains, and the top block of the left column is the
case selector (`Workbench.tsx`):

- **ECG imaging** — recover heart-surface potentials by quasi-static volume conduction (a Laplace problem).
- **4D-flow pressure** — recover the aortic pressure field by incompressible Navier-Stokes (a pressure-Poisson
  problem).

Under the dropdown, a small meta line names the physics and the field being recovered. Switching the case
swaps the entire workbench between the two per-case pages (`RealEcgi.tsx` and `Flow4d.tsx`), each with its own
controls, live readout, and result-first tabs.

## 2. The ECG-imaging workbench

### Controls (left column)

- **Dataset** — which real EDGAR experiment: the human heart in a torso tank (192 body electrodes recovering a
  256-electrode cage) or the in-situ dog heart (140 body electrodes recovering a 1321-node epicardial map).
  The same physics-informed pipeline runs on both with no retuning, which is the point of a catalogue.
- **Beat** — the rhythm: sinus, paced PVP, or paced AVP (the human tank has all three; the dog has sinus).
- **Field** — what the 3D map colours: the Recovered potential (our result), the Measured potential (the real
  gold standard the cage recorded), their Absolute error, or the per-node Uncertainty.

### Live diagnosis readout (against the real gold standard)

Below the controls, the readout shows the live reconstruction quality for the selected dataset and beat,
computed against the REAL measured cage potentials: relative error, spatial correlation, node-UQ reliability
(fraction of nodes within 2 sigma), and the heart-node count. Expected honest ranges: human tank RE 0.54-0.65
/ CC 0.72-0.85, dog RE 0.54 / CC 0.78, node-UQ about 0.90 throughout. The paced beats reconstruct at higher
correlation than sinus, which is physically expected: a focal paced activation is easier to localize than the
diffuse sinus wavefront.

### The result (main area)

The default "Reconstruction" tab shows the recovered field on the real heart-cage geometry in an orbitable 3D
view (drag to rotate). A "Beat time" slider scrubs through the beat; "Play beat" animates it ONCE (it stops at
the end and halts if you switch tabs, never a background compute loop). The legend gives the colour scale (a
diverging map for the signed potential fields, sequential for error/uncertainty), and the on-canvas readout
marks the node of maximum absolute error at the current frame. Toggle the Field control to compare the
recovered map against the measured gold standard and see where the error concentrates.

## 3. The 4D-flow-pressure workbench

### Controls (left column)

- **Field** — Relative pressure (mmHg, at peak systole) or Speed (m/s, over the cardiac cycle).

### Live readout (real scan)

Peak velocity (0.791 m/s), the recovered pressure range (0.79 mmHg), the clinical Bernoulli reference
$4V_{\max}^2$ (2.51 mmHg), and the lumen voxel count. The physics-based pressure field is the same order as
the routine Bernoulli estimate for this unobstructed aorta, while additionally revealing WHERE the pressure
varies, which a single Bernoulli number cannot.

### The result (main area)

The default "Pressure recovery" tab renders the aortic lumen as an orbitable 3D point cloud coloured by the
selected field (diverging for signed relative pressure, sequential for speed). With Speed selected, a "Cardiac
phase" slider scrubs the cycle and "Play cycle" animates it once. The honest-scope callout explains the
noise-robustness result and its limit: a velocity-noise ensemble moves the pressure by under 0.01 mmHg, so the
dominant uncertainty is NOT measurement noise (it is the absent invasive gold standard, the lumen
segmentation, and the unsteady-term approximation), which is why a per-voxel uncertainty MAP is deliberately
not shown (it would be a misleading uniform ~0 field); the robustness is reported as a scalar instead.

## 4. The result-first tabs (both cases)

Both pages put the interactive result FIRST, then walk the pedagogy in tabs. For ECGi: The problem, The
target, How the PDE arises (volume conduction to the linear forward operator, single-layer and BEM), the
Traditional approach (Tikhonov), and the Physics-informed proposal (graph-Laplacian prior + deep-ensemble
UQ). For 4D-flow: The problem, The target, How the PDE arises (Navier-Stokes to the pressure-Poisson
equation), the Traditional approach (simplified Bernoulli), and the Physics-informed proposal (divergence-free
denoising + analytic-derivative Poisson solve). Each carries captioned KaTeX equations, a theme-aware SVG, an
honest-scope callout, and inline references with real DOIs.

## 5. The Architecture ("How it works") modal

The ⓘ button in the header opens the Architecture modal (ADR-0058): a tab strip, each pairing one hand-authored
theme-aware SVG with a short bilingual explanation, covering the app (two physics domains, one catalogue), the
lanes (offline CPU/GPU physics vs the static web that only reads), the web-app flow (the SPA plus the five deep
doc pages and the Pages deploy), the science (the two governing chains), and the data contracts (raw data
gitignored, only the derived trace committed, guarded by completeness and physiological floors). It is the
fastest way to see that no model runs in the browser: the heavy physics is baked offline and gated on an
analytic known answer, and the web reads the committed trace.

## What the app is, and is not

- It IS a real workbench over real results: real measured signals, validated offline, rendered live. Every
  number in the readouts is a committed, re-verified artifact metric.
- It is NOT a live solver or a simulator with knobs that recompute physics in the browser. The sliders scrub
  BAKED frames of a real beat or cardiac cycle; they never trigger training or inference.
- It is NOT clinically deployed. The ECGi case is validated against a real torso-tank / in-situ cage gold
  standard; the 4D-flow case has no invasive gold standard (the reason the method exists), so its absolute
  pressure magnitude carries the method's uncertainty and the validation is the analytic gate, the
  physiological range, the noise-robustness, and the Bernoulli bracket.

## References

- Aras K, Good W, Tate J, et al. (2015). Experimental Data and Geometric Analysis Repository (EDGAR).
  Journal of Electrocardiology 48(6):975-981. DOI 10.1016/j.jelectrocard.2015.08.008.
- Bear LR, Cheng LK, LeGrice IJ, et al. (2015). Forward problem of electrocardiography: is it solved?
  Circulation: Arrhythmia and Electrophysiology 8(3):677-684. DOI 10.1161/CIRCEP.114.001573.
- Sahli Costabal F, Yang Y, Perdikaris P, et al. (2020). Physics-informed neural networks for cardiac
  activation mapping. Frontiers in Physics 8:42. DOI 10.3389/fphy.2020.00042.
