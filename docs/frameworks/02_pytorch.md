# PyTorch: the 4D-flow velocity PINNs and the shared training loop

## What it is

PyTorch is the automatic-differentiation and neural-network framework. CardioPINN pins `torch>=2.5` in
`data-pipeline/requirements.txt` and uses it for exactly one thing: the physics-informed neural networks that
denoise the real 4D-flow velocity field (Case B). The training runs offline on a local NVIDIA GPU (the CPU
wheel also works; these are small MLPs that train in minutes), and the recovered fields are baked into the
committed trace. No PyTorch runs in the browser, and there is no ONNX export lane; the web reads JSON.

The reason PyTorch is here and not in the ECGi case is autograd. The pressure-Poisson source is built from
velocity SPATIAL derivatives, and the unsteady pressure term from the TEMPORAL derivative. A network gives
those derivatives ANALYTICALLY (`torch.autograd.grad`), cleanly and everywhere including the lumen boundary,
which is precisely what removes the finite-difference edge artifact that otherwise wrecks the pressure map.

## The shared engine (`core/pinn.py`)

The cardiac-PINN literature ships small custom training loops rather than a turnkey framework, because the
novelty lives in the input space and the physics loss, not in the optimizer. `core/pinn.py` is that generic
core: the MODEL and the LOSS are supplied per case, the OPTIMIZATION is shared.

- **`MLP`** : a configurable multilayer perceptron, `tanh` activation by default, optional Fourier-feature
  input encoding, width and depth as constructor arguments. The output activation is left to the caller so the
  raw network stays a clean graph.
- **`train_loop`** : the canonical PINN recipe, Adam then L-BFGS. Adam (`lr=2e-3`, a few thousand iterations)
  gets close from a random start; L-BFGS (`max_iter`, `history_size=50`, strong-Wolfe line search) then
  polishes to a sharp minimum, which is where PINNs gain most of their final accuracy. A `loss_closure()`
  recomputes the full scalar loss (data + physics + regularization) each call; the loss history is returned for
  diagnostics.
- **`select_device`** picks CUDA when available, else CPU. **`seed_everything`** seeds CPU and CUDA so a run is
  a pure function of `(case, seed)`.

Both velocity networks below are a plain `MLP(activation="tanh")` driven by `train_loop`.

## Why a plain tanh MLP

The field being fit is a smooth, band-limited aortic velocity, and the loss needs clean, stable second
derivatives (the pressure-Poisson source uses first derivatives; the viscous Neumann flux uses the Laplacian).
`tanh` is infinitely differentiable and its higher derivatives stay well-behaved, so autograd through two
derivative levels is numerically stable. A ReLU network has zero second derivative almost everywhere and cannot
supply a Laplacian; a SIREN (sine) network is available in the `MLP` for oscillatory fields but is unnecessary
here and can introduce spurious high-frequency structure. Fourier features exist in the engine for sharp
wavefronts (the ECGi/activation lineage) but are OFF for the 4D-flow denoisers, where a smooth low-frequency
fit is the goal. Inputs and outputs are non-dimensionalized (positions by a characteristic length $L$, velocity
by $U$) so the network sees $O(1)$ values, with the SI chain-rule factors $U/L$ and $U/L^2$ applied when the
analytic derivatives are read back out.

## The divergence-free velocity denoiser (`real/flow4d_denoise.py`)

One frame at a time. The network $v_\theta(x,y,z)$ is trained to (i) match the measured velocity at the lumen
voxels and (ii) satisfy incompressibility at random collocation points:

$$\mathcal{L} = \underbrace{\big\lVert v_\theta(x_{\text{data}}) - v_{\text{measured}} \big\rVert^2}_{\text{data fit}}
   \; + \; w_{\text{div}}\; \underbrace{\big\langle (\nabla\cdot v_\theta)^2 \big\rangle_{\text{collocation}}}_{\text{incompressibility}}.$$

The divergence $\nabla\cdot v_\theta$ is assembled from `torch.autograd.grad` of each velocity component with
respect to the input coordinates (`w_div=1.0`, `n_coll=6000` collocation points resampled each step). Unlike
PRESSURE, VELOCITY is strongly constrained by the data, so this denoising is well-posed and robust. The trained
`DenoisedField` then exposes `source_and_flux`, which returns the ANALYTIC pressure-Poisson source
$S = -\rho \sum_{ij}(\partial_j v_i)(\partial_i v_j)$ and the steady Neumann flux
$b = -\rho\,(v\cdot\nabla)v + \mu\,\nabla^2 v$, both computed by second-order autograd (a Jacobian and a
Laplacian per point, batched at 20000 points). These feed SciPy's sparse pressure-Poisson solve (card 01).

This analytic-derivative choice is the decisive one, and it is now proven on a known answer (research dossier
`beyond-sota-pinn-2026-07-14`). On an analytic converging duct whose exact pressure is known, a denoiser fit to
noisy velocity recovers the pressure drop to a median 0.066 mmHg through this analytic path, versus 4.19 mmHg
(about 50% inflated) when the SAME fitted field's source is finite-differenced on the grid instead, the
approach a standard finite-difference PPE/WERP pipeline uses. That is a 63x gap on identical data, gated in CI
by `gate_analytic_vs_fd` / `test_flow4d_analytic_source`. Two candidate upgrades were tested adversarially
against this baseline and REFUTED on the same benchmark: enforcing incompressibility by construction (velocity
as the curl of a learned vector potential, exact div-free) did not improve pressure, and an end-to-end
differentiable coupling of the denoiser to the elliptic solve was subsumed by the two-stage pipeline. The
honest record is in the dossier's `findings.md`.

## The space-time network for the analytic dv/dt (`real/flow4d_spacetime.py`)

The unsteady pressure term needs $\partial v/\partial t$. Estimating it from three frames by finite difference
inflated the pressure range to about 15 mmHg. The fix is a space-time network $v_\theta(x,y,z,t)$ trained
divergence-free over the WHOLE cardiac cycle, so the temporal derivative is differentiated exactly:
`source_flux_unsteady` returns $S$, the steady flux $b$, and the acceleration $a = \partial v/\partial t$ (via
the fourth input column, with the SI factor $U/T$), and the caller assembles the full Neumann flux
$b - \rho\,a$. With the analytic unsteady term the recovered relative-pressure range drops to 0.79 mmHg on the
real scan, physiological for an unobstructed aorta and the same order as the clinical simplified-Bernoulli
estimate 2.51 mmHg. The temporal derivative is gated in CI on an analytic time-varying Poiseuille flow whose
exact $\partial w/\partial t$ is known (`verify_unsteady_poiseuille`, correlation 0.995) before any real data
is trusted. The bake (`flow4d_bake.py`) trains this network with `width=128, depth=7, w_div=2.0`.

## Why the momentum-residual PINN FAILED and is kept as a documented baseline (`real/flow4d_pinn.py`)

The obvious approach, one network $(x,y,z,t)\to(u,v,w,p)$ trained on the full Navier-Stokes momentum residual
(the "hidden fluid mechanics" formulation of Raissi et al.), does NOT recover pressure at aortic Reynolds
numbers. The non-dimensional residual carries the pressure gradient only through a soft penalty term, and
pressure is gauge-free (defined up to an additive constant) and weakly coupled to the loss, so the network
leaves it near its zero initialization. On the analytic Poiseuille gate (`verify_poiseuille_si`, where the exact
$dp/dz = -8\mu U/R^2$ is known) it recovered under 10 percent of the true gradient.

This file is deliberately kept, complete and runnable, as the DOCUMENTED failed baseline. It is not a dead
stub: it holds the full non-dimensional NS residual (`residual_nd`, continuity + three momentum components with
the Strouhal and Reynolds groupings) and its analytic Poiseuille gate, so the failure is reproducible and the
design decision is auditable. The shipped method separates the well-posed part (velocity, strongly
data-constrained, learned by the network) from the ill-posed part (pressure, solved by the elliptic Poisson
equation in SciPy). That separation is the whole point, and the failed baseline is the evidence for it.

## Honest limits and substitutions

- The networks are trained per scan; there is no pretrained model and no amortization. Each bake retrains,
  which is why the pipeline is offline and the artifact is committed.
- `torch.autograd.grad` through two derivative levels is exact but memory-heavy at large point counts, hence
  the batched evaluation (8000 to 20000 points per call).
- The denoiser makes the pressure robust to velocity noise (the ensemble in `flow4d_bake.py` moves it under
  0.01 mmHg), which is a strength but also means a noise-only ensemble gives an uninformative near-zero
  uncertainty; a per-voxel pressure uncertainty map is therefore NOT shown. The dominant uncertainty is the
  absent invasive gold standard, the lumen segmentation, and the unsteady-term approximation.
- No GPU is required for correctness; the CPU wheel produces the same result more slowly.

## References

- Raissi M, Yazdani A, Karniadakis GE (2020). Hidden fluid mechanics: Learning velocity and pressure fields
  from flow visualizations. Science 367(6481):1026-1030. DOI 10.1126/science.aaw4741.
- Krittian SBS, Lamata P, Michler C, et al. (2012). A finite-element approach to the direct computation of
  relative cardiovascular pressure from time-resolved MR velocity data. Medical Image Analysis 16(5):1029-1037.
  DOI 10.1016/j.media.2012.04.003.
- Sahli Costabal F, Yang Y, Perdikaris P, Hurtado DE, Kuhl E (2020). Physics-informed neural networks for
  cardiac activation mapping. Frontiers in Physics 8:42. DOI 10.3389/fphy.2020.00042.
