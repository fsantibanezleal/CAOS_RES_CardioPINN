# 02 · The two offline lanes, module by module

The offline pipeline lives in `data-pipeline/cardiopinnlab/`. It has two independent lanes plus a shared
training spine. Each lane loads raw data from a local gitignored path, runs its physics, and bakes a committed
JSON trace. The lanes do not share code beyond the MLP and the Adam to L-BFGS training loop in
`core/pinn.py` (used only by the 4D-flow PINNs; the ECGi lane is pure linear algebra and needs no torch).

```
data-pipeline/cardiopinnlab/
  core/pinn.py             # shared MLP + Adam->L-BFGS train_loop + seed_everything + select_device
  real/ecgi_edgar.py       # ECGi engine: single-layer forward op -> Tikhonov / graph-reg / deep-ensemble UQ
  real/ecgi_catalogue.py   # config-driven multi-dataset ECGi loader + bake_catalogue
  real/ecgi_bem.py         # boundary-element forward operator (analytic-gated) + single/double-layer blocks
  real/flow4d_dicom.py     # decode the real Philips 4D-flow DICOM velocity + phase-unwrap + lumen mask
  real/flow4d_denoise.py   # single-frame divergence-free velocity PINN with analytic source/flux (torch)
  real/flow4d_spacetime.py # space-time v(x,y,z,t) PINN: analytic spatial source/flux and analytic dv/dt
  real/flow4d_ppe.py       # pressure-Poisson sparse direct solve + the analytic converging-duct gate
  real/flow4d_pinn.py      # the SI momentum-residual NS-PINN, the documented failed approach (not imported by the bake)
  real/ns_pinn.py          # earlier dimensional (mm/ms) NS-PINN prototype of the same failed approach, also unshipped
  real/flow4d_bake.py      # bake the 4D-flow pressure trace the web reads
```

## Lane A: ECGi (CPU, NumPy/SciPy)

### `ecgi_edgar.py`, the reconstruction engine

This module holds the actual inverse solver. `load_edgar` reads the real EDGAR torso-tank potentials (a MATLAB
`ts` struct, field `potvals`) and the real torso and cage triangulations, dropping any frames that contain
NaNs. `forward_operator` builds the default single-layer (point-source) operator on the real electrode
geometry:

$$A_{ij} = \frac{1/(\lVert x^{b}_i - x^{h}_j\rVert + 1)}{\sum_j 1/(\lVert x^{b}_i - x^{h}_j\rVert + 1)}$$

so $\phi_{\text{body}} \approx A\,\phi_{\text{heart}}$, row-normalized. `reconstruct` calibrates a single scalar
gain on the first half of the beat frames (leakage-safe), then fixes it. It builds the mesh graph-Laplacian
`_graph_laplacian` from the real cage triangulation and solves the regularized normal equations at the
oracle-best regularization strength (swept over 30 log-spaced $\lambda$ values, chosen to minimize the true
error against the real cage, so each method is judged at its best), for two priors:

$$\hat\phi = (A^\top A + \lambda^2 L^\top L)^{-1} A^\top \phi_{\text{body}}$$

with $L$ the identity (Tikhonov) or the graph-Laplacian. A deep ensemble of $K=6$ graph-regularized
reconstructions over measurement-noise draws ($\sigma = 2\%$ of the data standard deviation) gives a per-node
spread, recalibrated by a temperature $\tau$ so the 2-sigma band matches the real error. `evaluate` computes
the relative error, the spatial correlation, and the UQ calibration against the real cage potentials.

### `ecgi_catalogue.py`, the multi-dataset loader and bake

EDGAR datasets carry per-lab field names and mesh layouts, so a small config per dataset drives a shared
loader. Two datasets reconstruct cleanly with the identical downstream engine (no per-heart retuning): the
Utah human torso tank (`ts`-struct potentials, `node`/`face` mesh structs; sinus + PVP + AVP) and the
Maastricht in-situ dog (raw arrays; sinus). `bake_catalogue` runs `bake_case_beat` for every beat and writes
`data/derived/real-ecgi-catalogue/catalogue.json` (schema `cardiopinn.ecgi-catalogue/v2`): per beat, the cage
mesh, decimated time frames of the recovered / measured / abs-error / uncertainty fields, and the metrics.
`is_closed` and `forward_comparison` add the honest single-layer-vs-BEM comparison where both surfaces are
closed 2-manifolds. The excluded datasets and the reasons are recorded in the module itself.

### `ecgi_bem.py`, the boundary-element forward operator

The physically-correct alternative to the single-layer kernel: the discretized boundary-integral equation for
a homogeneous torso bounded by an insulating body surface with the heart surface as the inner source boundary.
`_double_layer` uses exact triangle solid angles (Van Oosterom and Strackee 1983); `_single_layer` uses
triangle $1/r$ integrals; the $c(p)$ jump is folded into a deflated diagonal, and the heart-surface normal
current is eliminated to give the transfer matrix $Z$ with $\phi_{\text{body}} = Z\,\phi_{\text{heart}}$:

$$Z = [D_{BB} - G_{BH} G_{HH}^{-1} D_{HB}]^{-1}\,[G_{BH} G_{HH}^{-1} D_{HH} - D_{BH}]$$

`verify_bem_spheres` is the analytic gate (concentric spheres; see note 03). Honest finding: on the coarse real
electrode geometry the BEM does not beat the calibrated single-layer (dog: single-layer RE 0.54 vs BEM RE
0.63), so the single-layer stays the default; the BEM matters as electrode density and mesh closure improve.

## Lane B: 4D-flow aortic pressure (GPU, PyTorch)

### `flow4d_dicom.py`, decode the real velocity

`load_4dflow` reads the real Philips 4D-flow DICOM series: per cardiac frame, a magnitude image and three
phase-contrast velocity images along the patient RL, AP, FH axes (venc 120 cm/s). The 12-bit phase maps to
velocity through the DICOM rescale, and voxel centres come from `ImagePositionPatient` /
`ImageOrientationPatient` / `PixelSpacing` so velocity and geometry share the patient frame:

$$v_{\text{cm/s}} = \frac{\text{slope}\cdot px + \text{intercept}}{4096}\cdot v_{\text{enc}}$$

`unwrap_aliasing` corrects phase-wrap (a component that exceeds the venc wraps by $2\,v_{\text{enc}}$ to the
opposite sign): a voxel/component is flagged against a robust median-filtered local estimate and unwrapped
toward it (27863 samples corrected on this scan). `mask_lumen` segments the aortic lumen by the standard
pulsatile-flow criterion (peak-over-cycle speed above threshold, largest connected component, one closing
iteration).

### `flow4d_denoise.py`, the single-frame divergence-free denoiser

`denoise_frame` trains a network $v_\theta(x,y,z)$ to fit the measured lumen velocity while enforcing
incompressibility at collocation points:

$$\min_\theta\; \lVert v_\theta - v^{\text{meas}}\rVert^2 + \lambda\,\lVert\nabla\cdot v_\theta\rVert^2$$

Because the pressure-Poisson source is a product of velocity derivatives, measurement noise (which violates
continuity) would be amplified; the divergence-free fit projects it out. `DenoisedField.source_and_flux`
returns the analytic (autograd) PPE source and the steady part of the Neumann wall flux, computed exactly (not
by finite differences at the lumen edge, which is where FD manufactures the worst artifact). This per-frame
denoiser is reused by the robustness ensemble in the bake.

### `flow4d_spacetime.py`, the space-time PINN

`train_spacetime` fits a divergence-free $v_\theta(x,y,z,t)$ over the whole cardiac cycle, so both the PPE
source and the unsteady acceleration $\partial_t v$ are analytic (autograd in time), replacing an earlier
three-frame finite difference. `SpaceTimeField.source_flux_unsteady` returns the source $S$, the steady flux
$b_{\text{steady}}$, and the acceleration $a = \partial_t v$; the caller assembles the full Neumann flux
$b = b_{\text{steady}} - \rho\,a$. `verify_unsteady_poiseuille` is the analytic gate on a time-varying
Poiseuille flow (see note 03).

### `flow4d_ppe.py`, the pressure-Poisson solve

Taking the divergence of incompressible Navier-Stokes and using continuity gives a well-posed Poisson problem
for pressure whose source is built from velocity spatial derivatives:

$$\nabla^2 p = -\rho\sum_{i,j}\frac{\partial v_i}{\partial x_j}\frac{\partial v_j}{\partial x_i} = S(v),
\qquad \frac{\partial p}{\partial n} = b(v)\cdot n$$

`solve_ppe_precomputed` assembles the sparse system on the largest connected lumen component with Neumann
boundary conditions and one central Dirichlet pin (which removes the pure-Neumann nullspace), and solves it
directly with `scipy.sparse.linalg.spsolve`. Constants throughout: $\rho = 1060$ kg/m$^3$, $\mu = 0.0035$
Pa·s, $1$ mmHg $= 133.322$ Pa. `gate_converging` is the analytic gate (see note 03).

### `flow4d_pinn.py` and `ns_pinn.py`, the two documented failed NS-PINN baselines

A single network $(x,y,z,t)\to(u,v,w,p)$ trained on the momentum residual (the hidden-fluid-mechanics
formulation) does not recover pressure at aortic Reynolds numbers: pressure is gauge-free and only weakly
coupled to the loss, so it stays near its initialization (under 10 percent of the true gradient on analytic
Poiseuille). Two versions of this attempt are kept: `flow4d_pinn.py` is the SI, non-dimensionalized network
(gated by `verify_poiseuille_si`), and `ns_pinn.py` is an earlier dimensional (mm/ms) prototype of the same
attempt (gated by `test_poiseuille`). Read on their own, both module docstrings are still written as if this
were the intended method (a Bernoulli framing, a "trustworthy engine"); do not take them at face value. Neither
module is imported by `flow4d_bake.py`: both are unshipped and kept only as the honest, documented failure. The
shipped method instead separates the well-posed part (velocity, strongly data-constrained) from the ill-posed
part (pressure, solved by the elliptic Poisson equation).

### `flow4d_bake.py`, the trace the web reads

The orchestrator: decode and unwrap the velocity, segment the lumen, pick the peak-systolic frame (max kinetic
energy in the lumen), train the space-time PINN, assemble the full Neumann flux with the analytic unsteady
term, solve the PPE, run the velocity-noise robustness ensemble (a scalar `noise_sensitivity_mmHg`, not a
per-voxel map, because the denoiser makes the pressure nearly noise-insensitive), decimate the lumen to a
9000-point cloud, and write `data/derived/real-flow4d-pressure/trace.json`. The reported numbers on this scan:
peak velocity 0.791 m/s, PPE relative-pressure range 0.79 mmHg, Bernoulli $4V_{\max}^2 = 2.51$ mmHg.

## Why the split is architectural, not incidental

The two lanes cannot be merged: ECGi is a linear inverse solved with dense linear algebra and needs no GPU;
4D-flow is a nonlinear PDE recovery that needs autograd derivatives and a GPU-trained PINN. Keeping them in
separate modules with separate runtimes is what lets each be validated on its own terms and lets the CI light
lane run the ECGi contracts and the analytic gates without a GPU (the slow PINN gates are marked `slow` and run
locally on the bake machine).

## References

- Van Oosterom A, Strackee J (1983). The solid angle of a plane triangle. IEEE Transactions on Biomedical
  Engineering 30(2):125-126. DOI 10.1109/TBME.1983.325207.
- Krittian SBS, Lamata P, Michler C, et al. (2012). A finite-element approach to the direct computation of
  relative cardiovascular pressure from time-resolved MR velocity data. Medical Image Analysis 16(5):1029-1037.
  DOI 10.1016/j.media.2012.04.003.
- Raissi M, Yazdani A, Karniadakis GE (2020). Hidden fluid mechanics. Science 367(6481):1026-1030.
  DOI 10.1126/science.aaw4741.
</content>
