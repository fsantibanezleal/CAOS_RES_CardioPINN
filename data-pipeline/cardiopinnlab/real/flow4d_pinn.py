"""Recover the aortic pressure field from a REAL 4D-flow velocity field with a Navier-Stokes PINN (SI units).

The clinical question: the transaortic/coarctation pressure gradient is routinely estimated by the simplified
Bernoulli rule dP = 4*Vmax^2 (mmHg, Vmax in m/s), which ignores viscous losses, unsteadiness, and the inflow
velocity, and is known to misestimate the true gradient. 4D-flow MRI measures the full 3D+time velocity, from
which the physical pressure field follows from incompressible Navier-Stokes. Pressure is never measured; the
network is forced to produce a pressure field whose gradient balances the measured velocity's inertial and
viscous terms (hidden fluid mechanics, Raissi et al., Science 367:1026, 2020).

Everything is SI: positions m, velocity m/s, time s, rho kg/m^3, mu Pa*s, pressure Pa (reported in mmHg).
The residual math is gated on an analytic Poiseuille flow whose exact dp/dz = -8 mu U / R^2 is known, BEFORE
any real velocity is used. The real velocity has phase-wrap aliasing above the venc, so aliased voxels are
excluded, and the lumen is segmented from the flow itself (the provided STL is a different subject and does
not co-register)."""
from __future__ import annotations

import numpy as np
import torch

from ..core.pinn import MLP, seed_everything, select_device, train_loop

RHO = 1060.0      # blood density kg/m^3
MU = 0.0035       # blood dynamic viscosity Pa*s
PA_PER_MMHG = 133.322


def _train(data_xyzt, data_uvw, coll_xyzt, wall_xyzt, *, seed=42, n_adam=8000, n_lbfgs=800,
           width=128, depth=7, w_data=1.0, w_pde=1.0, w_wall=1.0, scale=None):
    """Train (x,y,z,t)->(u,v,w,p). Inputs are non-dimensionalized by `scale` (a dict of characteristic L,U,T)
    so the network sees O(1) inputs/outputs; residuals use SI rho, mu with the chain-rule factors."""
    device = select_device()
    seed_everything(seed)
    L, U, T = scale["L"], scale["U"], scale["T"]
    net = MLP(4, 4, width=width, depth=depth, activation="tanh").to(device)

    def nd(xyzt):  # non-dimensionalize position/time columns
        f = np.array([1 / L, 1 / L, 1 / L, 1 / T], np.float32)
        return xyzt * f

    d_xyzt = torch.tensor(nd(data_xyzt), dtype=torch.float32, device=device)
    d_uvw = torch.tensor(data_uvw / U, dtype=torch.float32, device=device)   # velocity in units of U
    c_np = nd(coll_xyzt); w_np = nd(wall_xyzt)
    c0 = torch.tensor(c_np, dtype=torch.float32, device=device)
    wl = torch.tensor(w_np, dtype=torch.float32, device=device)

    # In non-dim coords, NS reads: rho*U/T (u_t*) + rho*U^2/L (conv*) + P0/L (p*_x) - mu*U/L^2 (lap*) = 0.
    # Divide by rho*U^2/L: Strouhal St=L/(U T) on u_t*, 1 on conv, (P0/(rho U^2)) on p*, (1/Re) on lap.
    # Choose P0 = rho U^2 so pressure output is in units of rho U^2. Re = rho U L / mu.
    St = L / (U * T)
    Re = RHO * U * L / MU

    def residual_nd(net, xc):
        out = net(xc)
        u, v, w, p = out[:, 0:1], out[:, 1:2], out[:, 2:3], out[:, 3:4]

        def g(y):
            return torch.autograd.grad(y, xc, torch.ones_like(y), create_graph=True, retain_graph=True)[0]
        du, dv, dw, dp = g(u), g(v), g(w), g(p)
        ux, uy, uz, ut = du[:, 0:1], du[:, 1:2], du[:, 2:3], du[:, 3:4]
        vx, vy, vz, vt = dv[:, 0:1], dv[:, 1:2], dv[:, 2:3], dv[:, 3:4]
        wx, wy, wz, wt = dw[:, 0:1], dw[:, 1:2], dw[:, 2:3], dw[:, 3:4]
        px, py, pz = dp[:, 0:1], dp[:, 1:2], dp[:, 2:3]

        def lap(gv):
            gg = g(gv)
            return g(gg[:, 0:1])[:, 0:1] + g(gg[:, 1:2])[:, 1:2] + g(gg[:, 2:3])[:, 2:3]
        cont = ux + vy + wz
        mx = St * ut + (u * ux + v * uy + w * uz) + px - lap(u) / Re
        my = St * vt + (u * vx + v * vy + w * vz) + py - lap(v) / Re
        mz = St * wt + (u * wx + v * wy + w * wz) + pz - lap(w) / Re
        return cont, mx, my, mz

    def closure():
        pred = net(d_xyzt)[:, :3]
        loss_data = torch.mean((pred - d_uvw) ** 2)
        xc = c0.clone().detach().requires_grad_(True)
        cont, mx, my, mz = residual_nd(net, xc)
        loss_pde = torch.mean(cont ** 2) + torch.mean(mx ** 2 + my ** 2 + mz ** 2)
        loss_wall = torch.mean(net(wl)[:, :3] ** 2)
        return w_data * loss_data + w_pde * loss_pde + w_wall * loss_wall

    history = train_loop(list(net.parameters()), closure, n_adam=n_adam, n_lbfgs=n_lbfgs, lr=2e-3)
    return net, history, {"U": U, "L": L, "T": T, "Re": Re, "St": St, "device": device, "nd": nd}


def verify_poiseuille_si(seed=0) -> dict:
    """Gate: recover dp/dz for analytic steady Poiseuille flow (SI), where dp/dz = -8 mu U / R^2 exactly."""
    R, Lz = 0.010, 0.060      # 10 mm radius, 60 mm long pipe (m)
    U = 1.0                   # centreline velocity 1 m/s (aortic scale)
    rng = np.random.default_rng(seed)
    n = 4000
    r = R * np.sqrt(rng.uniform(0, 1, n)); th = rng.uniform(0, 2 * np.pi, n)
    x, y, z = r * np.cos(th), r * np.sin(th), rng.uniform(0, Lz, n)
    wv = U * (1 - (r / R) ** 2)
    data_xyzt = np.stack([x, y, z, np.zeros(n)], 1).astype(np.float32)
    data_uvw = np.stack([np.zeros(n), np.zeros(n), wv], 1).astype(np.float32)
    thw = rng.uniform(0, 2 * np.pi, 1200); zw = rng.uniform(0, Lz, 1200)
    wall = np.stack([R * np.cos(thw), R * np.sin(thw), zw, np.zeros(1200)], 1).astype(np.float32)
    scale = {"L": R, "U": U, "T": Lz / U}
    net, _, meta = _train(data_xyzt, data_uvw, data_xyzt.copy(), wall, seed=seed,
                          n_adam=6000, n_lbfgs=600, width=64, depth=5, scale=scale)
    zs = np.linspace(0.008, Lz - 0.008, 30)
    axis = torch.tensor(meta["nd"](np.stack([np.zeros(30), np.zeros(30), zs, np.zeros(30)], 1).astype(np.float32)),
                        dtype=torch.float32, device=meta["device"])
    with torch.no_grad():
        p_nd = net(axis)[:, 3].cpu().numpy()
    p_pa = p_nd * (RHO * U ** 2)                      # de-non-dimensionalize pressure
    dpdz_rec = float(np.polyfit(zs, p_pa, 1)[0])
    dpdz_true = float(-8 * MU * U / R ** 2)
    return {"dpdz_true_Pa_per_m": round(dpdz_true, 3), "dpdz_recovered_Pa_per_m": round(dpdz_rec, 3),
            "ratio": round(dpdz_rec / dpdz_true, 3), "Re": round(meta["Re"], 1)}
