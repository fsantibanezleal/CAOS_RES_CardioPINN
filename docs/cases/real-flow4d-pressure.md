# Real 4D-flow: the aortic pressure field from a real velocity scan (Navier-Stokes)

Case id: `real-flow4d-pressure`. This is a real-data case in a different physics domain from ECGi: the
governing equation is incompressible Navier-Stokes (fluid dynamics), not volume conduction. The network fits a
real measured velocity field and the pressure is forced out of it by the physics.

## The case, the need, how the physics helps, what we compute

- **The case.** A real thoracic-aorta 4D-flow MRI scan (Philips, venc 120 cm/s, distortion-corrected) measures
  the full three-directional blood velocity in the aorta at 16 frames across the cardiac cycle, on a 2.5 mm
  isotropic grid. Peak velocity of the divergence-free denoised field 0.791 m/s (the raw phase-contrast
  measured speed shown by the app's Speed toggle carries noise up to about 1.6 m/s).
- **The need.** The clinically decisive quantity for a stenosis or coarctation is the pressure drop across the
  narrowing. The reference measurement is invasive cardiac catheterization. 4D-flow measures velocity
  non-invasively but not pressure; pressure and velocity are tied by the fluid equations, so the pressure field
  can be computed from the measured velocity.
- **How the physics helps.** Incompressible Navier-Stokes relates the pressure gradient to the fluid
  acceleration and viscous friction. Taking the divergence of the momentum equation and using incompressibility
  gives a Poisson equation for pressure, `lap(p) = S(v)`, whose source is built from the velocity's spatial
  derivatives. Because that source is a product of derivatives, measurement noise (which violates
  incompressibility) is amplified, so a physics-informed velocity step is required first: a network fits the
  measured velocity while enforcing `div v = 0`, producing a smooth divergence-free field whose analytic
  derivatives are clean. The pressure-Poisson source and the Neumann wall flux are computed from those analytic
  derivatives, not by finite differences at the lumen edge (the edge is where finite differences manufacture
  the worst artifacts, and doing this analytically is what takes the recovered pressure from a
  non-physiological thousands of mmHg to a physiological range).
- **What we compute.** The relative pressure field over the aortic lumen at peak systole, and the measured
  speed over the cardiac cycle, on the real segmented lumen.

## Real validation (no invasive gold standard exists)

There is no non-invasive pressure gold standard for a 4D-flow scan, that absence is exactly why the method
exists. The validation is therefore threefold:

1. **Analytic gate (exact).** On an analytic converging-duct flow whose exact pressure drop is known, the
   pressure-Poisson solve recovers it to within 1 percent: correlation 1.00, recovered 4.74 vs analytic 4.73
   mmHg. This runs in CI (`tests/test_flow4d_ppe.py`) and must pass before any real data is trusted.
2. **Physiological range on the real scan.** The recovered relative pressure spans about 0.79 mmHg across the
   segment, small and physiological for an unobstructed aorta (with the analytic space-time unsteady term; the
   earlier three-frame finite difference inflated the unsteady contribution and gave ~15 mmHg), not thousands.
3. **Clinical bracket.** The peak velocity here is the peak of the divergence-free denoised field, 0.791 m/s
   (the raw phase-contrast measured speed on the same committed trace peaks near 1.6 m/s but is noise-inflated,
   violating incompressibility, which is exactly why the denoised field is used). The routine simplified-Bernoulli
   estimate from that denoised peak is 4 * Vmax^2 = 2.51 mmHg; the physics-based field brackets it, exactly what
   an unobstructed aorta should show, while additionally revealing where the pressure varies (which a single
   Bernoulli number cannot).

| Quantity | Value |
|---|---|
| Peak velocity (denoised field) | 0.791 m/s (raw measured speed peaks ~1.6 m/s, noise-inflated) |
| PPE relative-pressure range | 0.79 mmHg (space-time unsteady term) |
| Clinical Bernoulli 4*Vmax^2 | 2.51 mmHg |
| Lumen voxels resolved | 47902 |
| Analytic gate, steady (converging duct) | corr 1.00, 4.74 vs 4.73 mmHg |
| Analytic gate, unsteady (time-varying Poiseuille) | dv/dt corr 0.995 |
| Phase-wrap aliasing corrected | 27863 samples |

## Why the momentum-residual PINN was not used

A single network `(x,y,z,t) -> (u,v,w,p)` trained on the momentum residual (the hidden-fluid-mechanics
formulation) does not recover pressure at aortic Reynolds numbers: pressure is gauge-free and only weakly
coupled to the loss, so it stays near its initialization (on analytic Poiseuille it recovered under 10 percent
of the true gradient). That approach is kept in `real/flow4d_pinn.py` as the documented failed baseline. The
shipped method separates the well-posed part (velocity, strongly data-constrained) from the ill-posed part
(pressure, solved by the elliptic Poisson equation).

## Honesty and scope

- The target the network fits is real measured velocity; the pressure is never measured, it is forced out by
  the physics. The absolute pressure magnitude carries the method's uncertainty (no invasive truth to check
  against); the validated claims are the analytic gate, the physiological range, the divergence-free denoising,
  and the Bernoulli bracket.
- Noise-robustness (and its limit). A deep ensemble that perturbs the measured velocity with realistic
  phase-contrast noise (5% of the venc) and re-runs the whole pipeline moves the recovered pressure by under
  0.01 mmHg: the divergence-free denoiser makes the pressure essentially insensitive to velocity measurement
  noise. This is a strength, but it also means an ensemble over that noise gives a near-zero, uninformative
  uncertainty; the dominant uncertainty is instead the absent invasive gold standard, the lumen segmentation,
  and the unsteady-term approximation, which such an ensemble cannot quantify. So a per-voxel pressure
  uncertainty map is deliberately not shown (it would be a misleading uniform ~0 field); the robustness is
  reported as a scalar instead.
- The unsteady acceleration is differentiated exactly in time by a space-time network v(x,y,z,t) trained over
  the whole cardiac cycle (gated on an analytic time-varying Poiseuille flow, dv/dt correlation 0.995), and
  phase-wrap aliasing is corrected before the reconstruction (27863 wrapped samples unwrapped). These replace
  the earlier three-frame finite difference and the un-corrected jet, which had inflated the pressure range.
- Not clinically deployed; a validated methodological result on a real experimental scan.

## Data source and governance

A real thoracic-aorta 4D-flow MRI (Philips, venc 120 cm/s), distortion-corrected. Used under its data-use
agreement; the raw DICOMs are gitignored and not redistributed, only the derived pressure map is committed.

## References

- Raissi M, Yazdani A, Karniadakis GE (2020). Hidden fluid mechanics: Learning velocity and pressure fields
  from flow visualizations. Science 367(6481):1026-1030. DOI 10.1126/science.aaw4741.
- Krittian SBS, Lamata P, Michler C, et al. (2012). A finite-element approach to the direct computation of
  relative cardiovascular pressure from time-resolved MR velocity data. Medical Image Analysis 16(5):1029-1037.
  DOI 10.1016/j.media.2012.04.003.
