"""P3 adversarial test: does the analytic space-time dv/dt actually fix the temporal-resolution failure mode?

Hardy et al. (2025) show every discrete pressure estimator underestimates the TRANSIENT peak-systolic pressure
as temporal resolution drops, because it cannot resolve the unsteady dv/dt term. The engine's space-time PINN
differentiates v(x,y,z,t) analytically in time. This test proves or refutes that it recovers the transient
peak where a 3-frame centred finite difference (the pre-space-time baseline) collapses.

Known-answer flow: time-varying Poiseuille w(r,t)=U0(1+A sin(w t))(1-(r/R)^2). Exact axial unsteady
acceleration dw/dt = U0 A w cos(w t); peak |dw/dt| = U0 A w. Centred FD of a sinusoid attenuates the amplitude
by sinc(w*dt) (a known artifact) and amplifies measurement noise; the analytic net should hold near 1 until the
frame count is too low to fit the temporal shape. Sweep nT DOWN; report recovered peak-amplitude / true for
both, on clean AND noisy frames. Adversarial: does the analytic net ALSO collapse at low nT?
"""
from __future__ import annotations

import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve()
sys.path.insert(0, str(HERE.parents[2]))
sys.path.insert(0, str(HERE.parent))
import numpy as np                            # noqa: E402
from cardiopinnlab.real.flow4d_spacetime import train_spacetime   # noqa: E402

R, LZ = 0.010, 0.060
U0, A, T_CYCLE = 1.0, 0.3, 0.9
OMEGA = 2 * np.pi / T_CYCLE
TRUE_PEAK = U0 * A * OMEGA           # exact peak |dw/dt| on the axis
NT_SWEEP = [20, 12, 8, 6, 5, 4]
NOISE = [0.0, 0.05]                  # fraction of U0 added to velocity (phase noise)


def _make_frames(nT, noise, seed):
    """Random lumen points + velocity frames of the time-varying Poiseuille flow, at nT frames over one cycle."""
    rng = np.random.default_rng(seed)
    n = 1500
    r = R * np.sqrt(rng.uniform(0, 1, n)); th = rng.uniform(0, 2 * np.pi, n)
    x = r * np.cos(th); y = r * np.sin(th); z = rng.uniform(0, LZ, n)
    coords = np.stack([x, y, z], 1).astype(np.float32)
    times = np.linspace(0, T_CYCLE, nT).astype(np.float32)
    vel = np.zeros((nT, n, 3), np.float32)
    for k, t in enumerate(times):
        vel[k, :, 2] = U0 * (1 + A * np.sin(OMEGA * t)) * (1 - (r / R) ** 2)
    if noise > 0:
        vel = vel + rng.normal(0, noise * U0, vel.shape).astype(np.float32)
    return coords, vel, times


def _true_dwdt(t):
    return U0 * A * OMEGA * np.cos(OMEGA * t)


def _scale_corr(rec, tru):
    """Robust amplitude (regression slope) + shape (correlation), the metric the engine's own gate uses.
    scale=1 is perfect amplitude; unlike max-amplitude it is not fooled by overfitting spikes."""
    scale = float(np.polyfit(tru, rec, 1)[0]) if len(tru) >= 2 else float("nan")
    corr = float(np.corrcoef(tru, rec)[0, 1]) if len(tru) >= 3 else float("nan")
    return scale, corr


def _fd_scale_corr(times, noise, seed):
    """3-frame centred FD of the axial velocity samples w_axis(t_k) (what FD sees at r=0), regressed on truth."""
    rng = np.random.default_rng(seed + 777)
    w = U0 * (1 + A * np.sin(OMEGA * times))
    if noise > 0:
        w = w + rng.normal(0, noise * U0, w.shape)
    dt = times[1] - times[0]
    ti = times[1:-1]
    dwdt = (w[2:] - w[:-2]) / (2 * dt)
    return _scale_corr(dwdt, _true_dwdt(ti))


def _analytic_scale_corr(coords, vel, times, seed):
    """Train the space-time PINN; regress its analytic dw/dt on the axis (fine time grid) against truth."""
    fld = train_spacetime(coords, vel, times, seed=seed,
                          n_adam=5000, n_lbfgs=400, width=96, depth=6, n_coll=8000, max_data=12000)
    tt = np.linspace(0.05, T_CYCLE - 0.05, 40)
    pts = np.stack([np.zeros(40), np.zeros(40), np.full(40, LZ / 2), tt], 1).astype(np.float32)
    _, _, acc = fld.source_flux_unsteady(pts)
    return _scale_corr(acc[:, 2], _true_dwdt(tt))


def run() -> dict:
    rows = []
    for noise in NOISE:
        for nT in NT_SWEEP:
            coords, vel, times = _make_frames(nT, noise, seed=0)
            fd_scale, fd_corr = _fd_scale_corr(times, noise, seed=0)
            an_scale, an_corr = _analytic_scale_corr(coords, vel, times, seed=0)
            dt = float(times[1] - times[0])
            sinc = float(np.sinc(OMEGA * dt / np.pi))      # np.sinc(x)=sin(pi x)/(pi x)=sin(w dt)/(w dt)
            row = {
                "noise": noise, "nT": nT, "dt_s": round(dt, 4),
                "fd_scale": round(fd_scale, 4), "fd_corr": round(fd_corr, 4),
                "analytic_scale": round(an_scale, 4), "analytic_corr": round(an_corr, 4),
                "fd_sinc_predicted": round(sinc, 4),
            }
            rows.append(row)
            print(f"noise={noise} nT={nT:2d} dt={row['dt_s']:.3f}s | "
                  f"FD scale={row['fd_scale']:.3f} corr={row['fd_corr']:.3f} (sinc~{row['fd_sinc_predicted']:.3f}) | "
                  f"analytic scale={row['analytic_scale']:.3f} corr={row['analytic_corr']:.3f}", flush=True)

    # advance if the analytic amplitude (scale) holds near 1 at temporal resolutions where FD's scale has
    # clearly collapsed (< 0.8), quantified by a crossover nT, on the CLEAN sweep (noise=0.0).
    crossover = None
    for r in rows:
        if r["noise"] == 0.0 and r["fd_scale"] < 0.8 and abs(r["analytic_scale"] - 1.0) < 0.2 \
                and r["analytic_corr"] > 0.9 and crossover is None:
            crossover = r["nT"]
    analytic_holds = all(abs(r["analytic_scale"] - 1.0) < 0.25 and r["analytic_corr"] > 0.9
                         for r in rows if r["nT"] >= 6)
    fd_collapses = any(r["fd_scale"] < 0.8 for r in rows if r["nT"] <= 6)
    verdict = {
        "true_peak_dwdt": round(TRUE_PEAK, 4),
        "analytic_holds_to_nT6": bool(analytic_holds),
        "fd_collapses_by_nT6": bool(fd_collapses),
        "crossover_nT": crossover,
        "advance": bool(analytic_holds and fd_collapses and crossover is not None),
    }
    print("VERDICT:", json.dumps(verdict), flush=True)
    return {"rows": rows, "verdict": verdict}


if __name__ == "__main__":
    out = run()
    outp = HERE.parents[2].parent / "research" / "beyond-sota-pinn-2026-07-14" / "p3_tr_results.json"
    outp.write_text(json.dumps(out, indent=2))
    print("wrote", outp, flush=True)
