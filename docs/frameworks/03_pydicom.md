# pydicom: decoding the real Philips 4D-flow DICOM velocity series

## What it is

pydicom is the pure-Python library for reading and writing DICOM medical-image files. CardioPINN pins
`pydicom>=3.0` in `data-pipeline/requirements.txt` and uses it in one module, `real/flow4d_dicom.py`, to turn a
real Philips 4D-flow MRI acquisition into a time-resolved three-directional velocity field with correct
patient-frame geometry. Without this step there is no real velocity to recover pressure from; the entire
4D-flow case (Case B) begins here. The raw DICOMs are gitignored and used under a data-use agreement; only the
derived pressure trace is committed.

## The source acquisition

A real thoracic-aorta 4D-flow study (`4DFLOWWIP_16F_fullvel`, Philips, post distortion-correction). Per cardiac
frame the scan stores four images:

- one **magnitude** image (`SequenceName` contains `fl3d1r3`), the anatomical signal, and
- three **phase-contrast velocity** images (`v120rl`, `v120in`, `v120fh`), each encoding blood velocity along
  one patient axis, with a velocity-encoding sensitivity venc of 120 cm/s.

The scan has 16 frames across the cardiac cycle on a 2.5 mm isotropic grid.

## How CardioPINN uses pydicom

### Reading and classifying the series

`_read_all` walks the DICOM directory and `pydicom.dcmread(..., force=True)` reads each file, keeping only those
that actually carry `PixelData`. `_role` inspects the Philips `SequenceName` tag to label each image as
magnitude or as one of the three velocity encodings, mapping the encodings to patient axes:

- `v120rl` (right to left) to $+x$ (patient L),
- `v120in` (anterior to posterior, AP) to $+y$ (patient P),
- `v120fh` (foot to head) to $+z$ (patient H).

Every image is then indexed by `(role/axis, SliceLocation, TriggerTime)` so the loader can assemble a dense
`[T, nz, ny, nx, 3]` velocity array and a matching `[nz, ny, nx, 3]` coordinate array.

### The venc rescale to velocity

A phase-contrast image stores velocity as a scaled 12-bit phase, not as a physical value. `load_4dflow` applies
the DICOM `RescaleSlope` and `RescaleIntercept` and the venc to convert each pixel to a real velocity:

$$v\;[\text{cm/s}] \;=\; \frac{\text{slope}\cdot \text{px} + \text{intercept}}{4096}\,\cdot\,\text{venc},$$

so the full rescaled range $[-4096, 4096]$ spans $[-\text{venc}, +\text{venc}]$. The result is immediately
converted to the module's working unit (mm/ms, i.e. $1\,\text{cm/s} = 0.01\,\text{mm/ms}$) and later to SI m/s
for the pressure physics. The measured physiological peak on this scan is 0.791 m/s.

### Patient-frame voxel positions

Velocity samples and geometry must share one coordinate frame. `_voxel_xyz` reconstructs each voxel centre in
the patient frame from the standard DICOM spatial tags: `ImagePositionPatient` (the slice origin),
`ImageOrientationPatient` (the row and column direction cosines), and `PixelSpacing` (row and column spacing):

$$x_{ij} \;=\; \text{origin} \;+\; i\,\Delta_{\text{col}}\,\hat{r}_{\text{row}} \;+\; j\,\Delta_{\text{row}}\,\hat{r}_{\text{col}}.$$

Because the velocity encodings are aligned to the patient RL/AP/FH axes and the voxel positions come from the
same patient-frame tags, the velocity vectors and the geometry are consistent without any extra registration.
The aortic lumen is then segmented from the flow itself (`mask_lumen`): a voxel belongs to the lumen if its
peak-over-the-cycle speed exceeds a threshold, keeping the largest connected component (`scipy.ndimage`). This
is the standard pulsatile-flow segmentation for 4D-flow, used because the provided STL is a different subject
and does not co-register.

### Phase-wrap anti-aliasing

Phase-contrast velocity wraps when the true velocity exceeds the venc: a component that should read just above
$+\text{venc}$ instead reads near $-\text{venc}$, a jump of $2\,\text{venc}$ to the opposite sign.
`unwrap_aliasing` detects and corrects this per voxel and component: it compares each component to a robust
local estimate (a `scipy.ndimage.median_filter` of size 3) and, where a value sits more than one venc away from
its neighbours, adds or subtracts $2\,\text{venc}$ toward the local value:

$$v \;\leftarrow\; v \;-\; \operatorname{sign}(v - v_{\text{local}})\cdot 2\,\text{venc}
   \quad\text{where } \big|v - v_{\text{local}}\big| > \text{venc}.$$

On this scan 27863 samples are corrected. This runs BEFORE any downstream reconstruction, because an aliased
jet core would otherwise corrupt the velocity derivatives that drive the pressure-Poisson source.

## Honest limits and substitutions

- The velocity-encoding to axis mapping is specific to this Philips `SequenceName` convention (`v120rl` /
  `v120in` / `v120fh`). A different vendor or protocol would need a different `_role` mapping; the loader is not
  a universal 4D-flow reader.
- The lumen mask is a pulsatile-flow threshold plus largest connected component, not an anatomical
  segmentation; it is the honest self-contained choice given the non-co-registering STL, and the docs state so.
- Anti-aliasing uses a robust local (median) reference, not a full spatial-temporal phase-unwrapping solver. It
  handles the single-wrap case (one $2\,\text{venc}$ jump) that this scan exhibits; higher-order wraps would
  need a more elaborate unwrap.
- pydicom decodes the pixel data; the venc, the axis convention, and the units are supplied by the loader from
  the acquisition, not inferred, and are documented in the module docstring.

## References

- Raissi M, Yazdani A, Karniadakis GE (2020). Hidden fluid mechanics: Learning velocity and pressure fields
  from flow visualizations. Science 367(6481):1026-1030. DOI 10.1126/science.aaw4741.
- Krittian SBS, Lamata P, Michler C, et al. (2012). A finite-element approach to the direct computation of
  relative cardiovascular pressure from time-resolved MR velocity data. Medical Image Analysis 16(5):1029-1037.
  DOI 10.1016/j.media.2012.04.003.
