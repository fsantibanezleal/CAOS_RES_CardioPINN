"""The Eikonal physics residual (autograd). The isotropic Eikonal equation for cardiac activation is

    || grad T(x) || * V(x) = 1 ,   T = 0 at the stimulus,

where T is the local activation time [ms], V(x) = c(x) is the conduction velocity [mm/ms], and the slowness
1/V is the arrival-time gradient magnitude. A physics-informed network enforces this residual at collocation
points in addition to matching the sparse measured LATs. The anisotropic form (grad T)^T D grad T = 1 with a
fiber conductivity tensor D enters the fiber/geometry verticals; this module carries the isotropic core used
by the activation-mapping vertical."""
from __future__ import annotations

import torch


def grad_scalar(y: torch.Tensor, x: torch.Tensor) -> torch.Tensor:
    """d y / d x for a scalar field y = f(x), x requires_grad. Returns [n, dim]."""
    g = torch.autograd.grad(y, x, grad_outputs=torch.ones_like(y), create_graph=True, retain_graph=True)[0]
    return g


def eikonal_residual(t: torch.Tensor, coords: torch.Tensor, v: torch.Tensor) -> torch.Tensor:
    """Isotropic Eikonal residual r = ||grad T|| * V - 1, evaluated at coords. t = T(coords) [n,1],
    v = V(coords) [n,1] (conduction velocity > 0). Returns r [n,1]."""
    gt = grad_scalar(t, coords)                       # [n, dim]
    grad_norm = torch.sqrt(torch.sum(gt ** 2, dim=1, keepdim=True) + 1e-12)
    return grad_norm * v - 1.0


def total_variation(v_field: torch.Tensor, coords: torch.Tensor) -> torch.Tensor:
    """Total-variation regularizer on the conduction-velocity field: mean ||grad V||. Permits sharp CV
    discontinuities (scar borders, slow zones) while suppressing spurious oscillation, following the TV term
    in Sahli Costabal et al. 2020 that lets V be piecewise-smooth rather than globally smooth."""
    gv = grad_scalar(v_field, coords)
    return torch.mean(torch.sqrt(torch.sum(gv ** 2, dim=1, keepdim=True) + 1e-12))
