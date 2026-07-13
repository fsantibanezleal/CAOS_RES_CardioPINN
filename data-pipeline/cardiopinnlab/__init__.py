"""cardiopinnlab, the offline GPU pipeline for CardioPINN (ADR-0057).

Physics-informed neural networks for cardiac electrophysiology and cardiovascular medicine. Each case is a
research vertical (activation mapping, fiber/conductivity inverse, Delta-PINN geometry, AF phase mapping,
4D-flow hemodynamics, ...). The heavy training + validation + ONNX export runs offline on a local NVIDIA GPU;
the static web app re-infers the exported PINN in the browser (onnxruntime-web) and replays baked field
traces. The two data contracts, the staged pipeline, the measured lane gate and the manifest/trace are the
frozen ADR-0057 base; the engine (core/ + cases/) is the cardiac specialization.
"""

__version__ = "0.06.000"  # display X.XX.XXX; PEP 440 form in pyproject.toml (0.6.0)
