# 03 · The analytic gates: known-answer before real data

## Why a gate exists at all

The inverse problems in this product are ill-posed, and the fields they recover cannot be checked against a
direct measurement (ECGi: only in an experimental torso tank; 4D-flow: never, because no invasive pressure
truth exists for a scan). An engine that produces a plausible-looking field on real data proves nothing: it can
be wrong in a way no real measurement exposes. The discipline is therefore inverted: every physics engine is
first run on a known-answer analytic problem, where the exact solution is available in closed form, and it must
recover that exact answer before it is allowed to touch any real data. The gate is a pytest that must pass;
only then is the real bake trusted.

This is not decoration. The 4D-flow momentum-residual PINN (`flow4d_pinn.py`) failed its analytic Poiseuille
gate (it recovered under 10 percent of the true pressure gradient), and that failure is exactly why it was not
shipped and the pressure-Poisson route was built instead. The gate is what turned a wrong method away.

## Gate A: the concentric-sphere BEM gate (ECGi)

The boundary-element forward operator is gated on two concentric spheres: an inner heart sphere of radius
$a = 0.7$ and an outer insulating body sphere of radius $b = 1.0$, meshed as subdivided icospheres. For a
heart-surface potential equal to the degree-1 harmonic $\phi_H = \cos\theta$, the shell solution
$\phi = (Ar + B/r^2)\cos\theta$ with the insulating condition $\partial\phi/\partial r = 0$ at $r=b$ gives, in
closed form,

$$B = \tfrac{1}{2}A\,b^3, \qquad A\,a + \frac{B}{a^2} = 1, \qquad
\frac{\phi_B}{\cos\theta} = A\,b + \frac{B}{b^2}$$

so the exact heart-to-body transfer ratio is known. The BEM must reproduce it. `verify_bem_spheres` and the
tests in `tests/test_ecgi_bem.py` enforce:

- `correlation > 0.999` (the spatial pattern is essentially exact),
- `abs(recovered_scale - 1.0) < 0.08` (magnitude within 8 percent at subdivision level 3),
- `relative_error < 0.08`,
- and first-order convergence: the error at subdivision 3 is under 0.75 times the error at subdivision 2, so
  refining the mesh halves the error, which is the signature of a correct boundary-element assembly rather than
  an accidental match.

Only after this passes is the BEM applied to the real dog geometry (the only real case whose two surfaces are
closed 2-manifolds). Where it applies, the honest result is that it does not beat the calibrated single-layer,
and that null result is reported, not hidden.

## Gate B: the converging-duct PPE gate (4D-flow, steady)

The pressure-Poisson solver is gated on an analytic axisymmetric converging duct with an exact pressure. With a
mass-conserving velocity field $w = U_0(1 + a z)$, $u = -\tfrac{a}{2}U_0 x$, $v = -\tfrac{a}{2}U_0 y$
(parameters $U_0 = 1$, duct radius $R_d = 0.012$ m, length $L_z = 0.060$ m, $a = 8.0$, grid $h = 1.5$ mm), the
steady Euler pressure along the axis is known:

$$p(z) = -\rho\,U_0^2\left(a z + \frac{a^2 z^2}{2}\right) + c$$

`gate_converging` builds this field, solves the PPE by finite differences (the analytic field is smooth, so no
denoiser is needed here), and compares the recovered pressure to the exact one. On this problem the solver
recovers `corr 1.00` and a recovered drop of 4.74 mmHg against the analytic 4.73 mmHg. `tests/test_flow4d_ppe.py`
enforces:

- `corr > 0.99` (pressure field shape recovered),
- `0.9 < scale < 1.1` (magnitude within 10 percent),
- `abs(rec_drop_mmHg - true_drop_mmHg) < 0.2` (the pressure drop, the physically meaningful quantity, within
  0.2 mmHg).

This test runs in the CI light lane (no torch, no GPU, no raw data) and must pass before any real-scan pressure
is trusted.

## Gate C: the time-varying-Poiseuille unsteady gate (4D-flow, unsteady)

The space-time PINN adds the unsteady acceleration $\partial_t v$ to the pressure recovery, and that temporal
derivative must itself be gated. On a time-varying Poiseuille flow $w(r,t) = U_0(1 + A\sin\omega t)(1-(r/R)^2)$
with $u=v=0$ (parameters $U_0=1$, $A=0.3$, cycle $\approx 0.9$ s so $\omega = 2\pi/0.9$, $R=0.010$ m), the exact
axial unsteady pressure gradient on the axis is

$$\left.\frac{\partial p}{\partial z}\right|_{\text{unsteady}} = -\rho\,\frac{\partial w}{\partial t}
= -\rho\,U_0 A\,\omega\cos\omega t \quad (r=0)$$

`verify_unsteady_poiseuille` trains the space-time net on samples of $w(r,t)$ and reads its analytic
$\partial w/\partial t$ back on the axis over time. It recovers the exact acceleration at correlation 0.995.
`tests/test_flow4d_spacetime.py` (marked `slow`, because it trains a PINN, so it runs locally on the bake
machine rather than in the CI light lane) enforces:

- `dwdt_corr > 0.98` (the temporal pattern is recovered),
- `0.8 < dwdt_scale < 1.2` (amplitude within 20 percent).

This is what licenses using an analytic unsteady term on the real scan instead of a noisy three-frame finite
difference. The consequence is direct: with the analytic unsteady term the recovered real-scan relative-pressure
range is a physiological 0.79 mmHg, whereas the earlier finite-difference term inflated it to 14.87 mmHg.

## The gate to real-data numbers, side by side

| Gate | Analytic problem | Enforced by | Recovered vs true |
|---|---|---|---|
| BEM (ECGi) | concentric spheres, degree-1 harmonic | `test_ecgi_bem.py` | corr > 0.999, rel-err < 0.08, error halves per refinement |
| PPE steady (4D-flow) | converging duct, exact Euler pressure | `test_flow4d_ppe.py` | corr 1.00, 4.74 vs 4.73 mmHg |
| Unsteady (4D-flow) | time-varying Poiseuille, exact dw/dt | `test_flow4d_spacetime.py` | dw/dt corr 0.995 |

The real-data claims that these gates unlock: ECGi human RE 0.65-0.54 / CC 0.72-0.85 and dog RE 0.54 / CC 0.78
against the real cage; 4D-flow peak velocity 0.791 m/s, pressure range 0.79 mmHg, bracketing the clinical
Bernoulli 2.51 mmHg, with 27863 phase-wrap samples corrected. The gate proves the engine is correct on a
known answer; the real bake then reports what that correct engine produces on real data, with its honest scope.

## References

- Van Oosterom A, Strackee J (1983). The solid angle of a plane triangle. IEEE Transactions on Biomedical
  Engineering 30(2):125-126. DOI 10.1109/TBME.1983.325207.
- Bear LR, Cheng LK, LeGrice IJ, et al. (2015). Forward problem of electrocardiography: is it solved?
  Circulation: Arrhythmia and Electrophysiology 8(3):677-684. DOI 10.1161/CIRCEP.114.001573.
- Krittian SBS, Lamata P, Michler C, et al. (2012). A finite-element approach to the direct computation of
  relative cardiovascular pressure from time-resolved MR velocity data. Medical Image Analysis 16(5):1029-1037.
  DOI 10.1016/j.media.2012.04.003.
</content>
