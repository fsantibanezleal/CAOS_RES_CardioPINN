# 02 · 4D-flow input contract (Philips phase-contrast DICOM)

The raw INPUT for the aortic-pressure case is a Philips 4D-flow MRI DICOM series: a directory of DICOM images
that together encode the time-resolved, three-directional blood velocity in the thoracic aorta. This page
specifies what that series must contain for the loader (`data-pipeline/cardiopinnlab/real/flow4d_dicom.py`) to
decode it into a velocity field, including the phase-to-velocity rescale, the voxel geometry, the lumen
segmentation, and the phase-wrap unwrap rule. The contract is codified as `FLOW4D_CONTRACT` / `check_flow4d()`
in `data-pipeline/cardiopinnlab/io/contract.py`. No pressure is ever an input; pressure is the field the
physics forces out of the measured velocity downstream.

## The series: one magnitude + three phase encodings per (slice, frame)

For each cardiac frame and slice the scan stores FOUR images, identified by the Philips `SequenceName` tag:

| Role | `SequenceName` contains | Meaning |
|---|---|---|
| Magnitude | `fl3d1r3` | anatomical magnitude (used for reference, not velocity) |
| Velocity RL | `v120rl` | phase-contrast velocity along patient right→left ($+x_L$) |
| Velocity AP | `v120in` | phase-contrast velocity anterior→posterior ($+y_P$) |
| Velocity FH | `v120fh` | phase-contrast velocity foot→head ($+z_H$) |

The three velocity encodings map to the patient axes 0, 1, 2 respectively (`_VEL_DIRS`). Any image whose
`SequenceName` matches none of these roles is skipped. The shipped study is `4DFLOWWIP_16F_fullvel` (Philips,
16 cardiac frames, post distortion correction), read from `AORTA4D_DIR`
(default `.../aorta4d/dicoms/m_c1/4DFLOWWIP_16F_fullvel/undistort_v`).

## venc and the phase-to-velocity rescale

The velocity encoding is `venc = 120 cm/s` (default `venc_cm_s = 120.0`). Each 12-bit phase pixel maps to a
signed velocity through the DICOM rescale slope and intercept, where the full rescaled range
$[-4096, +4096]$ spans $[-\text{venc}, +\text{venc}]$:

$$v_{\text{cm/s}} = \frac{\text{RescaleSlope}\cdot \text{px} + \text{RescaleIntercept}}{4096}\,\cdot\,\text{venc}$$

`RescaleSlope` and `RescaleIntercept` are read per image (defaults 1.0 and 0.0 if absent). The decoded velocity
is then converted to the pipeline unit by `CM_S_TO_MM_MS = 0.01`:

$$v_{\text{mm/ms}} = 0.01 \cdot v_{\text{cm/s}}$$

The stored velocity is therefore in mm/ms, which is NUMERICALLY EQUAL to m/s ($1\ \text{mm/ms} = 1\ \text{m/s}$),
so the downstream SI physics (density $\rho = 1060\ \text{kg/m}^3$, viscosity $\mu = 3.5\times10^{-3}\ \text{Pa·s}$)
consumes these values directly. `check_flow4d` requires the velocity array to be `(T, N, 3)` aligned to the
coordinates, and the venc to lie in a plausible cardiovascular range $10 \le \text{venc} \le 600\ \text{cm/s}$.

## Voxel geometry (patient frame)

Voxel centres are reconstructed from the standard DICOM spatial tags so that velocity samples and geometry
share the patient frame:

$$\mathbf{x}_{j,i} = \mathbf{o} + i\,\Delta_c\,\hat{\mathbf{r}} + j\,\Delta_r\,\hat{\mathbf{c}}$$

with $\mathbf{o}$ = `ImagePositionPatient` (the origin), $\hat{\mathbf{r}}, \hat{\mathbf{c}}$ = the two rows of
`ImageOrientationPatient` (row and column direction cosines), and $\Delta_r, \Delta_c$ = `PixelSpacing`. Slices
are ordered by `SliceLocation`, cardiac frames by `TriggerTime` (both rounded to 3 decimals to bin robustly).
The grid is stored as `(nz, ny, nx)`; the acquisition is 2.5 mm isotropic, and the downstream pressure-Poisson
solve uses grid spacing $h = 2.5\times10^{-3}\ \text{m}$. Positions are expected in millimetres (patient frame);
the contract records `voxel_units` as such.

The loader returns `coords [N,3]`, `velocity [T,N,3]`, `times_ms [T]`, `speed_peak [N]` (peak speed over the
cycle per voxel), the `grid` shape, and the `venc_cm_s`. All voxels are returned unmasked; the lumen mask is a
separate step.

## Lumen segmentation (pulsatile-flow criterion)

The aortic lumen is segmented by the standard 4D-flow pulsatile-flow criterion, not by an external mask: a
voxel belongs to the lumen if its PEAK speed over the cardiac cycle exceeds a threshold (flowing blood), and
only the largest connected component is kept:

$$\text{lumen} = \operatorname*{arg\,max}_{\text{CC}}\Big\{\ \text{voxels with}\ \max_t \lVert \mathbf{v}(t)\rVert > s_{\text{thr}}\ \Big\}$$

`mask_lumen()` defaults to $s_{\text{thr}} = 12\ \text{cm/s}$; the bake (`flow4d_bake.py`) uses $40\ \text{cm/s}$
for the aorta, labels connected components, keeps the largest, and applies one iteration of binary closing. On
the shipped scan this yields 47902 lumen voxels. The contract explicitly notes that a provided STL of a
DIFFERENT subject is NOT co-registered and is not used; the geometry comes from the scan itself. NaN/Inf voxels
are excluded from the lumen.

The peak-systolic frame is chosen as the frame of maximum kinetic energy in the lumen,
$t_p = \arg\max_t \sum_{\text{lumen}} \lVert \mathbf{v}(t)\rVert^2$ (frame 5 on the shipped scan), and the
reported pressure field is evaluated there.

## Phase-wrap detection and unwrap rule

A phase-contrast component ALIASES when the true velocity exceeds the venc: it wraps by $2\,\text{venc}$ to the
opposite sign. `unwrap_aliasing()` corrects this BEFORE any reconstruction, per frame and per velocity
component, against a robust local estimate:

1. Compute a median-filtered reference of the component, `ref = median_filter(comp, size=3)`.
2. Flag a voxel as wrapped when it sits more than one venc away from that reference, for each sign:
   $\text{sign}\cdot(\text{comp} - \text{ref}) > \text{venc}$.
3. Unwrap by moving it toward the local value: `comp -= sign * 2 * venc`.

The count of corrected samples is carried through to the trace as `aliasing_corrected_samples` (27863 on the
shipped scan). Correcting the wrap before reconstruction is part of what keeps the recovered pressure
physiological; an un-corrected jet inflated the range in earlier iterations.

## What `check_flow4d` guarantees at ingest

`check_flow4d(coords_m, vel_ms, venc_cm_s)` raises `ValueError` on a hard violation and otherwise returns a
report:

- `coords` must be `(N, 3)`; `velocity` must be `(T, N, 3)` aligned to `coords`.
- `venc` must be in $[10, 600]\ \text{cm/s}$.
- it reports `n_voxels`, `n_frames`, `peak_speed_ms`, `venc_ms`, and whether the peak speed exceeds the venc
  (`aliased_above_venc`), so a scan that needs unwrapping is flagged.

## Data governance

The raw DICOMs are read from `AORTA4D_DIR` under the study's data-use agreement and are gitignored; they are
NOT redistributed. Only the derived pressure trace (Contract 2) is committed.

## References

- Raissi M, Yazdani A, Karniadakis GE (2020). Hidden fluid mechanics: Learning velocity and pressure fields
  from flow visualizations. Science 367(6481):1026-1030. DOI 10.1126/science.aaw4741.
- Krittian SBS, Lamata P, Michler C, et al. (2012). A finite-element approach to the direct computation of
  relative cardiovascular pressure from time-resolved MR velocity data. Medical Image Analysis 16(5):1029-1037.
  DOI 10.1016/j.media.2012.04.003.
- Sahli Costabal F, Yang Y, Perdikaris P, et al. (2020). Physics-informed neural networks for cardiac
  activation mapping. Frontiers in Physics 8:42. DOI 10.3389/fphy.2020.00042.
