"""Shared harness for the beyond-SOTA 4D-flow experiments (research/beyond-sota-pinn-2026-07-14).

Known-answer analytic flows with EXACT pressure / EXACT unsteady acceleration, a hard-divergence-free
curl-parameterized velocity field v = curl(A_theta), and metric helpers. Every claim of an advance is proven
or refuted here against a flow whose answer is known in closed form. SI units (m, m/s, s, Pa).

Run from the repo so `cardiopinnlab` imports:  .venv-pipeline/Scripts/python.exe -m experiments.beyond_sota.p1_curl
(with data-pipeline on sys.path; the experiment scripts insert it)."""
from __future__ import annotations

import numpy as np
import torch

from cardiopinnlab.core.pinn import MLP, seed_everything, select_device, train_loop
from cardiopinnlab.real.flow4d_ppe import RHO, MU, PA_PER_MMHG, solve_ppe, solve_ppe_precomputed


def solve_analytic(field, mask, h, coords_grid_m, rho=RHO, mu=MU):
    """Solve the PPE using a field's ANALYTIC (autograd) source/flux (the engine's real path), not finite
    differences. `field` must expose .source_and_flux(pts_m, rho, mu). Scatters S,b to grids and solves."""
    pts = coords_grid_m[mask]
    S_nodes, b_nodes = field.source_and_flux(pts, rho, mu)
    S = np.zeros(mask.shape); b = np.zeros(mask.shape + (3,))
    idx = np.argwhere(mask)
    for n, (k, j, i) in enumerate(idx):
        S[k, j, i] = S_nodes[n]; b[k, j, i] = b_nodes[n]
    return solve_ppe_precomputed(S, b, mask, h)


# ----------------------------------------------------------------------------- analytic flows
def converging_duct(h: float = 0.0015):
    """Axisymmetric converging duct with exact steady-Euler pressure (same flow as flow4d_ppe.gate_converging).
    w = U0(1+a z), u = -a/2 U0 x, v = -a/2 U0 y (divergence-free); p(z) = -rho U0^2 (a z + a^2 z^2/2) + c.
    Returns a grid velocity [nz,ny,nx,3], boolean lumen mask, exact pressure grid [nz,ny,nx] (Pa), h, U scale."""
    U0, Rd, Lz, a = 1.0, 0.012, 0.060, 8.0
    xs = np.arange(-Rd, Rd + h, h); ys = xs.copy(); zs = np.arange(0, Lz + h, h)
    Z, Y, X = np.meshgrid(zs, ys, xs, indexing="ij")
    vel = np.zeros(X.shape + (3,))
    vel[..., 0] = -0.5 * a * U0 * X
    vel[..., 1] = -0.5 * a * U0 * Y
    vel[..., 2] = U0 * (1 + a * Z)
    mask = (X ** 2 + Y ** 2) <= Rd ** 2
    p_true = -RHO * U0 ** 2 * (a * Z + a ** 2 * Z ** 2 / 2)
    U = float(np.linalg.norm(vel[mask], axis=1).max())    # ~venc-like scale
    return {"vel": vel, "mask": mask, "p_true": p_true, "h": h, "U": U, "shape": mask.shape}


def add_noise(vel: np.ndarray, mask: np.ndarray, frac: float, U: float, seed: int) -> np.ndarray:
    """Add Gaussian velocity noise at `frac` of the velocity scale U (like 4D-flow phase noise), lumen only."""
    rng = np.random.default_rng(seed)
    out = vel.copy()
    noise = rng.normal(0.0, frac * U, size=vel.shape)
    out[mask] = vel[mask] + noise[mask]
    return out


# ----------------------------------------------------------------------------- metrics
def divergence_grid(vel: np.ndarray, mask: np.ndarray, h: float) -> float:
    """RMS |div v| over the lumen interior (central differences), normalized by (U/L) is left to the caller.
    Returns the raw RMS divergence (1/s)."""
    du = np.gradient(vel[..., 0], h, axis=2)
    dv = np.gradient(vel[..., 1], h, axis=1)
    dw = np.gradient(vel[..., 2], h, axis=0)
    div = du + dv + dw
    # interior: erode the mask by one voxel so the central difference does not straddle the boundary
    from scipy import ndimage
    interior = ndimage.binary_erosion(mask, iterations=1)
    return float(np.sqrt(np.mean(div[interior] ** 2)))


def pressure_error(p_rec: np.ndarray, p_true: np.ndarray, mask: np.ndarray) -> dict:
    """Compare a recovered pressure grid to the exact one (both up to an additive constant)."""
    m = mask & ~np.isnan(p_rec)
    pt = p_true[m] - p_true[m].mean()
    pr = p_rec[m] - np.nanmean(p_rec[m])
    corr = float(np.corrcoef(pt, pr)[0, 1])
    scale = float(np.polyfit(pt, pr, 1)[0])
    true_drop = float((pt.max() - pt.min()) / PA_PER_MMHG)
    rec_drop = float((pr.max() - pr.min()) / PA_PER_MMHG)
    rmse = float(np.sqrt(np.mean((pr - pt) ** 2)) / PA_PER_MMHG)
    return {"corr": round(corr, 4), "scale": round(scale, 4),
            "true_drop_mmHg": round(true_drop, 3), "rec_drop_mmHg": round(rec_drop, 3),
            "drop_err_mmHg": round(abs(rec_drop - true_drop), 4), "rmse_mmHg": round(rmse, 4)}


# ----------------------------------------------------------------------------- curl-parameterized field
def _curl_nd(A: torch.Tensor, xc: torch.Tensor) -> torch.Tensor:
    """v = curl(A) in the SAME (non-dimensional) coordinates as xc. A [n,3], xc [n,3] requires_grad.
    v_x = dAz/dy - dAy/dz, v_y = dAx/dz - dAz/dx, v_z = dAy/dx - dAx/dy. Divergence-free by construction."""
    n = xc.shape[0]
    g = [torch.autograd.grad(A[:, i], xc, torch.ones(n, device=xc.device),
                             create_graph=True, retain_graph=True)[0] for i in range(3)]  # g[i][:,j] = dA_i/dx_j
    vx = g[2][:, 1] - g[1][:, 2]
    vy = g[0][:, 2] - g[2][:, 0]
    vz = g[1][:, 0] - g[0][:, 1]
    return torch.stack([vx, vy, vz], dim=1)


class CurlField:
    """A hard-divergence-free velocity field v = curl(A_theta). velocity() samples v (SI) on a grid; div is 0
    by construction (up to autograd roundoff)."""

    def __init__(self, net, c0, L, U, device):
        self.net, self.c0, self.L, self.U, self.device = net, c0, L, U, device

    def velocity(self, pts_m: np.ndarray, batch: int = 20000) -> np.ndarray:
        out = np.zeros((len(pts_m), 3))
        for s in range(0, len(pts_m), batch):
            xc = torch.tensor((pts_m[s:s + batch] - self.c0) / self.L, dtype=torch.float32,
                              device=self.device, requires_grad=True)
            v_nd = _curl_nd(self.net(xc), xc)
            out[s:s + batch] = v_nd.detach().cpu().numpy() * self.U
        return out

    def source_and_flux(self, pts_m, rho, mu, batch: int = 8000):
        """Analytic PPE source S and steady Neumann flux b (convective; the viscous term is negligible on the
        smooth gate flows and dropped for the 3rd-derivative cost), from the curl field's autograd derivatives.
        Mirrors DenoisedField.source_and_flux so soft vs curl compare on the SAME analytic path."""
        N = len(pts_m); S = np.zeros(N); b = np.zeros((N, 3)); sL, sU = self.L, self.U
        for s in range(0, N, batch):
            xc = torch.tensor((pts_m[s:s + batch] - self.c0) / sL, dtype=torch.float32,
                              device=self.device, requires_grad=True)
            v_nd = _curl_nd(self.net(xc), xc)               # [n,3], has graph (create_graph in _curl_nd)
            n = xc.shape[0]
            J = torch.zeros(n, 3, 3, device=self.device)
            for i in range(3):
                Ji = torch.autograd.grad(v_nd[:, i], xc, torch.ones(n, device=self.device),
                                         retain_graph=True)[0]      # d v_nd_i / d x_nd [n,3]
                J[:, i, :] = Ji * (sU / sL)
            v_si = v_nd.detach() * sU
            Jd = J.detach()
            S[s:s + batch] = (-rho * torch.einsum('nij,nji->n', Jd, Jd)).cpu().numpy()
            conv = torch.einsum('nij,nj->ni', Jd, v_si)
            b[s:s + batch] = (-rho * conv).cpu().numpy()
        return S, b


def fit_curl(coords_m, vel_ms, *, seed=42, n_adam=4000, n_lbfgs=400, width=96, depth=6, n_coll=6000):
    """Fit v = curl(A_theta) to (coords_m, vel_ms). NO divergence penalty (div is exact). Same optimizer budget
    as the soft-penalty denoiser for a fair comparison."""
    device = select_device(); seed_everything(seed)
    c0 = coords_m.mean(0); L = float(np.abs(coords_m - c0).max() + 1e-9)
    U = float(np.linalg.norm(vel_ms, axis=1).max() + 1e-9)
    Xnd = (coords_m - c0) / L
    X = torch.tensor(Xnd, dtype=torch.float32, device=device, requires_grad=True)
    V = torch.tensor(vel_ms / U, dtype=torch.float32, device=device)
    net = MLP(3, 3, width=width, depth=depth, activation="tanh").to(device)

    def closure():
        v_nd = _curl_nd(net(X), X)
        return torch.mean((v_nd - V) ** 2)

    train_loop(list(net.parameters()), closure, n_adam=n_adam, n_lbfgs=n_lbfgs, lr=2e-3)
    return CurlField(net, c0, L, U, device)


def grid_from_field(field, mask, base_vel_shape, coords_grid_m):
    """Evaluate a field.velocity() on all masked voxels and scatter back to a [nz,ny,nx,3] grid (NaN outside)."""
    v = np.full(base_vel_shape, np.nan)
    idx = np.argwhere(mask)
    pts = coords_grid_m[mask]
    vv = field.velocity(pts)
    for n, (k, j, i) in enumerate(idx):
        v[k, j, i] = vv[n]
    # zero-fill outside so solve_ppe's FD does not see NaN (mask restricts the solve anyway)
    v[np.isnan(v)] = 0.0
    return v


def grid_coords(shape, h):
    """Physical coordinates of every voxel centre for a converging_duct-style grid (origin at the array corner
    used by converging_duct: x,y in [-Rd..], z in [0..])."""
    nz, ny, nx = shape
    Rd = 0.012
    xs = np.arange(-Rd, -Rd + nx * h, h)[:nx]
    ys = np.arange(-Rd, -Rd + ny * h, h)[:ny]
    zs = np.arange(0, nz * h, h)[:nz]
    Z, Y, X = np.meshgrid(zs, ys, xs, indexing="ij")
    return np.stack([X, Y, Z], axis=-1)
