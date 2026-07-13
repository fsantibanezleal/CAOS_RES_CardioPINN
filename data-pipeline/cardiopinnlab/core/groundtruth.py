"""Ground-truth activation times by the fast marching method (scikit-fmm): the exact viscosity solution of
the isotropic, spatially heterogeneous Eikonal equation |grad T| = 1 / c(x), T = 0 at the stimulus.

This is the reference the activation-mapping PINN is validated against. scikit-fmm gives a mesh-native,
analytic-quality arrival-time field for a heterogeneous conduction-velocity map c(x) (including slow-
conduction regions that curve the wavefront and create collisions, the regime where naive interpolation of
sparse local activation times fails and the Eikonal PINN wins). Anisotropic (fiber-tensor) Eikonal ground
truth on triangulated surfaces enters with the fiber/geometry verticals; fim-python is the documented
reference tool for that lane (no Windows wheel, so the heterogeneous isotropic ground truth here uses
scikit-fmm, which ships wheels and solves this regime exactly)."""
from __future__ import annotations

import numpy as np
import skfmm


def eikonal_arrival_grid(speed: np.ndarray, source_rc: tuple[int, int], dx: float) -> np.ndarray:
    """Arrival time T on a regular grid. speed = c(x) [mm/ms] on an (n, n) grid; source at (row, col);
    dx = grid spacing [mm]. Returns T [ms] of shape (n, n)."""
    phi = np.ones_like(speed)
    r, c = source_rc
    phi[r, c] = -1.0  # zero level set = the stimulus site
    # travel_time solves |grad T| = 1/speed with T=0 on the zero level set
    t = skfmm.travel_time(phi, speed=speed, dx=dx)
    return np.asarray(t, dtype=np.float64)


def smooth_slow_region(n: int, size_mm: float, base_cv: float, slow_cv: float,
                       center_mm: tuple[float, float], radius_mm: float) -> np.ndarray:
    """A conduction-velocity map c(x) [mm/ms]: base_cv everywhere, dipping smoothly to slow_cv inside a
    Gaussian region (a zone of slowed conduction). Returns an (n, n) grid aligned with make_grid_mesh."""
    xs = np.linspace(0.0, size_mm, n)
    ys = np.linspace(0.0, size_mm, n)
    gx, gy = np.meshgrid(xs, ys, indexing="xy")
    cx, cy = center_mm
    d2 = (gx - cx) ** 2 + (gy - cy) ** 2
    w = np.exp(-d2 / (2.0 * radius_mm ** 2))
    return base_cv - (base_cv - slow_cv) * w
