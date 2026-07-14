"""A space-time divergence-free velocity PINN for the 4D-flow case: v_theta(x,y,z,t) fit to the measured
velocity over the WHOLE cardiac cycle while enforcing incompressibility, so the pressure-Poisson source AND
the unsteady term rho*dv/dt are both ANALYTIC (autograd), replacing the three-frame finite difference.

This upgrades the pressure recovery from a peak-systole snapshot to a continuous space-time field: the unsteady
acceleration dv/dt is differentiated exactly in time rather than estimated from three frames, and the pressure
can be evaluated at any phase. The velocity is the real 4D-flow scan; the temporal derivative is gated on an
analytic time-varying Poiseuille flow whose exact dw/dt (and hence the unsteady pressure gradient) is known,
before it is used on real data.

SI units (m, m/s, s). Same separation of concerns as the steady denoiser: the well-posed velocity fit is the
network's job; the ill-posed pressure is left to the elliptic Poisson solve (flow4d_ppe)."""
from __future__ import annotations

import numpy as np
import torch

from ..core.pinn import MLP, seed_everything, select_device, train_loop
from .flow4d_ppe import RHO, MU


class SpaceTimeField:
    """A trained divergence-free v(x,y,z,t) with analytic spatial derivatives (for the PPE source + wall flux)
    and analytic temporal derivative (for the unsteady term). All SI."""

    def __init__(self, net, c0, L, U, t0, T, device):
        self.net, self.c0, self.L, self.U = net, c0, L, U
        self.t0, self.T, self.device = t0, T, device

    def _nd(self, pts_xyzt):
        out = np.empty_like(pts_xyzt, dtype=np.float32)
        out[:, :3] = (pts_xyzt[:, :3] - self.c0) / self.L
        out[:, 3] = (pts_xyzt[:, 3] - self.t0) / self.T
        return out

    def velocity(self, pts_xyzt):
        xt = torch.tensor(self._nd(pts_xyzt), dtype=torch.float32, device=self.device)
        with torch.no_grad():
            return self.net(xt).cpu().numpy() * self.U

    def source_flux_unsteady(self, pts_xyzt, rho=RHO, mu=MU, batch=8000):
        """Analytic PPE source S, the STEADY Neumann flux b_steady (convective + viscous), and the unsteady
        acceleration a = dv/dt, all SI, at space-time points pts_xyzt [N,4]. The caller assembles the full
        Neumann flux b = b_steady - rho*a. Chain rule: d/dx = (U/L) d/dx_nd, d/dt = (U/T) d/dt_nd,
        d2/dx2 = (U/L^2) d2/dx_nd2."""
        N = len(pts_xyzt)
        S = np.zeros(N); b = np.zeros((N, 3)); acc = np.zeros((N, 3))
        sL, sU, sT = self.L, self.U, self.T
        for s in range(0, N, batch):
            pts = pts_xyzt[s:s + batch]
            xc = torch.tensor(self._nd(pts), dtype=torch.float32, device=self.device, requires_grad=True)
            out = self.net(xc)                       # non-dim velocity [n,3]
            n = xc.shape[0]
            J = torch.zeros(n, 3, 3, device=self.device)   # dv_i/dx_j (SI)
            lap = torch.zeros(n, 3, device=self.device)    # sum_j d2 v_i/dx_j2 (SI)
            vt = torch.zeros(n, 3, device=self.device)     # dv_i/dt (SI)
            for i in range(3):
                gi = torch.autograd.grad(out[:, i], xc, torch.ones(n, device=self.device),
                                         create_graph=True, retain_graph=True)[0]   # [n,4]
                J[:, i, :] = gi[:, :3] * (sU / sL)
                vt[:, i] = gi[:, 3] * (sU / sT)
                for j in range(3):
                    g2 = torch.autograd.grad(gi[:, j], xc, torch.ones(n, device=self.device),
                                             create_graph=True, retain_graph=True)[0][:, j]
                    lap[:, i] += g2 * (sU / sL ** 2)
            v_si = out.detach() * sU
            Jd = J.detach()
            S[s:s + batch] = (-rho * torch.einsum('nij,nji->n', Jd, Jd)).cpu().numpy()
            conv = torch.einsum('nij,nj->ni', Jd, v_si)      # (v.grad)v_i
            b[s:s + batch] = (-rho * conv + mu * lap.detach()).cpu().numpy()
            acc[s:s + batch] = vt.detach().cpu().numpy()
        return S, b, acc


def train_spacetime(coords_frames, vel_frames, times_s, *, seed=42, n_adam=6000, n_lbfgs=500,
                    width=128, depth=7, w_div=2.0, n_coll=12000, max_data=24000) -> SpaceTimeField:
    """Fit a divergence-free v(x,y,z,t) over all frames. coords_frames [N,3] (shared lumen voxels, m),
    vel_frames [T,N,3] (m/s), times_s [T] (s). Returns a SpaceTimeField."""
    device = select_device()
    seed_everything(seed)
    T_n, N = vel_frames.shape[0], coords_frames.shape[0]
    c0 = coords_frames.mean(0)
    L = float(np.abs(coords_frames - c0).max() + 1e-9)
    U = float(np.linalg.norm(vel_frames, axis=2).max() + 1e-9)
    t0 = float(times_s[0]); Tspan = float(times_s[-1] - times_s[0] + 1e-9)

    # assemble (x,y,z,t) data points across frames, subsampled for tractability
    XT = np.zeros((T_n * N, 4), np.float32); VV = np.zeros((T_n * N, 3), np.float32)
    for k in range(T_n):
        XT[k * N:(k + 1) * N, :3] = coords_frames
        XT[k * N:(k + 1) * N, 3] = times_s[k]
        VV[k * N:(k + 1) * N] = vel_frames[k]
    rng = np.random.default_rng(seed)
    if len(XT) > max_data:
        idx = rng.choice(len(XT), max_data, replace=False); XT, VV = XT[idx], VV[idx]

    def nd(a):
        o = np.empty_like(a, np.float32); o[:, :3] = (a[:, :3] - c0) / L; o[:, 3] = (a[:, 3] - t0) / Tspan
        return o

    net = MLP(4, 3, width=width, depth=depth, activation="tanh").to(device)
    Xd = torch.tensor(nd(XT), dtype=torch.float32, device=device)
    Vd = torch.tensor(VV / U, dtype=torch.float32, device=device)
    lo = Xd.min(0).values; hi = Xd.max(0).values
    gen = torch.Generator(device=device).manual_seed(seed)

    def div_loss():
        xc = (lo + (hi - lo) * torch.rand(n_coll, 4, generator=gen, device=device)).requires_grad_(True)
        out = net(xc); div = 0.0
        for i in range(3):
            gi = torch.autograd.grad(out[:, i:i + 1], xc, torch.ones_like(out[:, i:i + 1]),
                                     create_graph=True, retain_graph=True)[0]
            div = div + gi[:, i:i + 1]
        return torch.mean(div ** 2)

    def closure():
        return torch.mean((net(Xd) - Vd) ** 2) + w_div * div_loss()

    train_loop(list(net.parameters()), closure, n_adam=n_adam, n_lbfgs=n_lbfgs, lr=2e-3)
    return SpaceTimeField(net, c0, L, U, t0, Tspan, device)


def verify_unsteady_poiseuille(seed=0) -> dict:
    """Gate the ANALYTIC temporal derivative on a time-varying Poiseuille flow w(r,t)=U0(1+A sin(w t))(1-(r/R)^2),
    u=v=0. The exact axial unsteady pressure gradient (neglecting the small radial terms, on the axis) is
    dp/dz|_unsteady = -rho * dw/dt = -rho*U0*A*omega*cos(omega t) at r=0. The space-time PINN must recover dw/dt."""
    R, Lz = 0.010, 0.060; U0, A, omega = 1.0, 0.3, 2 * np.pi / 0.9   # ~0.9 s cycle
    rng = np.random.default_rng(seed)
    nT, n = 12, 1500
    times = np.linspace(0, 0.9, nT)
    r = R * np.sqrt(rng.uniform(0, 1, n)); th = rng.uniform(0, 2 * np.pi, n)
    x = r * np.cos(th); y = r * np.sin(th); z = rng.uniform(0, Lz, n)
    coords = np.stack([x, y, z], 1).astype(np.float32)
    vel = np.zeros((nT, n, 3), np.float32)
    for k, t in enumerate(times):
        vel[k, :, 2] = U0 * (1 + A * np.sin(omega * t)) * (1 - (r / R) ** 2)
    fld = train_spacetime(coords, vel, times.astype(np.float32), seed=seed,
                          n_adam=5000, n_lbfgs=400, width=96, depth=6, n_coll=8000, max_data=12000)
    # sample dw/dt on the axis over time
    tt = np.linspace(0.05, 0.85, 20)
    pts = np.stack([np.zeros(20), np.zeros(20), np.full(20, Lz / 2), tt], 1).astype(np.float32)
    _, _, acc = fld.source_flux_unsteady(pts)
    dwdt_rec = acc[:, 2]
    dwdt_true = U0 * A * omega * np.cos(omega * tt)   # at r=0
    corr = float(np.corrcoef(dwdt_rec, dwdt_true)[0, 1])
    scale = float(np.polyfit(dwdt_true, dwdt_rec, 1)[0])
    return {"dwdt_corr": round(corr, 4), "dwdt_scale": round(scale, 4),
            "amp_true": round(float(U0 * A * omega), 3), "amp_rec": round(float(np.abs(dwdt_rec).max()), 3)}
