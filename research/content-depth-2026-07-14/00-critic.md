# Completeness + honesty critique of the four problem-statement dossiers

Reviewer pass, 2026-07-14. Scope: the four `.md` sections in this folder
(`aortic-stenosis-grading`, `aortic-coarctation-and-4dflow-clinical`,
`4dflow-pressure-mapping-sota`, `ecgi-clinical-problem-depth`).
Goal: flag quantitative claims that lack a primary-source DOI/URL (fix or drop
before transcription), name missing problem-statement dimensions, and give a
prioritized fact list for the ECGi and 4D-flow statements.

Overall: sourcing discipline is good. Each file already carries an
"Unverified" section, most numbers are DOI-anchored, and the honest-limitation
sections are genuinely honest. The issues below are the residue, not systemic.

---

## (1) Quantitative claims stated without a primary-source DOI/URL

These must be fixed (attach a primary DOI) or dropped before the number is
transcribed into the app.

### aortic-stenosis-grading.md

1. **"~2-3% prevalence in adults over 65" and "burden projected to roughly
   double by 2050."** (lines 40-41) Attributed only to "2020 ACC/AHA guideline
   background" with no page and no primary demographic source. The `double by
   2050` projection in particular is a modeling claim with no citation.
   Fix: cite the actual projection study (e.g. a TAVR-candidate / burden
   projection paper) or drop the "double by 2050" clause. The Osnabrugge 2013
   `>75 y` numbers (12.4% / 3.4%) ARE properly sourced, so the over-65 2-3%
   line is redundant and can simply be dropped.

2. **Pressure-recovery clinical flag "ascending aorta diameter <= 30 mm."**
   (line 29) Cited to Bignoto 2023 (PMC10417789, a review, no DOI) and to
   "Garcia D, Pibarot P, et al." with no year, journal, volume, or DOI. That
   is an incomplete citation for a specific numeric threshold.
   Fix: pin the <=30 mm threshold to its primary source (Baumgartner 1999
   JACC, DOI 10.1016/S0735-1097(99)00066-2, is already in the file for the
   pressure-recovery mechanism and is the right anchor) or replace the
   dangling "Garcia D, Pibarot P, et al." with a complete citation + DOI.

3. **"misclassified in up to ~23% of patients."** (lines 33-34) The file
   already flags this as Unverified (line 62): quoted from the 2023 review
   citing an unopened original study. Good that it is flagged; it must NOT be
   stated as fact in the app until the original study + DOI are pinned.

### aortic-coarctation-and-4dflow-clinical.md

4. **Pressure-recovery mechanism, Aslan et al.** (lines 46-48) The claim
   (pressure recovery explains Doppler overestimation across segmental
   stenosis) is sourced only to PubMed 19845724, no DOI. A PubMed ID is a
   locator, not a DOI; acceptable as a fallback but weaker than every other
   citation in the file. Fix: retrieve and attach the DOI, or lean on the
   Baumgartner 1999 pressure-recovery source used in the AS file (same
   mechanism) which already has a DOI.

### ecgi-clinical-problem-depth.md

5. **"300,000 to 400,000 sudden cardiac deaths per year in the United
   States."** (lines 24-28) Attributed to a JACC:CEP VT-ablation review that
   "summarizes" the figure, explicitly hedged as "commonly cited US range."
   This is a secondary attribution for a headline epidemiology number that
   carries real rhetorical weight in the draft prose (line 105).
   Fix: cite a primary US SCD-incidence source (e.g. an AHA statistical
   update / Circulation heart-disease-and-stroke-statistics year volume, or
   a primary SCD-epidemiology paper) rather than an ablation review.

6. **"252-electrode" CardioInsight vest + "first FDA-cleared" claim.**
   (lines 57-61) Sourced to MassDevice / Cardiac Rhythm News trade coverage,
   not to the FDA 510(k) record itself. The electrode count and the
   "first commercially available" superlative should rest on the primary FDA
   510(k) clearance document/database entry. Fix: cite the FDA 510(k) number
   (accessible via the FDA 510(k) database) as the primary URL; keep the news
   link only as secondary color.

### 4dflow-pressure-mapping-sota.md

7. No unsourced quantitative claim. Every number (10 min/frame, 9-subject
   cohort, the head-to-head ranking) is DOI/arXiv-anchored, and the three
   soft spots (Marlevi 2021 volume/DOI, STE primary paper, DAF-FlowNet 2026
   preprint) are already correctly quarantined in the Unverified section.

### Cross-dossier inconsistency (flag before building a shared citation registry)

8. **"Marlevi 2021" resolves to conflicting citations across the two files.**
   - `4dflow-pressure-mapping-sota.md` line 46-47 cites a Marlevi 2021 as
     *Med Image Anal 68:101948* (intracardiac vWERP, PubMed 33383332) and
     separately, in Unverified (line 154), a Marlevi 2021 aortic-validation
     paper as ScienceDirect PII S1361841521002401.
   - `aortic-coarctation-and-4dflow-clinical.md` line 95-99 cites the aortic
     relative-pressure validation as *Bertoglio C / Marlevi D et al., Med
     Image Anal 2021;74:102214, DOI 10.1016/j.media.2021.102214*.
   These are plausibly two or three DISTINCT Marlevi/Bertoglio 2021 papers
   (one intracardiac vWERP, one aortic validation), but the volume/DOI/PII
   triplet is inconsistent and one is still Unverified. Reconcile into one
   registry entry per paper with a single confirmed DOI before either number
   is transcribed, or the app will cite the same author-year to two different
   objects.

---

## (2) Missing dimensions a strong problem statement needs

Rated by how much each gap weakens the "why measure the pressure/source well"
argument the app is making.

### aortic-stenosis-grading.md

- **HIGH: low-flow / low-gradient AS is absent.** This is the single most
  important missing dimension. The whole clinical case for a resolved pressure
  field / energy-loss index over a single peak gradient is strongest exactly in
  the discordant entities: classical low-flow low-gradient severe AS (small
  AVA but mean gradient < 40 mmHg because stroke volume is low) and
  paradoxical low-flow low-gradient AS with preserved EF. The dossier only
  treats high-gradient severe AS and the pressure-recovery overestimation. The
  under-estimation / discordance direction (where the single gradient fails and
  a field-based or energy-loss index adds the most value) is exactly the app's
  pitch and is missing. Add the guideline low-flow/low-gradient definitions
  and the dobutamine-stress-echo pathway (2020 ACC/AHA, already cited DOI
  10.1161/CIR.0000000000000923).
- **MEDIUM: energy loss index (ELI) is only alluded to.** The draft prose says
  "energy-loss-based severity index" but never names or defines the ELI
  (Garcia/Pibarot lineage) that operationalizes pressure recovery into a
  correction. If the app claims to compute an energy-loss index, define it with
  a primary source.

### aortic-coarctation-and-4dflow-clinical.md

- **HIGH: no epidemiology of coarctation.** Unlike the AS file (which opens
  with prevalence), this file has zero stakes framing: no CoA incidence
  (roughly 5-8% of congenital heart disease), no note that it presents across
  the lifespan, no long-term-outcome hook. A problem statement needs the
  "why this matters / how many people" opening. Add CoA incidence (per live
  births / as fraction of CHD) with a primary source.
- **MEDIUM: consequences of an untreated/residual gradient are unstated.** The
  file grades the gradient but never says what the gradient causes (persistent
  upper-body hypertension, LV afterload, re-coarctation rates after repair).
  That is the reason the 20 mmHg threshold exists; stating it strengthens the
  "why the number matters" logic.
- **LOW: PINN/deep-learning line not mentioned here.** CoA cites PPE and WERP
  but not the physics-informed reconstruction family that the sibling SOTA
  file covers and that CardioPINN actually implements. One cross-reference
  sentence would connect the clinical case to the method the app ships.

### 4dflow-pressure-mapping-sota.md

- **HIGH: no quantitative "clinically acceptable pressure error" target.** The
  file describes methods and their relative ranking but never states what
  accuracy is good enough to matter clinically (e.g. sub-mmHg vs the 20 mmHg
  CoA threshold and the 40 mmHg AS threshold, or agreement within catheter
  test-retest variability). Without a target, the reader cannot judge whether
  the reported biases (the CoA file's +0.4 mmHg vs FSI) are excellent or
  irrelevant. Import the AS/CoA thresholds as the yardstick.
- **MEDIUM: the temporal-resolution failure is only qualitative.** The peak-
  systole underestimation is attributed to TR being "too coarse," but no
  number is given for the TR needed to resolve the systolic pressure peak
  (the CoA file has 28-30 ms; connect that here as the quantitative bound and
  tie it to the dv/dt-dominance claim).
- **MEDIUM: STE has no primary citation.** The Stokes estimator is named and
  ranked but its introducing paper + DOI are unpinned (already flagged). Since
  the head-to-head ranking is a load-bearing "honest picture" claim, STE needs
  a real citation before the ranking is transcribed.
- **LOW: the current clinical standard's limitation lives only in the sibling
  files.** For a standalone problem statement, one sentence stating what
  Doppler/catheter cannot do (the thing 4D-flow adds: a full 3D field vs a 1D
  drop) would make this file self-contained. It is implied but not asserted
  with the clinical framing the AS/CoA files carry.

### ecgi-clinical-problem-depth.md

- **HIGH: no stated clinically-required localization accuracy.** The file
  reports what ECGi achieves (10 mm early; ~20 ms and tens-of-mm errors vs
  contact maps) but never states the accuracy an ablation actually needs
  (ablation lesions are ~5-7 mm, so a source must be localized within roughly
  a lesion-to-sub-cm tolerance to be actionable). Without the target, the
  reader cannot see whether the reported errors are acceptable or disqualifying
  (they are disqualifying, which is the point). Add the required-accuracy
  number with a primary source.
- **MEDIUM: SOTA reconstruction methods beyond zero-order Tikhonov are
  missing.** The file names only classical Tikhonov regularization as the
  method, then cites the digital-twin survey (arXiv:2406.11445) without naming
  the modern method families the app competes with or builds on (spline/
  method-of-fundamental-solutions, graph/Bayesian, and physics-informed /
  deep-learning ECGi). CardioPINN is a physics-informed inverse solver; the
  problem statement should name the SOTA it advances past, not just the 2004
  baseline.
- **MEDIUM: no ECGi clinical-evidence use cases.** ECGi already has published
  accuracy in specific tasks (PVC / idiopathic-VT origin localization, CRT
  optimization, Brugada / atrial-flutter substrate). Naming one with a numeric
  localization accuracy would ground the "it partly works, but is
  ill-posed and unreliable over scar" argument in a concrete task.

---

## (3) Prioritized facts (with DOIs) to put into each problem statement

### ECGi problem statement (in priority order)

1. **The localization tolerance the clinic needs vs what ECGi delivers.**
   Pair the required accuracy (ablation lesion ~5-7 mm, so useful source
   localization must be within roughly a centimeter) against the measured
   in-patient reality: mean activation-time error **20.4 +/- 8.6 ms**, overall
   contact-map correlation **0.03 +/- 0.43** (per-patient -0.68 to 0.82),
   breakthrough sites mislocated **75.7 +/- 38.1 mm**, worst over scar
   (21.9 +/- 10.8 ms vs 17.5 +/- 6.7 ms). This is the honesty core.
   Source: Duchateau et al., Heart Rhythm 2019;16(3):435-442,
   **DOI 10.1016/j.hrthm.2018.10.010**. (Sub-cm target: attach a primary
   ablation-lesion-size / accuracy-requirement source before transcribing the
   tolerance number.)
2. **The inverse problem is mathematically ill-posed and regularization
   trades detail for stability.** This is the reason a physics-informed
   method is warranted. Source: "Solving the Inverse Problem of
   Electrocardiography for Cardiac Digital Twins: A Survey," **arXiv:2406.11445
   (2024)**.
3. **ECGi is a genuine non-invasive inverse reconstruction with a real
   accuracy floor.** 224-electrode vest localized a focus to ~10 mm early on.
   Source: Ramanathan et al., Nature Medicine 2004;10(4):422-428,
   **DOI 10.1038/nm1011**. Commercial embodiment: Medtronic CardioInsight
   252-electrode vest, first FDA-cleared non-invasive mapping system
   (re-anchor to the primary FDA 510(k) record, not trade press).
4. **The 12-lead ECG cannot localize: 8 independent leads = a low-dimensional
   projection, good for region not 3D site.** Source: Anter/Josephson-lineage
   review, **PubMed 29784487 (2018)**; real-time 12-lead VT-origin work,
   JACC:CEP **DOI 10.1016/j.jacep.2017.02.024**.
5. **Validation needs a dense heart-surface ground truth that patients lack;
   EDGAR supplies simultaneous body-surface + epicardial-sock potentials.**
   Source: Aras et al., J Electrocardiol 2015;48(6):975-981,
   **DOI 10.1016/j.jelectrocard.2015.08.008**;
   repository https://www.ecg-imaging.org/edgar-database.
6. **Stakes (fix the sourcing first):** AF ~52.55 M cases (2021,
   PMC12133759) and near-fivefold stroke risk (Wolf et al., Stroke 1991,
   **DOI 10.1161/01.STR.22.8.983**) are solid; replace the SCD 300-400k/yr
   figure's ablation-review attribution with a primary US SCD-epidemiology
   source before use.

### 4D-flow pressure problem statement (in priority order)

1. **4D-flow yields a full 3D relative pressure FIELD, not a 1D drop, but only
   up to an additive constant per frame.** This is the core "why it beats
   Doppler/catheter" fact. Source: Marlevi et al., Sci Rep 2019;9:1375,
   **DOI 10.1038/s41598-018-37714-0**.
2. **The accuracy yardstick (import from the clinical files):** reconstructed
   pressure agrees with FSI ground truth to peak-systole bias **+0.4 mmHg**
   (limits < 1 mmHg), peak-to-peak trans-coarctation difference **0.75 mmHg**
   (Saitta et al., J Biomech 2019;94:13-21,
   **DOI 10.1016/j.jbiomech.2019.07.004**), judged against the guideline
   thresholds that define "clinically meaningful": AS mean gradient **>= 40
   mmHg** (2020 ACC/AHA, **DOI 10.1161/CIR.0000000000000923**) and CoA
   peak-to-peak **>= 20 mmHg** (2018 AHA/ACC, **DOI 10.1161/CIR.0000000000000603**).
   State the target explicitly so the biases are interpretable.
3. **No single estimator wins everywhere (the honest ranking).** In silico STE
   < PPE field error but PPE least noise-sensitive; in the phantom vWERP most
   accurate, then STE, then PPE; coarse temporal resolution systematically
   underestimates the peak-systole transient. Source: Hardy et al. 2025,
   **arXiv:2503.02847** (PMC11908371). Pin the STE primary citation before
   transcribing the ranking.
4. **PPE amplifies velocity noise because its source differentiates a low
   velocity-to-noise-ratio field; divergence-free denoising removes the
   noise-induced compressible component first.** Sources: Krittian et al.,
   Med Image Anal 2012, **DOI 10.1016/j.media.2012.04.003** (gradient
   dependence, ~10 min/frame); Ong et al., Magn Reson Med 2015;73:828-842,
   **DOI 10.1002/mrm.25176** (low VNR + divergence-free wavelet denoising).
5. **The peak pressure is driven by the unsteady dv/dt term, so temporal
   resolution is the binding constraint** (quantify: ~28-30 ms TR used in the
   CoA validation, Rengier 2014 **DOI 10.3978/j.issn.2223-3652.2014.03.03**;
   Bissell clinician's guide recommends <= 30 ms,
   **DOI 10.1186/s13244-023-01458-x**). Source for the dominance claim: Hardy
   et al. 2025, **arXiv:2503.02847**.
6. **The PINN reframing (why CardioPINN):** enforce Navier-Stokes as a soft
   training regularizer to recover velocity + pressure from partial, noisy
   data. Sources: Raissi/Yazdani/Karniadakis, Science 2020;367:1026-1030,
   **DOI 10.1126/science.aaw4741** (HFM); Kissas et al., CMAME 2020;358:112623,
   **DOI 10.1016/j.cma.2019.112623** (first PINN on real clinical 4D-flow);
   Fathi et al., CMPB 2020;197:105729, **DOI 10.1016/j.cmpb.2020.105729**
   (super-resolution + pressure without prescribed geometry/BCs).

---

## Bottom line

- **Must-fix before transcription (6 items):** AS over-65 prevalence + "double
  by 2050" (drop or source); AS aorta <=30 mm flag (complete the Garcia/Pibarot
  citation or anchor to Baumgartner 1999); AS 23% misclassification (keep out
  until primary-sourced); CoA pressure-recovery Aslan (add DOI); ECGi SCD
  300-400k/yr (replace ablation-review attribution with primary epi); ECGi
  252-electrode / first-FDA-cleared (anchor to FDA 510(k)). Plus reconcile the
  Marlevi-2021 citation conflict across the two 4D-flow files.
- **Highest-value missing dimensions:** low-flow/low-gradient AS (the app's
  strongest argument, currently absent); CoA epidemiology (no stakes opener);
  a quantitative clinically-acceptable pressure-error target in the 4D-flow
  file; and a stated required-localization-accuracy in the ECGi file. Each is a
  one-to-two-sentence add with sources already in hand or one lookup away.
