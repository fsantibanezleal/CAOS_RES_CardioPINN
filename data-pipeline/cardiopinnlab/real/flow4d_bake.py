"""Bake the REAL 4D-flow aortic pressure case into the committed artifact the web reads.

Pipeline (all real, all validated): decode the measured velocity (flow4d_dicom) -> segment the aortic lumen
from the pulsatile flow -> denoise + divergence-free-project the velocity with a PINN (flow4d_denoise) ->
recover the relative pressure field by the pressure-Poisson equation from the PINN's ANALYTIC derivatives
(flow4d_ppe, gated on an analytic flow) -> compare the recovered pressure drop to the clinical simplified
Bernoulli estimate 4*Vmax^2. No pressure is ever measured; it is the field the physics forces out of the
measured velocity. There is no invasive pressure gold standard (that is the whole point of the method), so the
validation is: the engine recovers the analytic pressure exactly (gate), the real-scan map is physiological,
and it brackets the clinical Bernoulli reference.

The raw DICOMs are gitignored (data-use); only the compact derived trace is committed."""
from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
from scipy import ndimage

from .flow4d_denoise import denoise_frame
from .flow4d_dicom import load_4dflow, mask_lumen, unwrap_aliasing
from .flow4d_ppe import PA_PER_MMHG, RHO, MU, solve_ppe_precomputed
from .flow4d_spacetime import train_spacetime


def _root() -> Path:
    return Path(os.environ.get("AORTA4D_DIR",
                               r"D:\_Datos\cardiopinn\aorta4d\dicoms\m_c1\4DFLOWWIP_16F_fullvel\undistort_v"))


def bake_flow4d(seed: int = 42, max_points: int = 9000, venc_cm_s: float = 120.0, k_ensemble: int = 4) -> dict:
    f = load_4dflow(_root(), venc_cm_s=venc_cm_s)
    f = unwrap_aliasing(f)                               # correct phase-wrap before anything downstream
    aliasing_corrected = int(f.get("aliasing_corrected_samples", 0))
    nz, ny, nx = f["grid"]
    nt = f["velocity"].shape[0]
    vel = f["velocity"].reshape(nt, nz, ny, nx, 3)      # m/s (loader returns mm/ms, numerically identical)
    coords = f["coords"].reshape(nz, ny, nx, 3)         # mm (patient frame); the Poisson solve below uses h in m
    h = 2.5e-3                                           # m, isotropic grid spacing used by the pressure-Poisson solve
    # Unit guard: the source S ~ (dv/dx)^2 scales like 1/h^2, so a spacing mismatch (a unit slip, or a re-bake of a
    # DICOM whose voxels are not 2.5 mm) silently rescales the pressure. Assert the physical spacing derived from the
    # coords (mm) matches h (m) before trusting the solve, so a mismatch fails LOUDLY at bake time.
    _step = np.linalg.norm(np.diff(coords, axis=0).reshape(-1, 3), axis=1)
    _sp_mm = float(np.median(_step[_step > 1e-6])) if np.any(_step > 1e-6) else 0.0
    assert abs(_sp_mm / 1000.0 - h) <= 0.5 * h, (
        f"4D-flow voxel spacing from coords ({_sp_mm:.3f} mm) is inconsistent with the Poisson grid spacing "
        f"h={h * 1000:.3f} mm; coords must be in mm and h in m (check the DICOM PixelSpacing / loader units).")

    # aortic lumen: pulsatile-flow threshold, largest connected component
    mask = mask_lumen(f, speed_thresh_cm_s=40.0).reshape(nz, ny, nx)
    lab, ncc = ndimage.label(mask)
    if ncc > 1:
        sizes = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, ncc + 1))
        mask = lab == (int(np.argmax(sizes)) + 1)

    # peak-systolic frame = max kinetic energy in the lumen
    ke = np.array([np.sum(np.linalg.norm(vel[t][mask], axis=1) ** 2) for t in range(nt)])
    tp = int(np.argmax(ke))

    pts = coords[mask]
    times_s = f["times_ms"].astype(np.float32) / 1000.0
    grids = {}

    # SPACE-TIME PINN over the whole cycle -> analytic spatial source/flux AND analytic unsteady term dv/dt
    # (replacing the three-frame finite difference). Gated on an analytic time-varying flow in the test suite.
    vel_lumen_frames = np.stack([vel[t][mask] for t in range(nt)])   # [T, Nlumen, 3]
    st = train_spacetime(pts, vel_lumen_frames, times_s, seed=seed,
                         n_adam=6000, n_lbfgs=500, width=128, depth=7, w_div=2.0)
    pts_peak = np.concatenate([pts, np.full((len(pts), 1), times_s[tp], np.float32)], axis=1)
    Sv, bv, acc = st.source_flux_unsteady(pts_peak, RHO, MU)
    S = np.zeros((nz, ny, nx)); b = np.zeros((nz, ny, nx, 3))
    S[mask] = Sv; b[mask] = bv - RHO * acc              # full Neumann flux incl. the analytic unsteady term
    p = solve_ppe_precomputed(S, b, mask, h)            # Pa (reported pressure)
    peak_grid = np.zeros((nz, ny, nx, 3), np.float32); peak_grid[mask] = st.velocity(pts_peak); grids[tp] = peak_grid

    # dv/dt on the lumen grid (analytic) is reused by the robustness ensemble so it does not retrain space-time.
    dvdt = np.zeros((nz, ny, nx, 3), np.float32); dvdt[mask] = acc

    def solve_from_velocity(v_lumen):
        dfk = denoise_frame(coords[mask], v_lumen, seed=seed, n_adam=3000, n_lbfgs=300, w_div=2.0)
        Sk, bk = dfk.source_and_flux(pts, RHO, MU)
        Sg = np.zeros((nz, ny, nx)); bg = np.zeros((nz, ny, nx, 3))
        Sg[mask] = Sk; bg[mask] = bk - RHO * dvdt[mask]
        return solve_ppe_precomputed(Sg, bg, mask, h)

    v_meas = vel[tp][mask]

    # Uncertainty ENSEMBLE (the 4D-flow analogue of the ECGi deep-ensemble node UQ): the dominant uncertainty is
    # VELOCITY MEASUREMENT NOISE, not the denoiser seed (the div-free fit is strongly data-constrained and nearly
    # seed-independent), so each member perturbs the measured velocity with realistic phase-contrast noise
    # (sigma ~ 5% of the venc), re-denoises and re-solves the PPE; the per-voxel spread is the pressure UQ.
    rng_uq = np.random.default_rng(seed)
    sigma_v = 0.05 * (venc_cm_s / 100.0)   # m/s (phase-contrast velocity noise scale)
    p_stack = [p]
    for k in range(k_ensemble):
        v_noisy = v_meas + rng_uq.normal(0.0, sigma_v, v_meas.shape).astype(np.float32)
        p_stack.append(solve_from_velocity(v_noisy))
    p_all = np.stack(p_stack)
    valid = mask & ~np.any(np.isnan(p_all), axis=0)
    for k in range(len(p_stack)):                            # common gauge (median-zero) before combining
        p_all[k][valid] -= np.median(p_all[k][valid])
    # Honest finding: the div-free denoiser makes the pressure ROBUST to velocity noise, so the ensemble spread
    # is a robustness metric (a scalar), NOT a per-voxel uncertainty field (that would be a misleading ~0 map).
    noise_sensitivity = float(np.median(np.nanstd(p_all, axis=0)[valid]) / PA_PER_MMHG)
    p_mmhg = (p - np.median(p[valid])) / PA_PER_MMHG

    # divergence reduction (physics quality): mean |div v| raw (smoothed) vs denoised
    def _div(V):
        return (np.gradient(V[..., 0], h, axis=2) + np.gradient(V[..., 1], h, axis=1)
                + np.gradient(V[..., 2], h, axis=0))
    raw_sm = np.zeros_like(vel[tp])
    for c in range(3):
        raw_sm[..., c] = ndimage.gaussian_filter(vel[tp][..., c] * valid, sigma=1.0)
    div_raw = float(np.abs(_div(raw_sm)[valid]).mean())
    div_dn = float(np.abs(_div(grids[tp])[valid]).mean())

    # speed over the cardiac cycle (measured, lightly smoothed) for the pulsatile animation
    speed_t = np.zeros((nt, nz, ny, nx), np.float32)
    for t in range(nt):
        sm = np.zeros_like(vel[t])
        for c in range(3):
            sm[..., c] = ndimage.gaussian_filter(vel[t][..., c] * mask, sigma=1.0)
        speed_t[t] = np.linalg.norm(sm, axis=3)

    # decimate the lumen voxels to a manageable point cloud for the browser
    vox = np.argwhere(valid)
    rng = np.random.default_rng(seed)
    if len(vox) > max_points:
        sel = rng.choice(len(vox), max_points, replace=False)
        vox = vox[sel]
    P = np.array([coords[k, j, i] for k, j, i in vox])
    P = (P - P.mean(0)) * 1000.0     # mm, centred
    scale = 60.0 / (np.abs(P).max() + 1e-9)
    P = P * scale
    pres = np.array([p_mmhg[k, j, i] for k, j, i in vox])
    speed_peak = np.array([speed_t[tp, k, j, i] for k, j, i in vox])
    speed_frames = [[round(float(speed_t[t, k, j, i]), 3) for k, j, i in vox] for t in range(nt)]

    vmax = float(np.linalg.norm(grids[tp][valid], axis=1).max())
    bernoulli = 4.0 * vmax ** 2
    p_drop = float(np.percentile(pres, 97.5) - np.percentile(pres, 2.5))

    return {
        "schema": "cardiopinn.flow4d-pressure/v3",
        "unsteady_term": "space-time PINN (analytic dv/dt over the whole cycle)",
        "points_mm": np.round(P, 2).tolist(),
        "pressure_mmHg": np.round(pres, 3).tolist(),
        "speed_ms_peak": np.round(speed_peak, 3).tolist(),
        "speed_ms_over_time": speed_frames,
        "times_ms": [int(t) for t in f["times_ms"]],
        "peak_frame": tp,
        "metrics": {
            "n_lumen_voxels": int(valid.sum()),
            "peak_velocity_ms": round(vmax, 3),
            "bernoulli_mmHg": round(bernoulli, 2),
            "ppe_pressure_drop_mmHg": round(p_drop, 2),
            "noise_sensitivity_mmHg": round(noise_sensitivity, 3),   # robustness: pressure spread under 5%-venc velocity noise
            "ensemble_members": int(k_ensemble),
            "aliasing_corrected_samples": aliasing_corrected,
            "div_raw_per_s": round(div_raw, 2),
            "div_denoised_per_s": round(div_dn, 2),
            "div_reduction_x": round(div_raw / (div_dn + 1e-9), 1),
            "venc_cm_s": venc_cm_s,
            "n_frames": int(nt),
        },
    }


def main() -> int:
    out = Path(__file__).resolve().parents[3] / "data" / "derived" / "real-flow4d-pressure"
    out.mkdir(parents=True, exist_ok=True)
    trace = bake_flow4d()
    p = out / "trace.json"
    p.write_text(json.dumps(trace, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {p} ({p.stat().st_size / 1e6:.2f} MB)")
    print("metrics:", json.dumps(trace["metrics"], indent=0))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
