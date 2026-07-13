# Pressure from 4D-flow (Navier-Stokes PINN)

Vertical id: `flow4d-ns-pressure` - category: hemodynamics-flow - lane: live (the pressure network is
coordinate-driven and re-runs in the browser).

## Medical, biological and physical context

**Medical.** Pressure gradients across valves and vessels (aortic stenosis, coarctation) drive clinical
decisions, but measuring pressure means passing an invasive catheter. 4D-flow MRI gives the blood velocity
non-invasively, and the pressure can be recovered from it, avoiding the catheter.

**Biological.** Blood is not a simple fluid: it is a suspension of red cells, and its viscosity rises with the
haematocrit (the red-cell fraction). That rheology changes the flow and the pressure field. Flow in the great
vessels is pulsatile and often swirling rather than smooth.

**Physical.** Incompressible Navier-Stokes couples velocity and pressure through conservation of mass and
momentum. A network fits the measured (noisy) velocity and enforces those equations, recovering the pressure
that was never measured; the viscosity term is haematocrit dependent.

## The research topic

4D-flow MRI measures the blood velocity field but not pressure. Recovering the pressure (and pressure drops
across a lesion) from noisy velocity is a central cardiovascular problem. A Navier-Stokes PINN denoises the
velocity and recovers the pressure field by enforcing incompressible mass and momentum conservation, where the
viscosity is hematocrit dependent (blood is more viscous at higher hematocrit). This reproduces the core of
Sierpe, Castillo, Mella, Galarce, arXiv:2508.03326 (2025). The beyond-SOTA addition is a calibrated per-voxel
pressure uncertainty (a deep ensemble with variance recalibration), which neither the rheology paper nor the
super-resolution NS-PINNs ship.

## Method

The network maps position to velocity and pressure. The loss combines a data term on the measured velocity
(pressure is never given) with the steady incompressible Navier-Stokes residual:

- continuity: `du/dx + dv/dy = 0`,
- momentum: `u du + v grad(u) + grad(p) - (1/Re) laplacian(u) = 0` (and the v component),

with the Reynolds number set by the hematocrit-dependent viscosity `mu(Hct)`. The ground-truth flow is the
Kovasznay analytic steady Navier-Stokes solution (a standard benchmark with closed-form velocity and pressure).
A deep ensemble over measurement-noise draws gives the per-voxel pressure uncertainty, and a variance
recalibration keeps the reported band honest.

## Results (measured bake, seed 42, hematocrit 0.45)

| Quantity | value |
|---|---|
| Velocity rel-L2 (denoised) | ~0.004 |
| Pressure rel-L2 (recovered) | ~0.008 |
| Pressure reliability within 2 sigma (raw) | ~0.98 |
| Pressure reliability within 2 sigma (recalibrated) | ~0.94 |
| Reynolds number (from hematocrit) | ~40 |
| Relative viscosity at Hct 0.45 | ~3.6 |

The PINN denoises the velocity to under half a percent and recovers the pressure field, which was never
measured, to under one percent, with a well-calibrated per-voxel pressure band. The Reynolds number follows
from the hematocrit-dependent viscosity.

## Scope and honesty

- The ground truth is the Newtonian Kovasznay analytic flow; the hematocrit rheology enters as the
  viscosity that sets the Reynolds number (a nominal single hematocrit here; Sierpe et al. sweep anemic to
  polycythemic). Real 4D-flow MRI of a patient vessel is the next data step. Not clinically validated.
- On this smooth analytic flow the raw ensemble is already close to calibrated; the recalibration still
  applies and keeps the band honest. The recovered pressure network re-runs live in the browser.

## References

- Sierpe M, Castillo E, Mella H, Galarce F (2025). Estimation of Hemodynamic Parameters via Physics Informed
  Neural Networks including Hematocrit Dependent Rheology. arXiv:2508.03326.
- Kovasznay LIG (1948). Laminar flow behind a two-dimensional grid. Mathematical Proceedings of the Cambridge
  Philosophical Society 44(1). DOI 10.1017/S0305004100023999.
