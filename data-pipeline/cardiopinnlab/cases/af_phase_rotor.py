"""Vertical 6 (beyond SOTA): atrial-fibrillation phase mapping and probabilistic rotor localization.

Research topic. During atrial fibrillation the excitation organizes into rotating spiral waves whose cores are
phase singularities (rotors), the targets of ablation. The classical pipeline (Hilbert-transform phase, then
phase-singularity detection by the topological charge around a loop) is noise-sensitive and returns a single
point. From sparse, noisy electrodes the rotor location is genuinely uncertain, so a single point is
misleading.

This vertical reconstructs the phase field from sparse noisy electrodes (interpolating the complex phasor so
the reconstruction respects the cyclic phase) and, with an ensemble over measurement-noise draws, produces a
PROBABILISTIC rotor-location heatmap plus a confidence radius, rather than a single point. The excitation is a
real Aliev-Panfilov reaction-diffusion spiral. This is the beyond-SOTA line for AF phase mapping: a
physics-grounded, uncertainty-aware rotor map. (The confirmed physics-informed work here is EP-PINNs, Herrero
Martin et al., Front. Cardiovasc. Med. 2022, and the fibrillatory PINN extension arXiv:2409.12712; the
confirmed learned phase-mapping / rotor work is a CNN, Lebert/Christoph, Front. Physiol. 2021. This vertical
combines a reaction-diffusion phase field with an explicit rotor-location uncertainty.)"""
from __future__ import annotations

import numpy as np

from ..core import baselines, geometry, reaction_diffusion
from ..core.rng import make_rng
from ..core.trace import build_mesh_field_trace
from ..io.schema import BakeResult
from .base import CaseSpec

CASE_ID = "af-phase-rotor"

N = 80
SIZE_MM = 60.0
STEPS = 3000
N_ELECTRODES = 220
NOISE = 0.10                 # phasor noise
K_ENSEMBLE = 6
MARGIN = 6                   # ignore boundary cells when locating the rotor


def _dominant_ps(charge: np.ndarray) -> tuple[int, int]:
    c = np.abs(charge).copy()
    c[:MARGIN, :] = 0
    c[-MARGIN:, :] = 0
    c[:, :MARGIN] = 0
    c[:, -MARGIN:] = 0
    idx = int(np.argmax(c))
    return np.unravel_index(idx, c.shape)      # (row, col) in the (n-1) charge grid


def _cell_to_mm(rc: tuple[int, int]) -> np.ndarray:
    dx = SIZE_MM / (N - 1)
    return np.array([(rc[1] + 0.5) * dx, (rc[0] + 0.5) * dx])


def _build(seed: int) -> BakeResult:
    rng = make_rng(seed)
    u, v = reaction_diffusion.aliev_panfilov_spiral(N, STEPS)
    phase = reaction_diffusion.phase_field(u, v)
    charge_true = reaction_diffusion.phase_singularities(phase)
    ps_true_rc = _dominant_ps(charge_true)
    ps_true = _cell_to_mm(ps_true_rc)

    verts, tris = geometry.make_grid_mesh(N, SIZE_MM)
    phase_flat = phase.ravel()
    cos_f, sin_f = np.cos(phase_flat), np.sin(phase_flat)
    elec = np.sort(rng.choice(verts.shape[0], size=N_ELECTRODES, replace=False))

    ps_locs = []
    recon_last = None
    heat = np.zeros((N - 1, N - 1))
    for _ in range(K_ENSEMBLE):
        cn = cos_f[elec] + rng.normal(0, NOISE, N_ELECTRODES)
        sn = sin_f[elec] + rng.normal(0, NOISE, N_ELECTRODES)
        cos_r, _ = baselines.gp_regress(verts[elec], cn, verts, 6.0, 1.0, NOISE)
        sin_r, _ = baselines.gp_regress(verts[elec], sn, verts, 6.0, 1.0, NOISE)
        phase_r = np.arctan2(sin_r, cos_r).reshape(N, N)
        ch_r = reaction_diffusion.phase_singularities(phase_r)
        rc = _dominant_ps(ch_r)
        ps_locs.append(_cell_to_mm(rc))
        heat[rc] += 1.0
        recon_last = phase_r.ravel()

    ps_locs = np.array(ps_locs)
    ps_mean = ps_locs.mean(0)
    ps_error = float(np.linalg.norm(ps_mean - ps_true))
    ps_radius = float(np.sqrt(np.mean(np.sum((ps_locs - ps_mean) ** 2, axis=1))))

    # blur the PS-count heatmap into a probabilistic rotor map on the vertex grid
    from scipy.ndimage import gaussian_filter
    heat_v = gaussian_filter(heat, sigma=2.0)
    heat_full = np.zeros((N, N))
    heat_full[:-1, :-1] = heat_v
    heat_full = heat_full / (heat_full.max() + 1e-9)

    metrics = {
        "rotor_loc_error_mm": round(ps_error, 2),
        "rotor_confidence_radius_mm": round(ps_radius, 2),
        "n_electrodes": N_ELECTRODES,
        "coverage_pct": round(100.0 * N_ELECTRODES / verts.shape[0], 1),
        "k_ensemble": K_ENSEMBLE,
    }

    charge_full = np.zeros((N, N))
    charge_full[:-1, :-1] = charge_true
    elec_sensors = np.concatenate([verts[elec], phase_flat[elec][:, None]], axis=1)
    trace = build_mesh_field_trace(
        case_id=CASE_ID, view_kit="CardiacMeshKit", vertices=verts, triangles=tris,
        fields={
            "potential_u": u.ravel(), "phase": phase_flat, "phase_recon": recon_last,
            "rotor_probability": heat_full.ravel(), "ps_charge_true": charge_full.ravel(),
        },
        field_units={
            "potential_u": "a.u.", "phase": "rad", "phase_recon": "rad",
            "rotor_probability": "prob", "ps_charge_true": "charge",
        },
        sensors=elec_sensors, isochrones_ms=[], coord_nd=2,
        summary={"rotor_loc_error_mm": metrics["rotor_loc_error_mm"],
                 "rotor_confidence_radius_mm": metrics["rotor_confidence_radius_mm"],
                 "coverage_pct": metrics["coverage_pct"]},
    )
    trace["rotor_true_mm"] = [round(float(ps_true[0]), 2), round(float(ps_true[1]), 2)]
    return BakeResult(
        case_id=CASE_ID, trace=trace, metrics=metrics,
        params={"size_mm": SIZE_MM, "n_grid": N, "steps": STEPS, "n_electrodes": N_ELECTRODES},
        onnx=None, web_drivable=False, flags=[],
    )


SPEC = CaseSpec(
    id=CASE_ID,
    title="AF phase mapping and probabilistic rotor localization",
    category="electrophysiology-fibrillation",
    system_type="phase-field",
    view_kit="CardiacMeshKit",
    real_or_synthetic="synthetic",
    expected_band="from sparse noisy electrodes the phase field of a reaction-diffusion spiral is reconstructed "
                  "and the rotor core is localized as a probability heatmap with a confidence radius, rather "
                  "than a single point",
    engine_desc="Aliev-Panfilov reaction-diffusion spiral; complex-phasor reconstruction from sparse electrodes; ensemble probabilistic rotor map",
    ladder={
        "classical": "Hilbert-transform phase + phase-singularity detection returning a single rotor point (noise-sensitive)",
        "sota": "physics-informed EP models of fibrillation (EP-PINNs) and learned rotor/phase mapping (deep networks)",
        "novel": "an uncertainty-aware rotor map: a probabilistic phase-singularity heatmap + a confidence radius from sparse noisy electrodes, not a single point",
    },
    references=[
        {"cite": "Herrero Martin et al. (2022). EP-PINNs: cardiac electrophysiology parameter estimation. "
                 "Frontiers in Cardiovascular Medicine 8:768419", "doi_or_arxiv": "10.3389/fcvm.2021.768419",
         "note": "physics-informed cardiac EP (monodomain Aliev-Panfilov)"},
        {"cite": "Lebert, Christoph et al. (2021). Rotor localization and phase mapping of cardiac excitation "
                 "waves using deep neural networks. Frontiers in Physiology 12:782176",
         "doi_or_arxiv": "10.3389/fphys.2021.782176", "note": "learned phase mapping / rotor localization (CNN)"},
        {"cite": "Aliev, Panfilov (1996). A simple two-variable model of cardiac excitation. Chaos, Solitons & "
                 "Fractals 7(3)", "doi_or_arxiv": "10.1016/0960-0779(95)00089-5", "note": "the reaction-diffusion model"},
    ],
    build=_build,
    tags=["atrial-fibrillation", "phase-mapping", "rotor", "phase-singularity", "reaction-diffusion", "uncertainty", "beyond-sota"],
)
