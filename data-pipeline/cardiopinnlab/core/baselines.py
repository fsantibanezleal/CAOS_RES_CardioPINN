"""Classical activation-mapping baselines: linear interpolation and Gaussian-process regression of the sparse
local activation times (LATs). These are the "classical" rung of the model ladder, the smoothness-only
reconstructions that ignore the wave physics. The Eikonal PINN is compared against them (Sahli Costabal et
al. 2020 make exactly this comparison: GP and linear interpolation over-smooth wavefront collisions and
invent unphysically high conduction velocities near gradient discontinuities)."""
from __future__ import annotations

import numpy as np
from scipy.interpolate import griddata


def linear_interp(sensor_xy: np.ndarray, sensor_t: np.ndarray, query_xy: np.ndarray) -> np.ndarray:
    """Piecewise-linear interpolation of LATs onto the full grid; nearest-neighbour fill outside the convex
    hull so the field is defined everywhere (a fair, complete baseline)."""
    lin = griddata(sensor_xy, sensor_t, query_xy, method="linear")
    nn = griddata(sensor_xy, sensor_t, query_xy, method="nearest")
    out = np.where(np.isnan(lin), nn, lin)
    return np.asarray(out, dtype=np.float64)


def gp_regress(sensor_xy: np.ndarray, sensor_t: np.ndarray, query_xy: np.ndarray,
               lengthscale_mm: float, signal_std: float, noise_std: float) -> tuple[np.ndarray, np.ndarray]:
    """Zero-mean Gaussian-process regression with an RBF kernel. Returns (posterior mean, posterior std) on
    the query grid. Fixed hyperparameters (no marginal-likelihood fit) keep it deterministic and dependency-
    free; the point is the smoothness prior + a variance estimate, the classical probabilistic baseline."""
    def rbf(a: np.ndarray, b: np.ndarray) -> np.ndarray:
        d2 = np.sum(a ** 2, 1)[:, None] + np.sum(b ** 2, 1)[None, :] - 2.0 * a @ b.T
        return (signal_std ** 2) * np.exp(-0.5 * np.maximum(d2, 0.0) / (lengthscale_mm ** 2))

    k_ss = rbf(sensor_xy, sensor_xy) + (noise_std ** 2) * np.eye(len(sensor_xy))
    k_qs = rbf(query_xy, sensor_xy)
    chol = np.linalg.cholesky(k_ss + 1e-9 * np.eye(len(sensor_xy)))
    alpha = np.linalg.solve(chol.T, np.linalg.solve(chol, sensor_t))
    mean = k_qs @ alpha
    v = np.linalg.solve(chol, k_qs.T)
    var = (signal_std ** 2) - np.sum(v ** 2, axis=0)
    std = np.sqrt(np.maximum(var, 0.0))
    return np.asarray(mean, dtype=np.float64), np.asarray(std, dtype=np.float64)
