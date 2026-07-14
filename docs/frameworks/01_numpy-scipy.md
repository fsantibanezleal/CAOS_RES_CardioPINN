# NumPy / SciPy: the ECGi engine and the sparse pressure-Poisson solve

## What it is

NumPy is the array and dense-linear-algebra core of the scientific Python stack; SciPy adds sparse matrices,
sparse and dense solvers, `ndimage` morphology, and `io.loadmat` for MATLAB files. CardioPINN pins
`numpy>=2.0,<2.3` and `scipy>=1.13` in `data-pipeline/requirements.txt`. Both run on the CPU.

Everything in the ECG-imaging case (Case A) is built on these two libraries alone. No PyTorch, no GPU, no ONNX.
SciPy also carries the one heavy linear solve of the 4D-flow case (Case B): the sparse pressure-Poisson direct
solve. This card documents both.

## How CardioPINN uses NumPy / SciPy in ECGi (`real/ecgi_edgar.py`, `real/ecgi_catalogue.py`)

### Reading the real EDGAR data

The EDGAR torso-tank and in-situ dog experiments ship as MATLAB `.mat` files. `scipy.io.loadmat` reads the
body-surface and heart-surface potential time series (`_potvals`) and the torso / cage triangulated geometries
(`_nodes_faces`, transposing to `[N,3]` nodes and converting 1-based MATLAB faces to 0-based). Frames with any
NaN electrode are dropped before reconstruction. The raw EDGAR data is used under its data-use agreement and is
never redistributed; only the derived reconstruction is committed.

### The forward operator

The body-surface potentials $\phi_{\text{body}}$ relate to the heart-surface potentials $\phi_{\text{heart}}$
through a linear forward operator $A$ set by the geometry:

$$\phi_{\text{body}} \approx A\,\phi_{\text{heart}}.$$

`forward_operator(torso_n, cage_n)` builds the single-layer (point-source) approximation directly as a NumPy
broadcast: pairwise distances $d_{ij} = \lVert x_i^{\text{torso}} - x_j^{\text{cage}} \rVert + 1$, then
$a_{ij} = 1/d_{ij}$, row-normalized. This is an unbounded-medium Green's-function kernel on the real electrode
positions, self-contained and honest about being an approximation.

The scalar gain of $A$ is calibrated on the FIRST HALF of the time frames (leakage-safe) and then fixed, so the
reconstruction never sees the frames it is scored on with a tuned gain.

### The regularized least-squares solves

The inverse is severely ill-posed, so it is regularized. Two solvers are assembled from the normal-equation
blocks $A^\top A$ and $A^\top \phi_{\text{body}}$, both solved with dense `numpy.linalg.solve`:

- **Tikhonov (zeroth order):** minimize
  $\lVert A\phi - \phi_{\text{body}} \rVert_2^2 + \lambda^2 \lVert \phi \rVert_2^2$, i.e. solve
  $(A^\top A + \lambda^2 I)\phi = A^\top \phi_{\text{body}}$.
- **Graph-regularized (surface-smooth):** replace the identity penalty with the mesh graph Laplacian
  $L$, minimizing $\lVert A\phi - \phi_{\text{body}} \rVert_2^2 + \lambda^2 \lVert L\phi \rVert_2^2$, i.e. solve
  $(A^\top A + \lambda^2 L^\top L + \varepsilon I)\phi = A^\top \phi_{\text{body}}$ with a tiny
  $\varepsilon = 10^{-6}$ jitter for conditioning.

For each method the regularization strength $\lambda$ is swept over `np.logspace(-3, 2, 30)` and the value that
minimizes the relative error against the REAL measured cage potentials is kept (an oracle-best baseline, the
fair comparison for a method whose only tuning knob is $\lambda$).

### The graph Laplacian

`_graph_laplacian(nodes, faces)` assembles the combinatorial (unweighted) graph Laplacian of the heart-cage
triangulation directly in a dense NumPy array: for every triangle edge $(a,b)$ it does
$L_{ab} \mathrel{-}= 1$, $L_{ba} \mathrel{-}= 1$, $L_{aa} \mathrel{+}= 1$, $L_{bb} \mathrel{+}= 1$. This makes
$\lVert L\phi \rVert_2^2$ a discrete Dirichlet energy that penalizes non-smooth potential maps on the surface,
the physically-motivated prior for a piecewise-smooth epicardial field.

### The deep ensemble for per-node uncertainty

A single regularized solution gives no uncertainty. The ensemble draws $K = 6$ realizations of measurement
noise on the body-surface potentials (Gaussian, standard deviation $0.02 \times$ the data spread), re-solves the
graph-regularized problem for each, and takes the per-node mean as the reconstruction and the per-node standard
deviation as the raw uncertainty. The spread is then recalibrated by a scalar temperature so that the
half-normal relation $\mathbb{E}|{\text{error}}| = \sigma \sqrt{\pi/2}$ holds on average; `evaluate` reports the
fraction of nodes whose true error falls within $2\sigma$ (about 0.90 across the catalogue). Everything is
`numpy.random.default_rng` and array reductions.

### The boundary-element forward operator (`real/ecgi_bem.py`)

A physically-correct alternative to the single-layer kernel: the BEM transfer matrix $Z$ with
$\phi_{\text{body}} = Z\,\phi_{\text{heart}}$, assembled entirely in NumPy. The double-layer (dipole)
coefficients are exact triangle solid angles via the Van Oosterom-Strackee formula
(`_solid_angle`, a vectorized `arctan2` of a scalar triple product over a Gram-like denominator); the
single-layer (monopole) coefficients are one-point triangle $1/r$ integrals with an analytic self-term. The
coupled boundary-integral equations are reduced by eliminating the heart-surface normal current, which is a
sequence of `numpy.linalg.solve` calls:

$$\big[D_{BB} - G_{BH} G_{HH}^{-1} D_{HB}\big]\,\phi_B
   = \big[G_{BH} G_{HH}^{-1} D_{HH} - D_{BH}\big]\,\phi_H.$$

It is gated on two concentric spheres, where the heart-to-body transfer of each spherical harmonic is known in
closed form (`verify_bem_spheres`, correlation 1.00, error halving per mesh refinement). Honest finding on the
real data: the BEM does NOT beat the calibrated single-layer (the human tank surface is open, and the coarse
140-node dog torso makes the solve regularization-dominated), so the single-layer stays the default.

## How CardioPINN uses SciPy in the 4D-flow case (`real/flow4d_ppe.py`)

The relative pressure is recovered by the pressure-Poisson equation

$$\nabla^2 p = -\rho \sum_{i,j} \frac{\partial v_i}{\partial x_j}\frac{\partial v_j}{\partial x_i} = S(v),$$

with Neumann boundary flux $\partial p/\partial n = b\cdot n$ from the momentum equation and one Dirichlet pin
to remove the pure-Neumann nullspace. `solve_ppe_precomputed` discretizes this on the masked lumen grid as a
sparse system: a `scipy.sparse.csr_matrix` of the 7-point Laplacian stencil (interior neighbors contribute
$+1$ off-diagonal and $-1$ to the diagonal; boundary faces fold the known Neumann flux into the right-hand
side), solved once by `scipy.sparse.linalg.spsolve` (a direct sparse LU). `scipy.ndimage.label` first restricts
the domain to the largest connected component so the Neumann block is not singular. This is a single robust
linear solve, not an iterative PINN, which is exactly why pressure (gauge-free, weakly coupled) is left to the
elliptic solver rather than a soft PDE residual.

The gate `gate_converging` builds an analytic converging-duct velocity field on a NumPy meshgrid, runs the same
solver, and checks the recovered pressure drop against the exact Euler pressure (correlation 1.00).

## Why no GPU is needed for ECGi

The ECGi problem sizes are small dense systems: the heart cage is 256 nodes (human) or 1321 nodes (dog), and
the reconstruction solves $n \times n$ systems with $n$ in the low hundreds to low thousands, over a few dozen
time frames, for a handful of ensemble members and $\lambda$ values. A dense `numpy.linalg.solve` at these
sizes is milliseconds on a CPU; the whole catalogue bakes in seconds. A GPU would add data-transfer overhead
and a heavy dependency for no benefit. The sparse pressure-Poisson solve, though larger (tens of thousands of
lumen voxels), is a one-shot direct sparse solve that also runs comfortably on the CPU. The GPU in this product
is reserved for the PyTorch velocity networks of the 4D-flow case (see card 02).

## Honest limits and substitutions

- The single-layer forward operator is an approximation (unbounded-medium point sources), not a full volume
  conductor. The BEM is the physically-correct operator and is implemented, but on the real electrode
  geometries it does not improve the reconstruction, so it is documented as a null result rather than shipped
  as the default.
- The oracle-best $\lambda$ per method uses the true cage potentials to pick the regularization strength. This
  is a fair BASELINE (both methods get their best $\lambda$), not a blind clinical estimator; in a patient with
  no gold standard, $\lambda$ would come from an L-curve or CRESO criterion. The docs state this plainly.
- The dense graph-Laplacian assembly is $O(N^2)$ in memory. It is fine for a few-hundred to ~1300-node cage; a
  larger mesh would need a sparse Laplacian. The current meshes do not require it.
- The ensemble captures MEASUREMENT-noise uncertainty only; it does not capture forward-model error or
  geometric misregistration, which the docs flag as the dominant real-world uncertainties.

## References

- Aras K, Good W, Tate J, et al. (2015). Experimental Data and Geometric Analysis Repository (EDGAR).
  Journal of Electrocardiology 48(6):975-981. DOI 10.1016/j.jelectrocard.2015.08.008.
- Bear LR, Cheng LK, LeGrice IJ, et al. (2015). Forward problem of electrocardiography: is it solved?
  Circulation: Arrhythmia and Electrophysiology 8(3):677-684. DOI 10.1161/CIRCEP.114.001573.
- Van Oosterom A, Strackee J (1983). The solid angle of a plane triangle. IEEE Transactions on Biomedical
  Engineering BME-30(2):125-126. DOI 10.1109/TBME.1983.325207.
- Krittian SBS, Lamata P, Michler C, et al. (2012). A finite-element approach to the direct computation of
  relative cardiovascular pressure from time-resolved MR velocity data. Medical Image Analysis 16(5):1029-1037.
  DOI 10.1016/j.media.2012.04.003.
