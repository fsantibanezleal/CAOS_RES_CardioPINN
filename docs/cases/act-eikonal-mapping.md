# Cardiac activation mapping (Eikonal PINN)

Vertical id: `act-eikonal-mapping` - category: electrophysiology-activation - lane: live (onnxruntime-web).

## The research topic

During a catheter electroanatomical mapping study, a clinician records the **local activation time** (LAT),
the moment the depolarization wavefront reaches each site, at a sparse, irregular set of endocardial points.
The clinical question is to reconstruct, from those sparse noisy samples, (a) the full **activation map**
`T(x)` over the chamber and (b) the underlying **conduction velocity** `V(x)`, whose slow regions mark
scar borders and arrhythmia substrate.

Plain interpolation of the LATs (linear, spline, Gaussian process) imposes only smoothness. It ignores the
physics of wave propagation, so it over-smooths wavefront curvature and, critically, produces **no
conduction-velocity field at all** (or an unphysical one where the activation gradient is discontinuous).
The physics-informed approach adds the wave equation as a constraint.

## Governing physics: the Eikonal equation

Under the Eikonal approximation of cardiac propagation, the activation time `T(x)` satisfies

$$\lVert \nabla T(x) \rVert \, V(x) = 1, \qquad T(x_{\text{stim}}) = 0,$$

where `V(x) > 0` is the local conduction velocity and the slowness `1/V` equals the magnitude of the
activation-time gradient. This is the high-frequency (front-arrival) limit of the monodomain
reaction-diffusion model: it tracks *when* the wavefront arrives without resolving the action-potential
shape, which is exactly what a LAT map measures. The anisotropic form, `sqrt((\nabla T)^T D \nabla T) = 1`
with a fiber conductivity tensor `D`, is treated in the fiber and geometry verticals; this vertical is the
isotropic, spatially heterogeneous case.

## The Eikonal PINN (SOTA, reproduced)

Two small multilayer perceptrons represent the fields:

- `T_theta(x)`, the activation time (a scalar per coordinate),
- `V_phi(x)`, the conduction velocity, constrained to a physiological band
  `V = V_min + (V_max - V_min) \sigma(\cdot)` with `V_min = 0.1`, `V_max = 1.0` mm/ms.

The training objective combines a data term, the physics residual, a stimulus anchor, and a total-variation
prior on `V`:

$$\mathcal{L} = w_d \, \frac{1}{N_s}\sum_i \big(T_\theta(x_i) - T_i\big)^2 + w_r \, \frac{1}{N_c}\sum_j \big(\lVert \nabla T_\theta(x_j)\rVert V_\phi(x_j) - 1\big)^2 + w_s \, T_\theta(x_{\text{stim}})^2 + w_{tv}\, \mathrm{TV}(V_\phi).$$

The total-variation term `TV(V) = mean ||grad V||` (following Sahli Costabal et al. 2020) lets `V` be
**piecewise-smooth**: it permits a sharp drop at a slow-conduction border while suppressing spurious
oscillation, which a plain L2 smoothness prior cannot do.

### Resolving the T/V degeneracy (the engineering that makes it work)

The joint inverse problem is degenerate: for any smooth `T` one can set `V = 1 / \lVert \nabla T \rVert` and
the residual vanishes, so `V` must be pinned down. This implementation uses a two-stage curriculum:

1. **Stage A (warm start).** Fit `T_theta` under a *fixed homogeneous* conduction speed
   `V = \bar{V}` (a well-posed forward-consistent problem). This gives a physically reasonable activation
   surface before `V` is allowed to vary.
2. **Stage B (joint refinement).** Unfreeze `V_phi` and minimize the full objective with the Eikonal
   residual, the total-variation prior, and a mild prior pulling `V` toward the nominal `\bar{V}`. Optimizer:
   Adam then L-BFGS (the canonical PINN recipe).

Activation time is normalized (`\tau = T / T_{\text{ref}}`, `T_{\text{ref}} = 100` ms) for a well-scaled
loss, and the network output is kept a plain tanh MLP (no Fourier features) so it exports to a clean ONNX
graph with tight PyTorch-vs-onnxruntime parity.

## Ground truth and data

Ground truth is the exact fast-marching solution (scikit-fmm) of the heterogeneous Eikonal on a 40 mm tissue
patch (41 x 41 vertices), with a conduction map that is `0.6` mm/ms at baseline dropping smoothly to `0.2`
mm/ms inside a circular slow region, so the wavefront visibly curves. The measurements are `30` sparse
vertices (the clinically realistic under-sampled regime) with `1.5` ms Gaussian noise. The classical
baselines are linear interpolation (with nearest-neighbour fill) and a Gaussian process with an RBF kernel.

fim-python is the reference tool for anisotropic Eikonal on triangulated surfaces; it has no Windows wheel,
so the runtime ground truth here uses scikit-fmm, which solves this heterogeneous-isotropic regime exactly.

## Results (measured bake, seed 42)

| Method | activation-time rel-L2 | conduction velocity |
|---|---|---|
| Linear interpolation | ~0.080 | not produced |
| Gaussian process | ~0.112 | not produced |
| Eikonal PINN | ~0.079 | RMSE ~0.091 mm/ms |

The PINN reconstructs the activation map at or below the sparse-data interpolation baselines while
additionally recovering a physically consistent conduction-velocity field, including the slow region, that
the smoothness-only baselines cannot produce. The exported ONNX net is ~68 KB with PyTorch-vs-onnxruntime
parity ~6e-5 (below the 1e-4 gate), so the browser re-runs the trained PINN live.

## Scope and honesty (what it is and is not)

- The geometry is a synthetic 2D tissue patch with a realistic conduction map; the physics (heterogeneous
  Eikonal) and the ground-truth solver are exact. Real curved cardiac surfaces + the Laplace-Beltrami
  eigenbasis enter with the Delta-PINN vertical; anisotropic fiber tensors enter with the fiber vertical.
- Not clinically validated. The value shown is methodological: physics-constrained reconstruction of both
  the activation map and the conduction velocity from sparse noisy LATs.
- The PINN does not "beat" a good forward Eikonal solver on a well-posed forward problem; its value is the
  inverse (assimilating sparse data + recovering `V`).

## References

- Sahli Costabal F, Yang Y, Perdikaris P, Hurtado DE, Kuhl E (2020). Physics-Informed Neural Networks for
  Cardiac Activation Mapping. Frontiers in Physics 8:42. DOI 10.3389/fphy.2020.00042. Code: github.com/fsahli/EikonalNet.
- Sethian JA (1996). A fast marching level set method for monotonically advancing fronts. PNAS 93(4):1591.
  DOI 10.1073/pnas.93.4.1591.
