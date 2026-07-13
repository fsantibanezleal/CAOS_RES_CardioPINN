# Docs, the CardioPINN wiki

Navigable wiki (ADR-0056), authored as each research vertical is built, not at the end. The offline pipeline
+ its validation + these docs are the primary product; the web app is a projection of a validated subset.

## Map
- **[architecture/](architecture/)**, how the repo works: the two worlds + one artifact contract, the two
  data contracts, determinism, the ONNX live-vs-replay lane gate, the staged pipeline, train -> ONNX -> web.
- **[frameworks/](frameworks/)**, one card per engine/library actually used (PyTorch, scikit-fmm,
  onnxruntime, robust-laplacian / potpourri3d, trimesh / meshio) plus the documented references (fim-python,
  openCARP, DeepXDE, PhysicsNeMo).
- **[guides/](guides/)**, runnable how-tos: run the offline bake, add a new vertical, bring your own map.
- **[cases/](cases/)**, one page per research vertical (its topic, theory, governing equations, method, real
  DOI references, results, and the honest scope).

## Verticals documented
- **[cases/act-eikonal-mapping.md](cases/act-eikonal-mapping.md)**, cardiac activation mapping by an Eikonal
  PINN (electrophysiology).

## Honesty + data policy
- Numbers come from the committed artifacts (the measured bake), never from a claim. Every case carries a
  real-or-synthetic flag in its manifest. The current cases are synthetic (fast-marching Eikonal ground truth
  on a realistic conduction map); no case is clinically validated.
- Public derived artifacts are committed (`data/derived/` + `models/`); raw/private sources stay out of git.
  The two data contracts govern raw -> pipeline and pipeline -> web.
