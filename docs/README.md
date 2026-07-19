# Docs, the CardioPINN wiki

CardioPINN is real-data-first: applied physics-informed reconstruction of unmeasurable cardiac quantities
from real measured signals, validated against real gold standards. No synthetic ground truth.

The app is a catalogue across two physics domains, selected by a top-level case switch.

## The real cases
- **[cases/real-ecgi-edgar.md](cases/real-ecgi-edgar.md)**, ECG imaging (quasi-static volume conduction) on
  real EDGAR torso-tank experiments: fit the real measured body-surface potentials, recover the heart-surface
  potentials, validate against the real measured heart-cage potentials. A multi-dataset catalogue reconstructed
  by the identical pipeline: a human torso tank (sinus + two paced beats) and an in-situ dog (sinus).
- **[cases/real-flow4d-pressure.md](cases/real-flow4d-pressure.md)**, 4D-flow aortic pressure (incompressible
  Navier-Stokes) on a real 4D-flow MRI velocity scan: denoise the measured velocity with a divergence-free
  PINN, recover the relative pressure field by the pressure-Poisson equation from analytic derivatives,
  gate the engine on an analytic flow and bracket the clinical Bernoulli estimate.

## Method + data
- ECGi: the forward operator, the regularized inverse (Tikhonov, graph-regularized), the deep-ensemble
  per-node uncertainty, and the validation metrics are in the case page and the app (Methodology,
  Implementation, Experiments).
- 4D-flow: the DICOM velocity decoding, the divergence-free PINN denoiser, the analytic pressure-Poisson
  source/flux, and the analytic gate are in the 4D-flow case page.

## Honesty + data governance
- Every ECGi number is the measured reconstruction quality against a real gold standard (relative error,
  correlation), never error against a field we invented. For 4D-flow there is no invasive pressure gold
  standard (the reason the method exists); the validated claims are the analytic gate, the physiological
  range, the divergence-free denoising, and the Bernoulli bracket.
- Every result is produced offline and committed as a JSON trace; the static web app reads the traces (no
  model runs in the browser). Raw datasets carry data-use agreements: read from a local path, not
  redistributed (gitignored).
- Not clinically deployed; validated methodological results on real experimental data.
