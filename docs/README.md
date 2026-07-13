# Docs, the CardioPINN wiki

CardioPINN is real-data-first: applied physics-informed reconstruction of unmeasurable cardiac quantities
from real measured signals, validated against real gold standards. No synthetic ground truth.

## The real case
- **[cases/real-ecgi-edgar.md](cases/real-ecgi-edgar.md)**, ECG imaging on a real EDGAR torso-tank
  experiment: fit the real measured body-surface potentials, recover the heart-surface potentials, validate
  against the real measured heart-cage potentials.

## Method + data
- The forward operator, the regularized inverse (Tikhonov, graph-regularized), the deep-ensemble per-node
  uncertainty, and the validation metrics are described in the case page and in the app (Methodology,
  Implementation, Experiments).

## Honesty + data governance
- Every number is the measured reconstruction quality against a real gold standard (relative error,
  correlation), never error against a field we invented.
- Raw datasets carry data-use agreements: they are read from a local path and are NOT redistributed
  (gitignored). Only the derived reconstruction result is committed and shown.
- Not clinically deployed; a validated methodological result on real experimental data.

## In progress
- A real 4D-flow -> pressure case (Navier-Stokes PINN, `real/ns_pinn.py`, verified on analytic Poiseuille)
  is awaiting the real 4D-flow velocity data.
