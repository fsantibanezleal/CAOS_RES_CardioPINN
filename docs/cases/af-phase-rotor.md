# AF phase mapping and probabilistic rotor localization

Vertical id: `af-phase-rotor` - category: electrophysiology-fibrillation - lane: replay (a phase-field snapshot,
not a coordinate network).

## The research topic

During atrial fibrillation the excitation organizes into rotating spiral waves whose cores are phase
singularities (rotors), the targets of ablation. The classical pipeline (Hilbert-transform phase, then
phase-singularity detection by the topological charge around a loop) is noise-sensitive and returns a single
point. From sparse noisy electrodes the rotor location is genuinely uncertain, so a single point is
misleading; a probability map with a confidence radius is the honest output.

## The excitation and the phase

The excitation is a real Aliev-Panfilov reaction-diffusion spiral (a standard two-variable reduced ionic
model), evolved from a broken wavefront into a sustained rotor. The state-space phase phi = atan2(v - v_ref,
u - u_ref) winds by 2 pi around the rotor core; the topological charge on each cell loop marks the phase
singularity.

## Beyond SOTA: an uncertainty-aware rotor map

From sparse noisy electrodes, the complex phasor (cos phi, sin phi) is interpolated (so the reconstruction
respects the cyclic phase rather than averaging angles), and an ensemble over measurement-noise draws produces
a probabilistic rotor-location heatmap plus a confidence radius, instead of a single point. This is the
beyond-SOTA line for AF phase mapping: a physics-grounded, uncertainty-aware rotor map.

## Results (measured bake, seed 42)

| Quantity | value |
|---|---|
| Rotor localization error | ~0.9 mm |
| Rotor confidence radius | ~0.9 mm |
| Electrodes | 220 (about 3.4% coverage) |

From sparse electrodes the rotor core is localized to within about 1 mm with a tight confidence radius, and
the probability heatmap shows the spatial uncertainty of the core rather than committing to a single point.

## Scope and honesty

- Synthetic reaction-diffusion spiral on a clean 2D sheet. Real optical-mapping and clinical AF electrode data
  are much noisier and more irregular; the numbers here reflect the controlled synthetic case, and clinical
  data would widen the confidence radius. Not clinically validated.
- The confirmed physics-informed cardiac-EP PINN work is EP-PINNs (Herrero Martin et al. 2022) and the
  fibrillatory PINN extension; the confirmed learned rotor/phase-mapping work is a CNN (Lebert/Christoph 2021).
  This vertical combines a reaction-diffusion phase field with an explicit rotor-location uncertainty; it does
  not claim to be a published PINN phase-mapping method.

## References

- Herrero Martin C et al. (2022). EP-PINNs: cardiac electrophysiology parameter estimation. Frontiers in
  Cardiovascular Medicine 8:768419. DOI 10.3389/fcvm.2021.768419.
- Lebert J, Christoph J et al. (2021). Rotor localization and phase mapping of cardiac excitation waves using
  deep neural networks. Frontiers in Physiology 12:782176. DOI 10.3389/fphys.2021.782176.
- Aliev RR, Panfilov AV (1996). A simple two-variable model of cardiac excitation. Chaos, Solitons & Fractals
  7(3). DOI 10.1016/0960-0779(95)00089-5.
