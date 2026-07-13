# PINNs on cardiac geometry (Delta-PINN)

Vertical id: `delta-pinn-geometry` - category: electrophysiology-activation - lane: replay (the input is the
precomputed mesh eigenbasis, not a browser-suppliable coordinate).

## The research topic

Real cardiac chambers are curved surfaces, not flat patches, and some are geometrically hard: two regions
can be close in the ambient 3D space yet far apart along the tissue (a fold, an appendage, the two walls of a
thin structure). A physics-informed network that takes the raw ambient coordinates (x, y, z) as input has no
way to know that two ambient-close points are electrically distant, so on such geometry it leaks activation
across the gap and the reconstruction collapses.

Delta-PINNs (Sahli Costabal, Pezzuto, Perdikaris, Engineering Applications of AI 127, 2024,
DOI 10.1016/j.engappai.2023.107324) fix this by replacing the coordinate input with the lowest eigenfunctions
of the Laplace-Beltrami operator of the actual mesh. Those eigenfunctions are the natural, geometry-aware
coordinates of the surface: two geodesically distant points get distinct eigenfunction values even when their
ambient coordinates nearly coincide.

## The surface Eikonal residual (intrinsic)

The activation obeys the Eikonal equation on the surface, `||grad_surface T|| c = 1`. The residual is enforced
intrinsically with a per-face gradient operator `G`: for a per-vertex field `T`, `G T` is the gradient of the
piecewise-linear interpolant, lying in each triangle plane, so the physics is evaluated on the manifold rather
than in the ambient space. The loss combines the sparse data term, the area-weighted residual, a stimulus
anchor, and a non-negativity penalty.

## The comparison

A self-overlapping scroll surface (the sheet wraps about 2.35 pi, so its outer wrap sits over the inner one,
two sheets at nearly the same ambient point but about 2 pi times the curl radius apart geodesically) is the
regime where ambient coordinates fail. Three methods reconstruct the activation from 40 sparse noisy local
activation times:

| Method | input | activation-time rel-L2 |
|---|---|---|
| 3D interpolation | ambient x, y, z | ~0.45 |
| Vanilla PINN | ambient x, y, z | ~0.48 |
| Delta-PINN | Laplace-Beltrami eigenbasis (48 modes) | ~0.20 |

Ground truth is the exact geodesic-distance activation (heat method, Crane et al. 2013). The vanilla PINN and
the 3D interpolation both collapse (they cannot separate the overlapping sheets), while the Delta-PINN
reconstructs the field more than twice as accurately, using the same physics residual. The exact numbers are
the committed bake (GPU training has small run-to-run variation; the relative ordering is robust). This is the genuine
regime where the eigenfunction encoding is necessary, not a benign surface where ambient coordinates already
suffice (on a gentle dome a vanilla PINN is fine, and Delta-PINN gives no advantage; the value is exactly on
the hard geometry).

## Scope and honesty

- The geometry is a synthetic surface chosen to expose the ambient-vs-geodesic mismatch; the physics (surface
  Eikonal), the eigenbasis and the geodesic ground truth are exact. Real patient atrial/ventricular meshes
  (for example the Roney atrial fibre atlas) are the next data step.
- Replay-only: the Delta-PINN input is the precomputed mesh eigenbasis, so the browser cannot feed a
  coordinate to re-run it live; the trace replays the baked fields (Delta-PINN, vanilla, ground truth, error).
- Delta-PINN is not a universal accuracy win; it is the method that makes PINNs work where the ambient
  embedding is problematic. This vertical shows that regime honestly.

## References

- Sahli Costabal F, Pezzuto S, Perdikaris P (2024). Delta-PINNs: physics-informed neural networks on complex
  geometries. Engineering Applications of Artificial Intelligence 127. DOI 10.1016/j.engappai.2023.107324.
  Code: github.com/fsahli/Delta-PINNs.
- Crane K, Weischedel C, Wardetzky M (2013). Geodesics in heat. ACM Transactions on Graphics 32(5).
  DOI 10.1145/2516971.2516977.
