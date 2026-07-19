# 01 · ECGi input contract (EDGAR)

The raw input for the ECGi case is a set of MATLAB `.mat` files from an EDGAR experiment (Consortium for ECG
Imaging). Each experiment recorded, simultaneously, four things: the body-surface potentials (the input the
inverse sees), the heart-surface potentials (the gold standard the inverse never sees, used only for scoring),
and the two triangulated electrode geometries. This page specifies exactly what those files must contain for
the loader (`data-pipeline/cardiopinnlab/real/ecgi_catalogue.py`, `ecgi_edgar.py`) to accept them, and how bad
data and non-manifold geometry are rejected. The contract is codified as `ECGI_CONTRACT` / `check_ecgi()` in
`data-pipeline/cardiopinnlab/io/contract.py`.

## The four arrays

| Piece | Array | Shape | Units | Role |
|---|---|---|---|---|
| Body-surface potentials | `body_p` | `(n_body_electrodes, n_time_frames)` | mV (relative) | the input to the inverse |
| Heart-surface potentials | `heart_p` (cage) | `(n_heart_nodes, n_time_frames)` | mV (relative) | the gold standard, scoring only |
| Body geometry | `body_n`, `body_f` | `(n_body_electrodes, 3)` nodes, `(m, 3)` faces | mm, index | the torso/tank electrode surface |
| Heart geometry | `cage_n`, `cage_f` | `(n_heart_nodes, 3)` nodes, `(m, 3)` faces | mm, index | the heart-cage/epicardial surface |

The two potential arrays must share the same time axis (`body_p.shape[1] == heart_p.shape[1]`); they were
recorded simultaneously, and `check_ecgi` raises `ValueError` if they differ. Each geometry's node count must
match the electrode/node count of its potentials (`body_n.shape[0] == body_p.shape[0]`, likewise heart), and
each geometry must be `(n, 3)`. The potentials are treated as relative (scale-invariant): the reconstruction
calibrates a single scalar gain on the first half of the beat, and the validated metrics (relative error,
correlation) are scale-free, so the absolute mV calibration of a given lab does not have to be normalized.

## Expected counts (per lab)

The contract admits a range, because different labs use different cage densities and electrode arrays:

- `n_body_electrodes`: 40 to 256. Utah torso tank uses 192; Maastricht dog uses 140.
- `n_heart_nodes`: 100 to 2000. Utah cage uses 256 nodes (508 triangles); Maastricht epicardial mesh uses
  1321 nodes (2638 triangles).
- `n_time_frames`: at least about 100 samples over the beat (Utah sinus has 244 usable frames after NaN
  dropping; Maastricht sinus has 593).

## The per-lab `.mat` layout (why each case carries a small config)

Field names and mesh structures differ per lab, so `ecgi_catalogue.py` attaches a small config per dataset and
shares the reconstruction. The two shipped datasets:

**Human torso tank (`dir: edgar`, Utah 2018-08-09).** Potentials are wrapped in a MATLAB `ts` struct:
`loadmat(path)["ts"][0,0]["potvals"]` gives `(n_electrodes, T)`. The beats live at
`signals/torsoBeat_{rhythm}.mat` and `signals/cageBeat_{rhythm}.mat` for `rhythm` in `{sinus, pvp, avp}`
(sinus and two paced beats). Geometry: `geom/geometries/torsoGeom_measurements.mat` (struct
`torsoGeom_measurements`) and `geom/geometries/cageGeom.mat` (struct `cageGeom`), each a struct with `node`
and `face` fields. The config flag `ts_struct: True` tells the loader the potentials are inside the `ts`
struct.

**Dog, in situ (`dir: edgar_maastricht`).** Potentials are plain arrays (not wrapped in `ts`), so
`ts_struct: False`: the loader takes the first non-`__` variable in the file. Beats at
`Interventions/dog2_beat1_SR/bodypots.mat` (140 x T) and `.../heartpots.mat` (1321 x T), sinus rhythm.
Geometry structs are named in the lab's language: `Meshes/body_sinus.mat` (struct `lichaam`, Dutch for body)
and `Meshes/heart_sinus.mat` (struct `hart`, heart).

## Geometry node/face conventions (normalization the loader applies)

MATLAB geometry structs are stored column-major and 1-indexed; the loader `_mesh()` normalizes both:

- Node orientation: a `node` stored as `(3, N)` is transposed to `(N, 3)`; likewise `face` `(3, M)` to
  `(M, 3)`. The heuristic is `if array.shape[0] == 3 and array.shape[1] != 3: transpose`.
- Face indexing: MATLAB faces are 1-based; the loader subtracts 1 to make them 0-based
  (`face - (1 if face.min() >= 1 else 0)`), leaving already-0-based faces untouched.
- Units: node coordinates are in millimetres. The bakers later re-centre (subtract the node mean) and rescale
  the cage geometry to a fixed view box; that rescale is a display transform on the derived trace, not part of
  the input contract.

## NaN and bad-lead handling

Real recordings contain dropped leads and saturated frames. The policy is: any time frame that contains a NaN
in either the body or the heart potentials is dropped from the beat, keeping the columns

$$\text{good} = \lnot\,\text{any}_{\text{elec}}\big(\text{isnan}(\phi_{\text{body}})\big)\;\land\;\lnot\,\text{any}_{\text{elec}}\big(\text{isnan}(\phi_{\text{heart}})\big)$$

so `body_p, heart_p = body_p[:, good], heart_p[:, good]`. This is a bad-lead / bad-frame flag: a frame with a
single NaN lead is excluded rather than imputed (we never fabricate a potential we did not measure).
`check_ecgi` additionally reports the count of flagged frames (`nan_frames_flagged`) so a malformed input is
visible at ingest.

## Rejection of open socks and unreadable BEM matrices

The single-layer (point-source) forward operator works on any electrode cloud, but the boundary-element (BEM)
operator requires a closed 2-manifold surface (Green's second identity on a watertight boundary). The loader
tests manifoldness with `is_closed(nodes, faces)`: it counts, for every triangle edge, how many triangles
share it, and requires

- zero boundary edges (every edge shared by exactly two triangles),
- zero non-manifold edges (no edge shared by more than two triangles), and
- Euler characteristic $\chi = V - E + F = 2$ (sphere topology).

`bem_transfer()` returns `None` (falls back to the single-layer operator) when either surface fails this test.
On the real electrode geometries, the human torso-tank surface is open (32 boundary edges), so the BEM does not
apply there and the case reports `bem_applicable: False` with that reason; the dog's surfaces are closed, so
the BEM is built and compared honestly (and, on the coarse 140-node torso, does not beat the calibrated
single-layer, an honest null result). See `03_derived-trace-contract.md` for how the comparison is recorded.

Three EDGAR datasets were inspected and deliberately excluded, each with a documented reason (in
`ecgi_catalogue.py`):

- **Bordeaux (torso tank + LV/RV pacing):** the epicardial recording is an open partial sock (about 108
  electrodes covering one side of the epicardium). The surface-to-surface forward operator assumes the source
  surface encloses the heart; a partial open sock makes the transfer map rank-deficient (measured correlation
  around 0.2). Presenting it as a reconstruction would be dishonest, and closing it would fabricate potentials
  on nodes we did not measure.
- **Valencia (atrial fibrillation):** the folder is explicitly a simulation (`sim_08-01-2014`); the "heart"
  electrograms are solver output, not a measured gold standard, so it violates the real-target rule.
- **Ischemia BEM matrices:** stored as MAT v7.3 (HDF5), which `scipy.io.loadmat` cannot read; the transfer
  matrix is also specific to that torso geometry and not transferable. The file is rejected as unreadable
  rather than partially parsed.

## Data governance

The raw EDGAR data is read from `EDGAR_ROOT` (default `D:/_Datos/cardiopinn`) / `EDGAR_DIR` under the EDGAR
data-use agreement with attribution and is not redistributed in this repository. Only the derived
reconstruction (Contract 2) is committed.

## References

- Aras K, Good W, Tate J, et al. (2015). Experimental Data and Geometric Analysis Repository (EDGAR).
  Journal of Electrocardiology 48(6):975-981. DOI 10.1016/j.jelectrocard.2015.08.008.
- Bear LR, Cheng LK, LeGrice IJ, et al. (2015). Forward problem of electrocardiography: is it solved?
  Circulation: Arrhythmia and Electrophysiology 8(3):677-684. DOI 10.1161/CIRCEP.114.001573.
- Van Oosterom A, Strackee J (1983). The solid angle of a plane triangle. IEEE Transactions on Biomedical
  Engineering BME-30(2):125-126. DOI 10.1109/TBME.1983.325207.
