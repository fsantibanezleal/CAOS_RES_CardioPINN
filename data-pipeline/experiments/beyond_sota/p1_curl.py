"""P1 adversarial test: hard divergence-free v = curl(A_theta) vs the current SOFT-penalty denoiser.

Claim under test: enforcing incompressibility BY CONSTRUCTION (velocity is the curl of a learned vector
potential, so div v = 0 exactly) recovers pressure from NOISY velocity better than penalizing div softly.

Setup: analytic converging duct (exact pressure known). Add Gaussian velocity noise. Fit BOTH nets to the
noisy velocity with the SAME optimizer budget, sample each on the grid, run the IDENTICAL pressure-Poisson
solve, and compare (a) the divergence residual of the recovered field, (b) the recovered pressure vs exact,
(c) the recovered TRUE-velocity error (denoising quality). Across seeds x noise levels. Adversarial: curl
trivially wins divergence; the real question is pressure and velocity recovery, and whether it holds up.
"""
from __future__ import annotations

import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve()
sys.path.insert(0, str(HERE.parents[2]))     # data-pipeline (for cardiopinnlab)
sys.path.insert(0, str(HERE.parent))         # for _bench
import numpy as np                            # noqa: E402
import _bench as B                            # noqa: E402
from cardiopinnlab.real.flow4d_denoise import denoise_frame   # noqa: E402
from cardiopinnlab.real.flow4d_ppe import solve_ppe           # noqa: E402

SEEDS = [0, 1, 2]
NOISE = [0.05, 0.10]
BUDGET = dict(n_adam=3000, n_lbfgs=300, width=96, depth=6)


def _vel_error(v_rec, v_true, mask):
    m = mask & ~np.isnan(v_rec[..., 0])
    num = np.linalg.norm(v_rec[m] - v_true[m], axis=1)
    den = np.linalg.norm(v_true[m], axis=1).mean()
    return float(num.mean() / den)


def run() -> dict:
    duct = B.converging_duct()
    mask, h, U, shape = duct["mask"], duct["h"], duct["U"], duct["shape"]
    cg = B.grid_coords(shape, h)
    p_true, v_true = duct["p_true"], duct["vel"]
    coords_lumen = cg[mask]

    rows = []
    for frac in NOISE:
        for seed in SEEDS:
            vel_noisy = B.add_noise(v_true, mask, frac, U, seed)
            vn_lumen = vel_noisy[mask]

            soft = denoise_frame(coords_lumen, vn_lumen, seed=seed,
                                 n_adam=BUDGET["n_adam"], n_lbfgs=BUDGET["n_lbfgs"],
                                 width=BUDGET["width"], depth=BUDGET["depth"], w_div=1.0, n_coll=6000)
            curl = B.fit_curl(coords_lumen, vn_lumen, seed=seed,
                              n_adam=BUDGET["n_adam"], n_lbfgs=BUDGET["n_lbfgs"],
                              width=BUDGET["width"], depth=BUDGET["depth"])

            vs = B.grid_from_field(soft, mask, v_true.shape, cg)   # grids for the div / velocity metrics
            vc = B.grid_from_field(curl, mask, v_true.shape, cg)
            ps = B.solve_analytic(soft, mask, h, cg)               # pressure via the ANALYTIC source path
            pc = B.solve_analytic(curl, mask, h, cg)

            # normalize divergence by (U/L) so it is dimensionless and comparable
            L = float(np.abs(coords_lumen - coords_lumen.mean(0)).max())
            norm = U / L
            row = {
                "noise": frac, "seed": seed,
                "soft": {"div_nd": round(B.divergence_grid(vs, mask, h) / norm, 5),
                         "vel_err": round(_vel_error(vs, v_true, mask), 4),
                         **B.pressure_error(ps, p_true, mask)},
                "curl": {"div_nd": round(B.divergence_grid(vc, mask, h) / norm, 5),
                         "vel_err": round(_vel_error(vc, v_true, mask), 4),
                         **B.pressure_error(pc, p_true, mask)},
            }
            rows.append(row)
            print(f"noise={frac} seed={seed} | "
                  f"soft: div={row['soft']['div_nd']:.4f} vErr={row['soft']['vel_err']:.3f} "
                  f"dropErr={row['soft']['drop_err_mmHg']:.3f} | "
                  f"curl: div={row['curl']['div_nd']:.4f} vErr={row['curl']['vel_err']:.3f} "
                  f"dropErr={row['curl']['drop_err_mmHg']:.3f}", flush=True)

    # verdict: adversarial. Count configs where curl beats soft on pressure drop error and on velocity error.
    n = len(rows)
    curl_wins_pressure = sum(r["curl"]["drop_err_mmHg"] < r["soft"]["drop_err_mmHg"] for r in rows)
    curl_wins_velocity = sum(r["curl"]["vel_err"] < r["soft"]["vel_err"] for r in rows)
    curl_wins_div = sum(r["curl"]["div_nd"] < r["soft"]["div_nd"] for r in rows)
    med_soft_drop = float(np.median([r["soft"]["drop_err_mmHg"] for r in rows]))
    med_curl_drop = float(np.median([r["curl"]["drop_err_mmHg"] for r in rows]))
    med_soft_div = float(np.median([r["soft"]["div_nd"] for r in rows]))
    med_curl_div = float(np.median([r["curl"]["div_nd"] for r in rows]))
    verdict = {
        "n_configs": n,
        "curl_wins_pressure_drop": curl_wins_pressure,
        "curl_wins_velocity": curl_wins_velocity,
        "curl_wins_divergence": curl_wins_div,
        "median_drop_err_mmHg": {"soft": round(med_soft_drop, 4), "curl": round(med_curl_drop, 4)},
        "median_div_nd": {"soft": round(med_soft_div, 5), "curl": round(med_curl_div, 5)},
        # advance requires: curl reduces divergence hugely AND does NOT regress pressure/velocity (>= half wins)
        "advance": bool(med_curl_div < 0.25 * med_soft_div
                        and curl_wins_pressure >= n / 2 and curl_wins_velocity >= n / 2),
    }
    print("VERDICT:", json.dumps(verdict), flush=True)
    return {"rows": rows, "verdict": verdict}


if __name__ == "__main__":
    out = run()
    outp = HERE.parents[2].parent / "research" / "beyond-sota-pinn-2026-07-14" / "p1_curl_results.json"
    outp.write_text(json.dumps(out, indent=2))
    print("wrote", outp, flush=True)
