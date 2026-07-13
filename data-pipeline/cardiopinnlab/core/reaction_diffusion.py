"""Reaction-diffusion cardiac excitation (Aliev-Panfilov monodomain) for the atrial-fibrillation vertical.

During fibrillation the excitation organizes into rotating spiral waves; their cores are phase singularities
(rotors), the targets of ablation. The Aliev-Panfilov two-variable model is a standard reduced ionic model
that produces such spirals:

    du/dt = D lap(u) - k u (u - a)(u - 1) - u v,
    dv/dt = (eps + mu1 v / (u + mu2)) (-v - k u (u - a - 1)).

u is the (normalized) transmembrane potential, v a slow recovery variable. An asymmetric initial condition
breaks the wavefront and it curls into a sustained rotating spiral. Explicit finite differences with Neumann
(no-flux) boundaries."""
from __future__ import annotations

import numpy as np

A, K, EPS, MU1, MU2 = 0.05, 8.0, 0.002, 0.2, 0.3


def _laplacian(f: np.ndarray) -> np.ndarray:
    lap = -4.0 * f
    lap += np.roll(f, 1, 0) + np.roll(f, -1, 0) + np.roll(f, 1, 1) + np.roll(f, -1, 1)
    # Neumann BC: mirror the edges (no flux)
    lap[0, :] += f[0, :] - f[1, :]
    lap[-1, :] += f[-1, :] - f[-2, :]
    lap[:, 0] += f[:, 0] - f[:, 1]
    lap[:, -1] += f[:, -1] - f[:, -2]
    return lap


def aliev_panfilov_spiral(n: int, steps: int, d: float = 0.1, dt: float = 0.05) -> tuple[np.ndarray, np.ndarray]:
    """Run the model to a sustained rotating spiral. Returns the final (u, v) grids [n, n]. The asymmetric
    initial condition (a half-plane of excitation + a half-plane of recovery) breaks the wave into a spiral."""
    u = np.zeros((n, n))
    v = np.zeros((n, n))
    u[:, : n // 2] = 1.0             # left half excited (a planar wavefront)
    v[: n // 2, :] = 1.0             # bottom half refractory (breaks the wave -> spiral)
    for _ in range(steps):
        du = d * _laplacian(u) - K * u * (u - A) * (u - 1.0) - u * v
        dv = (EPS + MU1 * v / (u + MU2)) * (-v - K * u * (u - A - 1.0))
        u = np.clip(u + dt * du, -0.1, 1.2)
        v = v + dt * dv
    return u, v


def phase_field(u: np.ndarray, v: np.ndarray) -> np.ndarray:
    """State-space phase phi = atan2(v - v_ref, u - u_ref) in [-pi, pi]. A phase singularity (rotor core) is a
    point around which phi winds by 2 pi."""
    return np.arctan2(v - np.mean(v), u - np.mean(u))


def phase_singularities(phase: np.ndarray) -> np.ndarray:
    """Topological charge per interior cell: the wrapped sum of phase differences around the 2x2 corner loop,
    divided by 2 pi. Returns the charge grid [n-1, n-1]; a value near +-1 marks a phase singularity."""
    def wrap(d):
        return (d + np.pi) % (2 * np.pi) - np.pi

    p = phase
    d1 = wrap(p[1:, :-1] - p[:-1, :-1])
    d2 = wrap(p[1:, 1:] - p[1:, :-1])
    d3 = wrap(p[:-1, 1:] - p[1:, 1:])
    d4 = wrap(p[:-1, :-1] - p[:-1, 1:])
    return (d1 + d2 + d3 + d4) / (2 * np.pi)
