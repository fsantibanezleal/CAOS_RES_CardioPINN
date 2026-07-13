# Non-invasive pulmonary-artery pressure (1D reduced-order NS PINN)

Vertical id: `pa-pressure-1dns` - category: hemodynamics-pressure - lane: replay (a cohort of pressure fields
over space and time).

## Medical, biological and physical context

**Medical.** Pulmonary hypertension is diagnosed by right-heart catheterization, an invasive procedure, when
the mean pulmonary-artery pressure exceeds 20 mmHg. A non-invasive estimate from imaging plus the measurable
wedge pressure would screen and monitor patients without repeated catheterization.

**Biological.** The pulmonary arteries carry blood from the right ventricle to the lungs at low pressure. In
pulmonary hypertension the vessels remodel and stiffen and the vascular resistance rises, so the right
ventricle must generate a higher pressure. The flow varies pulsatilely over the cardiac cycle.

**Physical.** A one-dimensional reduced-order blood-flow model relates the pressure gradient along the vessel
to the velocity (fluid inertia plus a resistance term). Integrating from the clinically measurable distal
wedge pressure gives the pressure along the artery and hence the mean pulmonary-artery pressure.

## The research topic

Pulmonary artery pressure (PAP) is measured by right-heart catheterization, an invasive procedure. From a
non-invasive velocity waveform (4D-flow or Doppler) plus the clinically measurable distal (wedge) pressure, a
1D reduced-order blood-flow model recovers the pressure along the vessel and hence the mean PAP. This
reproduces the approach of the Universidad de Valparaiso group (Jara et al., Biomedicines 13(9):2058, 2025,
DOI 10.3390/biomedicines13092058), which reported a physiologically plausible mean PAP for a single healthy
case. The beyond-SOTA addition is a cohort spanning normal to pulmonary hypertension and an uncertainty on the
estimated mean PAP.

## Method

The linearized 1D momentum balance `dp/dx = -rho du/dt - R u` (fluid inertia plus a resistance term, R the
pulmonary vascular resistance per length) gives the pressure gradient from the velocity. Integrating from the
distal wedge pressure yields the pressure field p(x, t) and the mean PAP. A PINN maps position and time to
velocity and pressure, fitting the measured velocity and enforcing the momentum residual with the distal
pressure anchored. Higher resistance and elevated wedge pressure raise the mean PAP (pulmonary hypertension).
An ensemble over measurement-noise draws gives the uncertainty on the estimated mean PAP.

## Results (measured bake, seed 42)

| Cohort case | true mean PAP | predicted mean PAP | uncertainty |
|---|---|---|---|
| Normal | ~10.5 mmHg | ~11.4 mmHg | ~0.0 |
| Elevated | ~18.3 mmHg | ~20.3 mmHg | ~0.6 |
| Pulmonary hypertension | ~28.1 mmHg | ~32.9 mmHg | ~0.5 |

Mean absolute error across the cohort is ~2.6 mmHg. The classification (normal below 20 mmHg versus pulmonary
hypertension above 20 mmHg, per the 2018 definition) is recovered correctly; the pulmonary-hypertension case
is somewhat overestimated, which the reported error and uncertainty make visible.

## Scope and honesty

- Synthetic cohort with a prescribed physiological velocity waveform and a linearized 1D momentum model (the
  nonlinear convective term is dropped for robustness, an honest reduction). The published Valparaiso case is
  a single healthy subject from real MRI; a real 4D-flow PA cohort with catheter ground truth is the next data
  step. Not clinically validated.
- The distal wedge pressure is treated as known (it is clinically measurable). The absolute pressures are
  physiologically plausible and the cohort separation is clear; the pulmonary-hypertension estimate is high by
  a few mmHg, shown rather than hidden.

## References

- Jara J et al. (2025). Physics-Informed Neural Network for Modeling the Pulmonary Artery Blood Pressure from
  Magnetic Resonance Images: A Reduced-Order Navier-Stokes Model. Biomedicines 13(9):2058.
  DOI 10.3390/biomedicines13092058.
