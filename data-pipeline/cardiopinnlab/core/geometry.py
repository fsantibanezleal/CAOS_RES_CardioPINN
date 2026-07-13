"""Geometry helpers: a triangulated regular grid over a tissue patch, plus sampling utilities. The grid is
the render mesh the browser draws (nodes + triangles) and the collocation lattice the PINN residual is
evaluated on. Real curved cardiac surfaces (atrial/ventricular meshes + the Laplace-Beltrami eigenbasis)
enter with the Delta-PINN vertical via core/mesh.py; this module is the 2D-patch geometry the activation
vertical uses so its physics is exact (scikit-fmm anisotropy-free heterogeneous Eikonal)."""
from __future__ import annotations

import numpy as np


def make_grid_mesh(n: int, size_mm: float) -> tuple[np.ndarray, np.ndarray]:
    """An n x n vertex grid over [0, size_mm]^2, triangulated (two triangles per cell). Returns
    (vertices [n*n, 2] in mm, triangles [m, 3] int)."""
    xs = np.linspace(0.0, size_mm, n)
    ys = np.linspace(0.0, size_mm, n)
    gx, gy = np.meshgrid(xs, ys, indexing="xy")
    verts = np.stack([gx.ravel(), gy.ravel()], axis=1).astype(np.float64)

    tris = []
    for j in range(n - 1):
        for i in range(n - 1):
            v00 = j * n + i
            v10 = j * n + i + 1
            v01 = (j + 1) * n + i
            v11 = (j + 1) * n + i + 1
            tris.append([v00, v10, v11])
            tris.append([v00, v11, v01])
    return verts, np.asarray(tris, dtype=np.int64)


def sample_sensor_indices(n_vertices: int, n_sensors: int, rng: np.random.Generator) -> np.ndarray:
    """Choose n_sensors distinct vertex indices (the sparse mapping-catheter measurement sites)."""
    n_sensors = min(n_sensors, n_vertices)
    return np.sort(rng.choice(n_vertices, size=n_sensors, replace=False))


def relative_l2(pred: np.ndarray, truth: np.ndarray) -> float:
    """Relative L2 error ||pred - truth|| / ||truth||, the field-reconstruction metric used across verticals."""
    denom = float(np.linalg.norm(truth))
    if denom == 0.0:
        return float(np.linalg.norm(pred))
    return float(np.linalg.norm(pred - truth) / denom)
