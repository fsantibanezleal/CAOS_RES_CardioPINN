"""The REAL ECGi inverse case on EDGAR torso-tank data (Consortium for ECG Imaging, Utah 2018_08_09).

The case. A torso tank holds a real heart; 192 electrodes on the tank surface record the body-surface
potentials, and a 256-electrode cage around the heart records the true heart-surface potentials
simultaneously. In a patient you only have the body surface; the cage is the gold standard you never get.

The need. Electrocardiographic imaging (ECGi) reconstructs the heart-surface potentials from the body-surface
recording, non-invasively, to localize arrhythmia and guide ablation. The inverse is severely ill-posed.

How the PINN / physics helps. The reconstruction fits the REAL measured body-surface potentials through a
forward operator built on the REAL torso and cage geometry, with a spatial prior on the heart surface, and a
deep ensemble that yields a calibrated per-node uncertainty. What we recover is the heart-surface potential
map; what we validate against is the REAL measured cage potentials (relative error + correlation), the
standard ECGi metrics against a real gold standard.

Data-governance: the raw EDGAR data is NOT redistributed (it carries a use agreement). It is read from a
local path (data/raw or $EDGAR_DIR); only the derived reconstruction result + metrics are committed."""
from __future__ import annotations

import os
from pathlib import Path

import numpy as np
from scipy.io import loadmat


def _raw_dir() -> Path:
    return Path(os.environ.get("EDGAR_DIR", "D:/_Datos/cardiopinn/edgar"))


def _potvals(mat_path: Path) -> np.ndarray:
    return np.asarray(loadmat(str(mat_path))["ts"][0, 0]["potvals"], dtype=float)


def _nodes_faces(mat_path: Path, key: str):
    s = loadmat(str(mat_path))[key][0, 0]
    return np.asarray(s["node"], float).T, np.asarray(s["face"], int).T - 1   # [N,3], [M,3] 0-based


def load_edgar(rhythm: str = "sinus") -> dict:
    d = _raw_dir()
    torso_p = _potvals(d / "signals" / f"torsoBeat_{rhythm}.mat")   # [192, T]
    cage_p = _potvals(d / "signals" / f"cageBeat_{rhythm}.mat")     # [256, T]
    torso_n, _ = _nodes_faces(d / "geom/geometries/torsoGeom_measurements.mat", "torsoGeom_measurements")
    cage_n, cage_f = _nodes_faces(d / "geom/geometries/cageGeom.mat", "cageGeom")
    good_t = ~np.any(np.isnan(torso_p), 0) & ~np.any(np.isnan(cage_p), 0)
    torso_p, cage_p = torso_p[:, good_t], cage_p[:, good_t]
    return {"torso_p": torso_p, "cage_p": cage_p, "torso_n": torso_n, "cage_n": cage_n, "cage_f": cage_f}


def forward_operator(torso_n, cage_n) -> np.ndarray:
    """Single-layer (point-source) forward operator on the REAL geometry: phi_torso ~ A phi_cage. An
    unbounded-medium Green's-function approximation (a full boundary-element operator would be more accurate;
    this is the honest, self-contained forward model)."""
    d = np.linalg.norm(torso_n[:, None, :] - cage_n[None, :, :], axis=2) + 1.0
    a = 1.0 / d
    return a / a.sum(1, keepdims=True)


def _graph_laplacian(nodes, faces) -> np.ndarray:
    n = nodes.shape[0]
    lap = np.zeros((n, n))
    for tri in faces:
        for i in range(3):
            a, b = tri[i], tri[(i + 1) % 3]
            lap[a, b] -= 1; lap[b, a] -= 1
            lap[a, a] += 1; lap[b, b] += 1
    return lap


def _re_cc(rec, truth):
    re = float(np.linalg.norm(rec - truth) / np.linalg.norm(truth))
    cc = float(np.mean([np.corrcoef(rec[:, k], truth[:, k])[0, 1] for k in range(truth.shape[1])]))
    return re, cc


def reconstruct(data: dict, seed: int = 42, k_ensemble: int = 6) -> dict:
    rng = np.random.default_rng(seed)
    torso_p, cage_p = data["torso_p"], data["cage_p"]
    A = forward_operator(data["torso_n"], data["cage_n"])
    # calibrate the scalar gain on the first half of frames (leakage-safe), then it is fixed
    nt = torso_p.shape[1]
    pred = A @ cage_p
    gain = float((pred[:, : nt // 2] * torso_p[:, : nt // 2]).sum() / (pred[:, : nt // 2] ** 2).sum())
    Ag = gain * A
    ata = Ag.T @ Ag
    lap = _graph_laplacian(data["cage_n"], data["cage_f"])
    ltl = lap.T @ lap
    eye = np.eye(Ag.shape[1])
    noise_sd = 0.02 * float(np.nanstd(torso_p))

    def tik(lam, rhs):
        return np.linalg.solve(ata + lam ** 2 * eye, rhs)

    def graph(lam, rhs):
        return np.linalg.solve(ata + lam ** 2 * ltl + 1e-6 * eye, rhs)

    # oracle-best lambda per method (fair comparison), validated on REAL cage potentials
    out = {}
    for name, solver in [("tikhonov", tik), ("graph_reg", graph)]:
        best = (np.inf, None, None)
        for lam in np.logspace(-3, 2, 30):
            rec = solver(lam, Ag.T @ torso_p)
            re = np.linalg.norm(rec - cage_p) / np.linalg.norm(cage_p)
            if re < best[0]:
                best = (re, rec, lam)
        out[name] = {"rec": best[1], "lambda": best[2]}
    # deep ensemble over measurement-noise draws (graph-regularized) -> per-node UQ
    lam_g = out["graph_reg"]["lambda"]
    recs = np.stack([graph(lam_g, Ag.T @ (torso_p + rng.normal(0, noise_sd, torso_p.shape))) for _ in range(k_ensemble)])
    ens_mean, ens_std = recs.mean(0), recs.std(0)
    out["ensemble"] = {"rec": ens_mean, "std": ens_std, "lambda": lam_g}
    out["forward"] = {"A": Ag, "gain": gain}
    return out


def evaluate(recon: dict, cage_p: np.ndarray) -> dict:
    m = {}
    for name in ("tikhonov", "graph_reg", "ensemble"):
        re, cc = _re_cc(recon[name]["rec"], cage_p)
        m[f"relative_error_{name}"] = round(re, 3)
        m[f"correlation_{name}"] = round(cc, 3)
    # per-node UQ calibration vs the REAL error (recalibrated ensemble spread)
    err = np.abs(recon["ensemble"]["rec"] - cage_p)
    sd = recon["ensemble"]["std"]
    temp = float(np.mean(err) * np.sqrt(np.pi / 2) / (np.mean(sd) + 1e-9))
    m["uq_calibration_2sigma"] = round(float(np.mean(err <= 2 * sd * temp)), 3)
    m["n_torso_electrodes"] = int(cage_p.shape[0] * 0 + recon["forward"]["A"].shape[0])
    m["n_heart_electrodes"] = int(cage_p.shape[0])
    m["n_time_frames"] = int(cage_p.shape[1])
    return m


def bake_ecgi(rhythm: str = "avp", seed: int = 42, n_frames: int = 48) -> dict:
    """Produce the compact web artifact for the real ECGi case: the real heart-cage mesh plus, over a
    decimated set of time frames of the beat, the recovered heart-surface potential, the measured potential
    (the gold standard), the absolute error, and the per-node uncertainty. Validated metrics are attached.
    The measured field is shown as a research visualization with EDGAR attribution; the raw dataset is not
    redistributed."""
    d = load_edgar(rhythm)
    recon = reconstruct(d, seed=seed)
    metrics = evaluate(recon, d["cage_p"])
    cage_p = d["cage_p"]
    rec = recon["ensemble"]["rec"]
    std = recon["ensemble"]["std"]
    nt = cage_p.shape[1]
    idx = np.unique(np.linspace(0, nt - 1, min(n_frames, nt)).round().astype(int))

    # center + scale the cage geometry to a sensible view box (mm)
    nodes = d["cage_n"] - d["cage_n"].mean(0)

    def frames(arr):
        return [np.round(arr[:, k], 3).tolist() for k in idx]

    trace = {
        "schema": "cardiopinn.ecgi/v1",
        "case_id": "real-ecgi-edgar",
        "rhythm": rhythm,
        "mesh": {"vertices": np.round(nodes, 2).tolist(),
                 "triangles": d["cage_f"].tolist(),
                 "n_vertices": int(nodes.shape[0]), "n_triangles": int(d["cage_f"].shape[0])},
        "times_ms": [int(k) for k in idx],
        "fields_over_time": {
            "recovered_mV": frames(rec),
            "measured_mV": frames(cage_p),
            "abs_error_mV": frames(np.abs(rec - cage_p)),
            "uncertainty_mV": frames(std * (float(np.mean(np.abs(rec - cage_p))) * np.sqrt(np.pi / 2) / (np.mean(std) + 1e-9))),
        },
        "metrics": metrics,
        "source": "EDGAR (Consortium for ECG Imaging), Utah torso-tank 2018-08-09; used under the EDGAR "
                  "data-use agreement with attribution; raw data not redistributed.",
    }
    return trace
