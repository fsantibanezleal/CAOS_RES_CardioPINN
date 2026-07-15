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

__version__ = "0.21.002"  # point-cloud viewport: fixed mid-slate data canvas so the coolwarm midpoint (light grey) and magma low-end (near-black) stay visible in both themes; +point size
