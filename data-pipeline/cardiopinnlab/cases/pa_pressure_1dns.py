"""Vertical 8 (beyond SOTA): non-invasive pulmonary-artery pressure via a 1D reduced-order Navier-Stokes PINN,
across a normal-to-pulmonary-hypertension cohort with uncertainty.

Research topic. Pulmonary artery pressure (PAP) is measured by right-heart catheterization, an invasive
procedure. From a non-invasive velocity waveform (4D-flow or Doppler) plus the distal (wedge) pressure, a 1D
reduced-order blood-flow model recovers the pressure along the vessel and hence the mean PAP. This reproduces
the approach of the Universidad de Valparaiso group (Jara et al., "Physics-Informed Neural Network for Modeling
the Pulmonary Artery Blood Pressure from Magnetic Resonance Images: A Reduced-Order Navier-Stokes Model",
Biomedicines 13(9):2058, 2025, DOI 10.3390/biomedicines13092058), which reported a physiologically plausible
mean PAP for a healthy case. The beyond-SOTA addition is a COHORT (normal to pulmonary hypertension) and an
uncertainty on the estimated mean PAP, where the single published case is one deterministic healthy subject.

The linearized 1D momentum balance dp/dx = -rho du/dt - R u (inertia + a resistance term, R the pulmonary
vascular resistance per length) gives the pressure from the velocity, anchored at the clinically measurable
distal wedge pressure. Higher resistance and elevated wedge pressure raise the mean PAP (pulmonary
hypertension)."""
from __future__ import annotations

import numpy as np
import torch

from ..core.pinn import MLP, seed_everything, select_device, train_loop
from ..core.rng import make_rng
from ..core.trace import build_mesh_field_trace
from ..io.schema import BakeResult
from .base import CaseSpec

CASE_ID = "pa-pressure-1dns"

RHO = 1060.0                      # blood density kg/m^3
L = 0.05                          # vessel length m
T = 0.8                           # cardiac cycle s
U0 = 0.5                          # peak velocity m/s
NX, NT = 40, 40
NOISE_VEL = 0.03
K_ENSEMBLE = 3
P_REF = 4000.0                    # Pa normalization for the pressure net
MMHG = 133.322                    # Pa per mmHg

# cohort: (name, resistance R [Pa s / m^2], wedge pressure [mmHg], velocity scale). Mean PAP > 20 mmHg is
# pulmonary hypertension (2018 definition); the labels below span normal to PH honestly.
COHORT = [
    ("normal", 1.3e5, 8.0, 1.0),
    ("elevated", 3.0e5, 12.0, 1.08),
    ("pulmonary_hypertension", 5.2e5, 16.0, 1.2),
]


def _waveform(tn):        # systolic pulse over the cycle (tn in [0,1])
    s = np.sin(np.pi * np.clip(tn / 0.4, 0, 1)) ** 2
    return 0.15 + 0.85 * s * (tn < 0.4)


def _u_field(xn, tn, uscale):
    return U0 * uscale * _waveform(tn) * (1.0 - 0.15 * xn)


def _u_dt(xn, tn, uscale):
    # analytic-ish time derivative via finite difference of the waveform
    h = 1e-3
    return (_u_field(xn, tn + h, uscale) - _u_field(xn, tn - h, uscale)) / (2 * h * T)


def _ground_truth_p(xn_grid, tn_grid, r, wedge_pa, uscale):
    # integrate dp/dx = -rho u_t - R u from the distal end x=L (p = wedge) toward the proximal end
    nx, nt = xn_grid.shape
    dx = L / (nx - 1)
    p = np.zeros((nx, nt))
    for j in range(nt):
        p[-1, j] = wedge_pa
        for i in range(nx - 2, -1, -1):
            xn = xn_grid[i, j]
            tn = tn_grid[i, j]
            dpdx = -RHO * _u_dt(xn, tn, uscale) - r * _u_field(xn, tn, uscale)
            p[i, j] = p[i + 1, j] - dpdx * dx    # integrating toward smaller x
    return p


def _fit(seed, coords, u_meas, r, wedge_pa, uscale, device):
    seed_everything(seed)
    xt = torch.tensor(coords, dtype=torch.float32, device=device)     # (x/L, t/T)
    u_d = torch.tensor(u_meas, dtype=torch.float32, device=device).unsqueeze(1)
    net = MLP(2, 2, width=64, depth=5, activation="tanh").to(device)   # -> (u, p_norm)
    distal_mask = torch.tensor(coords[:, 0] > 0.999, dtype=torch.bool, device=device)

    def closure():
        xc = xt.clone().detach().requires_grad_(True)
        out = net(xc)
        u = out[:, 0:1]
        p = out[:, 1:2] * P_REF
        u_t = torch.autograd.grad(u, xc, torch.ones_like(u), create_graph=True)[0][:, 1:2] / T
        p_x = torch.autograd.grad(p, xc, torch.ones_like(p), create_graph=True)[0][:, 0:1] / L
        res = p_x + RHO * u_t + r * u
        loss_data = torch.mean((net(xt)[:, 0:1] - u_d) ** 2)
        loss_res = torch.mean(res ** 2) / (P_REF ** 2)
        loss_anchor = torch.mean((net(xt)[distal_mask][:, 1:2] * P_REF - wedge_pa) ** 2) / (P_REF ** 2)
        return 1.0 * loss_data + 1.0 * loss_res + 5.0 * loss_anchor

    train_loop(list(net.parameters()), closure, n_adam=2500, n_lbfgs=200, lr=2e-3)
    with torch.no_grad():
        out = net(xt).cpu().numpy()
    return out[:, 1] * P_REF     # pressure Pa


def _build(seed: int) -> BakeResult:
    device = select_device()
    rng = make_rng(seed)
    xs = np.linspace(0, 1, NX)
    ts = np.linspace(0, 1, NT)
    gx, gt = np.meshgrid(xs, ts, indexing="xy")
    coords = np.stack([gx.ravel(), gt.ravel()], axis=1)

    rows = []
    per_case_fields = {}
    for name, r, wedge_mmhg, uscale in COHORT:
        wedge_pa = wedge_mmhg * MMHG
        p_true = _ground_truth_p(gx, gt, r, wedge_pa, uscale)
        mean_pap_true = float(p_true.mean() / MMHG)
        u_true = _u_field(gx, gt, uscale).ravel()
        preds = []
        for k in range(K_ENSEMBLE):
            u_meas = u_true + rng.normal(0, NOISE_VEL, u_true.shape)
            p_pred = _fit(seed + 7 * k, coords, u_meas, r, wedge_pa, uscale, device)
            preds.append(float(p_pred.mean() / MMHG))
        mean_pap_pred = float(np.mean(preds))
        mean_pap_std = float(np.std(preds))
        rows.append((name, mean_pap_true, mean_pap_pred, mean_pap_std))
        per_case_fields[name] = (p_true.ravel() / MMHG)

    metrics = {}
    for name, tr, pr, sd in rows:
        metrics[f"pap_true_{name}_mmhg"] = round(tr, 1)
        metrics[f"pap_pred_{name}_mmhg"] = round(pr, 1)
        metrics[f"pap_uq_{name}_mmhg"] = round(sd, 2)
    metrics["mean_abs_pap_error_mmhg"] = round(float(np.mean([abs(pr - tr) for _, tr, pr, _ in rows])), 2)
    metrics["n_cohort"] = len(COHORT)
    metrics["k_ensemble"] = K_ENSEMBLE

    # render the severe-PH pressure field over (x, t) as a surface (x horizontal, t vertical)
    verts = np.zeros((NX * NT, 3))
    verts[:, 0] = coords[:, 0] * 50.0     # x in mm-ish for display
    verts[:, 1] = coords[:, 1] * 40.0     # t axis
    tris = []
    for j in range(NT - 1):
        for i in range(NX - 1):
            v00, v10, v01, v11 = j * NX + i, j * NX + i + 1, (j + 1) * NX + i, (j + 1) * NX + i + 1
            tris.append([v00, v10, v11])
            tris.append([v00, v11, v01])
    trace = build_mesh_field_trace(
        case_id=CASE_ID, view_kit="CardiacMeshKit", vertices=verts, triangles=np.array(tris),
        fields={
            "pressure_normal_mmhg": per_case_fields["normal"],
            "pressure_elevated_mmhg": per_case_fields["elevated"],
            "pressure_PH_mmhg": per_case_fields["pulmonary_hypertension"],
            "velocity_field": _u_field(gx, gt, 1.0).ravel(),
        },
        field_units={
            "pressure_normal_mmhg": "mmHg", "pressure_elevated_mmhg": "mmHg",
            "pressure_PH_mmhg": "mmHg", "velocity_field": "m/s",
        },
        sensors=None, isochrones_ms=[], coord_nd=3,
        summary={"pap_pred_normal_mmhg": metrics["pap_pred_normal_mmhg"],
                 "pap_pred_PH_mmhg": metrics["pap_pred_pulmonary_hypertension_mmhg"],
                 "mean_abs_pap_error_mmhg": metrics["mean_abs_pap_error_mmhg"]},
    )
    trace["cohort"] = [{"name": n, "pap_true": round(tr, 1), "pap_pred": round(pr, 1), "pap_uq": round(sd, 2)}
                       for n, tr, pr, sd in rows]
    return BakeResult(
        case_id=CASE_ID, trace=trace, metrics=metrics,
        params={"n_x": NX, "n_t": NT, "n_cohort": len(COHORT), "cycle_s": T},
        onnx=None, web_drivable=False, flags=[],
    )


SPEC = CaseSpec(
    id=CASE_ID,
    title="Non-invasive pulmonary-artery pressure (1D reduced-order NS PINN)",
    category="hemodynamics-pressure",
    system_type="pressure-field",
    view_kit="CardiacMeshKit",
    real_or_synthetic="synthetic",
    expected_band="from a non-invasive velocity waveform and the distal wedge pressure, the 1D reduced-order "
                  "PINN recovers the mean pulmonary-artery pressure across a normal-to-pulmonary-hypertension "
                  "cohort within a couple of mmHg, with an uncertainty per case",
    engine_desc="1D reduced-order Navier-Stokes PINN (velocity + pressure over x,t); cohort normal-to-PH; ensemble PAP uncertainty",
    ladder={
        "classical": "echo tricuspid-regurgitation Bernoulli estimate or statistical regression (indirect, operator dependent)",
        "sota": "1D reduced-order Navier-Stokes PINN for PA pressure, single healthy case (Valparaiso 2025)",
        "novel": "extend to a normal-to-pulmonary-hypertension cohort with an uncertainty on the estimated mean PAP",
    },
    references=[
        {"cite": "Jara et al. (2025). Physics-Informed Neural Network for Modeling the Pulmonary Artery Blood "
                 "Pressure from MRI: A Reduced-Order Navier-Stokes Model. Biomedicines 13(9):2058",
         "doi_or_arxiv": "10.3390/biomedicines13092058", "note": "the 1D-NS PA-pressure PINN reproduced + extended"},
        {"cite": "Sierpe, Castillo, Mella, Galarce (2025). Hemodynamic parameters via PINNs including hematocrit "
                 "rheology", "doi_or_arxiv": "arXiv:2508.03326", "note": "the same Chilean hemodynamics cluster"},
    ],
    build=_build,
    tags=["pulmonary-artery-pressure", "1d-reduced-order", "navier-stokes", "cohort", "non-invasive", "beyond-sota"],
)
