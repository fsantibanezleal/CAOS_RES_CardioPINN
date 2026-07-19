# 03 · Derived trace contract (the JSON the web reads)

CardioPINN is bake-and-read: the offline pipeline computes every result and commits it as a compact JSON trace,
and the static web app reads only those traces (no model runs in the browser). This page specifies the exact
shape, field names, units, and ranges of the two committed traces, the schema-version discipline, and the CI
floors a trace must clear before it is trusted. The frontend mirrors these shapes in
`frontend/src/lib/contract.types.ts` (kept in lock-step so `tsc` fails on drift).

## A. ECGi catalogue: `data/derived/real-ecgi-catalogue/catalogue.json`

Schema string `cardiopinn.ecgi-catalogue/v2`. Baked by `cardiopinnlab.real.ecgi_catalogue.bake_catalogue()`.

```
{
  "schema": "cardiopinn.ecgi-catalogue/v2",
  "cases": [ EcgiCase, ... ]          // one per real dataset (human-tank, dog-insitu)
}
```

**`EcgiCase`**

| Field | Type | Meaning |
|---|---|---|
| `id` | string | dataset id (`human-tank`, `dog-insitu`) |
| `name` | string | human-readable name |
| `context_en` / `context_es` | string | one-line bilingual context (the app is EN/ES) |
| `beats` | `{ label -> EcgiBeat }` | one entry per beat (`sinus`, `paced-pvp`, `paced-avp`; dog: `sinus`) |
| `forward_comparison` | object or null | single-layer vs BEM honesty record (see below) |

**`EcgiBeat`**

| Field | Type | Units / shape | Meaning |
|---|---|---|---|
| `mesh.vertices` | `number[n][3]` | mm (centred, scaled to a ~60-unit view box) | heart-cage geometry for rendering |
| `mesh.triangles` | `number[m][3]` | 0-based vertex indices | cage triangulation |
| `mesh.n_vertices` | int | | node count (equals `n_heart_electrodes`) |
| `mesh.n_triangles` | int | | triangle count |
| `times_ms` | `number[nf]` | decimated frame indices over the beat | the time axis |
| `fields_over_time.recovered_mV` | `number[nf][n]` | mV (signed), 3 dp | Our reconstruction, per frame per node |
| `fields_over_time.measured_mV` | `number[nf][n]` | mV (signed), 3 dp | the real cage gold standard |
| `fields_over_time.abs_error_mV` | `number[nf][n]` | mV, 3 dp | `abs(recovered - measured)` |
| `fields_over_time.uncertainty_mV` | `number[nf][n]` | mV, 3 dp | recalibrated per-node ensemble spread |
| `metrics` | `{ str -> number }` | | validated metrics (below) |

Frames are decimated to at most 40 (`np.unique(linspace(0, nt-1, 40))`), so `nf <= 40`; `times_ms` are the
selected frame indices (a monotone time axis for the beat, not calibrated milliseconds). Values are rounded to
3 decimals; mesh vertices to 2. The cage geometry is mean-centred and scaled by `60 / max|node|` to a
consistent view box, which is a display transform, not physical millimetres.

**`metrics`** (per beat, validated against the real measured cage potentials):

| Key | Meaning | Shipped values (human-tank sinus / dog sinus) |
|---|---|---|
| `relative_error_tikhonov` | RE of the Tikhonov solution | 0.654 / 0.542 |
| `correlation_tikhonov` | spatial correlation, Tikhonov | 0.718 / 0.779 |
| `relative_error_graph_reg` | RE, graph-Laplacian prior | 0.667 / 0.588 |
| `correlation_graph_reg` | correlation, graph prior | 0.722 / 0.731 |
| `relative_error_ensemble` | RE, deep-ensemble mean | 0.667 / 0.588 |
| `correlation_ensemble` | correlation, ensemble mean | 0.722 / 0.731 |
| `uq_calibration_2sigma` | fraction of nodes within $2\sigma$ of the true error | 0.895 / 0.901 |
| `n_torso_electrodes` | body-electrode count | 192 / 140 |
| `n_heart_electrodes` | heart-node count | 256 / 1321 |
| `n_time_frames` | usable frames after NaN dropping | 244 / 593 |

Relative error and correlation are the standard ECGi metrics,

$$\text{RE} = \frac{\lVert \hat\phi - \phi\rVert}{\lVert \phi\rVert}, \qquad
\text{CC} = \frac{1}{T}\sum_t \operatorname{corr}\big(\hat\phi(:,t), \phi(:,t)\big)$$

with $\hat\phi$ the recovered and $\phi$ the measured heart-surface potentials. The per-node uncertainty is a
deep ensemble over measurement-noise draws, recalibrated by a temperature so that the reported $\sigma$ matches
the observed error scale.

**`forward_comparison`** (honest single-layer vs boundary-element record, first beat). When the BEM does not
apply (an open surface), it is `{ beat, bem_applicable: false, reason }`; on the human tank:
`reason: "body surface open (32 boundary edges); BEM needs a closed 2-manifold"`. When it applies (dog, both
surfaces closed): `{ beat, bem_applicable: true, single_layer: {RE, CC}, bem: {RE, CC} }`, with the honest
shipped numbers single-layer RE 0.542 / CC 0.779 versus BEM RE 0.629 / CC 0.775 (the BEM does not beat the
calibrated single-layer on the coarse real geometry; a reported null result, not a claimed improvement).

## B. 4D-flow pressure: `data/derived/real-flow4d-pressure/trace.json`

Schema string `cardiopinn.flow4d-pressure/v3`. Baked by `cardiopinnlab.real.flow4d_bake.bake_flow4d()`.

| Field | Type | Units / shape | Meaning |
|---|---|---|---|
| `schema` | string | | `cardiopinn.flow4d-pressure/v3` |
| `unsteady_term` | string | | provenance, `"space-time PINN (analytic dv/dt over the whole cycle)"` |
| `points_mm` | `number[n][3]` | centred + scaled to a ~60-unit view box, 2 dp | aortic-lumen point cloud (display coords) |
| `pressure_mmHg` | `number[n]` | mmHg (signed), median-gauged, 3 dp | recovered relative pressure at peak systole |
| `speed_ms_peak` | `number[n]` | m/s, 3 dp | measured speed at the peak frame |
| `speed_ms_over_time` | `number[nf][n]` | m/s, 3 dp | measured speed over the cardiac cycle |
| `times_ms` | `number[nf]` | ms (DICOM `TriggerTime`) | the real cardiac-phase axis |
| `peak_frame` | int | | index of peak systole (max lumen kinetic energy) |
| `metrics` | `{ str -> number }` | | validated quantities (below) |

The point cloud is decimated to at most `max_points = 9000` voxels for the browser (shipped: 9000), centred
and rescaled to a fixed view box; `points_mm` reflects the physical origin (mm patient frame) but the committed
values are display-normalized, not raw millimetres. Pressure is relative and gauge-free (the physical quantity
is the difference), so it is committed median-zero; on the shipped scan it spans roughly $-0.70$ to $+0.15$
mmHg. The frame axis has `nf = 16` real trigger times (0 to 937 ms), and `peak_frame = 5`.

**`metrics`**

| Key | Meaning | Shipped value |
|---|---|---|
| `n_lumen_voxels` | segmented lumen voxel count (full, not decimated) | 47902 |
| `peak_velocity_ms` | peak lumen speed of the denoised field | 0.791 |
| `bernoulli_mmHg` | clinical simplified Bernoulli $4\,V_{\max}^2$ | 2.51 |
| `ppe_pressure_drop_mmHg` | robust recovered pressure range (2.5 to 97.5 pct) | 0.79 |
| `noise_sensitivity_mmHg` | pressure spread under 5%-venc velocity noise (robustness scalar) | 0.0 |
| `ensemble_members` | velocity-noise ensemble size | 4 |
| `aliasing_corrected_samples` | phase-wrap samples unwrapped | 27863 |
| `div_raw_per_s` | mean $\lvert\nabla\cdot\mathbf{v}\rvert$ of the raw (smoothed) field | 25.37 |
| `div_denoised_per_s` | mean $\lvert\nabla\cdot\mathbf{v}\rvert$ after the div-free PINN | 11.19 |
| `div_reduction_x` | divergence reduction factor | 2.3 |
| `venc_cm_s` | encoding velocity | 120.0 |
| `n_frames` | cardiac frames | 16 |

The recovered pressure solves the pressure-Poisson equation $\nabla^2 p = S(\mathbf{v})$ with
$S = -\rho\sum_{ij}(\partial_j v_i)(\partial_i v_j)$ from the divergence-free PINN's analytic derivatives, so
`ppe_pressure_drop_mmHg` (0.79 mmHg) brackets the clinical `bernoulli_mmHg` (2.51 mmHg) for this unobstructed
aorta. Because the div-free denoiser absorbs velocity measurement noise, `noise_sensitivity_mmHg` is
essentially 0; it is committed as a scalar robustness metric, not as a per-voxel uncertainty field (which would
be a misleading uniform ~0 map). The absolute magnitude carries the method's uncertainty (no invasive gold
standard).

## Schema-version discipline

Every trace carries an explicit `schema` string with a version (`.../v2`, `.../v3`). The version bumps when the
Shape the web reads changes (a new field, a new axis, a renamed key), never for a numeric re-bake. The frontend
`contract.types.ts` interfaces annotate the exact version strings; a mismatch between the baked schema and the
mirrored interface makes the TypeScript build fail, which is the guardrail against silent drift between the
pipeline and the pages.

## Completeness and physiological floors (CI validators)

Two tests read the committed traces (they never write them) and fail the build if a trace is incomplete or
non-physiological. These floors are the concrete defence against a partial or corrupted bake reaching prod.

**ECGi, `tests/test_real_ecgi.py`** (completeness floor + per-beat sanity):

- `len(cases) >= 2` and `total_beats >= 4` (guards a partial bake silently shrinking the catalogue).
- every case has non-empty `beats`.
- per beat: $0.2 < \text{relative\_error\_tikhonov} < 1.0$ (ill-posed: not perfect, not garbage);
  $0.5 < \text{correlation\_tikhonov} \le 1.0$ (real ECGi range);
  $0.5 \le \text{uq\_calibration\_2sigma} \le 1.0$ (a calibrated per-node uncertainty).
- `mesh.n_vertices == metrics.n_heart_electrodes` (geometry matches the field).

**4D-flow, `tests/test_flow4d_trace.py`** (existence + physiological floor):

- `len(points_mm) >= 1000` and `len(pressure_mmHg) == len(points_mm)`.
- `len(speed_ms_over_time) == metrics.n_frames`.
- $0 < \text{ppe\_pressure\_drop\_mmHg} < 60$ mmHg (physiological, not the thousands of mmHg the pre-fix
  finite-difference boundary artifact produced).
- $0.1 < \text{peak\_velocity\_ms} < 6$ m/s (physiological aortic velocity).
- `bernoulli_mmHg > 0`.
- `ensemble_members >= 3` and $0 \le \text{noise\_sensitivity\_mmHg} < 2$ mmHg.

## Bring-your-own-data

To render your own recording in the app you produce a trace that satisfies this contract: run the offline
pipeline on an input that clears Contract 1 (see `01_ecgi-input-contract.md` / `02_4dflow-input-contract.md`),
and the baker emits a `catalogue.json` / `trace.json` in these shapes with these fields, units, and ranges. If
the trace clears the floors above, the static web reads it unchanged. No browser-side model, no server: the
contract IS the interface.

## References

- Aras K, Good W, Tate J, et al. (2015). Experimental Data and Geometric Analysis Repository (EDGAR).
  Journal of Electrocardiology 48(6):975-981. DOI 10.1016/j.jelectrocard.2015.08.008.
- Bear LR, Cheng LK, LeGrice IJ, et al. (2015). Forward problem of electrocardiography: is it solved?
  Circulation: Arrhythmia and Electrophysiology 8(3):677-684. DOI 10.1161/CIRCEP.114.001573.
- Krittian SBS, Lamata P, Michler C, et al. (2012). A finite-element approach to the direct computation of
  relative cardiovascular pressure from time-resolved MR velocity data. Medical Image Analysis 16(5):1029-1037.
  DOI 10.1016/j.media.2012.04.003.
