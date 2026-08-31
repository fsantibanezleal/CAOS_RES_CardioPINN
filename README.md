# CardioPINN

Applied physics-informed reconstruction of cardiac quantities that cannot be measured directly, from data
that can be measured. Every case fits a real measured signal and is validated against a real gold standard.
There is no synthetic ground truth: a network that only re-solves an equation a classical solver already
solves answers no clinical question.

Live: https://cardiopinn.fasl-work.com/

[![DOI](https://img.shields.io/badge/DOI-10.5281%2Fzenodo.21508806-blue)](https://doi.org/10.5281/zenodo.21508806)

Preprint (CC-BY-4.0): *"Physics-Informed Reconstruction of Unmeasurable Cardiac
Fields from Real Data: Electrocardiographic Imaging and 4D-Flow Aortic Pressure,
with Honest Nulls"*, concept DOI [10.5281/zenodo.21508806](https://doi.org/10.5281/zenodo.21508806)
(source in [`manuscripts/physics-informed-cardiac-fields/`](manuscripts/physics-informed-cardiac-fields/)).

> Status: real-data-first (0.1x, validated methodological results). Not clinically deployed; validated methodological results on real
> experimental data. Raw datasets are used under their data-use agreements and are not redistributed.

The app is a catalogue of real applied cases across two different physics domains, each recovering an
unmeasurable clinical field from a measurable one on real data, with a top-level case selector.

## Case 1: ECG imaging (ECGi) - quasi-static volume conduction

A torso tank recorded, simultaneously, the real body-surface potentials and the true heart-surface potentials
on a cage around the heart. In a patient you only ever get the body surface; the heart-surface cage is the
gold standard you never have. ECGi reconstructs the heart-surface potentials from the body-surface recording
(a severely ill-posed inverse) to localize an arrhythmia and guide ablation.

This is a multi-dataset catalogue reconstructed by the identical pipeline (no per-heart retuning) over
independent real EDGAR experiments:

- **Human torso tank** (Utah 2018-08-09; 192 body -> 256 cage): sinus RE 0.65 / CC 0.72, PVP RE 0.58 /
  CC 0.80, AV-paced RE 0.54 / CC 0.85, node-UQ ~0.90.
- **In-situ dog** (Maastricht; 140 body -> 1321-node epicardium): sinus RE 0.54 / CC 0.78.

Bordeaux, Valencia and the ischemia BEM were inspected and honestly excluded (open partial sock is
rank-deficient; Valencia is a simulation, not a measurement; the ischemia BEM matrix is an unreadable MAT
variant and torso-specific). We fit the real body-surface potentials through a forward operator on the real
geometry, with a graph-Laplacian prior on the heart surface and a deep ensemble for a calibrated per-node
uncertainty (NumPy/SciPy; no torch needed).

## Case 2: 4D-flow aortic pressure - incompressible Navier-Stokes

A real 4D-flow MRI scan measures the 3D-plus-time blood velocity in the aorta but never the pressure, which is
the quantity a clinician needs to grade a stenosis or coarctation but cannot get without a catheter. Pressure
and velocity are tied by the fluid equations, so the pressure field follows from the measured velocity.

- **The method.** A divergence-free velocity PINN (data fit + `div v = 0`, torch) denoises the measured
  velocity; the relative pressure is then recovered by the pressure-Poisson equation `lap(p) = S(v)` solved
  from the network's analytic derivatives (computing the source and Neumann flux analytically, not by finite
  differences at the lumen edge, is what removes the boundary artifact that otherwise wrecks the map).
- **What we validate.** There is no invasive pressure gold standard (the reason the method exists). The engine
  is gated on an analytic converging duct whose exact pressure drop is known (correlation 1.00) and on a
  time-varying Poiseuille flow for the unsteady term (dv/dt correlation 0.995) before any real data is trusted.
  A space-time PINN gives the analytic unsteady acceleration over the whole cycle; with it the real-scan map is
  physiological (a 0.79 mmHg relative-pressure range, small for this unobstructed aorta) and the same order as
  the clinical simplified-Bernoulli estimate (2.51 mmHg from the same scan's 0.791 m/s peak velocity). The
  absolute magnitude carries the method's uncertainty.

## Repository

```
data-pipeline/cardiopinnlab/
  real/ecgi_edgar.py       # ECGi engine: forward operator -> Tikhonov / graph-reg / deep-ensemble node UQ
  real/ecgi_catalogue.py   # config-driven multi-dataset ECGi loader (per-lab field-name/mesh variants)
  real/flow4d_dicom.py     # decode the real Philips 4D-flow DICOM velocity series (pydicom)
  real/flow4d_denoise.py   # divergence-free velocity PINN denoiser with analytic source/flux (torch)
  real/flow4d_ppe.py       # pressure-Poisson sparse direct solve (analytic-gated in tests)
  real/flow4d_pinn.py      # the momentum-residual NS-PINN, kept as the documented failed approach
  real/flow4d_bake.py      # bake the 4D-flow pressure artifact the web reads
  core/pinn.py             # shared MLP + Adam->L-BFGS training loop
data/derived/real-ecgi-catalogue/catalogue.json    # ECGi catalogue (2 datasets, 4 beats)
data/derived/real-flow4d-pressure/trace.json        # 4D-flow pressure map (9000-pt lumen cloud)
frontend/                  # Vite + React + three.js app; a top-level case selector (ECGi | 4D-flow)
docs/                      # the wiki (both cases, methods, data governance)
```

Raw datasets live under gitignored paths (not redistributed). Every result is produced offline and committed;
the static web app reads the committed traces (it does not run any model in the browser).

## Run

```bash
# ECGi (light: NumPy/SciPy only)
py -3.12 -m venv .venv && ./.venv/Scripts/python.exe -m pip install numpy scipy
EDGAR_ROOT=... ./.venv/Scripts/python.exe -c "from cardiopinnlab.real import ecgi_catalogue as C; print(C.bake_catalogue()['cases'][0]['id'])"

# 4D-flow (heavy: the offline PINN pipeline, local GPU recommended)
py -3.12 -m venv .venv-pipeline
./.venv-pipeline/Scripts/python.exe -m pip install -r data-pipeline/requirements.txt
AORTA4D_DIR=... ./.venv-pipeline/Scripts/python.exe -m cardiopinnlab.real.flow4d_bake

cd frontend && npm install && npm run dev
```

## Data sources

- **ECGi:** EDGAR (Consortium for ECG Imaging). Aras K et al., "Experimental Data and Geometric Analysis
  Repository (EDGAR)", J. Electrocardiol. 48(6):975-981 (2015), DOI 10.1016/j.jelectrocard.2015.08.008.
- **4D-flow:** a real thoracic-aorta 4D-flow MRI (Philips, venc 120 cm/s), distortion-corrected. Method
  references: Raissi et al., Science 367:1026 (2020), DOI 10.1126/science.aaw4741; Krittian et al., Medical
  Image Analysis 16(5):1029 (2012), DOI 10.1016/j.media.2012.04.003.

Both used under their data-use agreements with attribution; raw data not redistributed.

## License

MIT. Owner: Felipe Santibanez-Leal.
