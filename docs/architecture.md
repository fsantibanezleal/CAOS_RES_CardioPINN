# Architecture

CardioPINN is a REAL-DATA-ONLY, BAKE-AND-READ product. Every result is computed offline by the Python
pipeline and committed as a compact JSON trace; the static web app only READS those traces. No model runs in
the browser. There is no ONNX / onnxruntime-web lane, no Pyodide, no live recompute, and no replay gate. A
deploy is a frozen frontend build over a frozen artifact.

The product spans TWO different physics domains, each recovering an unmeasurable clinical field from a
measurable one on real data, and each has its own offline lane:

- ECGi (electrocardiographic imaging), quasi-static volume conduction, recovered on the CPU with NumPy/SciPy.
- 4D-flow aortic pressure, incompressible Navier-Stokes, recovered on the GPU with PyTorch.

Both lanes are gated on a known-answer analytic problem before any real data is trusted, both are deterministic
given a seed, and both end at the same boundary: a committed `data/derived/<case>/*.json` trace.

## The numbered deep notes

- [01, overview](architecture/01_overview.md), what the product is: two physics domains, the catalogue, the
  bake-and-read principle.
- [02, the two offline lanes](architecture/02_two-offline-lanes.md), the ECGi CPU lane and the 4D-flow GPU
  lane, module by module.
- [03, the analytic gates](architecture/03_analytic-gates.md), why every engine is gated on a known-answer
  problem before real data, with the exact recovered-vs-true numbers and the tests that enforce them.
- [04, determinism and reproducibility](architecture/04_determinism-and-reproducibility.md), a run is a pure
  function of (case, seed); the committed trace is the frozen output; CI validates, it never re-bakes.
- [05, deploy](architecture/05_deploy.md), the Vite/React/hash-router/three.js static SPA, the `copy-data.mjs`
  overlay, and the GitHub Actions Pages workflow on the custom domain.

Binding decision: [ADR-0057](../../conventions/architecture/0-archetype/ADR-0057-product-repo-archetype.md).
</content>
</invoke>
