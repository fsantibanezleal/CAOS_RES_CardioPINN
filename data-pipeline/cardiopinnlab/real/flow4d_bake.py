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
from .flow4d_dicom import load_4dflow, mask_lumen
from .flow4d_ppe import PA_PER_MMHG, RHO, MU, solve_ppe_precomputed


def _root() -> Path:
    return Path(os.environ.get("AORTA4D_DIR",
                               r"D:\_Datos\cardiopinn\aorta4d\dicoms\m_c1\4DFLOWWIP_16F_fullvel\undistort_v"))


def bake_flow4d(seed: int = 42, max_points: int = 9000, venc_cm_s: float = 120.0, k_ensemble: int = 4) -> dict:
    f = load_4dflow(_root(), venc_cm_s=venc_cm_s)
    nz, ny, nx = f["grid"]
    nt = f["velocity"].shape[0]
    vel = f["velocity"].reshape(nt, nz, ny, nx, 3)      # m/s
    coords = f["coords"].reshape(nz, ny, nx, 3)         # m
    h = 2.5e-3

    # aortic lumen: pulsatile-flow threshold, largest connected component
    mask = mask_lumen(f, speed_thresh_cm_s=40.0).reshape(nz, ny, nx)
    lab, ncc = ndimage.label(mask)
    if ncc > 1:
        sizes = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, ncc + 1))
        mask = lab == (int(np.argmax(sizes)) + 1)

    # peak-systolic frame = max kinetic energy in the lumen
    ke = np.array([np.sum(np.linalg.norm(vel[t][mask], axis=1) ** 2) for t in range(nt)])
    tp = int(np.argmax(ke))

    # Unsteady term: denoise the two temporal neighbours once (shared across the pressure ensemble).
    pts = coords[mask]
    trig_dt = (f["times_ms"][1] - f["times_ms"][0]) * 1e-3
    grids = {}
    for t in [(tp - 1) % nt, (tp + 1) % nt]:
        df = denoise_frame(coords[mask], vel[t][mask], seed=seed, n_adam=3000, n_lbfgs=300, w_div=2.0)
        g = np.zeros((nz, ny, nx, 3), np.float32); g[mask] = df.velocity(coords[mask]); grids[t] = g
    dvdt = (grids[(tp + 1) % nt] - grids[(tp - 1) % nt]) / (2 * trig_dt)

    def solve_from_velocity(v_lumen):
        dfk = denoise_frame(coords[mask], v_lumen, seed=seed, n_adam=3000, n_lbfgs=300, w_div=2.0)
        Sv, bv = dfk.source_and_flux(pts, RHO, MU)
        S = np.zeros((nz, ny, nx)); b = np.zeros((nz, ny, nx, 3))
        S[mask] = Sv; b[mask] = bv
        b[mask] += -RHO * dvdt[mask]
        g = np.zeros((nz, ny, nx, 3), np.float32); g[mask] = dfk.velocity(coords[mask])
        return solve_ppe_precomputed(S, b, mask, h), g       # (Pa, denoised grid velocity)

    # Reported pressure + peak velocity come from the CLEAN denoise.
    v_meas = vel[tp][mask]
    p, peak_grid = solve_from_velocity(v_meas)
    grids[tp] = peak_grid

    # Uncertainty ENSEMBLE (the 4D-flow analogue of the ECGi deep-ensemble node UQ): the dominant uncertainty is
    # VELOCITY MEASUREMENT NOISE, not the denoiser seed (the div-free fit is strongly data-constrained and nearly
    # seed-independent), so each member perturbs the measured velocity with realistic phase-contrast noise
    # (sigma ~ 5% of the venc), re-denoises and re-solves the PPE; the per-voxel spread is the pressure UQ.
    rng_uq = np.random.default_rng(seed)
    sigma_v = 0.05 * (venc_cm_s / 100.0)   # m/s (phase-contrast velocity noise scale)
    p_stack = [p]
    for k in range(k_ensemble):
        v_noisy = v_meas + rng_uq.normal(0.0, sigma_v, v_meas.shape).astype(np.float32)
        pk, _ = solve_from_velocity(v_noisy)
        p_stack.append(pk)
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
        "schema": "cardiopinn.flow4d-pressure/v2",
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
