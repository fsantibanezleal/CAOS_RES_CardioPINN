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
