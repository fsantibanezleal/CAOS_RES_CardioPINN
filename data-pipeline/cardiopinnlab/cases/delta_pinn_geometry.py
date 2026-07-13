"""Vertical 2: physics-informed activation mapping on a curved cardiac surface (Delta-PINN).

Research topic. Real cardiac chambers are curved surfaces, not flat patches. A physics-informed network that
takes the raw ambient coordinates (x, y, z) as input struggles on a complex surface: the coordinates do not
respect the manifold, so the network wastes capacity learning the geometry instead of the field. Delta-PINNs
(Sahli Costabal, Pezzuto, Perdikaris, Eng. Appl. AI 127, 2024, DOI 10.1016/j.engappai.2023.107324) replace
the coordinate input with the lowest eigenfunctions of the Laplace-Beltrami operator of the actual mesh: the
natural, geometry-aware coordinates of the surface.

This vertical solves the surface Eikonal activation problem on a curved dome, comparing a Delta-PINN
(eigenbasis input) against a vanilla PINN (raw x, y, z input) under the SAME intrinsic surface-Eikonal
residual ||grad_surface T|| c = 1, and against a classical 3D interpolation baseline. The residual is enforced
with a per-face intrinsic gradient operator, so the physics is evaluated on the manifold, not in the ambient
space. Ground truth is the exact geodesic-distance activation (heat method). Replay-only: the Delta-PINN input
is the precomputed mesh eigenbasis, not a browser-suppliable coordinate, so it is honestly not live-drivable."""
from __future__ import annotations

import numpy as np
import torch
import torch.nn as nn
from scipy.interpolate import griddata

from ..core import mesh
from ..core.pinn import MLP, seed_everything, select_device, train_loop
from ..core.rng import make_rng
from ..core.trace import build_mesh_field_trace
from ..io.schema import BakeResult
from .base import CaseSpec

CASE_ID = "delta-pinn-geometry"

RADIUS_MM = 10.0           # curl radius; the scroll wraps ~1.85 pi so its ends come close in 3D
LENGTH_MM = 40.0
N_GRID = 34                # ~1156 vertices
K_EIG = 48                 # Laplace-Beltrami eigenfunctions (the Delta-PINN input dimension)
AMBIENT_SCALE = 30.0       # normalization for the vanilla-PINN ambient input
CV = 0.6                   # mm/ms homogeneous conduction speed
N_SENSORS = 40
NOISE_MS = 1.5
T_REF = 100.0


def _sparse_torch(g_csr, device):
    coo = g_csr.tocoo()
    idx = torch.tensor(np.vstack([coo.row, coo.col]), dtype=torch.long, device=device)
    val = torch.tensor(coo.data, dtype=torch.float32, device=device)
    return torch.sparse_coo_tensor(idx, val, g_csr.shape, device=device).coalesce()


def _train(net, input_tensor, g_torch, areas_t, sensor_idx, t_sensors_norm, src_idx, device, seed):
    seed_everything(seed)

    def tau_of():
        return net(input_tensor)                                  # [n, 1]

    def loss_closure():
        tau = tau_of()
        loss_data = torch.mean((tau[sensor_idx] - t_sensors_norm) ** 2)
        loss_src = torch.mean(tau[src_idx] ** 2)
        loss_pos = torch.mean(torch.relu(-tau) ** 2)
        t_phys = T_REF * tau                                       # ms
        grad = torch.sparse.mm(g_torch, t_phys).reshape(-1, 3)    # per-face gradient [m, 3] ms/mm
        gnorm = torch.sqrt(torch.sum(grad ** 2, dim=1, keepdim=True) + 1e-12)
        res = gnorm * CV - 1.0
        loss_pde = torch.sum((res ** 2) * areas_t) / torch.sum(areas_t)
        return 1.0 * loss_data + 5.0 * loss_src + 10.0 * loss_pos + 2.0 * loss_pde

    train_loop(list(net.parameters()), loss_closure, n_adam=4000, n_lbfgs=300, lr=2e-3)
    with torch.no_grad():
        return (T_REF * tau_of()).cpu().numpy().ravel()


def _build(seed: int) -> BakeResult:
    device = select_device()
    rng = make_rng(seed)

    verts, faces = mesh.make_curled_surface(N_GRID, RADIUS_MM, LENGTH_MM)
    phi = mesh.laplace_beltrami_eigenbasis(verts, faces, K_EIG)
    g_csr, areas = mesh.face_gradient_operator(verts, faces)
    src = int(np.argmin(verts[:, 1] + verts[:, 2]))               # a vertex at one end of the scroll
    t_truth = mesh.geodesic_activation(verts, faces, src, CV)

    sensor_idx = np.sort(rng.choice(verts.shape[0], size=N_SENSORS, replace=False))
    sensor_t = t_truth[sensor_idx] + rng.normal(0.0, NOISE_MS, size=sensor_idx.shape)

    # classical baseline: 3D nearest/linear interpolation of the sparse LATs over the surface vertices
    t_lin = griddata(verts[sensor_idx], sensor_t, verts, method="nearest")

    g_torch = _sparse_torch(g_csr, device)
    areas_t = torch.tensor(areas, dtype=torch.float32, device=device).unsqueeze(1)
    sensor_idx_t = torch.tensor(sensor_idx, dtype=torch.long, device=device)
    src_t = torch.tensor([src], dtype=torch.long, device=device)
    t_sensors_norm = torch.tensor(sensor_t / T_REF, dtype=torch.float32, device=device).unsqueeze(1)

    phi_t = torch.tensor(phi, dtype=torch.float32, device=device)
    xyz_t = torch.tensor((verts - verts.mean(0)) / AMBIENT_SCALE, dtype=torch.float32, device=device)

    delta_net = MLP(K_EIG, 1, width=64, depth=5, activation="tanh").to(device)
    vanilla_net = MLP(3, 1, width=64, depth=5, activation="tanh").to(device)

    t_delta = _train(delta_net, phi_t, g_torch, areas_t, sensor_idx_t, t_sensors_norm, src_t, device, seed)
    t_vanilla = _train(vanilla_net, xyz_t, g_torch, areas_t, sensor_idx_t, t_sensors_norm, src_t, device, seed + 1)

    def rel_l2(p):
        return float(np.linalg.norm(p - t_truth) / np.linalg.norm(t_truth))

    metrics = {
        "rel_l2_delta_pinn": round(rel_l2(t_delta), 4),
        "rel_l2_vanilla_pinn": round(rel_l2(t_vanilla), 4),
        "rel_l2_interp": round(rel_l2(t_lin), 4),
        "n_eigenfunctions": int(K_EIG),
        "n_sensors": int(N_SENSORS),
    }

    sensors = np.concatenate([verts[sensor_idx], sensor_t[:, None]], axis=1)
    iso = list(np.linspace(float(t_truth.min()) + 4, float(t_truth.max()) - 2, 8))
    trace = build_mesh_field_trace(
        case_id=CASE_ID, view_kit="CardiacMeshKit", vertices=verts, triangles=faces,
        fields={
            "T_delta_pinn": t_delta, "T_vanilla_pinn": t_vanilla, "T_truth": t_truth, "T_interp": t_lin,
            "abs_err_delta": np.abs(t_delta - t_truth), "abs_err_vanilla": np.abs(t_vanilla - t_truth),
            "eig_1": phi[:, 0] * 50.0 + 50.0, "eig_2": phi[:, 1] * 50.0 + 50.0,
        },
        field_units={
            "T_delta_pinn": "ms", "T_vanilla_pinn": "ms", "T_truth": "ms", "T_interp": "ms",
            "abs_err_delta": "ms", "abs_err_vanilla": "ms", "eig_1": "a.u.", "eig_2": "a.u.",
        },
        sensors=sensors, isochrones_ms=iso, coord_nd=3,
        summary={k: metrics[k] for k in ("rel_l2_delta_pinn", "rel_l2_vanilla_pinn", "rel_l2_interp")},
    )
    return BakeResult(
        case_id=CASE_ID, trace=trace, metrics=metrics,
        params={"radius_mm": RADIUS_MM, "length_mm": LENGTH_MM, "n_grid": N_GRID, "k_eig": K_EIG, "cv": CV},
        onnx=None, web_drivable=False, flags=[],
    )


SPEC = CaseSpec(
    id=CASE_ID,
    title="PINNs on cardiac geometry (Delta-PINN)",
    category="electrophysiology-activation",
    system_type="activation-surface",
    view_kit="CardiacMeshKit",
    real_or_synthetic="synthetic-real-geometry",
    expected_band="the Delta-PINN (Laplace-Beltrami eigenbasis input) reconstructs the surface activation "
                  "more accurately than a vanilla (x, y, z) PINN under the same intrinsic Eikonal residual, and "
                  "than a smoothness-only 3D interpolation baseline, on the curved geometry",
    engine_desc="Delta-PINN vs vanilla PINN on a curved surface; intrinsic per-face Eikonal residual; geodesic ground truth",
    ladder={
        "classical": "3D interpolation of sparse LATs over the surface (ignores the manifold and the physics)",
        "sota": "physics-informed activation on the surface with the intrinsic Eikonal residual",
        "novel": "Delta-PINN: Laplace-Beltrami eigenfunction input encoding so the PINN respects the true geometry (Sahli Costabal et al. 2024)",
    },
    references=[
        {"cite": "Sahli Costabal, Pezzuto, Perdikaris (2024). Delta-PINNs: physics-informed neural networks on "
                 "complex geometries. Engineering Applications of AI 127", "doi_or_arxiv": "10.1016/j.engappai.2023.107324",
         "note": "the eigenfunction positional encoding reproduced here"},
        {"cite": "Crane, Weischedel, Wardetzky (2013). Geodesics in heat. ACM TOG 32(5)",
         "doi_or_arxiv": "10.1145/2516971.2516977", "note": "the heat-method geodesic ground truth"},
    ],
    build=_build,
    tags=["delta-pinn", "laplace-beltrami", "complex-geometry", "surface-eikonal", "sota-reproduction"],
)
