# Inverse ECG imaging with node uncertainty (ECGi)

Vertical id: `inverse-ecgi` - category: electrophysiology-inverse - lane: live (the reconstructed potential
network is coordinate-driven and re-runs in the browser).

## Medical, biological and physical context

**Medical.** ECG imaging reconstructs the heart-surface electrical activity from a vest of body-surface
electrodes, non-invasively, to guide diagnosis and plan ablation. The reconstruction is unstable, so knowing
where on the heart surface it can be trusted is as important as the map itself.

**Biological.** The heart is an electrical source inside the torso, which acts as a passive volume conductor.
The heart-surface potentials spread through the body tissues and reach the skin attenuated and smeared, so the
surface ECG is a blurred projection of the true cardiac potentials.

**Physical.** The forward map from heart-surface to body-surface potentials is a linear operator set by the
torso geometry; its inverse is severely ill-posed (small noise produces large error). Tikhonov regularization
stabilizes it, and a physics-constrained ensemble adds a calibrated per-node uncertainty.

## The research topic

Electrocardiographic imaging reconstructs the heart-surface potentials from body-surface potentials measured
by a torso vest, given the torso geometry (a forward transfer matrix A, so measured = A times heart). The
problem is severely ill-posed: small measurement noise produces large oscillatory errors in the naive
inverse. The classical remedy is Tikhonov regularization, which trades a smoothness bias for stability but
returns a single point estimate with no uncertainty.

## Method

A single-layer-potential forward operator maps a heart surface to an enclosing torso surface. Three
reconstructions are compared:

- **Tikhonov** at its best: the regularization strength is chosen by an oracle sweep (the lambda minimizing
  the reconstruction error), so Tikhonov is compared at its optimum, not strawmanned.
- **Physics-constrained network**: a network whose forward-projected potentials must match the measured
  body-surface potentials, with a smoothness prior on the heart surface (a k-nearest-neighbour Laplacian).
- **Deep ensemble** over measurement-noise draws, giving a per-node uncertainty on the recovered potentials,
  recalibrated so the reported band is honest.

## Results (measured bake, seed 42)

| Method | relative error | correlation | per-node UQ |
|---|---|---|---|
| Tikhonov (oracle lambda) | ~0.20 | ~0.98 | none |
| Physics-constrained PINN | ~0.16 | ~0.99 | calibrated (~0.91 within 2 sigma) |

The physics-constrained reconstruction slightly beats a well-tuned Tikhonov on both the relative error and the
correlation, and, more importantly, it reports a calibrated per-node uncertainty that the single Tikhonov
estimate cannot provide. The honest message: a well-regularized Tikhonov is a strong baseline; the reconstruction
accuracy gain is modest, and the real added value is the calibrated node-level uncertainty.

## Scope and honesty

- The forward operator is a simplified single-layer-potential relation and the geometry is synthetic (two
  concentric spheres). Real torso and heart meshes with a boundary-element forward matrix (the EDGAR /
  Consortium for ECG Imaging data) are the next data step. Not clinically validated.
- The 2026 state-of-the-art direction for calibrated inverse ECGi is a geometry-free generative diffusion
  prior (arXiv:2601.18615); this vertical implements a physics-plus-smoothness constraint with a recalibrated
  ensemble uncertainty, and documents the generative direction rather than claiming it.

## References

- Bear LR et al. Advances and regularization studies in ECG imaging. Sensors 23(4):1841 (2023).
  DOI 10.3390/s23041841.
- Geometry-Free Conditional Diffusion Modeling for the Inverse Electrocardiography Problem (2026).
  arXiv:2601.18615.
