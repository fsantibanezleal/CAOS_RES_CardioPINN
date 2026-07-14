"""The INGESTION data contract (ADR-0057 Contract 1): the schema, units, expected ranges and outlier policy of
the RAW inputs the offline pipeline reads. This is the bring-your-own-data contract: to run CardioPINN on your
own recording, it must satisfy the checks here. The raw data itself is gitignored (data-use agreements); this
module documents and validates its SHAPE, not its content.

Two input families, one per case:
  - ECGi (EDGAR): simultaneous body-surface and heart-surface potentials + the two electrode geometries.
  - 4D-flow: a Philips phase-contrast DICOM series (magnitude + 3 velocity encodings) + the venc.

The checks are intentionally cheap and explicit so a malformed input fails LOUDLY at ingest, not silently
downstream. They are used by the loaders (ecgi_catalogue, flow4d_dicom) and can be called directly."""
from __future__ import annotations

import numpy as np

# ---- ECGi (EDGAR) input contract ---------------------------------------------------------------------------

ECGI_CONTRACT = {
    "body_potentials": {"dtype": "float", "shape": "(n_body_electrodes, n_time_frames)", "units": "mV (relative)",
                        "n_body_electrodes": "40..256 (per lab: Utah 192, Maastricht 140)",
                        "n_time_frames": ">= 100 samples over the beat"},
    "heart_potentials": {"dtype": "float", "shape": "(n_heart_nodes, n_time_frames)", "units": "mV (relative)",
                        "n_heart_nodes": "100..2000 (per lab: Utah 256 cage, Maastricht 1321 epicardium)",
                        "role": "the GOLD STANDARD, recorded simultaneously; never seen by the inverse, only for scoring"},
    "body_geometry": {"node": "(n_body_electrodes, 3) mm", "face": "(m, 3) triangle indices"},
    "heart_geometry": {"node": "(n_heart_nodes, 3) mm", "face": "(m, 3) triangle indices"},
    "outlier_policy": "time frames or leads containing NaN are DROPPED (a bad-lead flag); a BEM forward operator "
                      "requires closed 2-manifold surfaces, so an open sock or an unreadable transfer matrix is "
                      "rejected (that dataset falls back to the single-layer operator or is excluded with a reason).",
}


def check_ecgi(body_p: np.ndarray, heart_p: np.ndarray, body_n: np.ndarray, heart_n: np.ndarray) -> dict:
    """Validate an ECGi input tuple against ECGI_CONTRACT. Returns a report dict; raises ValueError on a hard
    violation (wrong rank, mismatched time axis, degenerate geometry)."""
    if body_p.ndim != 2 or heart_p.ndim != 2:
        raise ValueError(f"potentials must be 2D (electrodes x time); got {body_p.shape}, {heart_p.shape}")
    if body_p.shape[1] != heart_p.shape[1]:
        raise ValueError(f"body/heart time axes differ: {body_p.shape[1]} vs {heart_p.shape[1]} (must be simultaneous)")
    if body_n.shape[0] != body_p.shape[0] or heart_n.shape[0] != heart_p.shape[0]:
        raise ValueError("geometry node count must match the electrode/node count of its potentials")
    for name, g in (("body", body_n), ("heart", heart_n)):
        if g.ndim != 2 or g.shape[1] != 3:
            raise ValueError(f"{name} geometry must be (n, 3) mm; got {g.shape}")
    nan_frames = int(np.any(np.isnan(body_p), 0).sum() + np.any(np.isnan(heart_p), 0).sum())
    return {"ok": True, "n_body": int(body_p.shape[0]), "n_heart": int(heart_p.shape[0]),
            "n_time_frames": int(body_p.shape[1]), "nan_frames_flagged": nan_frames}


# ---- 4D-flow input contract --------------------------------------------------------------------------------

FLOW4D_CONTRACT = {
    "series": "a Philips phase-contrast DICOM series: 1 magnitude image + 3 velocity encodings (RL, AP, FH) per "
              "(slice, cardiac frame)",
    "velocity_rescale": "velocity_cm_s = (RescaleSlope*px + RescaleIntercept)/4096 * venc; the full rescaled "
                        "range spans plus/minus the venc",
    "venc_cm_s": {"typical": 120, "note": "speeds above the venc phase-wrap and are unwrapped by 2*venc"},
    "voxel_units": "positions m (from ImagePositionPatient/ImageOrientationPatient/PixelSpacing); velocity m/s",
    "geometry": "the lumen is segmented from the pulsatile flow (peak-speed threshold, largest connected "
                "component); a provided STL of a different subject is NOT co-registered and is not used",
    "outlier_policy": "phase-wrapped voxels are detected against a robust (median-filtered) local estimate and "
                      "unwrapped by 2*venc BEFORE reconstruction; NaN/Inf voxels are excluded from the lumen.",
}


def check_flow4d(coords_m: np.ndarray, vel_ms: np.ndarray, venc_cm_s: float) -> dict:
    """Validate a decoded 4D-flow field. coords_m [N,3] m, vel_ms [T,N,3] m/s. Raises on a hard violation."""
    if coords_m.ndim != 2 or coords_m.shape[1] != 3:
        raise ValueError(f"coords must be (N, 3) m; got {coords_m.shape}")
    if vel_ms.ndim != 3 or vel_ms.shape[2] != 3 or vel_ms.shape[1] != coords_m.shape[0]:
        raise ValueError(f"velocity must be (T, N, 3) m/s aligned to coords; got {vel_ms.shape}")
    if not (10.0 <= venc_cm_s <= 600.0):
        raise ValueError(f"venc {venc_cm_s} cm/s outside a plausible cardiovascular range")
    peak = float(np.linalg.norm(vel_ms, axis=2).max())
    return {"ok": True, "n_voxels": int(coords_m.shape[0]), "n_frames": int(vel_ms.shape[0]),
            "peak_speed_ms": round(peak, 3), "venc_ms": round(venc_cm_s / 100.0, 3),
            "aliased_above_venc": bool(peak > venc_cm_s / 100.0)}
