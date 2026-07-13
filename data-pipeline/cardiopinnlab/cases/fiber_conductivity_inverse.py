"""Vertical 3: recovering the myocardial fiber field and anisotropy from activation maps (FiberNet / PIEMAP).

Research topic. Myocardium conducts faster along the fiber than across it, so activation obeys the anisotropic
Eikonal sqrt( (grad T)^T D (grad T) ) = 1 with D = R(alpha) diag(cl^2, ct^2) R(alpha)^T. A single activation
map under-determines the fiber field (the wavefront only samples certain directions), so the inverse problem
uses SEVERAL maps from different stimulus sites, which jointly constrain the shared fiber angle alpha(x) and
the along/across conduction velocities cl, ct. This is the FiberNet / PIEMAP problem (Grandits, Pezzuto, Sahli
Costabal, Perdikaris, Pock, Plank, Krause, arXiv:2102.10863).

The PINN shares one fiber-angle network and the two conduction velocities across per-map activation networks,
enforcing the anisotropic Eikonal residual for every map. A deep ensemble (K independent fits) gives the
epistemic uncertainty of the recovered fiber field. The fiber-angle network is coordinate-driven, so it is
exported to ONNX and re-run live in the browser."""
from __future__ import annotations

import numpy as np
import torch

from ..core import anisotropic, eikonal, geometry
from ..core.onnx_export import export_mlp
from ..core.pinn import MLP, seed_everything, select_device, train_loop
from ..core.rng import make_rng
from ..core.trace import build_mesh_field_trace
from ..io.schema import BakeResult
from .base import CaseSpec

CASE_ID = "fiber-conductivity-inverse"

SIZE_MM = 40.0
N_GRID = 41
CL_TRUE, CT_TRUE = 0.70, 0.30          # mm/ms along / across fiber
N_MAPS = 3                             # activation maps from distinct stimulus sites
N_SENSORS = 45
NOISE_MS = 1.0
K_ENSEMBLE = 3
T_REF = 100.0


def _true_fiber(size: float, n: int) -> np.ndarray:
    xs = np.linspace(0, size, n)
    gx, gy = np.meshgrid(xs, xs, indexing="xy")
    return (np.deg2rad(30.0) + np.deg2rad(90.0) * (gx + gy) / (2 * size))   # smoothly rotating fibers


def _aniso_residual(gx, gy, alpha, cl2, ct2):
    c, s = torch.cos(alpha), torch.sin(alpha)
    d00 = cl2 * c ** 2 + ct2 * s ** 2
    d11 = cl2 * s ** 2 + ct2 * c ** 2
    d01 = (cl2 - ct2) * c * s
    quad = d00 * gx ** 2 + 2 * d01 * gx * gy + d11 * gy ** 2
    return torch.sqrt(torch.clamp(quad, min=1e-9)) - 1.0


def _fit(seed, verts, sensor_idx, sensor_t, src_norm, device):
    seed_everything(seed)
    xn_all = torch.tensor(verts / SIZE_MM, dtype=torch.float32, device=device)
    alpha_net = MLP(2, 1, width=48, depth=4, activation="tanh").to(device)
    t_nets = [MLP(2, 1, width=48, depth=4, activation="tanh").to(device) for _ in range(N_MAPS)]
    log_cl = torch.nn.Parameter(torch.tensor(np.log(0.5), dtype=torch.float32, device=device))
    log_ct = torch.nn.Parameter(torch.tensor(np.log(0.4), dtype=torch.float32, device=device))
    xn_sensors = [torch.tensor(verts[sensor_idx[m]] / SIZE_MM, dtype=torch.float32, device=device) for m in range(N_MAPS)]
    t_sensors = [torch.tensor(sensor_t[m] / T_REF, dtype=torch.float32, device=device).unsqueeze(1) for m in range(N_MAPS)]
    src_t = torch.tensor(src_norm, dtype=torch.float32, device=device)

    params = list(alpha_net.parameters()) + [p for net in t_nets for p in net.parameters()] + [log_cl, log_ct]

    def closure():
        cl2 = torch.exp(log_cl) ** 2
        ct2 = torch.exp(log_ct) ** 2
        loss = 0.0
        xc = xn_all.clone().detach().requires_grad_(True)
        alpha_c = alpha_net(xc)[:, 0]
        for m in range(N_MAPS):
            tau = t_nets[m](xn_sensors[m])
            loss = loss + torch.mean((tau - t_sensors[m]) ** 2)
            loss = loss + 3.0 * torch.mean(t_nets[m](src_t[m:m + 1]) ** 2)
            t_c = t_nets[m](xc)
            g = eikonal.grad_scalar(t_c, xc) * (T_REF / SIZE_MM)
            res = _aniso_residual(g[:, 0], g[:, 1], alpha_c, cl2, ct2)
            loss = loss + 1.5 * torch.mean(res ** 2)
        # smoothness prior on the fiber field + anisotropy ordering (cl >= ct)
        ga = eikonal.grad_scalar(alpha_net(xc), xc)
        loss = loss + 5e-3 * torch.mean(ga ** 2)
        loss = loss + 0.1 * torch.relu(torch.exp(log_ct) - torch.exp(log_cl)) ** 2
        return loss

    train_loop(params, closure, n_adam=3000, n_lbfgs=200, lr=3e-3)
    with torch.no_grad():
        alpha = alpha_net(xn_all)[:, 0].cpu().numpy()
        cl, ct = float(torch.exp(log_cl)), float(torch.exp(log_ct))
    return alpha_net, alpha, cl, ct


def _wrap_pi(a):
    return (a + np.pi / 2) % np.pi - np.pi / 2


def _build(seed: int) -> BakeResult:
    device = select_device()
    rng = make_rng(seed)
    verts, tris = geometry.make_grid_mesh(N_GRID, SIZE_MM)
    alpha_true_grid = _true_fiber(SIZE_MM, N_GRID)
    alpha_true = alpha_true_grid.ravel()
    dx = SIZE_MM / (N_GRID - 1)
    stim_rc = [(0, 0), (N_GRID - 1, 0), (N_GRID // 2, N_GRID - 1)]
    t_truth = [anisotropic.anisotropic_activation_grid(N_GRID, SIZE_MM, alpha_true_grid, CL_TRUE, CT_TRUE, s).ravel() for s in stim_rc]
    src_norm = np.array([[s[1] * dx / SIZE_MM, s[0] * dx / SIZE_MM] for s in stim_rc])

    sensor_idx = [np.sort(rng.choice(verts.shape[0], size=N_SENSORS, replace=False)) for _ in range(N_MAPS)]
    sensor_t = [t_truth[m][sensor_idx[m]] + rng.normal(0, NOISE_MS, size=N_SENSORS) for m in range(N_MAPS)]

    # deep ensemble for epistemic UQ on the fiber field
    alphas, cls, cts, nets = [], [], [], []
    for k in range(K_ENSEMBLE):
        net, alpha, cl, ct = _fit(seed + 17 * k, verts, sensor_idx, sensor_t, src_norm, device)
        alphas.append(alpha)
        cls.append(cl)
        cts.append(ct)
        nets.append(net)
    alpha_stack = np.stack(alphas)                                   # [K, n]
    # circular-ish mean over the ensemble (fibers are mod pi -> average via angle-doubling)
    mean2 = np.arctan2(np.mean(np.sin(2 * alpha_stack), 0), np.mean(np.cos(2 * alpha_stack), 0))
    alpha_mean = mean2 / 2.0
    alpha_std_deg = np.rad2deg(np.std(_wrap_pi(alpha_stack - alpha_mean), axis=0))

    angle_err_deg = np.rad2deg(np.abs(_wrap_pi(alpha_mean - alpha_true)))
    metrics = {
        "fiber_angle_rmse_deg": round(float(np.sqrt(np.mean(angle_err_deg ** 2))), 2),
        "cl_recovered": round(float(np.mean(cls)), 3),
        "ct_recovered": round(float(np.mean(cts)), 3),
        "cl_true": CL_TRUE, "ct_true": CT_TRUE,
        "anisotropy_recovered": round(float(np.mean(cls) / max(np.mean(cts), 1e-6)), 2),
        "mean_uq_std_deg": round(float(np.mean(alpha_std_deg)), 2),
        "n_maps": N_MAPS, "k_ensemble": K_ENSEMBLE,
    }

    # export the (first ensemble member's) fiber-angle net for live re-inference
    class FiberExport(torch.nn.Module):
        def __init__(self, net):
            super().__init__()
            self.net = net

        def forward(self, xy_mm):
            return self.net(xy_mm / SIZE_MM)

    onnx_meta, onnx_blob = export_mlp(FiberExport(nets[0]), in_dim=2, out_names=["fiber_angle_rad"],
                                      opset=17, domain=(0.0, SIZE_MM), seed=seed)

    sensors = np.concatenate([verts[sensor_idx[0]], sensor_t[0][:, None]], axis=1)
    trace = build_mesh_field_trace(
        case_id=CASE_ID, view_kit="CardiacMeshKit", vertices=verts, triangles=tris,
        fields={
            "fiber_angle_true_deg": np.rad2deg(alpha_true), "fiber_angle_pinn_deg": np.rad2deg(_wrap_pi(alpha_mean)),
            "fiber_uq_std_deg": alpha_std_deg, "fiber_abs_err_deg": angle_err_deg,
            "T_map1_truth": t_truth[0],
        },
        field_units={
            "fiber_angle_true_deg": "deg", "fiber_angle_pinn_deg": "deg", "fiber_uq_std_deg": "deg",
            "fiber_abs_err_deg": "deg", "T_map1_truth": "ms",
        },
        sensors=sensors, isochrones_ms=[], coord_nd=2,
        summary={"fiber_angle_rmse_deg": metrics["fiber_angle_rmse_deg"],
                 "anisotropy_recovered": metrics["anisotropy_recovered"],
                 "mean_uq_std_deg": metrics["mean_uq_std_deg"]},
    )
    return BakeResult(
        case_id=CASE_ID, trace=trace, metrics=metrics,
        params={"size_mm": SIZE_MM, "n_grid": N_GRID, "n_maps": N_MAPS, "cl_true": CL_TRUE, "ct_true": CT_TRUE},
        onnx=onnx_meta, web_drivable=True, flags=[], extra={"onnx_blob": onnx_blob},
    )


SPEC = CaseSpec(
    id=CASE_ID,
    title="Fiber and conductivity inference (FiberNet)",
    category="electrophysiology-fiber",
    system_type="fiber-field",
    view_kit="CardiacMeshKit",
    real_or_synthetic="synthetic",
    expected_band="from several activation maps the PINN recovers the fiber-angle field (RMSE a few tens of "
                  "degrees at worst, better where the wavefronts sample multiple directions) and the "
                  "anisotropy ratio cl/ct, with a deep-ensemble uncertainty on the fiber field",
    engine_desc="multi-map anisotropic-Eikonal inverse; shared fiber-angle net + learnable cl, ct; deep-ensemble UQ; ONNX export",
    ladder={
        "classical": "assume rule-based / atlas fibers and literature CV (population, not patient-specific)",
        "sota": "anisotropic-Eikonal PINN recovering the fiber field + conductivity from multiple maps (FiberNet / PIEMAP)",
        "novel": "deep-ensemble epistemic uncertainty on the recovered fiber field (where to trust the inference)",
    },
    references=[
        {"cite": "Grandits, Pezzuto, Sahli Costabal, Perdikaris, Pock, Plank, Krause (2021). Learning atrial "
                 "fiber orientations and conductivity tensors from intracardiac maps using PINNs (PIEMAP)",
         "doi_or_arxiv": "arXiv:2102.10863", "note": "the anisotropic-Eikonal inverse reproduced here"},
        {"cite": "Grandits et al. (2022). PINNs to learn cardiac fiber orientation from multiple electroanatomical "
                 "maps. Engineering with Computers", "doi_or_arxiv": "10.1007/s00366-022-01709-3", "note": "FiberNet"},
    ],
    build=_build,
    tags=["anisotropic-eikonal", "fiber-inference", "conductivity-tensor", "deep-ensemble-uq", "inverse"],
)
