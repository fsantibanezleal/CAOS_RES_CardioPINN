"""Anisotropic cardiac conduction: the fiber conductivity tensor and an anisotropic-Eikonal ground-truth
solver. Myocardium conducts faster ALONG the fiber than across it, so activation obeys the anisotropic
Eikonal sqrt( (grad T)^T D (grad T) ) = 1 with

    D(x) = R(alpha(x)) diag(cl^2, ct^2) R(alpha(x))^T,

alpha the local fiber angle, cl and ct the conduction velocities along and across the fiber. The wavefront
speed in a unit direction u is sqrt(u^T D u) (isotropic check: D = c^2 I gives speed c; along fiber gives cl).
The inverse problem (recover the fiber field alpha and the anisotropy from activation maps) is the FiberNet /
PIEMAP topic (Grandits, Pezzuto, Sahli Costabal et al., arXiv:2102.10863)."""
from __future__ import annotations

import heapq

import numpy as np


def fiber_tensor(alpha: float, cl: float, ct: float) -> np.ndarray:
    """The 2x2 conductivity tensor D for a fiber angle alpha and along/across CVs cl, ct."""
    c, s = np.cos(alpha), np.sin(alpha)
    r = np.array([[c, -s], [s, c]])
    return r @ np.diag([cl ** 2, ct ** 2]) @ r.T


# a 16-direction stencil (king + knight moves) for directional resolution of the anisotropic front
_STENCIL = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1),
            (-1, -2), (-1, 2), (1, -2), (1, 2), (-2, -1), (-2, 1), (2, -1), (2, 1)]


def anisotropic_activation_grid(n: int, size_mm: float, alpha_grid: np.ndarray, cl: float, ct: float,
                                source_rc: tuple[int, int]) -> np.ndarray:
    """Approximate anisotropic-Eikonal arrival time on an n x n grid via Dijkstra with anisotropic edge costs
    (edge cost = length / sqrt(u^T D u) using the local fiber tensor). Returns T [ms] of shape (n, n). This is
    a graph approximation of the continuous anisotropic Eikonal, exact enough to serve as inverse-problem
    ground truth."""
    dx = size_mm / (n - 1)
    dist = np.full((n, n), np.inf)
    r0, c0 = source_rc
    dist[r0, c0] = 0.0
    pq: list[tuple[float, int, int]] = [(0.0, r0, c0)]
    while pq:
        d, r, c = heapq.heappop(pq)
        if d > dist[r, c]:
            continue
        d_tensor = fiber_tensor(float(alpha_grid[r, c]), cl, ct)
        for dr, dc in _STENCIL:
            nr, nc = r + dr, c + dc
            if not (0 <= nr < n and 0 <= nc < n):
                continue
            e = np.array([dc * dx, dr * dx])
            length = np.hypot(*e)
            u = e / length
            speed = np.sqrt(u @ d_tensor @ u)
            nd = d + length / speed
            if nd < dist[nr, nc]:
                dist[nr, nc] = nd
                heapq.heappush(pq, (nd, nr, nc))
    return dist
