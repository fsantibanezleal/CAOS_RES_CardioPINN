# Beyond-SOTA for the 4D-flow pressure PINN: design, adversarial evaluation, decision

Date: 2026-07-14. Goal: implement four candidate advances over the current engine, evaluate each
ADVERSARIALLY on known-answer benchmarks (try to REFUTE the advance), and ship ONLY what beats the
baseline on a falsifiable metric. Honest nulls are recorded as nulls.

## Constraint that shapes the evaluation

The raw 4D-flow scan is not in this environment (`data/raw` holds only the EDGAR ECGi `.mat` files; the
velocity scan is behind `AORTA4D_DIR` on the bake machine). This is fine, and arguably better: a real
scan has NO invasive pressure gold standard (that absence is why the method exists), so it cannot decide a
"beyond SOTA" claim. The engine's own honesty discipline is to prove methods on ANALYTIC flows with EXACT
ground truth (`gate_converging`, `verify_unsteady_poiseuille`). Every claim below is therefore proven or
refuted on a known-answer flow. Real-scan re-bake (updating `trace.json`) is deferred to the bake machine;
we ship the METHODS + the analytic-benchmark evidence, not a new real-scan number we cannot verify here.

## Baseline (current engine)

- Denoiser (`flow4d_denoise.py`): MLP R^3 -> R^3 outputs velocity; incompressibility is a SOFT penalty
  `w_div * mean(div^2)` at collocation points. Space-time (`flow4d_spacetime.py`): MLP R^4 -> R^3, same
  soft penalty, analytic `dv/dt`.
- Pressure (`flow4d_ppe.py`): elliptic pressure-Poisson `lap(p)=S(v)`, Neumann `dp/dn=b.n`, one Dirichlet
  pin, sparse DIRECT solve (`spsolve`, not differentiable). Source S + flux b from the net's analytic
  derivatives.
- UQ (`flow4d_bake.py`): ensemble over 5%-venc VELOCITY noise -> `noise_sensitivity` (near zero, because the
  denoiser makes pressure robust to velocity noise: an honest but uninformative scalar).
- Gates: converging duct (corr > 0.99, drop within 0.2 mmHg); time-varying Poiseuille (dwdt_corr > 0.98).

## The four proposals, each with a falsifiable adversarial test

### P1. Hard divergence-free by construction: v = curl(A_theta)
- Method: the network outputs a vector potential A (R^3->R^3 or R^4->R^3 for space-time); velocity is its
  curl, so div(v) = div(curl A) = 0 EXACTLY (a differential identity), at every point and derivative order.
  Data loss becomes ||curl(A_theta) - v_measured||^2; NO div penalty. Source/flux read second derivatives of A.
- Baseline: the soft-penalty net.
- Adversarial test (converging duct + Poiseuille, >= 3 seeds each): (a) DIVERGENCE RESIDUAL of the recovered
  field on the lumen (curl must be ~1e-6 or better; penalty is small-but-finite); (b) PRESSURE error vs the
  exact analytic pressure (corr, scale, drop error). Refutation attempts: does curl actually LOWER pressure
  error, or only the divergence metric it trivially wins? Does it cost data-fit accuracy (velocity RMSE)?
  Does the advantage survive across seeds? Is it slower to train for the same accuracy?
- Advance IFF: curl reduces pressure-drop error AND/OR divergence residual by a clear margin without a
  velocity-fit regression, consistently across seeds.

### P3. Prove the dv/dt fix on a temporal-resolution-degradation benchmark (Hardy 2025 failure mode)
- Method: a synthetic time-varying flow with a KNOWN unsteady pressure gradient. Two ways to get dv/dt into
  the PPE: (i) analytic dv/dt from a space-time PINN trained on the frames; (ii) a 3-frame CENTRED FINITE
  DIFFERENCE (the pre-space-time baseline; and the implicit assumption behind coarse-TR PPE/WERP/STE).
- Adversarial test: sweep the number of temporal frames nT DOWN (e.g. 20, 12, 8, 6, 5, 4) and measure the
  recovered PEAK unsteady pressure amplitude vs the exact value, for analytic-dv/dt vs 3-frame-FD. Hardy 2025
  predicts every FD/discrete estimator underestimates the transient peak as TR drops. Refutation attempts:
  does the space-time net ALSO collapse at low nT (it has fewer frames to fit)? Where exactly does FD break
  and does analytic actually hold? Is the "win" just at absurdly low nT no one uses?
- Advance IFF: analytic dv/dt holds the transient peak (error small) at temporal resolutions where 3-frame FD
  has clearly diverged, with the crossover quantified.

### P4. End-to-end differentiable coupling of the denoiser and the elliptic solve
- Method: replace `spsolve` with a DIFFERENTIABLE Poisson solve (a torch sparse/CG solve, or the same linear
  system with an implicit-differentiation adjoint), so the pressure residual on the analytic gate can
  backpropagate into the velocity network. Fine-tune the (already div-free) velocity net with a small
  pressure-consistency term added to the data + physics loss.
- Baseline: the two-stage pipeline (denoise, then solve, no feedback).
- Adversarial test (converging duct, where the exact pressure is known so a pressure-consistency loss is
  legitimate to define via the analytic BC, NOT via peeking at the answer): does coupling improve the
  recovered pressure drop vs the two-stage baseline? Refutation attempts: does the differentiable solve match
  `spsolve` to tolerance first (correctness)? Does coupling actually help or just add cost / overfit the pin?
  Is any gain within seed noise?
- Advance IFF: the differentiable solve reproduces `spsolve` to tolerance AND coupling reduces pressure error
  beyond seed noise. (Plausible NULL: for a linear elliptic solve the two-stage is already near-optimal;
  report honestly if so.)

### P2. Calibrated per-voxel pressure uncertainty from STRUCTURAL perturbations
- Method: the dominant uncertainty is not velocity noise (the denoiser absorbs it) but the unverifiable
  STRUCTURAL choices: lumen segmentation (dilate/erode the mask by +-1 voxel), the Dirichlet pin location,
  the Neumann boundary treatment, and the network seed. Build an ensemble over these perturbations and report
  the per-voxel pressure standard deviation as the uncertainty field, recalibrated so the predicted band
  matches the realized error (the same temperature-calibration discipline the ECGi deep-ensemble uses).
- Adversarial test (converging duct, exact pressure known): is the resulting UQ CALIBRATED? Compute the
  fraction of voxels whose true error falls within the predicted 2-sigma band; a calibrated UQ gives ~0.95.
  Refutation attempts: is it wildly over- or under-confident? Is it uninformative (near-constant)? Does it
  merely rediscover the velocity-noise near-zero (i.e. do the structural perturbations actually move the
  pressure)? Compare its calibration to the current velocity-noise ensemble's.
- Advance IFF: structural perturbations move the pressure meaningfully AND the recalibrated band is
  approximately calibrated (coverage near nominal), giving an informative per-voxel uncertainty the current
  scalar does not.

## Where advances get shipped (only if confirmed)

- New/edited engine modules under `data-pipeline/cardiopinnlab/real/` + a new gate test per confirmed advance
  (mirroring `test_flow4d_ppe.py` / `test_flow4d_spacetime.py`).
- The bake (`flow4d_bake.py`) wired to use the confirmed method (curl denoiser; structural UQ ensemble),
  behind the same analytic gate, so the next real-scan bake produces the improved trace.
- Docs (`docs/frameworks/02_pytorch.md`, `docs/cases/real-flow4d-pressure.md`, Methodology tab) + the app
  Methodology "beyond SOTA" note, transcribed from the findings with the measured numbers and honest scope.
- CHANGELOG + tag. Nulls are documented in `findings.md` and NOT shipped as advances.
