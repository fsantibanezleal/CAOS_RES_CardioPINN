"""Physics-informed denoising of a measured 4D-flow velocity field: fit the measured velocity while enforcing
incompressibility (div v = 0).

This is the step that makes PPE pressure recovery work on real data. The pressure-Poisson source is a product
of velocity SPATIAL DERIVATIVES, so measurement noise, which violates continuity, is amplified into a
non-physiological pressure. A network v_theta(x,y,z) trained to (i) match the measured velocity at the lumen
voxels and (ii) satisfy div v = 0 at collocation points produces a smooth, divergence-free field whose
derivatives are clean. Unlike PRESSURE (gauge-free, weakly coupled, which the momentum-residual PINN failed
to recover), VELOCITY is strongly constrained by the data, so this denoising is well-posed and robust.

SI units (m, m/s). One frame at a time; the caller assembles the temporal derivative from a few denoised
frames. Output is the denoised velocity evaluated back on the voxel grid, ready for flow4d_ppe.solve_ppe."""
from __future__ import annotations

import numpy as np
import torch

from ..core.pinn import MLP, seed_everything, select_device, train_loop
from .flow4d_ppe import PA_PER_MMHG, RHO, solve_ppe, solve_ppe_precomputed


class DenoisedField:
    """A trained divergence-free velocity field with ANALYTIC (autograd) derivatives, so the pressure-Poisson
    source and boundary flux are smooth everywhere (no finite-difference edge artifact at the lumen boundary,
    which is what otherwise corrupts the recovered pressure). Velocity and derivatives are returned in SI."""

    def __init__(self, net, c0, L, U, device):
        self.net, self.c0, self.L, self.U, self.device = net, c0, L, U, device

    def velocity(self, pts_m):
        xt = torch.tensor((pts_m - self.c0) / self.L, dtype=torch.float32, device=self.device)
        with torch.no_grad():
            return self.net(xt).cpu().numpy() * self.U

    def source_and_flux(self, pts_m, rho, mu, batch=20000):
        """Analytic PPE source S = -rho sum_ij (dv_i/dx_j)(dv_j/dx_i) and the STEADY part of the Neumann flux
        b_i = -rho (v.grad)v_i + mu lap(v_i), both in SI, at pts_m [N,3]. The unsteady term -rho dv/dt is added
        by the caller from a few frames. Chain rule: d/dx = (U/L) d/dx_nd, d2/dx2 = (U/L^2) d2/dx_nd2."""
        N = len(pts_m)
        S = np.zeros(N); b = np.zeros((N, 3))
        sL, sU = self.L, self.U
        for s in range(0, N, batch):
            pts = pts_m[s:s + batch]
            xc = torch.tensor((pts - self.c0) / sL, dtype=torch.float32, device=self.device, requires_grad=True)
            out = self.net(xc)                       # non-dim velocity [n,3]
            n = xc.shape[0]
            J = torch.zeros(n, 3, 3, device=self.device)      # J[:,i,j] = dv_i/dx_j (SI)
            lap = torch.zeros(n, 3, device=self.device)       # lap[:,i] = sum_j d2 v_i/dx_j2 (SI)
            for i in range(3):
                gi = torch.autograd.grad(out[:, i], xc, torch.ones(n, device=self.device),
                                         create_graph=True, retain_graph=True)[0]   # d v_i / d x_nd [n,3]
                J[:, i, :] = gi * (sU / sL)
                for j in range(3):
                    g2 = torch.autograd.grad(gi[:, j], xc, torch.ones(n, device=self.device),
                                             create_graph=True, retain_graph=True)[0][:, j]
                    lap[:, i] += g2 * (sU / sL ** 2)
            v_si = out.detach() * sU
            Jd = J.detach()
            s_val = -rho * torch.einsum('nij,nji->n', Jd, Jd)
            conv = torch.einsum('nij,nj->ni', Jd, v_si)       # (v.grad)v_i
            b_val = -rho * conv + mu * lap.detach()
            S[s:s + batch] = s_val.cpu().numpy()
            b[s:s + batch] = b_val.cpu().numpy()
        return S, b


def denoise_frame(coords_m, vel_ms, *, seed=42, n_adam=4000, n_lbfgs=400, width=96, depth=6,
                  w_div=1.0, n_coll=6000) -> DenoisedField:
    """Fit + divergence-free-project one velocity frame. coords_m [N,3] lumen voxel centres (m), vel_ms [N,3]
    measured velocity (m/s). Returns a DenoisedField with .velocity() and analytic .source_and_flux()."""
    device = select_device()
    seed_everything(seed)
    c0 = coords_m.mean(0)
    L = float(np.abs(coords_m - c0).max() + 1e-9)
    U = float(np.linalg.norm(vel_ms, axis=1).max() + 1e-9)
    X = torch.tensor((coords_m - c0) / L, dtype=torch.float32, device=device)
    V = torch.tensor(vel_ms / U, dtype=torch.float32, device=device)
    net = MLP(3, 3, width=width, depth=depth, activation="tanh").to(device)
    lo = X.min(0).values; hi = X.max(0).values
    gen = torch.Generator(device=device).manual_seed(seed)

    def div_loss():
        xc = (lo + (hi - lo) * torch.rand(n_coll, 3, generator=gen, device=device)).requires_grad_(True)
        out = net(xc)
        div = 0.0
        for i in range(3):
            gi = torch.autograd.grad(out[:, i:i + 1], xc, torch.ones_like(out[:, i:i + 1]),
                                     create_graph=True, retain_graph=True)[0]
            div = div + gi[:, i:i + 1]
        return torch.mean(div ** 2)

    def closure():
        loss_data = torch.mean((net(X) - V) ** 2)
        return loss_data + w_div * div_loss()

    train_loop(list(net.parameters()), closure, n_adam=n_adam, n_lbfgs=n_lbfgs, lr=2e-3)
    return DenoisedField(net, c0, L, U, device)


def gate_analytic_vs_fd(seed: int = 0, noise_frac: float = 0.08) -> dict:
    """Gate the DESIGN choice that separates this engine from a standard finite-difference PPE/WERP pipeline:
    the pressure-Poisson source is a velocity-GRADIENT product, so recovering pressure from a fitted velocity
    field is decided by how its gradients are formed. Here, on an analytic converging duct with EXACT pressure,
    a divergence-free denoiser is fit to NOISY velocity, then pressure is recovered two ways from the SAME field:
    (a) from the network's ANALYTIC (autograd) derivatives; (b) from FINITE DIFFERENCES on the sampled grid.
    The analytic path recovers the exact pressure drop to a few hundredths of a mmHg; the finite-difference path
    inflates it by tens of percent, worst at the lumen edge. Validated on a known answer (research dossier
    beyond-sota-pinn-2026-07-14). No raw data needed."""
    U0, Rd, Lz, a = 1.0, 0.012, 0.060, 8.0
    h = 0.0015
    xs = np.arange(-Rd, Rd + h, h); ys = xs.copy(); zs = np.arange(0, Lz + h, h)
    Z, Y, X = np.meshgrid(zs, ys, xs, indexing="ij")
    vel = np.zeros(X.shape + (3,))
    vel[..., 0] = -0.5 * a * U0 * X; vel[..., 1] = -0.5 * a * U0 * Y; vel[..., 2] = U0 * (1 + a * Z)
    mask = (X ** 2 + Y ** 2) <= Rd ** 2
    p_true = -RHO * U0 ** 2 * (a * Z + a ** 2 * Z ** 2 / 2)
    U = float(np.linalg.norm(vel[mask], axis=1).max())
    rng = np.random.default_rng(seed)
    vn = vel.copy(); vn[mask] = vel[mask] + rng.normal(0, noise_frac * U, vel[mask].shape)
    coords = np.stack([X[mask], Y[mask], Z[mask]], 1)

    fld = denoise_frame(coords, vn[mask], seed=seed, n_adam=1500, n_lbfgs=150, width=64, depth=5, w_div=1.0)

    def _drop_err(p):
        m = mask & ~np.isnan(p)
        pt = p_true[m] - p_true[m].mean(); pr = p[m] - np.nanmean(p[m])
        return abs(((pr.max() - pr.min()) - (pt.max() - pt.min())) / PA_PER_MMHG)

    # (a) analytic source/flux
    S_nodes, b_nodes = fld.source_and_flux(coords, RHO, 0.0035)
    S = np.zeros(mask.shape); b = np.zeros(mask.shape + (3,))
    for n, (k, j, i) in enumerate(np.argwhere(mask)):
        S[k, j, i] = S_nodes[n]; b[k, j, i] = b_nodes[n]
    p_analytic = solve_ppe_precomputed(S, b, mask, h)
    # (b) finite differences on the denoised velocity grid
    v_grid = np.zeros(vel.shape)
    vv = fld.velocity(coords)
    for n, (k, j, i) in enumerate(np.argwhere(mask)):
        v_grid[k, j, i] = vv[n]
    p_fd = solve_ppe(v_grid, mask, h)

    ea, ef = _drop_err(p_analytic), _drop_err(p_fd)
    return {"analytic_drop_err_mmHg": round(float(ea), 4), "fd_drop_err_mmHg": round(float(ef), 4),
            "ratio_fd_over_analytic": round(float(ef / max(ea, 1e-6)), 1),
            "true_drop_mmHg": round(float((p_true[mask].max() - p_true[mask].min()) / PA_PER_MMHG), 3)}


if __name__ == "__main__":
    import json
    print(json.dumps(gate_analytic_vs_fd()))
