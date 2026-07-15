# 02, Add an ECGi dataset to the catalogue

The ECGi case is a MULTI-DATASET catalogue: independent real EDGAR experiments (different hearts, species,
pathologies, electrode counts and mesh layouts) reconstructed by the IDENTICAL pipeline, with no per-heart
retuning. The reconstruction (forward operator, Tikhonov, graph-Laplacian prior, deep-ensemble node UQ) lives
in `real/ecgi_edgar.py` and is shared; what differs per lab is only WHERE the four pieces of data live and
what the MATLAB fields are called. That per-lab difference is captured in a small config, so adding a dataset
is a config edit, not new engine code. This guide is how to add one honestly, or exclude it with a reason.

## The four pieces every case needs

A real ECGi case must supply, on the same beat:

1. the **body-surface potentials** (the input): a `[n_body, T]` array over the beat,
2. the **heart-surface potentials** (the gold standard): a `[n_heart, T]` array over the same frames,
3. the **body mesh** (nodes + faces), whose nodes carry the body electrodes,
4. the **heart mesh** (nodes + faces), whose nodes carry the heart electrodes.

The loader reads all four from local `.mat` files under `EDGAR_ROOT/<dir>` and builds the case. The raw data
is never committed (data-use agreement); only the derived reconstruction is.

## The config-driven loader

The catalogue lives in `data-pipeline/cardiopinnlab/real/ecgi_catalogue.py`. Each dataset is one dict in the
`CASES` list. The two shipped configs show the range of variation the loader absorbs:

```python
CASES = [
    {
        "id": "human-tank", "name": "Human torso tank",
        "context_en": "explanted human heart in a torso tank; sinus and two paced beats",
        "context_es": "...",
        "dir": "edgar",
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
        "context_es": "...",
        "dir": "edgar_maastricht",
        "beats": {"sinus": ("Interventions/dog2_beat1_SR/bodypots.mat",
                            "Interventions/dog2_beat1_SR/heartpots.mat")},
        "body_mesh": ("Meshes/body_sinus.mat", "lichaam"),
        "heart_mesh": ("Meshes/heart_sinus.mat", "hart"),
        "ts_struct": False,
    },
]
```

### The per-lab variants the config handles

- **Potential field layout (`ts_struct`).** The Utah torso-tank `.mat` files wrap the potentials in a MATLAB
  `ts` struct, so the values are at `mat["ts"][0,0]["potvals"]` (`ts_struct: True`; the field name defaults to
  `potvals`, overridable with `ts_field`). The Maastricht dog files store a bare array, so the loader takes
  the first non-metadata variable in the file (`ts_struct: False`). This is why `_potvals()` branches on the
  flag.
- **Mesh struct name.** The heart/body mesh is a MATLAB struct with `node` and `face` sub-fields, but the
  struct itself is named per lab: `torsoGeom_measurements` / `cageGeom` for Utah, the Dutch `lichaam` (body) /
  `hart` (heart) for Maastricht. The config's mesh tuple carries `(relpath, structname)`; `_mesh()` falls back
  to the first struct in the file if the name is not found.
- **Node/face orientation and indexing.** `_mesh()` transposes a `3xN` array to `Nx3`, and converts 1-based
  MATLAB face indices to 0-based (`face - 1` when `face.min() >= 1`). You do not configure this; it is handled.
- **NaN frames.** `load_case_beat()` drops any time frame that is NaN in either the body or the heart array
  (`good = ~isnan(body) & ~isnan(heart)`), so a dataset with dropout channels still reconstructs on its clean
  frames.

### How to add a CASE

1. Put the raw `.mat` files under `EDGAR_ROOT/<your-dir>/` (gitignored; never commit them).
2. Append a dict to `CASES` with: a unique `id`, a human `name`, bilingual `context_en` / `context_es`, the
   `dir`, the `beats` map (`{label: (body_relpath, heart_relpath)}`), the `body_mesh` and `heart_mesh` tuples
   `(relpath, structname)`, and `ts_struct` (whether the potentials are wrapped in a `ts` struct). Add
   `ts_field` only if the potential field inside the struct is not named `potvals`.
3. Add a human label for the app dropdown in `frontend/src/pages/RealEcgi.tsx` (`DATASET_LABEL`), and beat
   labels in `BEAT_LABEL` if you introduce new beat keys.
4. Rebake the catalogue and re-validate (guide 03). The completeness floor will now expect at least the new
   totals, so it cannot silently shrink again.

Nothing in the reconstruction changes: `bake_case_beat()` calls the shared `reconstruct()` and `evaluate()`,
so the new heart is judged against its own real cage recording with the same code as every other heart.

## The completeness floor (why a partial bake cannot shrink the catalogue)

Both the validator (`scripts/check_artifacts.py`) and the pytest guard (`tests/test_real_ecgi.py`) enforce a
completeness floor:

```python
MIN_CASES = 2
MIN_BEATS = 4
```

A bake that produces fewer than 2 datasets or fewer than 4 beats FAILS, so a partial run (say, one dataset
because a data path was wrong) can never overwrite the committed multi-dataset catalogue with a smaller one.
When you add datasets, raise these floors to the new totals. The pytest guard additionally checks each beat is
a real reconstruction, not perfect and not garbage: `0.2 < relative_error < 1.0`, `0.5 < correlation <= 1.0`,
`0.5 <= node-UQ <= 1.0`, and that the mesh vertex count matches the heart-electrode count.

## How a dataset is honestly EXCLUDED

Not every EDGAR experiment can be reconstructed honestly. When a dataset fails the real-target rule or the
forward-operator assumptions, it is inspected and DELIBERATELY excluded, with the reason written in the code
(the block above `_potvals` in `ecgi_catalogue.py`), not silently dropped:

- **Bordeaux (torso tank + LV/RV pacing): open sock, rank-deficient.** The epicardial recording is an OPEN
  sock (`sockMeshOpen`, 108 electrodes covering one side of the epicardium). The surface-to-surface forward
  operator assumes the source surface ENCLOSES the heart; a partial open sock makes the map rank-deficient
  (measured correlation about 0.2). Presenting that as a reconstruction would be dishonest. Making it work
  would require interpolating potentials onto the closed 1182-node `epiMesh`, which fabricates data that was
  not measured.
- **Valencia (atrial fibrillation): a simulation, not a measurement.** The folder is explicitly a SIMULATION
  (`sim_08-01-2014`); the "heart" electrograms are solver output, not a measured gold standard, so it violates
  the real-target rule (a network validated against a field a solver produced answers no real question).
- **Ischemia BEM matrices: unreadable variant, torso-specific.** The transfer matrices are stored as MAT v7.3
  (HDF5), which `scipy.io.loadmat` cannot read, and the matrix is specific to that torso geometry and not
  transferable to the other datasets.

This is the honesty bar: a dataset ships only if its heart-surface gold standard is a real measurement on a
closed-enough surface for the shared forward operator, and it is excluded with a stated technical reason
otherwise.

## The BEM applicability check (a related honesty gate)

A dataset can also be reconstructible but not eligible for the boundary-element (BEM) forward operator, which
requires BOTH surfaces to be closed 2-manifolds. `is_closed()` counts boundary edges (edges shared by only
one triangle) and the Euler characteristic; `forward_comparison()` runs the single-layer vs BEM comparison
only when both surfaces are closed. On the real electrode geometry the human torso-tank surface is open (32
boundary edges), so the BEM applies only to the dog case, and there it does not beat the calibrated
single-layer (dog: single-layer RE 0.54 vs BEM RE 0.63) because the coarse 140-node torso makes the
reconstruction regularization-dominated. That null result is reported in the catalogue (`forward_comparison`
per case), not hidden. The single-layer stays the default.

## References

- Aras K, Good W, Tate J, et al. (2015). Experimental Data and Geometric Analysis Repository (EDGAR).
  Journal of Electrocardiology 48(6):975-981. DOI 10.1016/j.jelectrocard.2015.08.008.
- Bear LR, Cheng LK, LeGrice IJ, et al. (2015). Forward problem of electrocardiography: is it solved?
  Circulation: Arrhythmia and Electrophysiology 8(3):677-684. DOI 10.1161/CIRCEP.114.001573.
- Van Oosterom A, Strackee J (1983). The solid angle of a plane triangle. IEEE Transactions on Biomedical
  Engineering 30(2):125-126. DOI 10.1109/TBME.1983.325207.
