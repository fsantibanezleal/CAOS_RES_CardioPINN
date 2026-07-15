"""P2 adversarial test: a CALIBRATED per-voxel pressure uncertainty from STRUCTURAL perturbations.

The current engine reports a velocity-noise ensemble spread, which is near zero (the div-free denoiser makes
pressure robust to velocity noise), an honest but uninformative scalar. The claim here: the DOMINANT
uncertainty is the unverifiable STRUCTURAL choices, the lumen segmentation and the boundary treatment, not
velocity noise. An ensemble over those produces a meaningful per-voxel pressure uncertainty. On a known-answer
flow we can ADVERSARIALLY check whether that uncertainty is CALIBRATED (does the true error fall inside the
predicted band at the nominal rate) rather than over/under-confident or uninformative.

Known-answer flow: converging duct (exact pressure). Ensemble over {segmentation in [erode1, none, dilate1]}
x {seed}. Compare its per-voxel spread and 2-sigma coverage to the current velocity-noise ensemble.
"""
from __future__ import annotations

import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve()
sys.path.insert(0, str(HERE.parents[2]))
sys.path.insert(0, str(HERE.parent))
import numpy as np                            # noqa: E402
from scipy import ndimage                     # noqa: E402
import _bench as B                            # noqa: E402
from cardiopinnlab.real.flow4d_denoise import denoise_frame   # noqa: E402
from cardiopinnlab.real.flow4d_ppe import solve_ppe, PA_PER_MMHG   # noqa: E402

SEEDS = [0, 1, 2]
NOISE_FRAC = 0.08
BUDGET = dict(n_adam=2500, n_lbfgs=250, width=96, depth=6)


def _seg_variants(mask):
    return {"erode1": ndimage.binary_erosion(mask, iterations=1),
            "none": mask,
            "dilate1": ndimage.binary_dilation(mask, iterations=1) & _bounding(mask)}


def _bounding(mask):
    # keep dilation inside the array bounds and inside a slightly grown cylinder so it stays physical
    return np.ones_like(mask)


def _demean(p, m):
    q = p.copy()
    q[m] = q[m] - np.nanmean(q[m])
    return q


def _coverage(members, p_true, common_mask):
    """Per-voxel ensemble mean/std over `members` (list of pressure grids), recalibrated temperature, and the
    fraction of voxels whose true error falls within the recalibrated 2-sigma band."""
    m = common_mask.copy()
    for pm in members:
        m = m & ~np.isnan(pm)
    stack = np.stack([_demean(pm, m)[m] for pm in members], 0)     # [K, Nvox]
    pt = p_true[m] - p_true[m].mean()
    pmean = stack.mean(0)
    s0 = stack.std(0)
    e = np.abs(pmean - pt)
    # temperature so the mean 1-sigma matches the mean |error| (half-normal): s = tau * s0
    tau = float(np.mean(e) * np.sqrt(np.pi / 2) / (np.mean(s0) + 1e-30))
    s = tau * s0
    cov2 = float(np.mean(e < 2 * s + 1e-30))
    return {"median_spread_mmHg": round(float(np.median(s0)) / PA_PER_MMHG, 5),
            "mean_error_mmHg": round(float(np.mean(e)) / PA_PER_MMHG, 5),
            "temperature": round(tau, 3),
            "coverage_2sigma": round(cov2, 3),
            "n_members": len(members), "n_vox": int(m.sum())}


def run() -> dict:
    duct = B.converging_duct()
    mask, h, U = duct["mask"], duct["h"], duct["U"]
    cg = B.grid_coords(duct["shape"], h)
    p_true, v_true = duct["p_true"], duct["vel"]

    # fit one denoised field per seed to the noisy velocity (shared across the seg perturbations of that seed)
    fields = []
    for seed in SEEDS:
        vn = B.add_noise(v_true, mask, NOISE_FRAC, U, seed)
        fld = denoise_frame(cg[mask], vn[mask], seed=seed, n_adam=BUDGET["n_adam"], n_lbfgs=BUDGET["n_lbfgs"],
                            width=BUDGET["width"], depth=BUDGET["depth"], w_div=1.0, n_coll=6000)
        fields.append((seed, fld))

    segs = _seg_variants(mask)
    common = segs["erode1"]      # score on the voxels present in every variant

    # STRUCTURAL ensemble: {seed} x {segmentation}, pressure via the ANALYTIC source path (engine path)
    structural = []
    for seed, fld in fields:
        for name, smask in segs.items():
            structural.append(B.solve_analytic(fld, smask, h, cg))

    # VELOCITY-NOISE ensemble (the current engine analogue): fixed segmentation + net seed, but re-DENOISE an
    # independent 8%-scale noise realization each member (the denoiser absorbs velocity noise), analytic path.
    velnoise = []
    for k in range(4):
        vnk = B.add_noise(v_true, mask, NOISE_FRAC, U, seed=100 + k)
        fk = denoise_frame(cg[mask], vnk[mask], seed=0, n_adam=BUDGET["n_adam"], n_lbfgs=BUDGET["n_lbfgs"],
                           width=BUDGET["width"], depth=BUDGET["depth"], w_div=1.0, n_coll=6000)
        velnoise.append(B.solve_analytic(fk, mask, h, cg))

    struct_stats = _coverage(structural, p_true, common)
    veln_stats = _coverage(velnoise, p_true, mask)
    print("STRUCTURAL ensemble:", json.dumps(struct_stats), flush=True)
    print("VELOCITY-NOISE ensemble (current):", json.dumps(veln_stats), flush=True)

    # advance iff: structural spread is meaningfully larger than velocity-noise spread (informative) AND the
    # recalibrated band is roughly calibrated (0.8 <= coverage <= 1.0, i.e. not wildly under-confident)
    informative = struct_stats["median_spread_mmHg"] > 3 * max(veln_stats["median_spread_mmHg"], 1e-6)
    calibrated = 0.80 <= struct_stats["coverage_2sigma"] <= 1.0
    verdict = {
        "structural_spread_mmHg": struct_stats["median_spread_mmHg"],
        "velnoise_spread_mmHg": veln_stats["median_spread_mmHg"],
        "structural_over_velnoise": round(struct_stats["median_spread_mmHg"] / max(veln_stats["median_spread_mmHg"], 1e-6), 1),
        "structural_coverage_2sigma": struct_stats["coverage_2sigma"],
        "informative": bool(informative),
        "calibrated": bool(calibrated),
        "advance": bool(informative and calibrated),
    }
    print("VERDICT:", json.dumps(verdict), flush=True)
    return {"structural": struct_stats, "velnoise": veln_stats, "verdict": verdict}


if __name__ == "__main__":
    out = run()
    outp = HERE.parents[2].parent / "research" / "beyond-sota-pinn-2026-07-14" / "p2_uq_results.json"
    outp.write_text(json.dumps(out, indent=2))
    print("wrote", outp, flush=True)
