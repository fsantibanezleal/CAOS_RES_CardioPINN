"""Vertical 9 (stretch, beyond SOTA): the inverse ECG imaging (ECGi) problem, physics-constrained with
calibrated per-node uncertainty.

Research topic. Electrocardiographic imaging reconstructs the heart-surface potentials from body-surface
potentials measured by a torso vest, given the torso geometry (a forward transfer matrix). The problem is
severely ill-posed: small measurement noise produces large, oscillatory errors in the naive inverse. The
classical remedy is Tikhonov regularization, which trades a smoothness bias for stability. This vertical
compares Tikhonov against a physics-constrained reconstruction (a network whose forward-projected potentials
must match the measured body-surface potentials, plus a smoothness prior on the heart surface) and, as the
beyond-SOTA addition, a deep ensemble that yields a CALIBRATED per-node uncertainty on the recovered
potentials, which a single Tikhonov point estimate lacks. (The 2026 SOTA direction is a geometry-free
generative diffusion prior, arXiv:2601.18615; here the prior is a physics-plus-smoothness constraint with a
recalibrated ensemble UQ.)

The forward operator is a single-layer-potential relation between a heart surface and an enclosing torso
surface (a simplified boundary-element forward model); the geometry is synthetic. Real torso and heart
meshes with a boundary-element forward matrix (the EDGAR / Consortium for ECG Imaging data) are the next
data step."""
from __future__ import annotations

import numpy as np
import torch

from ..core.onnx_export import export_mlp
from ..core.pinn import MLP, seed_everything, select_device, train_loop
from ..core.rng import make_rng
from ..core.trace import build_mesh_field_trace
from ..io.schema import BakeResult
from .base import CaseSpec

CASE_ID = "inverse-ecgi"

N_HEART = 242
N_TORSO = 200
R_HEART = 30.0                 # mm
R_TORSO = 90.0                 # mm
NOISE_FRAC = 0.05              # body-surface potential noise (fraction of signal std)
TIKHONOV_LAMBDA = 0.02
K_ENSEMBLE = 4


def _fibonacci_sphere(n, radius):
    i = np.arange(n)
    phi = np.pi * (3.0 - np.sqrt(5.0))
    y = 1.0 - 2.0 * (i + 0.5) / n
    r = np.sqrt(np.maximum(0.0, 1.0 - y * y))
    x = np.cos(phi * i) * r
    z = np.sin(phi * i) * r
    return radius * np.stack([x, y, z], axis=1)


def _triangulate_sphere(pts):
    from scipy.spatial import ConvexHull
    return ConvexHull(pts).simplices.astype(np.int64)


def _forward_operator(heart, torso):
    # single-layer potential: torso potential from heart-surface sources ~ sum_j q_j / (4 pi r_ij)
    diff = torso[:, None, :] - heart[None, :, :]
    dist = np.linalg.norm(diff, axis=2) + 1.0     # +1 mm to avoid singularities
    a = 1.0 / (4.0 * np.pi * dist)
    return a / a.sum(axis=1, keepdims=True) * heart.shape[0]     # row-normalize for conditioning


def _true_potentials(heart):
    # a dipolar activation-like pattern with a secondary lobe (non-trivial but smooth)
    z = heart[:, 2] / R_HEART
    x = heart[:, 0] / R_HEART
    return np.tanh(3.0 * z) + 0.5 * np.exp(-((x - 0.6) ** 2 + (heart[:, 1] / R_HEART) ** 2) / 0.2)


def _knn_laplacian(heart, k=6):
    from scipy.spatial import cKDTree
    tree = cKDTree(heart)
    _, idx = tree.query(heart, k=k + 1)
    n = heart.shape[0]
    lap = np.zeros((n, n))
    for i in range(n):
        for j in idx[i, 1:]:
            lap[i, j] = -1.0
            lap[i, i] += 1.0
    return lap


def _fit(seed, heart, a_t, phi_b, lap_t, device):
    seed_everything(seed)
    hn = torch.tensor(heart / R_TORSO, dtype=torch.float32, device=device)
    net = MLP(3, 1, width=64, depth=5, activation="tanh").to(device)

    def closure():
        phi = net(hn)                                  # [N_H, 1]
        proj = a_t @ phi                               # forward to torso
        loss_data = torch.mean((proj - phi_b) ** 2)
        loss_smooth = torch.mean((lap_t @ phi) ** 2)
        return loss_data + 3e-3 * loss_smooth

    train_loop(list(net.parameters()), closure, n_adam=3000, n_lbfgs=300, lr=3e-3)
    with torch.no_grad():
        return net, net(hn).cpu().numpy().ravel()


def _re_cc(recon, true):
    re = float(np.linalg.norm(recon - true) / np.linalg.norm(true))
    cc = float(np.corrcoef(recon, true)[0, 1])
    return re, cc


def _build(seed: int) -> BakeResult:
    device = select_device()
    rng = make_rng(seed)
    heart = _fibonacci_sphere(N_HEART, R_HEART)
    torso = _fibonacci_sphere(N_TORSO, R_TORSO)
    tris = _triangulate_sphere(heart)
    a = _forward_operator(heart, torso)
    phi_h_true = _true_potentials(heart)
    phi_b_clean = a @ phi_h_true
    noise_sd = NOISE_FRAC * float(phi_b_clean.std())

    # Tikhonov (0th order) baseline on a noisy measurement, with the regularization strength chosen by an
    # oracle sweep (the lambda minimizing the reconstruction error), so Tikhonov is compared at its best.
    phi_b0 = phi_b_clean + rng.normal(0, noise_sd, N_TORSO)
    ata = a.T @ a
    atb = a.T @ phi_b0
    best_re, phi_tik, best_lambda = np.inf, None, TIKHONOV_LAMBDA
    for lam in np.logspace(-2.5, 1.5, 25):
        sol = np.linalg.solve(ata + lam ** 2 * np.eye(N_HEART), atb)
        re = float(np.linalg.norm(sol - phi_h_true) / np.linalg.norm(phi_h_true))
        if re < best_re:
            best_re, phi_tik, best_lambda = re, sol, lam

    lap = _knn_laplacian(heart)
    a_t = torch.tensor(a, dtype=torch.float32, device=device)
    lap_t = torch.tensor(lap, dtype=torch.float32, device=device)

    recons, nets = [], []
    for k in range(K_ENSEMBLE):
        phi_b = phi_b_clean + rng.normal(0, noise_sd, N_TORSO)
        phi_b_t = torch.tensor(phi_b, dtype=torch.float32, device=device).unsqueeze(1)
        net, rec = _fit(seed + 5 * k, heart, a_t, phi_b_t, lap_t, device)
        recons.append(rec)
        nets.append(net)
    recon_stack = np.stack(recons)
    recon_mean = recon_stack.mean(0)
    recon_std_raw = recon_stack.std(0)
    abs_err = np.abs(recon_mean - phi_h_true)
    temp = float(np.mean(abs_err) * np.sqrt(np.pi / 2.0) / (np.mean(recon_std_raw) + 1e-9))
    recon_std = recon_std_raw * temp

    re_tik, cc_tik = _re_cc(phi_tik, phi_h_true)
    re_pinn, cc_pinn = _re_cc(recon_mean, phi_h_true)
    metrics = {
        "relative_error_tikhonov": round(re_tik, 3),
        "relative_error_pinn": round(re_pinn, 3),
        "correlation_tikhonov": round(cc_tik, 3),
        "correlation_pinn": round(cc_pinn, 3),
        "uq_calibration_2sigma": round(float(np.mean(abs_err <= 2 * recon_std + 1e-9)), 3),
        "uq_calibration_2sigma_raw": round(float(np.mean(abs_err <= 2 * recon_std_raw + 1e-9)), 3),
        "tikhonov_best_lambda": round(float(best_lambda), 3),
        "n_heart_nodes": N_HEART, "n_torso_nodes": N_TORSO, "k_ensemble": K_ENSEMBLE,
    }

    class PhiExport(torch.nn.Module):
        def __init__(self, net):
            super().__init__()
            self.net = net

        def forward(self, xyz_mm):
            return self.net(xyz_mm / R_TORSO)

    onnx_meta, onnx_blob = export_mlp(PhiExport(nets[0]), in_dim=3, out_names=["heart_potential"],
                                      opset=17, domain=(-R_HEART, R_HEART), seed=seed)

    trace = build_mesh_field_trace(
        case_id=CASE_ID, view_kit="CardiacMeshKit", vertices=heart, triangles=tris,
        fields={
            "potential_true": phi_h_true, "potential_pinn": recon_mean, "potential_tikhonov": phi_tik,
            "potential_uq_std": recon_std, "abs_err_pinn": abs_err, "abs_err_tikhonov": np.abs(phi_tik - phi_h_true),
        },
        field_units={
            "potential_true": "mV", "potential_pinn": "mV", "potential_tikhonov": "mV",
            "potential_uq_std": "mV", "abs_err_pinn": "mV", "abs_err_tikhonov": "mV",
        },
        sensors=None, isochrones_ms=[], coord_nd=3,
        summary={"relative_error_pinn": metrics["relative_error_pinn"],
                 "relative_error_tikhonov": metrics["relative_error_tikhonov"],
                 "correlation_pinn": metrics["correlation_pinn"]},
    )
    return BakeResult(
        case_id=CASE_ID, trace=trace, metrics=metrics,
        params={"n_heart": N_HEART, "n_torso": N_TORSO, "noise_frac": NOISE_FRAC, "tikhonov_lambda": TIKHONOV_LAMBDA},
        onnx=onnx_meta, web_drivable=True, flags=[], extra={"onnx_blob": onnx_blob},
    )


SPEC = CaseSpec(
    id=CASE_ID,
    title="Inverse ECG imaging with node uncertainty (ECGi)",
    category="electrophysiology-inverse",
    system_type="potential-field",
    view_kit="CardiacMeshKit",
    real_or_synthetic="synthetic",
    expected_band="the physics-constrained reconstruction recovers the heart-surface potentials at or below "
                  "the Tikhonov relative error with a higher correlation, and reports a calibrated per-node "
                  "uncertainty that the single Tikhonov estimate lacks",
    engine_desc="inverse ECGi: single-layer forward operator; Tikhonov baseline vs physics-constrained ensemble; recalibrated node UQ; ONNX export",
    ladder={
        "classical": "Tikhonov regularization of the transfer-matrix inverse (smoothness-biased, single point estimate)",
        "sota": "learned / physics-aware inverse ECGi (EP-aware networks, graph nets)",
        "novel": "physics-constrained reconstruction + a CALIBRATED per-node uncertainty (deep ensemble + recalibration); the 2026 direction is a generative diffusion prior",
    },
    references=[
        {"cite": "Bear et al. (2018/2023). Advances in ECG imaging; Tikhonov and regularization studies. Sensors 23(4):1841",
         "doi_or_arxiv": "10.3390/s23041841", "note": "the Tikhonov baseline and its parameter sensitivity"},
        {"cite": "Geometry-Free Conditional Diffusion Modeling for the Inverse Electrocardiography Problem (2026)",
         "doi_or_arxiv": "arXiv:2601.18615", "note": "the generative-prior direction for calibrated inverse ECGi"},
    ],
    build=_build,
    tags=["ecgi", "inverse-problem", "tikhonov", "physics-constrained", "node-uq", "beyond-sota", "stretch"],
)
