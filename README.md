# CardioPINN

Applied physics-informed reconstruction of cardiac quantities that cannot be measured directly, from data
that CAN be measured. Every case fits a REAL measured signal and is validated against a REAL gold standard.
There is no synthetic ground truth: a network that only re-solves an equation a classical solver already
solves answers no clinical question.

Live: https://cardiopinn.fasl-work.com/

> Status: real-data-first (0.0.x). Not clinically deployed; validated methodological results on real
> experimental data. Raw datasets are used under their data-use agreements and are not redistributed.

## The flagship case: ECG imaging (ECGi), on real EDGAR data

A torso tank (EDGAR, Consortium for ECG Imaging; Utah 2018-08-09) recorded, simultaneously, the real
body-surface potentials on 192 electrodes AND the true heart-surface potentials on a 256-electrode cage
around the heart. In a patient you only ever get the body surface; the heart-surface cage is the gold
standard you never have.

- **The need.** ECGi reconstructs the heart-surface potentials from the body-surface recording,
  non-invasively, to localize an arrhythmia and guide ablation. The inverse is severely ill-posed.
- **How the physics helps.** We fit the REAL measured body-surface potentials through a forward operator on
  the REAL torso and cage geometry, with a spatial prior on the heart surface and a deep ensemble for a
  calibrated per-node uncertainty, and recover the heart-surface potentials.
- **What we validate.** The recovered potentials against the REAL measured heart-cage potentials, using the
  standard ECGi metrics: sinus RE 0.65 / CC 0.72, paced PVP RE 0.58 / CC 0.80, AV-paced RE 0.54 / CC 0.85,
  node-UQ reliability ~0.90. Literature-consistent; paced beats localize better than sinus (physically
  correct). The app animates the recovered heart-surface potential on the real cage geometry over the beat.

## Repository

```
data-pipeline/cardiopinnlab/
  real/ecgi_edgar.py    # the real ECGi case: load EDGAR -> forward operator -> Tikhonov / graph-reg /
                        # deep-ensemble node UQ -> validate vs REAL heart potentials -> bake the artifact
  real/ns_pinn.py       # the real Navier-Stokes pressure engine for the 4D-flow case (in progress;
  real/flow4d_dicom.py  #   verified on analytic Poiseuille; awaiting the real 4D-flow velocity)
  core/pinn.py, core/rng.py, io/formats.py   # shared helpers
data/derived/real-ecgi-edgar/trace.json      # the committed reconstruction the web reads
frontend/                                      # Vite + React + three.js app (lands on the real ECGi case)
docs/                                          # the wiki (real case, method, data governance)
```

Raw datasets live under `data/raw/` (gitignored, not redistributed). The reconstruction is produced offline
and committed; the static web app shows it.

## Run

```bash
py -3.12 -m venv .venv-pipeline
./.venv-pipeline/Scripts/python.exe -m pip install numpy scipy
# point EDGAR_DIR at a local EDGAR torso-tank export (signals/ + geom/), then:
EDGAR_DIR=... ./.venv-pipeline/Scripts/python.exe -c "from cardiopinnlab.real import ecgi_edgar as E; print(E.evaluate(E.reconstruct(E.load_edgar('avp')), E.load_edgar('avp')['cage_p']))"
cd frontend && npm install && npm run dev
```

## Data source

EDGAR (Consortium for ECG Imaging), Utah torso-tank 2018-08-09. Aras K et al., "Experimental Data and
Geometric Analysis Repository (EDGAR)", J. Electrocardiol. 48(6):975-981 (2015),
DOI 10.1016/j.jelectrocard.2015.08.008. Used under the EDGAR data-use agreement with attribution; raw data
not redistributed.

## License

Apache-2.0. Owner: Felipe Santibanez-Leal.
