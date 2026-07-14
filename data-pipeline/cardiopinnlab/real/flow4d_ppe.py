"""Recover relative pressure from a measured velocity field by the Pressure-Poisson Equation (PPE).

This is the physically-correct route the momentum-residual PINN failed at (see _gate_pressure.py): pressure is
gauge-free and weakly coupled, so forcing it through a soft PDE residual leaves it near zero. Instead, take the
divergence of incompressible Navier-Stokes to get a well-posed Poisson problem for pressure whose source is
built entirely from the (measured, smoothed) velocity's spatial derivatives:

    laplacian(p) = -rho * sum_ij (d v_i / d x_j)(d v_j / d x_i) = S(v)     (continuity used)

solved with Neumann boundary conditions dp/dn = b.n from the momentum equation on the domain boundary. This is
the standard 4D-flow pressure-mapping method (Ebbers 2001; Krittian et al., virtual work-energy relative
pressure, MRM 2012). It is a single linear solve, robust, and recovers pressure up to an additive constant
(the physical quantity is the pressure DIFFERENCE). SI units throughout: m, m/s, s, Pa.

The solver is gated on an analytic converging duct whose exact pressure drop is known BEFORE any real data is
used; only if the gate passes is the method applied to the real 4D-flow scan."""
from __future__ import annotations

import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import spsolve

RHO = 1060.0
MU = 0.0035
PA_PER_MMHG = 133.322


def _derivs(vel, h):
    """Central-difference velocity gradients on a regular grid. vel [nz,ny,nx,3], h spacing (m).
    Returns dvi_dxj [nz,ny,nx,3,3] with index [...,i,j] = d v_i / d x_j (x0=x,x1=y,x2=z along axes 2,1,0)."""
    g = np.zeros(vel.shape + (3,), np.float64)
    # axis mapping: spatial x -> array axis 2, y -> 1, z -> 0
    for i in range(3):
        g[..., i, 0] = np.gradient(vel[..., i], h, axis=2)
        g[..., i, 1] = np.gradient(vel[..., i], h, axis=1)
        g[..., i, 2] = np.gradient(vel[..., i], h, axis=0)
    return g


def ppe_source(vel, h, rho=RHO):
    """S = -rho * sum_ij (dv_i/dx_j)(dv_j/dx_i)  [nz,ny,nx]."""
    g = _derivs(vel, h)
    s = np.zeros(vel.shape[:3], np.float64)
    for i in range(3):
        for j in range(3):
            s += g[..., i, j] * g[..., j, i]
    return -rho * s


def momentum_rhs(vel, h, rho=RHO, mu=MU, dvel_dt=None):
    """b = -rho(dv/dt + (v.grad)v) + mu*lap(v)  [nz,ny,nx,3]; the Neumann flux dp/dn = b.n on the boundary."""
    g = _derivs(vel, h)               # [...,i,j] = dv_i/dx_j
    conv = np.einsum('...ij,...j->...i', g, vel)      # (v.grad)v_i = sum_j v_j dv_i/dx_j
    lap = np.zeros_like(vel)
    for i in range(3):
        lap[..., i] = (np.gradient(np.gradient(vel[..., i], h, axis=2), h, axis=2)
                       + np.gradient(np.gradient(vel[..., i], h, axis=1), h, axis=1)
                       + np.gradient(np.gradient(vel[..., i], h, axis=0), h, axis=0))
    b = -rho * conv + mu * lap
    if dvel_dt is not None:
        b -= rho * dvel_dt
    return b


def solve_ppe(vel, mask, h, rho=RHO, mu=MU, dvel_dt=None):
    """Solve laplacian(p)=S on the masked domain with Neumann BC dp/dn=b.n and one Dirichlet pin, by a sparse
    direct solve (robust on the large, irregular, ill-conditioned real lumen where CG stalls).
    vel [nz,ny,nx,3] m/s, mask [nz,ny,nx] bool, h spacing m. Returns p [nz,ny,nx] Pa (NaN outside mask)."""
    from scipy import ndimage
    nz, ny, nx = mask.shape
    # Restrict to the single largest connected component so the Neumann domain is connected (a disconnected
    # component without the Dirichlet pin makes that block singular and spsolve returns NaN).
    lab, ncc = ndimage.label(mask)
    if ncc > 1:
        sizes = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, ncc + 1))
        mask = lab == (int(np.argmax(sizes)) + 1)
    S = ppe_source(vel, h, rho)
    b = momentum_rhs(vel, h, rho, mu, dvel_dt)
    idx = -np.ones(mask.shape, int)
    coords = np.argwhere(mask)
    for n, (k, jj, ii) in enumerate(coords):
        idx[k, jj, ii] = n
    N = len(coords)
    rows, cols, vals = [], [], []
    rhs = np.zeros(N)
    h2 = h * h
    # neighbor offsets: (dk,dj,di) and the spatial axis (0=x along di, 1=y along dj, 2=z along dk) with sign
    nbrs = [((0, 0, 1), 0, +1), ((0, 0, -1), 0, -1), ((0, 1, 0), 1, +1),
            ((0, -1, 0), 1, -1), ((1, 0, 0), 2, +1), ((-1, 0, 0), 2, -1)]
    # Dirichlet pin at one central voxel removes the pure-Neumann nullspace (otherwise the system is singular
    # and the recovered magnitude is dominated by the unconstrained constant mode).
    pin = int(np.argmin(np.linalg.norm(coords - coords.mean(0), axis=1)))
    for n, (k, jj, ii) in enumerate(coords):
        if n == pin:
            rows.append(n); cols.append(n); vals.append(1.0)
            rhs[n] = 0.0
            continue
        diag = 0.0
        rhs[n] = S[k, jj, ii] * h2
        for (dk, dj, di), axis, sign in nbrs:
            nk, nj, ni = k + dk, jj + dj, ii + di
            inside = 0 <= nk < nz and 0 <= nj < ny and 0 <= ni < nx and mask[nk, nj, ni]
            if inside:
                rows.append(n); cols.append(idx[nk, nj, ni]); vals.append(1.0)
                diag -= 1.0
            else:
                # Neumann: ghost p_nbr = p_here + sign*h*(dp/dx_axis), dp/dx_axis = b[axis] (momentum: grad p = b).
                # (p_nbr - p_here) = sign*h*b[axis] is a known constant -> to rhs; contributes nothing to p_here.
                rhs[n] -= sign * h * b[k, jj, ii, axis]
        rows.append(n); cols.append(n); vals.append(diag)
    A = csr_matrix((vals, (rows, cols)), shape=(N, N))
    p_flat = spsolve(A, rhs)
    p = np.full(mask.shape, np.nan)
    for n, (k, jj, ii) in enumerate(coords):
        p[k, jj, ii] = p_flat[n]
    return p


def gate_converging(seed=0) -> dict:
    """Gate: analytic axisymmetric converging duct with exact pressure. w=U0(1+a z), u=-a/2 U0 x, v=-a/2 U0 y
    (mass-conserving); steady Euler pressure p(z) = -rho U0^2 (a z + a^2 z^2/2) + c. The PPE must recover it."""
    U0, Rd, Lz, a = 1.0, 0.012, 0.060, 8.0
    h = 0.0015                       # 1.5 mm grid
    xs = np.arange(-Rd, Rd + h, h); ys = xs.copy(); zs = np.arange(0, Lz + h, h)
    Z, Y, X = np.meshgrid(zs, ys, xs, indexing='ij')
    vel = np.zeros(X.shape + (3,))
    vel[..., 0] = -0.5 * a * U0 * X
    vel[..., 1] = -0.5 * a * U0 * Y
    vel[..., 2] = U0 * (1 + a * Z)
    mask = (X ** 2 + Y ** 2) <= Rd ** 2
    p = solve_ppe(vel, mask, h)
    p_true = -RHO * U0 ** 2 * (a * Z + a ** 2 * Z ** 2 / 2)
    m = mask & ~np.isnan(p)
    pt = p_true[m] - p_true[m].mean(); pr = p[m] - np.nanmean(p[m])
    corr = float(np.corrcoef(pt, pr)[0, 1])
    scale = float(np.polyfit(pt, pr, 1)[0])
    return {"corr": round(corr, 4), "scale": round(scale, 4),
            "true_drop_mmHg": round((pt.max() - pt.min()) / PA_PER_MMHG, 3),
            "rec_drop_mmHg": round((pr.max() - pr.min()) / PA_PER_MMHG, 3),
            "n_voxels": int(m.sum())}


if __name__ == "__main__":
    print(gate_converging())
