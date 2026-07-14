# ECGi clinical problem depth (dossier)

Topic: deepen the problem statement for the ECG-imaging (ECGi) case in CardioPINN.
Compiled 2026-07-14. Every quantitative claim below is tied to a primary source (guideline,
peer-reviewed paper, or curated repository). Claims that could not be confirmed to a primary
source are listed under "Unverified".

## Verified facts

### Epidemiology and stakes

- Global prevalence of atrial fibrillation / atrial flutter reached about 52.55 million cases in
  2021, with roughly 4.48 million new cases that year (age-standardized incidence about 52.1 per
  100,000). Source: GBD-based analysis, "Global burden and health inequality of atrial
  fibrillation/atrial flutter from 1990 to 2021", PMC12133759 (2025).
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12133759/
- Atrial fibrillation carries a lifetime risk on the order of 1 in 3 to 1 in 5 after age 45.
  Source: same GBD 2021 analysis (PMC12133759).
- Atrial fibrillation is an independent risk factor for stroke, conferring a near fivefold excess
  of stroke; AF's attributable stroke risk rises with age (from about 1.5% at 50-59 y to about 23.5%
  at 80-89 y in Framingham). Source: Wolf, Abbott, Kannel, "Atrial fibrillation as an independent
  risk factor for stroke: the Framingham Study", Stroke 1991;22(8):983-988.
  DOI: 10.1161/01.STR.22.8.983
- Sudden cardiac death accounts for roughly 300,000 to 400,000 deaths per year in the United States,
  and is most commonly driven by ventricular tachyarrhythmias (ventricular tachycardia degenerating
  to ventricular fibrillation). Source: review literature summarized via JACC: Clinical
  Electrophysiology, "Ventricular Tachycardia Ablation: Past, Present, and Future Perspectives",
  DOI: 10.1016/j.jacep.2019.09.015 (SCD burden figure; commonly cited US range).
- Catheter ablation of ventricular tachycardia reduces VT recurrence and ICD therapies in
  structural heart disease, though a mortality benefit is not firmly established. Source: JACC:CEP
  2019, DOI: 10.1016/j.jacep.2019.09.015.

### Why the 12-lead ECG cannot localize the source

- The standard 12-lead ECG provides only 8 independent leads (the other 4 are linear combinations),
  i.e. a very low-dimensional projection of the whole-heart electrical field onto a handful of body
  points. It supports coarse, region-level inference of a ventricular arrhythmia's site of origin
  (e.g. RVOT vs LVOT, basal vs apical) via morphology algorithms, but not a precise 3D source
  location. Source: Anter/Josephson-lineage review "Localization of Ventricular Arrhythmias for
  Catheter Ablation: The Role of Surface Electrocardiogram", PubMed 29784487 (2018);
  and real-time 12-lead VT-origin localization work, JACC:CEP, DOI: 10.1016/j.jacep.2017.02.024.
- Catheter ablation is inherently a localization problem: it delivers focal lesions and therefore
  depends on knowing the arrhythmia's origin or its critical isthmus/exit site. Today that
  localization is obtained invasively, with intracardiac electroanatomic mapping catheters, one
  chamber at a time, during the procedure. Source: JACC:CEP 2019 VT ablation review,
  DOI: 10.1016/j.jacep.2019.09.015.

### What ECGi does, the commercial system, and validation

- ECGi is a non-invasive inverse reconstruction: it records body-surface potentials from a
  multi-electrode array, combines them with a patient-specific heart-torso geometry from CT (or MRI),
  and reconstructs epicardial/heart-surface potentials, unipolar electrograms, and activation
  (isochrone) maps by solving the inverse problem of electrocardiography. Source: Ramanathan, Ghanem,
  Jia, Ryu, Rudy, "Noninvasive electrocardiographic imaging for cardiac electrophysiology and
  arrhythmia", Nature Medicine 2004;10(4):422-428. DOI: 10.1038/nm1011. That study used a 224-electrode
  vest and reported localizing an arrhythmic focus to roughly 10 mm accuracy.
- The commercial embodiment is Medtronic's CardioInsight system: a single-use 252-electrode
  body-surface vest fused with a cardiac CT, giving panoramic single-beat maps of both atria or both
  ventricles. It received US FDA 510(k) clearance as the first commercially available non-invasive
  cardiac electrical mapping system. Source: Medtronic / FDA 510(k) clearance coverage (MassDevice,
  Cardiac Rhythm News, 2017). https://www.massdevice.com/medtronic-wins-fda-clearance-cardioinsight-3d-mapping-tech/

### Honest clinical limitations

- The inverse problem of electrocardiography is mathematically ill-posed: many internal source
  configurations produce nearly indistinguishable body-surface potentials, so small input errors
  (geometry, segmentation, noise) can produce large output errors. Regularization (e.g. zero-order
  Tikhonov) is required to stabilize the solution, which trades spatial detail for stability.
  Source: "Solving the Inverse Problem of Electrocardiography for Cardiac Digital Twins: A Survey",
  arXiv:2406.11445 (2024); segmentation-uncertainty study PMC10544807.
- Direct in-patient validation against invasive contact mapping shows ECGi activation maps are only
  moderately accurate and heterogeneous: mean activation-time error 20.4 +/- 8.6 ms; overall
  between-map correlation with contact maps was poor (0.03 +/- 0.43), with per-patient correlation
  ranging from -0.68 to 0.82. Wide-QRS/paced rhythms did better (0.68 +/- 0.17). Primary epicardial
  breakthrough sites were imaged 75.7 +/- 38.1 mm from their true contact-mapped location, and errors
  were larger over scar (21.9 +/- 10.8 ms vs 17.5 +/- 6.7 ms). Source: Duchateau, Sacher, Pambrun,
  ... Dubois, "Performance and limitations of noninvasive cardiac activation mapping", Heart Rhythm
  2019;16(3):435-442. DOI: 10.1016/j.hrthm.2018.10.010.
- There is no routine per-patient gold standard in the clinic: invasive electroanatomic maps are
  spatially sparse and rarely epicardial and endocardial simultaneously, so ECGi accuracy in living
  patients is hard to certify. This is precisely why experimental data with a dense heart-surface
  ground truth matter.

### EDGAR: the experimental gold-standard data

- EDGAR (Experimental Data and Geometric Analysis Repository) is a curated, freely distributed
  archive built specifically to validate ECGi methods against a real heart-surface gold standard.
  It aggregates canine torso-tank/experimental data (University of Utah), human clinical data
  (Charles University Hospital, Prague), and simulation data (Karlsruhe Institute of Technology),
  each bundled with the torso and cardiac geometry needed to pose the inverse problem. Source:
  Aras, Good, Tate, ... MacLeod, "Experimental Data and Geometric Analysis Repository - EDGAR",
  Journal of Electrocardiology 2015;48(6):975-981. DOI: 10.1016/j.jelectrocard.2015.08.008.
- Its value for ECGi is that experimental datasets provide simultaneously measured body-surface
  potentials AND directly recorded epicardial sock potentials on the same beat, i.e. the
  ground-truth heart-surface signal that a reconstruction can be scored against, which is unavailable
  in most patients. Source: Aras 2015 (DOI: 10.1016/j.jelectrocard.2015.08.008); repository at
  https://www.ecg-imaging.org/edgar-database

## Draft prose (for the app)

Atrial fibrillation and ventricular tachycardia are common and dangerous. Atrial fibrillation now
affects on the order of 52 million people worldwide, and it is not benign: the Framingham cohort
showed it confers a near fivefold excess risk of stroke, independent of other factors, with the
attributable risk climbing steeply into old age. Ventricular tachycardia sits upstream of most of the
300,000 to 400,000 sudden cardiac deaths recorded each year in the United States. For both, the
definitive treatment when drugs fail is catheter ablation: burning or freezing the small piece of
tissue that starts or sustains the arrhythmia. Ablation is, fundamentally, a localization problem. You
cannot destroy a source you cannot find.

The problem is that the tool used to read the heart's electricity, the standard 12-lead ECG, cannot
find it. Twelve leads are really only eight independent signals: a very low-dimensional projection of
a three-dimensional electrical field onto a few points on the skin. That projection is enough to
diagnose that an arrhythmia exists and to guess a broad region of origin from waveform morphology, but
it cannot resolve a precise 3D site on the heart surface. So in practice the origin is found the hard
way, invasively, by threading mapping catheters into the chambers during the procedure and sampling
the surface point by point, one chamber at a time.

Electrocardiographic imaging (ECGi) tries to recover what the 12-lead throws away. It records a dense
body-surface potential map from a multi-electrode vest (Medtronic's FDA-cleared CardioInsight system
uses a 252-electrode vest), fuses it with a patient-specific heart-torso geometry from CT, and solves
the inverse problem of electrocardiography to reconstruct potentials, electrograms, and activation
maps across the whole heart surface from a single beat, non-invasively and panoramically. Early human
work localized an arrhythmic focus to roughly 10 mm. The honest catch is that this inverse problem is
ill-posed: many different heart-surface sources produce almost the same body-surface signal, so tiny
errors in geometry, segmentation, or noise blow up in the reconstruction, and regularization buys
stability by sacrificing detail. When ECGi has been checked directly against invasive contact maps in
patients, agreement was moderate at best and highly variable: mean activation-time errors around 20 ms,
overall correlation near zero (with per-patient values from -0.68 to 0.82), and breakthrough sites
mislocated by tens of millimeters, worst over scar, which is exactly the tissue ablation cares about.

This is why validation cannot rest on patients alone: a living patient has no dense heart-surface gold
standard to score a reconstruction against. The EDGAR repository (Aras et al., 2015) exists for this.
It curates experimental datasets, notably canine torso-tank recordings, where body-surface potentials
and directly measured epicardial sock potentials are captured on the same beat, together with the
geometry needed to pose the inverse problem. That gives a real, measured heart-surface truth to test a
reconstruction against, which is what makes it the right benchmark for a physics-informed reconstruction
method rather than one more clinically plausible but unfalsifiable map.
