"""Load a REAL 4D-flow MRI acquisition into a time-resolved 3-directional velocity field.

Source: a real thoracic-aorta 4D-flow study (`4DFLOWWIP_16F_fullvel`, Philips, post distortion correction).
Per cardiac frame the scan stores a magnitude image (`WIP_fl3d1r3`) and three phase-contrast velocity images
encoding velocity along the patient RL, AP and FH axes (`WIP_f_v120rl / v120in / v120fh`, venc 120 cm/s). The
12-bit phase pixel maps to velocity through the DICOM rescale: velocity_cm/s = (slope*px + intercept)/4096 *
venc, i.e. the full rescaled range [-4096, 4096] spans [-venc, +venc]. Voxel centres come from
ImagePositionPatient / ImageOrientationPatient / PixelSpacing, so velocity samples and geometry share the
patient frame.

The aortic lumen is masked by the pulsatile-flow criterion standard in 4D-flow: a voxel belongs to the lumen
if its peak-over-the-cardiac-cycle speed exceeds a threshold (flowing blood), keeping the largest connected
component. No synthetic data anywhere; the velocity is the real scan, and the pressure the PINN later recovers
is never measured."""
from __future__ import annotations

from pathlib import Path

import numpy as np

CM_S_TO_MM_MS = 0.01   # 1 cm/s = 10 mm/s = 0.01 mm/ms

# Philips SequenceName -> role. The three velocity encodings map to the patient axes:
#   rl (right->left) = +x_L,  in (anterior->posterior, AP) = +y_P,  fh (foot->head) = +z_H.
_VEL_DIRS = {"v120rl": 0, "v120in": 1, "v120fh": 2}
_MAG = "fl3d1r3"


def _read_all(dcm_dir: Path):
    import pydicom
    out = []
    for f in sorted(Path(dcm_dir).glob("*")):
        try:
            ds = pydicom.dcmread(str(f), force=True)
            if hasattr(ds, "PixelData"):
                out.append(ds)
        except Exception:
            continue
    return out


def _role(ds):
    name = str(getattr(ds, "SequenceName", "") or "")
    if _MAG in name:
        return ("mag", None)
    for key, axis in _VEL_DIRS.items():
        if key in name:
            return ("vel", axis)
    return (None, None)


def _voxel_xyz(ds, ny, nx):
    dr, dc = [float(x) for x in ds.PixelSpacing]
    ori = np.array([float(x) for x in ds.ImageOrientationPatient]).reshape(2, 3)
    row_dir, col_dir = ori[0], ori[1]
    origin = np.array([float(x) for x in ds.ImagePositionPatient])
    jj, ii = np.meshgrid(np.arange(ny), np.arange(nx), indexing="ij")
    return origin[None, None, :] + ii[..., None] * dc * row_dir + jj[..., None] * dr * col_dir


def load_4dflow(root: Path, venc_cm_s: float = 120.0) -> dict:
    """Assemble the real 4D-flow field. Returns coords [Nvox,3] mm (patient frame), velocity [T,Nvox,3] mm/ms,
    times [T] ms, speed_peak [Nvox] mm/ms, and the (nz,ny,nx) grid shape. All voxels (unmasked) are returned;
    masking to the lumen is done by mask_lumen()."""
    ds_list = _read_all(root)
    if not ds_list:
        raise FileNotFoundError(f"no DICOMs under {root}")
    ny, nx = int(ds_list[0].Rows), int(ds_list[0].Columns)

    # index every image by (role/axis, slice-z, trigger-time)
    recs = []
    for ds in ds_list:
        role, axis = _role(ds)
        if role is None:
            continue
        recs.append((role, axis, round(float(ds.SliceLocation), 3),
                     round(float(getattr(ds, "TriggerTime", 0.0)), 3), ds))
    zs = sorted({r[2] for r in recs})
    ts = sorted({r[3] for r in recs})
    zi = {z: i for i, z in enumerate(zs)}
    ti = {t: i for i, t in enumerate(ts)}
    nz, nt = len(zs), len(ts)

    coords = np.zeros((nz, ny, nx, 3), np.float32)
    vel = np.zeros((nt, nz, ny, nx, 3), np.float32)
    have_pos = np.zeros(nz, bool)
    for role, axis, z, t, ds in recs:
        k = zi[z]
        if not have_pos[k]:
            coords[k] = _voxel_xyz(ds, ny, nx)
            have_pos[k] = True
        if role == "vel":
            px = ds.pixel_array.astype(np.float32)
            slope = float(getattr(ds, "RescaleSlope", 1.0))
            icpt = float(getattr(ds, "RescaleIntercept", 0.0))
            v_cm_s = (slope * px + icpt) / 4096.0 * venc_cm_s
            vel[ti[t], k, :, :, axis] = v_cm_s * CM_S_TO_MM_MS

    coords = coords.reshape(-1, 3)
    vel = vel.reshape(nt, -1, 3)
    speed_peak = np.linalg.norm(vel, axis=2).max(axis=0)
    return {"coords": coords, "velocity": vel, "times_ms": np.array(ts, np.float32),
            "speed_peak": speed_peak, "grid": (nz, ny, nx), "venc_cm_s": venc_cm_s}


def unwrap_aliasing(field: dict) -> dict:
    """Correct phase-wrap aliasing in the velocity: a phase-contrast component wraps when the true velocity
    exceeds the venc, appearing as a jump of 2*venc to the opposite sign. A voxel/component is flagged as
    aliased when it differs from a robust (median-filtered) local estimate by more than the venc, and is
    unwrapped by adding/subtracting 2*venc toward that local value. Returns a field with the corrected velocity
    and the count of corrected samples (0 if the scan has no aliasing in the lumen, as this one nearly does)."""
    from scipy import ndimage
    nz, ny, nx = field["grid"]
    nt = field["velocity"].shape[0]
    venc = field["venc_cm_s"] * CM_S_TO_MM_MS   # mm/ms (same units as velocity)
    vel = field["velocity"].reshape(nt, nz, ny, nx, 3).copy()
    corrected = 0
    for t in range(nt):
        for c in range(3):
            comp = vel[t, ..., c]
            ref = ndimage.median_filter(comp, size=3)
            for sign in (+1, -1):
                wrapped = (sign * (comp - ref)) > venc     # component sits ~2*venc away from its neighbours
                if wrapped.any():
                    comp[wrapped] -= sign * 2.0 * venc
                    corrected += int(wrapped.sum())
            vel[t, ..., c] = comp
    out = dict(field)
    out["velocity"] = vel.reshape(nt, -1, 3)
    out["speed_peak"] = np.linalg.norm(out["velocity"], axis=2).max(axis=0)
    out["aliasing_corrected_samples"] = corrected
    return out


def mask_lumen(field: dict, speed_thresh_cm_s: float = 12.0) -> np.ndarray:
    """Boolean mask over voxels: the aortic lumen = peak speed above threshold, largest connected component."""
    from scipy import ndimage
    nz, ny, nx = field["grid"]
    thr = speed_thresh_cm_s * CM_S_TO_MM_MS
    m = (field["speed_peak"] > thr).reshape(nz, ny, nx)
    lab, n = ndimage.label(m)
    if n == 0:
        return m.reshape(-1)
    sizes = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
    keep = int(np.argmax(sizes)) + 1
    m = (lab == keep)
    m = ndimage.binary_closing(m, iterations=1)
    return m.reshape(-1)
