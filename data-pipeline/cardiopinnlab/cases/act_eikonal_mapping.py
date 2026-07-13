"""Vertical 1: cardiac activation mapping by an Eikonal physics-informed neural network.

Research topic. From a sparse set of noisy local activation times (LATs) measured on the endocardium by a
mapping catheter, reconstruct the full activation map T(x) and the underlying conduction velocity V(x). The
governing physics is the isotropic Eikonal equation ||grad T|| V = 1, T = 0 at the stimulus.

Classical baselines (linear interpolation, Gaussian-process regression) impose only smoothness and ignore
the wave physics: with sparse sampling they over-smooth wavefront curvature and, crucially, recover NO
conduction velocity at all. The Eikonal PINN adds the physics residual + a total-variation prior on V,
reconstructing both T and a physically consistent V and generalizing off the sparse samples. This reproduces
the core of Sahli Costabal, Yang, Perdikaris, Hurtado, Kuhl, "Physics-Informed Neural Networks for Cardiac
Activation Mapping", Frontiers in Physics 8:42 (2020), DOI 10.3389/fphy.2020.00042.

Ground truth is the exact fast-marching (scikit-fmm) solution of the heterogeneous Eikonal on the tissue
patch; the conduction field has a smooth slow-conduction region so the wavefront curves. The geometry here
is a synthetic 2D patch with a realistic CV map; real curved cardiac surfaces + the Laplace-Beltrami
eigenbasis enter with the Delta-PINN vertical.

Training uses a two-stage curriculum that resolves the T/V degeneracy of the joint inverse problem (for any
smooth T one can set V = 1/||grad T||, so V must be pinned down by a prior + a warm start): Stage A fits the
activation time under a fixed homogeneous conduction speed (a well-posed warm start); Stage B unfreezes the
conduction-velocity field and refines both under the Eikonal residual, a total-variation prior and a mild
prior toward the nominal CV."""
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

CASE_ID = "act-eikonal-mapping"

# --- physical configuration (realistic atrial-tissue scale) ------------------------------------------------
SIZE_MM = 40.0          # a 4 cm endocardial tissue patch
N_GRID = 41             # render mesh + collocation lattice (41x41 = 1681 vertices)
BASE_CV = 0.60          # mm/ms, physiological atrial conduction velocity
SLOW_CV = 0.20          # mm/ms, a slowed-conduction region
SLOW_CENTER = (24.0, 16.0)
SLOW_RADIUS = 6.0
SOURCE_MM = (4.0, 4.0)  # stimulus site (near a corner)
N_SENSORS = 30          # sparse mapping-catheter sites (the clinically realistic, under-sampled regime)
NOISE_MS = 1.5          # measurement noise on the LATs
V_MIN, V_MAX = 0.10, 1.00  # physiological CV band the V-net is constrained to
T_REF = 100.0           # ms, activation-time normalization scale (tau = T / T_REF)


def _build(seed: int) -> BakeResult:
    device = select_device()
    seed_everything(seed)
    rng = make_rng(seed)

    # --- geometry + heterogeneous conduction field ---------------------------------------------------------
    verts, tris = geometry.make_grid_mesh(N_GRID, SIZE_MM)
    cv_grid = groundtruth.smooth_slow_region(N_GRID, SIZE_MM, BASE_CV, SLOW_CV, SLOW_CENTER, SLOW_RADIUS)
    dx = SIZE_MM / (N_GRID - 1)
    src_rc = (int(round(SOURCE_MM[1] / dx)), int(round(SOURCE_MM[0] / dx)))   # (row=y, col=x)
    t_truth = groundtruth.eikonal_arrival_grid(cv_grid, src_rc, dx).ravel()    # ms, aligned with verts
    cv_true = cv_grid.ravel()

    # --- sparse noisy LAT measurements ---------------------------------------------------------------------
    sensor_idx = geometry.sample_sensor_indices(verts.shape[0], N_SENSORS, rng)
    sensor_xy = verts[sensor_idx]
    sensor_t = t_truth[sensor_idx] + rng.normal(0.0, NOISE_MS, size=sensor_idx.shape)

    # --- classical baselines -------------------------------------------------------------------------------
    t_lin = baselines.linear_interp(sensor_xy, sensor_t, verts)
    t_gp, _ = baselines.gp_regress(sensor_xy, sensor_t, verts,
                                   lengthscale_mm=8.0, signal_std=float(sensor_t.std() + 1e-6), noise_std=NOISE_MS)

    # --- the Eikonal PINN (two nets: activation time T and conduction velocity V) ---------------------------
    t_net = MLP(2, 1, width=64, depth=5, activation="tanh").to(device)
    v_net = MLP(2, 1, width=32, depth=3, activation="tanh").to(device)

    xn_all = torch.tensor(verts / SIZE_MM, dtype=torch.float32, device=device)
    xn_sensors = torch.tensor(sensor_xy / SIZE_MM, dtype=torch.float32, device=device)
    tau_sensors = torch.tensor(sensor_t / T_REF, dtype=torch.float32, device=device).unsqueeze(1)
    xn_src = torch.tensor(np.array(SOURCE_MM) / SIZE_MM, dtype=torch.float32, device=device).unsqueeze(0)
    base_cv_t = torch.tensor(BASE_CV, dtype=torch.float32, device=device)
    scale = T_REF / SIZE_MM   # physical gradient of T = (T_REF / L) * gradient of tau w.r.t normalized coords

    def tau_of(xn: torch.Tensor) -> torch.Tensor:
        return t_net(xn)

    def v_of(xn: torch.Tensor) -> torch.Tensor:
        return V_MIN + (V_MAX - V_MIN) * torch.sigmoid(v_net(xn))

    def data_terms() -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        loss_data = torch.mean((tau_of(xn_sensors) - tau_sensors) ** 2)
        loss_src = torch.mean(tau_of(xn_src) ** 2)
        loss_pos = torch.mean(torch.relu(-tau_of(xn_all)) ** 2)   # activation time is non-negative
        return loss_data, loss_src, loss_pos

    def eikonal_residual(v_field: torch.Tensor, xc: torch.Tensor, tau_c: torch.Tensor) -> torch.Tensor:
        gt = eikonal.grad_scalar(tau_c, xc) * scale               # physical gradient of T [ms/mm]
        grad_norm = torch.sqrt(torch.sum(gt ** 2, dim=1, keepdim=True) + 1e-12)
        return grad_norm * v_field - 1.0

    # Stage A: fit T under a FIXED homogeneous conduction speed (a well-posed warm start).
    def closure_a() -> torch.Tensor:
        ld, ls, lp = data_terms()
        xc = xn_all.clone().detach().requires_grad_(True)
        res = eikonal_residual(base_cv_t, xc, tau_of(xc))
        return 1.0 * ld + 5.0 * ls + 10.0 * lp + 1.0 * torch.mean(res ** 2)

    train_loop(list(t_net.parameters()), closure_a, n_adam=2500, n_lbfgs=0, lr=2e-3)

    # Stage B: unfreeze V, refine both under the Eikonal residual + TV prior + mild CV prior.
    def closure_b() -> torch.Tensor:
        ld, ls, lp = data_terms()
        xc = xn_all.clone().detach().requires_grad_(True)
        v_c = v_of(xc)
        res = eikonal_residual(v_c, xc, tau_of(xc))
        ltv = eikonal.total_variation(v_of(xc), xc)
        lprior = torch.mean((v_c - base_cv_t) ** 2)
        return 1.0 * ld + 5.0 * ls + 10.0 * lp + 2.0 * torch.mean(res ** 2) + 1e-2 * ltv + 2e-2 * lprior

    history = train_loop(list(t_net.parameters()) + list(v_net.parameters()),
                         closure_b, n_adam=3500, n_lbfgs=400, lr=1.5e-3)

    with torch.no_grad():
        t_pinn = (T_REF * tau_of(xn_all)).cpu().numpy().ravel()
        cv_pinn = v_of(xn_all).cpu().numpy().ravel()

    # --- metrics -------------------------------------------------------------------------------------------
    metrics = {
        "rel_l2_pinn": round(geometry.relative_l2(t_pinn, t_truth), 4),
        "rel_l2_gp": round(geometry.relative_l2(t_gp, t_truth), 4),
        "rel_l2_linear": round(geometry.relative_l2(t_lin, t_truth), 4),
        "cv_rmse_mm_per_ms": round(float(np.sqrt(np.mean((cv_pinn - cv_true) ** 2))), 4),
        "n_sensors": int(N_SENSORS),
        "noise_ms": NOISE_MS,
        "final_loss": round(float(history[-1]), 8),
    }

    # --- ONNX export (T as a function of physical mm coordinates, browser-drivable) ------------------------
    class TExport(nn.Module):
        def __init__(self, net: nn.Module):
            super().__init__()
            self.net = net

        def forward(self, xy_mm: torch.Tensor) -> torch.Tensor:
            return T_REF * self.net(xy_mm / SIZE_MM)

    onnx_meta, onnx_blob = export_mlp(
        TExport(t_net), in_dim=2, out_names=["activation_time_ms"],
        opset=17, domain=(0.0, SIZE_MM), seed=seed,
    )

    # --- compact mesh + fields trace -----------------------------------------------------------------------
    sensors = np.concatenate([sensor_xy, sensor_t[:, None]], axis=1)   # [k, 3] = (x, y, measured t)
    isochrones = list(np.linspace(float(t_truth.min()) + 5.0, float(t_truth.max()) - 2.0, 8))
    trace = build_mesh_field_trace(
        case_id=CASE_ID, view_kit="CardiacMeshKit", vertices=verts, triangles=tris,
        fields={
            "T_pinn": t_pinn, "T_truth": t_truth, "T_gp": t_gp, "T_linear": t_lin,
            "CV_pinn": cv_pinn, "CV_true": cv_true, "abs_err_pinn": np.abs(t_pinn - t_truth),
        },
        field_units={
            "T_pinn": "ms", "T_truth": "ms", "T_gp": "ms", "T_linear": "ms",
            "CV_pinn": "mm/ms", "CV_true": "mm/ms", "abs_err_pinn": "ms",
        },
        sensors=sensors, isochrones_ms=isochrones,
        summary={
            "rel_l2_pinn": metrics["rel_l2_pinn"], "rel_l2_gp": metrics["rel_l2_gp"],
            "rel_l2_linear": metrics["rel_l2_linear"], "cv_rmse_mm_per_ms": metrics["cv_rmse_mm_per_ms"],
            "size_mm": SIZE_MM, "t_max_ms": round(float(t_truth.max()), 2),
        },
    )

    return BakeResult(
        case_id=CASE_ID, trace=trace, metrics=metrics,
        params={"size_mm": SIZE_MM, "n_grid": N_GRID, "base_cv": BASE_CV, "slow_cv": SLOW_CV,
                "n_sensors": N_SENSORS, "noise_ms": NOISE_MS},
        onnx=onnx_meta, web_drivable=True, flags=[], extra={"onnx_blob": onnx_blob},
    )


SPEC = CaseSpec(
    id=CASE_ID,
    title="Cardiac activation mapping (Eikonal PINN)",
    category="electrophysiology-activation",
    system_type="activation-surface",
    view_kit="CardiacMeshKit",
    real_or_synthetic="synthetic",
    expected_band="PINN reconstructs T at or below the sparse-data interpolation baselines AND recovers a "
                  "physically consistent conduction-velocity map (including the slow region) that the "
                  "smoothness-only baselines cannot produce",
    engine_desc="two-network Eikonal PINN (activation time T + conduction velocity V), PyTorch, ONNX export",
    ladder={
        "classical": "linear / Gaussian-process interpolation of sparse LATs (smoothness only, no wave physics, no CV)",
        "sota": "Eikonal PINN with data + physics residual + total-variation CV prior (Sahli Costabal et al. 2020)",
        "novel": "carried in later verticals: anisotropic + geometry-aware + joint scar recovery with node UQ",
    },
    references=[
        {"cite": "Sahli Costabal, Yang, Perdikaris, Hurtado, Kuhl (2020). PINNs for Cardiac Activation Mapping. "
                 "Frontiers in Physics 8:42", "doi_or_arxiv": "10.3389/fphy.2020.00042",
         "note": "the SOTA method reproduced here; two-net T/V split + TV prior + GP comparison"},
        {"cite": "Sethian (1996). A fast marching level set method for monotonically advancing fronts. PNAS 93",
         "doi_or_arxiv": "10.1073/pnas.93.4.1591", "note": "the fast-marching ground-truth Eikonal solver"},
    ],
    build=_build,
    tags=["eikonal", "activation-mapping", "conduction-velocity", "inverse", "sota-reproduction"],
)
