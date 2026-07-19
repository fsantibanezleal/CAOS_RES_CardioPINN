# Guides

How-to guides for CardioPINN. The product is real-data-only and bake-and-read: every result is computed
Offline from a real measured signal, validated, and committed as a JSON trace under `data/derived/`; the
static web app only reads those traces. No model runs in the browser (there is no ONNX / onnxruntime-web /
Pyodide lane). These guides walk the full loop, from a clean clone to reading the live app.

- [01, run locally](guides/01_run-locally.md): clone the repo, create the two virtual environments (the
  light NumPy/SciPy `.venv` for the ECGi case, the heavy GPU `.venv-pipeline` for the 4D-flow case), point the
  data-root environment variables at your local raw data, and start the frontend dev server.
- [02, add an ECGi dataset](guides/02_add-an-ecgi-dataset.md): the config-driven catalogue loader
  (`ecgi_catalogue.py`), the per-lab potential and mesh field-name variants, how to add a new `case` config,
  the completeness floor that guards the committed catalogue, and how a dataset is honestly excluded with a
  documented reason (Bordeaux open sock, Valencia simulation, ischemia unreadable BEM matrix).
- [03, rebake and validate](guides/03_rebake-and-validate.md): run the two bakes (the ECGi catalogue and
  `flow4d_bake`), the analytic gates that must pass before any real data is trusted, the validator
  (`scripts/check_artifacts.py`) and the pytest completeness and physiological floors, and how to re-verify the
  committed artifact before `git add`.
- [04, reading the app](guides/04_reading-the-app.md): how to use the live web app, the top-level research
  case selector, the dataset / beat / field controls, the live diagnosis readout against the real gold
  standard, the result-first tabs, and the in-app Architecture ("How it works") modal.

For the deeper why behind these steps, see the theme wikis: `docs/methods/` (the physics engines),
`docs/data/` (the datasets and data governance), and `docs/cases/` (the two real applied cases end to end).
