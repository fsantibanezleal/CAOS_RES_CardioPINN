# Data contract

CardioPINN is a REAL-DATA-ONLY, BAKE-AND-READ product. Every result is computed OFFLINE by the Python
pipeline (`data-pipeline/cardiopinnlab/`) and committed to disk as a compact JSON trace. The static web app
READS those traces and nothing else: no model runs in the browser, there is no ONNX / onnxruntime-web /
Pyodide lane, no WebGPU inference. The trust boundary therefore has exactly two documented contracts, and this
theme specifies both.

```
   RAW INPUT (gitignored, data-use)          DERIVED ARTIFACT (committed)         WEB (reads only)
   -------------------------------           ----------------------------         ----------------
   EDGAR .mat (potentials + geometry)  --->  data/derived/real-ecgi-catalogue/  --> React pages read
   Philips 4D-flow DICOM series        --->    catalogue.json                      the two JSON traces
                                             data/derived/real-flow4d-pressure/
                                               trace.json
              Contract 1                            Contract 2
         (ingestion contract)                 (artifact contract)
```

## The two contracts

- **Contract 1, the ingestion contract (raw INPUT).** What a raw recording must look like for the offline
  pipeline to accept it: array shapes, units, node/electrode counts, the phase-contrast velocity rescale, and
  the outlier/rejection policy. This is the bring-your-own-data contract: to run CardioPINN on your own
  recording it must satisfy these checks. The raw data is never redistributed (it carries a data-use
  agreement); this contract documents and validates its SHAPE, not its content. It is codified in
  `data-pipeline/cardiopinnlab/io/contract.py` (`ECGI_CONTRACT` / `check_ecgi`, `FLOW4D_CONTRACT` /
  `check_flow4d`) and enforced by the loaders (`ecgi_catalogue.py`, `flow4d_dicom.py`).
  - [01_ecgi-input-contract.md](data-contract/01_ecgi-input-contract.md): the EDGAR ECGi input (per-lab `.mat`
    structures, electrode/mesh counts, NaN handling, open-sock and unreadable-BEM rejection).
  - [02_4dflow-input-contract.md](data-contract/02_4dflow-input-contract.md): the 4D-flow DICOM input
    (magnitude + 3 phase encodings, venc, rescale-to-velocity mapping, voxel geometry, lumen segmentation,
    phase-wrap unwrap rule).

- **Contract 2, the artifact contract (derived TRACE).** The exact JSON the web reads: field names, units,
  ranges, array shapes, the schema-version string, and the completeness plus physiological floors a CI
  validator enforces before a trace is trusted. It is mirrored on the frontend side in
  `frontend/src/lib/contract.types.ts` (kept in lock-step so `tsc` fails on drift), and guarded by
  `tests/test_real_ecgi.py` and `tests/test_flow4d_trace.py`.
  - [03_derived-trace-contract.md](data-contract/03_derived-trace-contract.md): the ECGi `catalogue.json`
    schema, the 4D-flow `trace.json` schema, the schema-version discipline, and the validator floors.

## Why the split matters

The ingestion contract answers "can I feed my own recording into the pipeline?"; the artifact contract answers
"what will the browser render, in what units, with what guarantees?". A change to a scanner or a lab's field
naming touches only Contract 1. A change to what the web needs (a new field, a new frame axis) touches only
Contract 2 and bumps a schema version. Keeping them separate is what lets the raw data stay off the repo while
the derived result stays fully specified and testable.

## Governance and honesty (applies to both contracts)

- Raw datasets are read from a local, gitignored path (`EDGAR_ROOT` / `EDGAR_DIR` for ECGi, `AORTA4D_DIR` for
  4D-flow) under their data-use agreements and are NOT redistributed. Only the derived traces are committed.
- Every number in a committed trace is a real reconstruction quantity: for ECGi, the relative error and
  correlation against the REAL measured heart-cage gold standard; for 4D-flow, the recovered relative-pressure
  range, the analytic gate, and the clinical Bernoulli bracket (there is no invasive pressure gold standard, so
  the absolute magnitude carries the method's uncertainty). No number is error against a field we invented.
- Tests never write canonical artifacts. The floor tests READ the committed traces; the bakers write them.

## References

- Aras K, Good W, Tate J, et al. (2015). Experimental Data and Geometric Analysis Repository (EDGAR).
  Journal of Electrocardiology 48(6):975-981. DOI 10.1016/j.jelectrocard.2015.08.008.
- Raissi M, Yazdani A, Karniadakis GE (2020). Hidden fluid mechanics. Science 367(6481):1026-1030.
  DOI 10.1126/science.aaw4741.
