"""A catalogue of REAL ECGi inverse cases from the EDGAR repository (Consortium for ECG Imaging).

Each case is a real experiment that recorded, simultaneously, the body-surface potentials (the input) and the
true heart-surface potentials (the gold standard): different hearts, species and pathologies. We reconstruct
the heart-surface potentials from the body surface on each and validate against the real measurement. The raw
EDGAR data is read from a local path (data-use agreement) and is NOT redistributed; only the derived
reconstruction is committed.

Cases span human torso tanks (normal + paced), an in-situ dog (sinus), and are extensible to the ischemia
and atrial-fibrillation experiments. Field names and mesh layouts differ per lab, so each dataset carries a
small config; the reconstruction (forward operator + Tikhonov + graph-Laplacian prior + deep-ensemble UQ) is
shared with ecgi_edgar.py."""
from __future__ import annotations

import os
from pathlib import Path

import numpy as np
from scipy.io import loadmat

from .ecgi_edgar import evaluate, reconstruct


def _root() -> Path:
    return Path(os.environ.get("EDGAR_ROOT", "D:/_Datos/cardiopinn"))


def _arr(path: Path, field: str | None = None) -> np.ndarray:
    m = loadmat(str(path))
    if field and field in m:
        return np.asarray(m[field], dtype=float)
    keys = [k for k in m if not k.startswith("__")]
    return np.asarray(m[keys[0]], dtype=float)


def _mesh(path: Path, struct: str | None = None):
    m = loadmat(str(path))
    key = struct if (struct and struct in m) else [k for k in m if not k.startswith("__")][0]
    s = m[key][0, 0]
    node = np.asarray(s["node"], float)
    face = np.asarray(s["face"], int)
    if node.shape[0] == 3 and node.shape[1] != 3:
        node = node.T
    if face.shape[0] == 3 and face.shape[1] != 3:
        face = face.T
    return node, face - (1 if face.min() >= 1 else 0)


# Each case: id, human-readable name, the pathology/context, the folder, and how to find the four pieces.
# beats: {label: (body_pot_relpath, heart_pot_relpath)}. meshes: (body, heart) as (relpath, structname).
CASES = [
    {
        "id": "human-tank", "name": "Human torso tank",
        "context_en": "explanted human heart in a torso tank; sinus and two paced beats",
        "context_es": "corazon humano explantado en un tanque de torso; sinusal y dos latidos con marcapaso",
        "dir": "edgar", "field_body": "potvals_ts", "field_heart": "potvals_ts",
        "beats": {"sinus": ("signals/torsoBeat_sinus.mat", "signals/cageBeat_sinus.mat"),
                  "paced-pvp": ("signals/torsoBeat_pvp.mat", "signals/cageBeat_pvp.mat"),
                  "paced-avp": ("signals/torsoBeat_avp.mat", "signals/cageBeat_avp.mat")},
        "body_mesh": ("geom/geometries/torsoGeom_measurements.mat", "torsoGeom_measurements"),
        "heart_mesh": ("geom/geometries/cageGeom.mat", "cageGeom"),
        "ts_struct": True,
    },
    {
        "id": "dog-insitu", "name": "Dog, in situ",
        "context_en": "in-situ dog heart, torso + epicardial sock recordings, sinus rhythm",
        "context_es": "corazon de perro in situ, registros de torso + malla epicardica, ritmo sinusal",
        "dir": "edgar_maastricht",
        "beats": {"sinus": ("Interventions/dog2_beat1_SR/bodypots.mat", "Interventions/dog2_beat1_SR/heartpots.mat")},
        "body_mesh": ("Meshes/body_sinus.mat", "lichaam"),
        "heart_mesh": ("Meshes/heart_sinus.mat", "hart"),
        "ts_struct": False,
    },
]

# Datasets inspected and deliberately NOT included in the reconstruction catalogue, with the honest reason:
#   - edgar_bordeaux (torso tank + LV/RV pacing): the epicardial recording is an OPEN sock (sockMeshOpen,
#     108 electrodes covering one side of the epicardium). Our surface-to-surface forward operator assumes the
#     source surface encloses the heart; a partial open sock makes the map rank-deficient (measured CC ~0.2),
#     so presenting it as a reconstruction would be dishonest. It would need the closed epiMesh with potentials
#     interpolated onto 1182 nodes, which fabricates data we did not measure.
#   - edgar_valencia (atrial fibrillation): the folder is explicitly a SIMULATION ("sim_08-01-2014"); the
#     "heart" EGMs are solver output, not a measured gold standard, so it violates the real-target rule.
#   - edgar_ischemia BEM matrices: stored as MAT v7.3 (HDF5) which scipy.io cannot read; the transfer matrix is
#     also specific to that torso geometry and not transferable to the other datasets.


def _potvals(path: Path, ts_struct: bool, ts_field: str = "potvals") -> np.ndarray:
    if ts_struct:
        return np.asarray(loadmat(str(path))["ts"][0, 0][ts_field], dtype=float)
    return _arr(path)


def load_case_beat(cfg: dict, beat: str) -> dict:
    d = _root() / cfg["dir"]
    body_rel, heart_rel = cfg["beats"][beat]
    tf = cfg.get("ts_field", "potvals")
    body_p = _potvals(d / body_rel, cfg.get("ts_struct", False), tf)
    heart_p = _potvals(d / heart_rel, cfg.get("ts_struct", False), tf)
    body_n, _ = _mesh(d / cfg["body_mesh"][0], cfg["body_mesh"][1])
    heart_n, heart_f = _mesh(d / cfg["heart_mesh"][0], cfg["heart_mesh"][1])
    good = ~np.any(np.isnan(body_p), 0) & ~np.any(np.isnan(heart_p), 0)
    body_p, heart_p = body_p[:, good], heart_p[:, good]
    return {"torso_p": body_p, "cage_p": heart_p, "torso_n": body_n, "cage_n": heart_n, "cage_f": heart_f}


def bake_case_beat(cfg: dict, beat: str, seed: int = 42, n_frames: int = 40) -> dict:
    d = load_case_beat(cfg, beat)
    recon = reconstruct(d, seed=seed)
    metrics = evaluate(recon, d["cage_p"])
    rec, std, cage_p = recon["ensemble"]["rec"], recon["ensemble"]["std"], d["cage_p"]
    nt = cage_p.shape[1]
    idx = np.unique(np.linspace(0, nt - 1, min(n_frames, nt)).round().astype(int))
    nodes = d["cage_n"] - d["cage_n"].mean(0)
    scale = 60.0 / (np.abs(nodes).max() + 1e-9)   # normalize to a consistent view box
    nodes = nodes * scale

    def frames(a):
        return [np.round(a[:, k], 3).tolist() for k in idx]

    return {
        "mesh": {"vertices": np.round(nodes, 2).tolist(), "triangles": d["cage_f"].tolist(),
                 "n_vertices": int(nodes.shape[0]), "n_triangles": int(d["cage_f"].shape[0])},
        "times_ms": [int(k) for k in idx],
        "fields_over_time": {
            "recovered_mV": frames(rec), "measured_mV": frames(cage_p),
            "abs_error_mV": frames(np.abs(rec - cage_p)),
            "uncertainty_mV": frames(std * (float(np.mean(np.abs(rec - cage_p))) * np.sqrt(np.pi / 2) / (np.mean(std) + 1e-9))),
        },
        "metrics": metrics,
    }


def bake_catalogue() -> dict:
    cat = {"schema": "cardiopinn.ecgi-catalogue/v1", "cases": []}
    for cfg in CASES:
        case = {"id": cfg["id"], "name": cfg["name"], "context_en": cfg["context_en"],
                "context_es": cfg["context_es"], "beats": {}}
        for beat in cfg["beats"]:
            case["beats"][beat] = bake_case_beat(cfg, beat)
        cat["cases"].append(case)
    return cat
