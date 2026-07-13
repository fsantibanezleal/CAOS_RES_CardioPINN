"""Curved-surface geometry for the Delta-PINN vertical: a smooth 3D cardiac-like surface, its Laplace-Beltrami
eigenbasis (the Delta-PINN input encoding), an intrinsic per-face gradient operator (for the surface Eikonal
residual), and geodesic activation ground truth.

Real curved cardiac surfaces make a raw (x, y, z) PINN struggle: the ambient coordinates do not respect the
manifold. Delta-PINNs (Sahli Costabal, Pezzuto, Perdikaris, 2024) replace the coordinate input with the low
eigenfunctions of the Laplace-Beltrami operator of the actual mesh, which are the natural, geometry-aware
coordinates of the surface. This module provides those eigenfunctions plus the operators needed to enforce
the Eikonal equation intrinsically on the surface."""
from __future__ import annotations

import numpy as np
import robust_laplacian
import scipy.sparse as sp
from scipy.sparse.linalg import eigsh


def make_curved_surface(n: int, size_mm: float, height_mm: float) -> tuple[np.ndarray, np.ndarray]:
    """A smoothly curved patch: an n x n grid over [0, size_mm]^2 lifted by a Gaussian dome in z. Returns
    (vertices [n*n, 3] mm, triangles [m, 3]). Non-planar, so it exercises the manifold encoding."""
    xs = np.linspace(0.0, size_mm, n)
    ys = np.linspace(0.0, size_mm, n)
    gx, gy = np.meshgrid(xs, ys, indexing="xy")
    cx = cy = size_mm / 2.0
    s = size_mm / 3.2
    gz = height_mm * np.exp(-((gx - cx) ** 2 + (gy - cy) ** 2) / (2.0 * s ** 2))
    verts = np.stack([gx.ravel(), gy.ravel(), gz.ravel()], axis=1).astype(np.float64)
    tris = []
    for j in range(n - 1):
        for i in range(n - 1):
            v00, v10, v01, v11 = j * n + i, j * n + i + 1, (j + 1) * n + i, (j + 1) * n + i + 1
            tris.append([v00, v10, v11])
            tris.append([v00, v11, v01])
    return verts, np.asarray(tris, dtype=np.int64)


def make_curled_surface(n: int, radius_mm: float, length_mm: float) -> tuple[np.ndarray, np.ndarray]:
    """A curled scroll surface: the sheet wraps ~1.85 pi around an axis, so its two ends come close in the
    ambient space while remaining far apart along the manifold. This is the regime where raw (x, y, z) input
    fails (two geodesically distant regions look adjacent) and the Laplace-Beltrami eigenbasis of Delta-PINNs
    is needed. Returns (vertices [n*n, 3] mm, triangles [m, 3])."""
    theta_max = 2.35 * np.pi   # > 2 pi: the outer wrap overlaps the inner one, two sheets at nearly the same
                               # ambient point but ~2 pi R apart geodesically (where a raw x,y,z PINN fails)
    us = np.linspace(0.0, 1.0, n)
    vs = np.linspace(0.0, length_mm, n)
    gu, gv = np.meshgrid(us, vs, indexing="xy")
    theta = theta_max * gu
    x = radius_mm * np.sin(theta)
    z = radius_mm * (1.0 - np.cos(theta))
    verts = np.stack([x.ravel(), gv.ravel(), z.ravel()], axis=1).astype(np.float64)
    tris = []
    for j in range(n - 1):
        for i in range(n - 1):
            v00, v10, v01, v11 = j * n + i, j * n + i + 1, (j + 1) * n + i, (j + 1) * n + i + 1
            tris.append([v00, v10, v11])
            tris.append([v00, v11, v01])
    return verts, np.asarray(tris, dtype=np.int64)


def laplace_beltrami_eigenbasis(verts: np.ndarray, faces: np.ndarray, k: int) -> np.ndarray:
    """The lowest k non-trivial Laplace-Beltrami eigenfunctions (robust Laplacian, Sharp-Crane), normalized to
    [-1, 1] per column. Returns [n, k]. The constant zeroth eigenfunction is dropped."""
    lap, mass = robust_laplacian.mesh_laplacian(verts, faces)
    vals, vecs = eigsh(lap, k=k + 1, M=mass, sigma=1e-8, which="LM")
    phi = vecs[:, 1:k + 1]                                  # drop the constant mode
    denom = np.max(np.abs(phi), axis=0, keepdims=True)
    denom[denom == 0] = 1.0
    return (phi / denom).astype(np.float64)


def face_gradient_operator(verts: np.ndarray, faces: np.ndarray) -> tuple[sp.csr_matrix, np.ndarray]:
    """A sparse operator G [3*m, n] mapping per-vertex scalars to per-face intrinsic gradients (the gradient
    of the piecewise-linear interpolant, lying in each face plane). Also returns per-face areas [m]. Used to
    enforce the surface Eikonal residual ||grad_surface T|| c = 1 differentiably in the PINN loss."""
    m = faces.shape[0]
    rows, cols, data = [], [], []
    areas = np.zeros(m)
    for f in range(m):
        ia, ib, ic = faces[f]
        a, b, c = verts[ia], verts[ib], verts[ic]
        e_a = c - b   # edge opposite vertex a
        e_b = a - c   # edge opposite vertex b
        e_c = b - a   # edge opposite vertex c
        nrm = np.cross(b - a, c - a)
        area2 = np.linalg.norm(nrm)
        areas[f] = 0.5 * area2
        if area2 < 1e-12:
            continue
        nhat = nrm / area2
        # grad of a linear scalar f = sum_v f_v * (nhat x e_opposite) / (2 area)
        ga = np.cross(nhat, e_a) / area2
        gb = np.cross(nhat, e_b) / area2
        gc = np.cross(nhat, e_c) / area2
        for comp in range(3):
            base = 3 * f + comp
            rows += [base, base, base]
            cols += [ia, ib, ic]
            data += [ga[comp], gb[comp], gc[comp]]
    g = sp.csr_matrix((data, (rows, cols)), shape=(3 * m, verts.shape[0]))
    return g, areas


def geodesic_activation(verts: np.ndarray, faces: np.ndarray, source_vertex: int, speed_mm_per_ms: float) -> np.ndarray:
    """Geodesic-distance activation time from a source vertex, T = geodesic_distance / speed [ms]. This is the
    exact isotropic surface-Eikonal solution (unit-speed geodesic distance scaled by 1/c). Uses the heat
    method (potpourri3d) when available, else a graph-Dijkstra fallback on the mesh edges."""
    try:
        import potpourri3d as pp3d
        solver = pp3d.MeshHeatMethodDistanceSolver(verts, faces)
        dist = solver.compute_distance(source_vertex)
    except Exception:
        dist = _dijkstra_surface(verts, faces, source_vertex)
    return np.asarray(dist, dtype=np.float64) / speed_mm_per_ms


def _dijkstra_surface(verts: np.ndarray, faces: np.ndarray, source: int) -> np.ndarray:
    import heapq
    n = verts.shape[0]
    adj: list[list[tuple[int, float]]] = [[] for _ in range(n)]
    seen = set()
    for f in faces:
        for a, b in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])):
            key = (min(a, b), max(a, b))
            if key in seen:
                continue
            seen.add(key)
            w = float(np.linalg.norm(verts[a] - verts[b]))
            adj[a].append((b, w))
            adj[b].append((a, w))
    dist = np.full(n, np.inf)
    dist[source] = 0.0
    pq = [(0.0, source)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, w in adj[u]:
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist
