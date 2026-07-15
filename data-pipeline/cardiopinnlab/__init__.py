"""cardiopinnlab, the offline pipeline for CardioPINN (ADR-0057).

Physics-informed reconstruction of cardiac quantities that cannot be measured directly, from real clinical
data that can, across two physics domains: (1) ECG imaging, recovering heart-surface potentials from a
body-surface recording by quasi-static volume conduction (real EDGAR datasets; NumPy/SciPy); (2) 4D-flow,
recovering the aortic pressure field from a measured MRI velocity scan by incompressible Navier-Stokes (a
divergence-free velocity PINN in torch feeding a pressure-Poisson solve). Every case runs OFFLINE (the ECGi
reconstruction on CPU, the 4D-flow PINN on a local GPU) and the derived results are baked to committed JSON
traces; the static web app READS those traces (it does not run any model in the browser). Physics engines are
gated on analytic problems with known answers before any real data is trusted (see real/ + tests/).
"""

__version__ = "0.21.005"  # full adversarial revision (61 confirmed findings): content-honesty (ensemble-vs-Tikhonov, cage gain/oracle-lambda leakage disclosure, denoised-vs-measured velocity), robustness (error boundary, fetch handling, dataset-aware tabs, coords guard, NaN floor), plus docs/kits fixes
