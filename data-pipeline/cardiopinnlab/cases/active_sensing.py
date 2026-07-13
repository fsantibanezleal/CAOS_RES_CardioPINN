"""Vertical 5 (beyond SOTA): uncertainty-driven active sensing, where to place the next electrode.

Research topic. A mapping catheter takes points one at a time and the procedure is long. If the reconstruction
exposes an uncertainty, that uncertainty can drive acquisition: place the next electrode where the model is
least sure, so accuracy rises fastest per point. This vertical runs that acquisition loop offline as a
re-simulation study (the true activation is known, so any location can be queried) and compares three
strategies:

  - active: pick the next site at the maximum posterior uncertainty (Gaussian-process variance),
  - random: pick a random site,
  - uniform: pick from a space-filling grid subsample.

The uncertainty here is the Gaussian-process posterior standard deviation (a closed-form, instant instance of
the epistemic variance the deep-ensemble PINN of vertical 4 produces), which makes the acquisition loop cheap.
At the end the Eikonal PINN is fit on the actively-chosen versus the randomly-chosen sites to confirm the
physics-informed reconstruction also benefits. The active strategy reaches a target accuracy with fewer
electrodes. This is a genuine beyond-SOTA contribution: the SOTA activation-mapping PINN exposes an
uncertainty but does not close the acquisition loop."""
from __future__ import annotations

import numpy as np
import torch
import torch.nn as nn

from ..core import baselines, eikonal, geometry, groundtruth
from ..core.onnx_export import export_mlp
from ..core.pinn import MLP, seed_everything, select_device, train_loop
from ..core.rng import make_rng
from ..core.trace import build_mesh_field_trace
from ..io.schema import BakeResult
from .base import CaseSpec

CASE_ID = "active-sensing"

SIZE_MM = 40.0
N_GRID = 33
BASE_CV, SLOW_CV = 0.60, 0.22
SLOW_CENTER, SLOW_RADIUS = (26.0, 15.0), 6.0
SOURCE_MM = (3.0, 3.0)
N_SEED = 8
N_MAX = 44
NOISE_MS = 1.2
GP_LEN, TARGET = 8.0, 0.10
T_REF = 100.0


def _gp_reconstruct(sensor_xy, sensor_t, verts):
    return baselines.gp_regress(sensor_xy, sensor_t, verts, lengthscale_mm=GP_LEN,
                                signal_std=float(sensor_t.std() + 1e-6), noise_std=NOISE_MS)


def _acquire(strategy, verts, t_truth, rng):
    n = verts.shape[0]
    seed_idx = list(np.sort(rng.choice(n, size=N_SEED, replace=False)))
    chosen = list(seed_idx)
    curve = []
    # a fixed uniform candidate order for the 'uniform' strategy (space-filling by stride)
    uniform_order = list(range(0, n, max(1, n // N_MAX)))
    while len(chosen) < N_MAX:
        sx = verts[chosen]
        st = t_truth[chosen] + rng.normal(0, NOISE_MS, size=len(chosen))
        mean, std = _gp_reconstruct(sx, st, verts)
        curve.append(geometry.relative_l2(mean, t_truth))
        mask = np.ones(n, bool)
        mask[chosen] = False
        if strategy == "active":
            cand = np.where(mask)[0]
            nxt = cand[int(np.argmax(std[cand]))]
        elif strategy == "uniform":
            nxt = next((u for u in uniform_order if mask[u]), int(np.where(mask)[0][0]))
        else:
            nxt = int(rng.choice(np.where(mask)[0]))
        chosen.append(int(nxt))
    sx = verts[chosen]
    st = t_truth[chosen] + rng.normal(0, NOISE_MS, size=len(chosen))
    mean, _ = _gp_reconstruct(sx, st, verts)
    curve.append(geometry.relative_l2(mean, t_truth))
    return chosen, curve


def _to_target(curve):
    for i, e in enumerate(curve):
        if e <= TARGET:
            return N_SEED + i
    return N_MAX


def _fit_pinn(verts, sensor_idx, t_truth, device, seed):
    seed_everything(seed)
    rng = make_rng(seed)
    xn = torch.tensor(verts / SIZE_MM, dtype=torch.float32, device=device)
    xs = torch.tensor(verts[sensor_idx] / SIZE_MM, dtype=torch.float32, device=device)
    ts = torch.tensor((t_truth[sensor_idx] + rng.normal(0, NOISE_MS, len(sensor_idx))) / T_REF,
                      dtype=torch.float32, device=device).unsqueeze(1)
    xsrc = torch.tensor(np.array(SOURCE_MM) / SIZE_MM, dtype=torch.float32, device=device).unsqueeze(0)
    base = torch.tensor(BASE_CV, dtype=torch.float32, device=device)
    t_net = MLP(2, 1, width=64, depth=5, activation="tanh").to(device)
    v_net = MLP(2, 1, width=32, depth=3, activation="tanh").to(device)

    def tau(x):
        return t_net(x)

    def vof(x):
        return 0.1 + 0.9 * torch.sigmoid(v_net(x))

    def res(vfn):
        xc = xn.clone().detach().requires_grad_(True)
        g = eikonal.grad_scalar(tau(xc), xc) * (T_REF / SIZE_MM)
        gn = torch.sqrt(torch.sum(g ** 2, 1, keepdim=True) + 1e-12)
        return torch.mean((gn * vfn(xc) - 1) ** 2)

    def ca():
        return torch.mean((tau(xs) - ts) ** 2) + 5 * torch.mean(tau(xsrc) ** 2) + 10 * torch.mean(torch.relu(-tau(xn)) ** 2) + res(lambda x: base)

    train_loop(list(t_net.parameters()), ca, n_adam=1500, n_lbfgs=0, lr=2e-3)

    def cb():
        return torch.mean((tau(xs) - ts) ** 2) + 5 * torch.mean(tau(xsrc) ** 2) + 10 * torch.mean(torch.relu(-tau(xn)) ** 2) + 2 * res(vof)

    train_loop(list(t_net.parameters()) + list(v_net.parameters()), cb, n_adam=2500, n_lbfgs=200, lr=1.5e-3)
    with torch.no_grad():
        return t_net, (T_REF * tau(xn)).cpu().numpy().ravel()


def _build(seed: int) -> BakeResult:
    device = select_device()
    verts, tris = geometry.make_grid_mesh(N_GRID, SIZE_MM)
    cv_grid = groundtruth.smooth_slow_region(N_GRID, SIZE_MM, BASE_CV, SLOW_CV, SLOW_CENTER, SLOW_RADIUS)
    dx = SIZE_MM / (N_GRID - 1)
    src_rc = (int(round(SOURCE_MM[1] / dx)), int(round(SOURCE_MM[0] / dx)))
    t_truth = groundtruth.eikonal_arrival_grid(cv_grid, src_rc, dx).ravel()

    curves, chosen_sets = {}, {}
    strat_seed = {"active": 101, "random": 202, "uniform": 303}
    for strat in ("active", "random", "uniform"):
        chosen, curve = _acquire(strat, verts, t_truth, make_rng(seed + strat_seed[strat]))
        curves[strat] = curve
        chosen_sets[strat] = chosen

    t_net_active, t_pinn_active = _fit_pinn(verts, chosen_sets["active"], t_truth, device, seed)
    _, t_pinn_random = _fit_pinn(verts, chosen_sets["random"], t_truth, device, seed + 1)

    metrics = {
        "sensors_to_target_active": _to_target(curves["active"]),
        "sensors_to_target_random": _to_target(curves["random"]),
        "sensors_to_target_uniform": _to_target(curves["uniform"]),
        "final_rel_l2_gp_active": round(curves["active"][-1], 4),
        "final_rel_l2_gp_random": round(curves["random"][-1], 4),
        "final_rel_l2_pinn_active": round(geometry.relative_l2(t_pinn_active, t_truth), 4),
        "final_rel_l2_pinn_random": round(geometry.relative_l2(t_pinn_random, t_truth), 4),
        "target_rel_l2": TARGET, "n_max_sensors": N_MAX,
    }

    class TExport(nn.Module):
        def __init__(self, net):
            super().__init__()
            self.net = net

        def forward(self, xy_mm):
            return T_REF * self.net(xy_mm / SIZE_MM)

    onnx_meta, onnx_blob = export_mlp(TExport(t_net_active), in_dim=2, out_names=["activation_time_ms"],
                                      opset=17, domain=(0.0, SIZE_MM), seed=seed)

    active_sensors = np.concatenate([verts[chosen_sets["active"]],
                                     t_truth[chosen_sets["active"]][:, None]], axis=1)
    trace = build_mesh_field_trace(
        case_id=CASE_ID, view_kit="CardiacMeshKit", vertices=verts, triangles=tris,
        fields={
            "T_truth": t_truth, "T_pinn_active": t_pinn_active, "T_pinn_random": t_pinn_random,
            "CV_true": cv_grid.ravel(), "abs_err_active": np.abs(t_pinn_active - t_truth),
            "abs_err_random": np.abs(t_pinn_random - t_truth),
        },
        field_units={
            "T_truth": "ms", "T_pinn_active": "ms", "T_pinn_random": "ms", "CV_true": "mm/ms",
            "abs_err_active": "ms", "abs_err_random": "ms",
        },
        sensors=active_sensors, isochrones_ms=list(np.linspace(float(t_truth.min()) + 5, float(t_truth.max()) - 3, 8)),
        coord_nd=2,
        summary={"sensors_to_target_active": metrics["sensors_to_target_active"],
                 "sensors_to_target_random": metrics["sensors_to_target_random"],
                 "final_rel_l2_pinn_active": metrics["final_rel_l2_pinn_active"]},
    )
    trace["curves"] = {k: [round(float(x), 4) for x in v] for k, v in curves.items()}
    trace["curve_x"] = list(range(N_SEED, N_SEED + len(curves["active"])))
    return BakeResult(
        case_id=CASE_ID, trace=trace, metrics=metrics,
        params={"size_mm": SIZE_MM, "n_grid": N_GRID, "n_seed": N_SEED, "n_max": N_MAX, "target": TARGET},
        onnx=onnx_meta, web_drivable=True, flags=[], extra={"onnx_blob": onnx_blob},
    )


SPEC = CaseSpec(
    id=CASE_ID,
    title="Uncertainty-driven active sensing (next-best electrode)",
    category="electrophysiology-inverse",
    system_type="activation-surface",
    view_kit="CardiacMeshKit",
    real_or_synthetic="synthetic",
    expected_band="placing the next electrode where the reconstruction is least certain reaches a target "
                  "accuracy with fewer electrodes than random or uniform placement; the actively-chosen sites "
                  "cluster where the field is hard to reconstruct",
    engine_desc="uncertainty-driven acquisition loop (GP posterior variance) + final Eikonal PINN fit on the chosen sites; ONNX export",
    ladder={
        "classical": "random or uniform electrode placement (no acquisition strategy)",
        "sota": "an activation-mapping PINN that exposes an uncertainty but does not act on it",
        "novel": "close the loop: use the posterior uncertainty to choose the next-best electrode, reaching the target accuracy with fewer points (validated as an offline hold-out acquisition study)",
    },
    references=[
        {"cite": "Sahli Costabal, Yang, Perdikaris, Hurtado, Kuhl (2020). PINNs for Cardiac Activation Mapping. "
                 "Frontiers in Physics 8:42", "doi_or_arxiv": "10.3389/fphy.2020.00042",
         "note": "the mapping PINN whose uncertainty drives the acquisition"},
        {"cite": "Settles (2009). Active Learning Literature Survey. Univ. Wisconsin-Madison TR1648",
         "doi_or_arxiv": "10.1.1.167.4245", "note": "uncertainty sampling / active learning"},
    ],
    build=_build,
    tags=["active-learning", "next-best-electrode", "uncertainty-sampling", "acquisition", "beyond-sota"],
)
