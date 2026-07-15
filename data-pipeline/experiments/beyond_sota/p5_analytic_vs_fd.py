"""P5 (headline): analytic-autograd source/flux vs finite-difference source/flux for pressure recovery.

This is the engine's core design claim, isolated on a known-answer flow: the pressure-Poisson source is a
velocity-GRADIENT product, so how the gradients are computed decides the pressure. The engine computes them
from the velocity network's ANALYTIC (autograd) derivatives; the standard alternative (and what a plain
PPE/WERP pipeline uses) is a FINITE DIFFERENCE on the (noisy) velocity grid, which manufactures artifacts,
worst at the lumen edge. Fit ONE div-free denoiser to noisy analytic velocity, then recover pressure two ways
from the SAME fitted field: (a) analytic source_and_flux; (b) finite-difference solve_ppe on the sampled grid.
Compare both to the exact analytic pressure, across seeds x noise. Adversarial: is the analytic path really
better, or did P4 see a lucky seed? Does the gap hold across seeds and noise levels?
"""
from __future__ import annotations

import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve()
sys.path.insert(0, str(HERE.parents[2]))
sys.path.insert(0, str(HERE.parent))
import numpy as np                            # noqa: E402
import _bench as B                            # noqa: E402
from cardiopinnlab.real.flow4d_denoise import denoise_frame   # noqa: E402
from cardiopinnlab.real.flow4d_ppe import solve_ppe           # noqa: E402

SEEDS = [0, 1, 2]
NOISE = [0.05, 0.10]
BUDGET = dict(n_adam=3000, n_lbfgs=300, width=96, depth=6)


def run() -> dict:
    duct = B.converging_duct(); mask, h, U = duct["mask"], duct["h"], duct["U"]
    cg = B.grid_coords(duct["shape"], h); p_true, v_true = duct["p_true"], duct["vel"]

    rows = []
    for frac in NOISE:
        for seed in SEEDS:
            vn = B.add_noise(v_true, mask, frac, U, seed)
            fld = denoise_frame(cg[mask], vn[mask], seed=seed, **BUDGET, w_div=1.0, n_coll=6000)
            # (a) analytic-autograd source/flux (engine path)
            p_analytic = B.solve_analytic(fld, mask, h, cg)
            # (b) finite-difference source/flux on the denoised velocity grid
            v_grid = B.grid_from_field(fld, mask, v_true.shape, cg)
            p_fd = solve_ppe(v_grid, mask, h)
            ea = B.pressure_error(p_analytic, p_true, mask)
            ef = B.pressure_error(p_fd, p_true, mask)
            rows.append({"noise": frac, "seed": seed, "analytic": ea, "fd": ef})
            print(f"noise={frac} seed={seed} | analytic dropErr={ea['drop_err_mmHg']:.4f} "
                  f"rmse={ea['rmse_mmHg']:.4f} scale={ea['scale']:.3f} | "
                  f"FD dropErr={ef['drop_err_mmHg']:.4f} rmse={ef['rmse_mmHg']:.4f} scale={ef['scale']:.3f}",
                  flush=True)

    n = len(rows)
    a_drop = [r["analytic"]["drop_err_mmHg"] for r in rows]
    f_drop = [r["fd"]["drop_err_mmHg"] for r in rows]
    analytic_wins = sum(a < f for a, f in zip(a_drop, f_drop))
    verdict = {
        "n_configs": n,
        "analytic_wins_drop": analytic_wins,
        "median_drop_err_mmHg": {"analytic": round(float(np.median(a_drop)), 4),
                                 "fd": round(float(np.median(f_drop)), 4)},
        "median_ratio_fd_over_analytic": round(float(np.median(f_drop)) / max(float(np.median(a_drop)), 1e-6), 1),
        # confirmed advance: analytic beats FD in EVERY config by a clear margin
        "advance": bool(analytic_wins == n and float(np.median(f_drop)) > 3 * float(np.median(a_drop))),
    }
    print("VERDICT:", json.dumps(verdict), flush=True)
    return {"rows": rows, "verdict": verdict}


if __name__ == "__main__":
    out = run()
    outp = HERE.parents[2].parent / "research" / "beyond-sota-pinn-2026-07-14" / "p5_analytic_vs_fd_results.json"
    outp.write_text(json.dumps(out, indent=2))
    print("wrote", outp, flush=True)
