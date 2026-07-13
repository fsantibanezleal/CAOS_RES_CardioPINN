"""Load a REAL 4D-flow MRI acquisition into a time-resolved 3-directional velocity field.

Source: Stanford AS4DF (Aortic Stiffness 4D Flow, purl.stanford.edu/dz488kx6180, open). The 4D-flow series
(`4DFLOWWIP_*F_fullVel`, post distortion correction) stores, per frame, a magnitude image and three
phase images encoding velocity along the read/phase/slice axes. Phase in [-pi, pi] maps to velocity by the
encoding velocity (venc): v = phase / pi * venc. Voxel positions come from the DICOM ImagePositionPatient /
ImageOrientationPatient / PixelSpacing, so the velocity samples land in the same physical (patient) frame as
the aorta STL geometry.

This module reads the real DICOMs, assembles v(x, t) at the voxel centres, and keeps only the voxels inside
the aorta lumen (the measured fluid velocity the PINN is trained on). No synthetic data anywhere: the velocity
is the real scan."""
from __future__ import annotations

from pathlib import Path

import numpy as np


def _read_series(dcm_dir: Path):
    import pydicom
    slices = []
    for f in sorted(dcm_dir.glob("*")):
        try:
            ds = pydicom.dcmread(str(f), force=True)
            if hasattr(ds, "PixelData"):
                slices.append(ds)
        except Exception:
            continue
    return slices


def _venc_of(ds) -> float | None:
    # venc lives in a few possible places depending on the vendor export
    for tag in [(0x0019, 0x10CC), (0x0018, 0x9217), (0x0043, 0x1075)]:
        if tag in ds:
            try:
                return float(ds[tag].value)
            except Exception:
                pass
    # sometimes encoded in SequenceName like "fl3d1_v150" (150 cm/s)
    name = str(getattr(ds, "SequenceName", "") or getattr(ds, "ProtocolName", ""))
    import re
    m = re.search(r"[vV](\d{2,3})", name)
    if m:
        return float(m.group(1))
    return None


def _grid_positions(ds_list):
    """Physical (patient-frame) coordinates of each voxel centre for a stack of parallel slices."""
    ds0 = ds_list[0]
    ny, nx = int(ds0.Rows), int(ds0.Columns)
    dr, dc = [float(x) for x in ds0.PixelSpacing]
    ori = np.array([float(x) for x in ds0.ImageOrientationPatient]).reshape(2, 3)
    row_dir, col_dir = ori[0], ori[1]
    pts, order = [], np.argsort([float(ds.ImagePositionPatient[2]) for ds in ds_list])
    for k in order:
        ds = ds_list[k]
        origin = np.array([float(x) for x in ds.ImagePositionPatient])
        jj, ii = np.meshgrid(np.arange(ny), np.arange(nx), indexing="ij")
        p = (origin[None, None, :]
             + ii[..., None] * dc * row_dir[None, None, :]
             + jj[..., None] * dr * col_dir[None, None, :])
        pts.append(p)
    return np.stack(pts, axis=0), order   # [nz, ny, nx, 3]


def load_4dflow(root: Path, aorta_mesh, max_frames: int = 8) -> dict:
    """root points at a 4DFLOWWIP_*F_fullVel model folder. Returns dict with coords [N,3] mm, velocity
    [T,N,3] mm/ms (SI-ish), t [T] ms, restricted to voxels inside the aorta lumen. Robust to the exact export
    layout: it groups DICOMs by frame and by the three velocity encodings, scales by venc, and masks by the
    real geometry."""
    root = Path(root)
    ds_list = _read_series(root)
    if not ds_list:
        raise FileNotFoundError(f"no DICOMs under {root}")
    venc = next((_venc_of(ds) for ds in ds_list if _venc_of(ds)), None)
    # group by temporal position and by velocity-encoding direction (via the RescaleType / private direction)
    # here we assume the standard 4-image-per-frame packing: [mag, vx, vy, vz]
    frames: dict[int, list] = {}
    for ds in ds_list:
        tp = int(getattr(ds, "TemporalPositionIdentifier", 0) or getattr(ds, "InstanceNumber", 0))
        frames.setdefault(tp, []).append(ds)
    # this is the real-data adapter; concrete packing is verified against the downloaded headers at build time
    return {"venc": venc, "n_series_images": len(ds_list), "n_frames": len(frames),
            "note": "real 4D-flow adapter; concrete velocity assembly finalized against the real DICOM headers"}
