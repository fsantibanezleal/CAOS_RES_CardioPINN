# 01 · Overview: two physics domains, one bake-and-read product

## What CardioPINN is

CardioPINN is an applied physics-informed reconstruction product: it recovers cardiac quantities that cannot be
measured directly, from data that CAN be measured, and validates every case against a REAL gold standard.
There is no synthetic ground truth anywhere. A network that only re-solves an equation a classical solver
already solves answers no clinical question, so the premise is inverted: each case fits a REAL measured signal,
and the unmeasurable field is forced out of it by the physics.

The app is a catalogue of real applied cases across TWO different physics domains, with a top-level case
selector. The two domains do not share an equation, a solver, a dataset, or a runtime; they share only the
discipline (analytic gate, then real data) and the output boundary (a committed JSON trace the web reads).

## Domain A: ECG imaging (ECGi), quasi-static volume conduction

A torso tank records, simultaneously, the real body-surface potentials AND the true heart-surface potentials on
a cage around the heart. In a patient you only ever get the body surface; the heart-surface cage is the gold
standard you never have. ECGi reconstructs the heart-surface potentials from the body-surface recording (a
severely ill-posed inverse) to localize the origin of an arrhythmia and guide ablation.

This is a MULTI-DATASET catalogue reconstructed by the identical pipeline (no per-heart retuning) over
independent real EDGAR experiments:

- Human torso tank (Utah 2018-08-09; 192 body electrodes to 256 cage electrodes): sinus RE 0.65 / CC 0.72,
  paced PVP 0.58 / 0.80, AV-paced 0.54 / 0.85.
- In-situ dog (Maastricht; 140 body to 1321-node epicardium): sinus RE 0.54 / CC 0.78.

The per-node uncertainty is recalibrated so that roughly 90 percent of nodes fall within two standard
deviations of the true error. Bordeaux (open sock, rank-deficient), Valencia (a simulation, not a measurement)
and the ischemia BEM matrices (an unreadable MAT variant) were inspected and honestly excluded. The whole
reconstruction is NumPy/SciPy on the CPU; no torch is needed.

## Domain B: 4D-flow aortic pressure, incompressible Navier-Stokes

A real 4D-flow MRI scan measures the three-directional blood velocity in the aorta over the cardiac cycle but
never the pressure, which is the quantity a clinician needs to grade a stenosis or coarctation and cannot get
without a catheter. Pressure and velocity are tied by the fluid equations, so the pressure field follows from
the measured velocity.

A divergence-free velocity PINN denoises the measured velocity (data fit plus $\nabla\cdot v = 0$); the
relative pressure is then recovered by the pressure-Poisson equation solved from the network's ANALYTIC
derivatives. There is no invasive pressure gold standard (the reason the method exists), so the validation is
threefold: the engine recovers an analytic pressure exactly (the gate), the real-scan map is physiological (a
0.79 mmHg relative-pressure range on the real scan, from a 0.791 m/s peak velocity), and it brackets the
clinical simplified-Bernoulli estimate ($4\,V_{\max}^2 = 2.51$ mmHg from the same scan). The absolute magnitude
carries the method's uncertainty. This lane trains small PINNs on a local GPU with PyTorch.

## The bake-and-read principle

The product has a single, strict architectural rule: the physics runs OFFLINE and the web only READS its
output. Concretely:

1. The Python pipeline (`data-pipeline/cardiopinnlab/`) loads the raw data from a local, gitignored path,
   runs the reconstruction (ECGi) or the PINN plus Poisson solve (4D-flow), and writes a compact,
   schema-versioned JSON trace to `data/derived/<case>/`.
2. Those traces are the ONLY thing committed from the data (the raw datasets carry data-use agreements and are
   never redistributed): `data/derived/real-ecgi-catalogue/catalogue.json` (about 2.44 MB, 2 datasets, 4
   beats) and `data/derived/real-flow4d-pressure/trace.json` (about 1.59 MB, schema
   `cardiopinn.flow4d-pressure/v3`, a decimated 9000-point lumen cloud plus pressure at peak systole plus the
   pulsatile speed over 16 frames).
3. The static SPA fetches the trace at load time and renders it with three.js. It animates the baked frames
   (paused by default). It never trains, never runs an inference engine, never recomputes a field. There is no
   server.

This is why "bake-and-read" is not a slogan but the contract: the number you see in the web is exactly the
number the committed JSON holds, which is exactly what the offline engine produced. Any prose about ONNX,
onnxruntime-web, Pyodide, a browser inference session, or a live/replay gate is STALE and does not describe
this product: the deployed bundle ships none of these. That wording was dropped from these architecture docs in
0.12.001; any residue still lingering in code comments or ignore rules is leftover from the earlier design, not
a live capability.

## Why two domains at all

The point of the catalogue is to show the SAME discipline recovering an unmeasurable field in two settings that
share nothing but the method's honesty:

- a LINEAR ill-posed inverse (ECGi: a transfer matrix, regularization, and an ensemble), and
- a NONLINEAR PDE-constrained recovery (4D-flow: a divergence-free fit and an elliptic pressure solve).

Both are validated the only honest way each admits: ECGi against a REAL measured heart cage, 4D-flow against an
EXACT analytic pressure plus a physiological-range and clinical-bracket argument (because no invasive truth
exists). The architecture keeps them in separate modules and separate runtimes precisely so that neither
domain's assumptions leak into the other.

## References

- Aras K, Good W, Tate J, et al. (2015). Experimental Data and Geometric Analysis Repository (EDGAR).
  Journal of Electrocardiology 48(6):975-981. DOI 10.1016/j.jelectrocard.2015.08.008.
- Bear LR, Cheng LK, LeGrice IJ, et al. (2015). Forward problem of electrocardiography: is it solved?
  Circulation: Arrhythmia and Electrophysiology 8(3):677-684. DOI 10.1161/CIRCEP.114.001573.
- Raissi M, Yazdani A, Karniadakis GE (2020). Hidden fluid mechanics: learning velocity and pressure fields
  from flow visualizations. Science 367(6481):1026-1030. DOI 10.1126/science.aaw4741.
</content>
