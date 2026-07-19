# 04 · Determinism and reproducibility

## A run is a pure function of (case, seed)

Both offline lanes are deterministic: given the raw data and a seed, the bake produces the same trace every
time. Nothing in the pipeline reads a clock, a random device, or an environment-dependent order.

- ECGi: `reconstruct(data, seed=42)` seeds a single `numpy.random.default_rng(seed)` for the deep-ensemble
  measurement-noise draws; everything else (the forward operator, the gain calibration on the first half of
  frames, the oracle-best $\lambda$ sweep over 30 fixed log-spaced values, the closed-form regularized solves)
  is deterministic linear algebra. The same seed yields the same ensemble mean, spread, and metrics.
- 4D-flow: `bake_flow4d(seed=42)` seeds `core.pinn.seed_everything(seed)` (Python `random`, NumPy, and torch)
  before training the space-time PINN, seeds a separate `default_rng(seed)` for the velocity-noise robustness
  ensemble, and seeds the point-cloud decimation. The PINN training loop (Adam then L-BFGS, `train_loop`) is
  itself deterministic under a fixed seed and device.

The seed is not a knob the user turns; it is a fixed part of the run identity. Two people who run the same
case with the same seed on the same data get byte-comparable traces (modulo GPU non-associativity, which the
physiological-range and gate assertions absorb).

## The committed trace is the frozen output

The boundary between the offline physics and the web is the committed JSON trace. Once baked and committed, the
trace is frozen: it is the canonical record of what the engine produced, and it is what the web serves. The two
canonical artifacts are:

- `data/derived/real-ecgi-catalogue/catalogue.json` (schema `cardiopinn.ecgi-catalogue/v2`, about 2.44 MB): 2
  datasets, 4 beats, each with the cage mesh, decimated frames of the recovered / measured / abs-error /
  uncertainty fields, and the validated metrics.
- `data/derived/real-flow4d-pressure/trace.json` (schema `cardiopinn.flow4d-pressure/v3`, about 1.59 MB): a
  decimated 9000-point lumen cloud, the pressure at peak systole, the pulsatile speed over 16 frames, and the
  metrics block (peak velocity, PPE pressure drop, Bernoulli, noise sensitivity, aliasing-corrected samples,
  divergence reduction).

Because the trace is the frozen output, the number a viewer sees in the web is traceable end to end: web value
equals committed JSON value equals offline engine output. There is no recomputation that could drift from it.

## CI validates the artifact; it never re-bakes

CI does not run the physics. The heavy bake (the GPU-trained PINN, the raw DICOM decode, the raw EDGAR load)
happens once, locally, on the machine that has the data and the GPU, and the resulting trace is committed. CI's
job is to validate that committed trace, not to reproduce it:

- `scripts/check_artifacts.py` (the "contract 2" step in `ci.yml`) loads both committed traces with the
  standard library only and enforces hard floors: the ECGi catalogue must have at least 2 cases and 4 beats
  with every required field and metric present and correlations in $[-1,1]$; the 4D-flow trace must have a
  matching point cloud and pressure array, a physiological pressure drop ($0 <$ range $< 60$ mmHg, the guard
  against the finite-difference boundary artifact that once produced thousands of mmHg), and a physiological
  peak velocity ($0.1 < v < 6$ m/s).
- `tests/test_flow4d_trace.py` and `tests/test_real_ecgi.py` assert the same contracts as pytest, plus the
  4D-flow noise-robustness scalar bounds ($0 \le$ `noise_sensitivity_mmHg` $< 2.0$, ensemble members $\ge 3$).
- The analytic gates (`test_flow4d_ppe.py`, `test_ecgi_bem.py`) run in the CI light lane with no raw data and
  no GPU; the PINN gate (`test_flow4d_spacetime.py`) is marked `slow` and runs locally on the bake machine.

The CI split (`test` + `frontend` + `guards` jobs) installs only the light runtime (`requirements.txt`, no
torch); the GPU pipeline stack is local-only. So CI can never accidentally re-bake a canonical artifact, and a
partial or non-physiological bake fails the validator rather than shipping silently.

## Tests never write canonical artifacts

This is a hard rule with its own scar tissue across the portfolio: a test that writes into `data/derived/`
could clobber the committed multi-dataset catalogue with a smaller CPU-only bake, and two releases could ship
the degraded artifact before anyone noticed. The defenses here are structural:

- Tests read the committed trace (`tests/test_flow4d_trace.py`, `check_artifacts.py`); they never write it. The
  bake entry points (`flow4d_bake.main`, `ecgi_catalogue.bake_catalogue`) are the only writers, and they are
  invoked deliberately on the bake machine, never from a test or from CI.
- The completeness floors (`MIN_CASES = 2`, `MIN_BEATS = 4` in `check_artifacts.py`; the ECGi catalogue bake's
  own floor) mean that if some path ever did shrink the catalogue, the validator fails the build instead of
  publishing it.
- The physiological-range floors do the same for 4D-flow: a bake that regressed to the finite-difference
  boundary artifact would exceed 60 mmHg and fail, rather than shipping a wrong pressure map.

The net effect: the canonical artifact can only change through an intentional local bake plus commit, and the
committed artifact is re-verified by CI before it is served. Reproducibility here means the frozen number is
provably the engine's number, and no automated process can quietly overwrite it.

## References

- Aras K, Good W, Tate J, et al. (2015). Experimental Data and Geometric Analysis Repository (EDGAR).
  Journal of Electrocardiology 48(6):975-981. DOI 10.1016/j.jelectrocard.2015.08.008.
- Raissi M, Yazdani A, Karniadakis GE (2020). Hidden fluid mechanics. Science 367(6481):1026-1030.
  DOI 10.1126/science.aaw4741.
</content>
