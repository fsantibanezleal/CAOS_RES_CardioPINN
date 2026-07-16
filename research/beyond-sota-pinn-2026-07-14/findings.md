# Beyond-SOTA for the 4D-flow pressure PINN: findings

Adversarial evaluation of four candidate advances on KNOWN-ANSWER analytic flows (exact ground truth), the
honest way to decide a "beyond SOTA" claim when the real scan has no invasive pressure gold standard. Every
number below is against a flow whose answer is closed-form. GPU: RTX 4070. Design + protocol in `00-design.md`;
raw per-experiment JSON in `p*_results.json`. Method verdicts are ADVANCE or NULL; only ADVANCEs ship.

## A methodological finding that shaped everything (round 1 -> round 2)

Round 1 ran P1/P2 through a FINITE-DIFFERENCE pressure solve on the sampled velocity grid and got ~4 mmHg
pressure errors for every method, masking all differences. P4 accidentally exposed why: its two-stage path used
the engine's ANALYTIC (autograd) source/flux and got 0.096 mmHg on the same flow. So the FD path was
confounding the comparisons. Round 2 re-ran everything on the analytic path. The lesson is itself the headline
result (P5 below): how the velocity gradients are formed dominates the recovered pressure.

## P5 (HEADLINE) - CONFIRMED ADVANCE: analytic-autograd source/flux vs finite differences

The pressure-Poisson source is a velocity-GRADIENT product, so recovering pressure from a fitted velocity field
is decided by how its gradients are computed. The engine forms them from the velocity network's ANALYTIC
(autograd) derivatives; a standard PPE/WERP pipeline finite-differences the (noisy) velocity grid, which
manufactures artifacts, worst at the lumen edge.

Converging duct, exact pressure, denoiser fit to noisy velocity, pressure recovered two ways from the SAME
field, 6 configs (2 noise x 3 seeds):

| path | median drop error (mmHg) | median scale |
|---|---|---|
| analytic (autograd) | **0.066** | 0.997 |
| finite difference | 4.19 | ~1.49 (50% inflated) |

Analytic wins 6/6; median ratio **63x**. This proves, on a known answer, the engine's decisive design choice and
that it removes the FD artifact the standard estimators carry. SHIPPED as a gate (`gate_analytic_vs_fd`,
`test_flow4d_analytic_source.py`) + docs. `advance = true`.

## P1 - NULL: hard divergence-free by construction (v = curl(A_theta))

Parameterizing velocity as the curl of a learned vector potential makes div(v) = 0 EXACTLY. On the fair
analytic path, across 6 configs: curl drives the divergence residual ~6x lower (0.00006 vs 0.00034 nd, as
expected by construction), but the pressure is WORSE, not better (median drop error 0.217 vs 0.066 mmHg for the
soft penalty; curl wins pressure 0/6, velocity 0/6). The soft penalty's residual divergence is already small
enough that pressure is not limited by it; the curl output being a derivative of the net gives slightly noisier
pressure-relevant gradients. The intuition that hard div-free would help pressure is refuted. `advance = false`.
NOT shipped.

## P4 - NULL (with a real by-product): differentiable coupling of the denoiser and the elliptic solve

Implemented an implicit-differentiation Poisson solve (forward factorizes A once, backward solves the adjoint
A^T lambda = grad_p). It reproduces `spsolve` EXACTLY (max abs diff 0.0), a correct, reusable differentiable
solve. But coupling did not help: for a linear elliptic solve with an already-good (div-free) velocity, the
two-stage pipeline is near-optimal, so there is no residual for coupling to reduce, and perturbing the
well-trained net with a coupling fine-tune only hurt it. Consistent with P1 (velocity-consistency is not the
pressure bottleneck). Subsumed / null; the differentiable solve is kept in the research code but not wired into
the engine (no downstream use earns its complexity). `advance = false`. NOT shipped.

## P2 - NULL: calibrated per-voxel pressure UQ from structural perturbations

Ensemble over the unverifiable structural choices (segmentation +-1 voxel x seed), pressure via the analytic
path, scored on the converging duct. The recalibrated band is CALIBRATED (2-sigma coverage 0.93, near the
nominal 0.95), so the UQ machinery is sound. But on this clean, well-defined lumen the uncertainty is genuinely
small: the structural spread (0.016 mmHg) is only 1.5x the velocity-noise spread (0.011 mmHg), not the
domination the hypothesis predicted, because the pressure is robust to a +-1-voxel segmentation change here.
The method calibrates but is not informative on a clean benchmark; it would only reveal large uncertainty on a
REAL, ambiguous lumen segmentation, which cannot be tested without the raw scan. Honest limitation, not a
shipped advance. `advance = false`. NOT shipped (the calibration discipline is documented for a future
real-scan UQ pass).

## P3 - CONFIRMED (secondary, the temporal analog of P5): analytic dv/dt vs 3-frame FD as temporal resolution degrades

Transcribed from `p3_tr_results.json` (the round-2 robust scale/correlation metric; this header was left as a
`<PENDING>` placeholder and is now filled from the committed result). On a known-answer analytic flow, the
unsteady term dv/dt is estimated two ways as the frame count per cycle nT is reduced (dt grows): a 3-frame
finite difference, and the space-time network's analytic autograd derivative.

The finite difference loses amplitude exactly as the sinc aliasing law predicts (`fd_scale` tracks
`fd_sinc_predicted` to 3 digits): scale 0.98 at nT=20, 0.87 at nT=8, 0.76 at nT=6, 0.64 at nT=5, collapsing
to 0.21 with `corr = NaN` at nT=4. The analytic derivative holds scale ~1.0 and correlation > 0.99 down to
nT=6, degrading only at nT=5 (corr 0.89) and nT=4 (corr 0.51). Under 5% velocity noise the gap widens: FD
correlation is already 0.895 at nT=20 while the analytic stays > 0.99.

Honest bound: this is not magic below the Nyquist floor. At nT<=5 both degrade; the analytic simply holds one
to two frame-steps longer, where FD has already lost 24%+ of the amplitude. That regime (coarse temporal
sampling) is exactly where a real 4D-flow scan sits, which is why it matters. `advance = true` as a METHOD
property on exact ground truth, same status as P5; scoped to analytic flows (a real scan has no temporal
ground truth for dv/dt). This does NOT claim a clinical result and does not re-bake `trace.json`.

## Honest scope

All results are on known-answer analytic flows (the rigorous way to prove a method; a real scan has no pressure
gold standard). The confirmed advance (P5) is a property of the METHOD proven on exact ground truth, so it
transfers; the real-scan re-bake that would update `trace.json` runs on the machine with `AORTA4D_DIR` and is
not re-run here. The nulls are honest nulls on the clean benchmark: P1/P4 refute their hypotheses outright; P2
(structural UQ) is expected to be small on a clean, well-defined lumen and would need a real ambiguous
segmentation to show its value, an honest limitation, not a shipped claim.
