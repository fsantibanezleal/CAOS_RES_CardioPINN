# Aortic coarctation (CoA) grading, the pressure gradient, and 4D-flow MRI as a clinical tool

Research dossier section, dated 2026-07-14. All quantitative claims are checked against a primary
source (guideline, peer-reviewed paper, or review) with DOI/URL. Numbers that could not be confirmed
to a primary source are listed under "Unverified" and must not be stated as fact in the app.

## Verified facts

### Guideline thresholds for intervention

- 2020 ESC ACHD guideline: in HYPERTENSIVE patients with an increased non-invasive gradient between
  upper and lower limbs confirmed by invasive measurement (peak-to-peak >= 20 mmHg), repair of
  coarctation or re-coarctation is a Class I indication; catheter stenting is preferred when technically
  feasible. In NORMOTENSIVE patients with the same confirmed peak-to-peak gradient >= 20 mmHg, catheter
  treatment "should be considered" (Class IIa). Source: Baumgartner H, et al. 2020 ESC Guidelines for the
  management of adult congenital heart disease. Eur Heart J. 2021;42(6):563-645.
  DOI: 10.1093/eurheartj/ehaa554. (ACC key-points summary: acc.org ten-points-to-remember 2020.)

- 2018 AHA/ACC ACHD guideline: intervention for coarctation is recommended (Class I) when (1) the
  peak-to-peak coarctation gradient is >= 20 mmHg, or (2) the peak-to-peak gradient is < 20 mmHg but
  there is anatomic imaging evidence of significant coarctation with radiologic evidence of significant
  collateral flow. Intervention may be considered (Class IIb) in patients with > 50% aortic narrowing
  relative to the aortic diameter at the level of the diaphragm, regardless of the pressure gradient and
  presence of hypertension. Source: Stout KK, et al. 2018 AHA/ACC Guideline for the Management of Adults
  With Congenital Heart Disease. Circulation. 2019;139(14):e698-e800.
  DOI: 10.1161/CIR.0000000000000603 (also JACC 2019;73(12):e81-e192, DOI: 10.1016/j.jacc.2018.08.1029).
  PubMed: 30121239.

- The invasive reference standard for the gradient is the PEAK-TO-PEAK catheter gradient (difference
  between the peak systolic pressure proximal and distal to the lesion), not an instantaneous Doppler
  peak. Both guidelines require invasive confirmation of a non-invasive gradient before intervening on
  the gradient criterion. (Same guideline sources above.)

### Why Doppler-estimated gradients are unreliable in CoA

- The clinical Doppler estimate uses the SIMPLIFIED Bernoulli equation, delta_P = 4 * v_max^2, which
  drops the proximal-velocity term and the viscous and unsteady (flow-acceleration) terms. In coarctation
  this systematically OVERESTIMATES the true (catheter, peak-to-peak) gradient. Source: Seifert BL, et al.
  "Accuracy and pitfalls of Doppler evaluation of the pressure gradient in aortic coarctation."
  J Am Coll Cardiol. 1986;7(6):1379-1385. DOI: 10.1016/S0735-1097(86)80160-7. PubMed: 3711495.

- The dominant physical reason is PRESSURE RECOVERY: downstream of the stenosis, part of the kinetic
  energy converts back to pressure, so the true net (peak-to-peak) gradient is lower than the maximal
  instantaneous gradient predicted from peak velocity. Overestimation is worst in mild or long/tandem
  lesions and when the distal aorta is not much larger than the throat. Source: Aslan S, et al. (in vitro
  segmental-stenosis model showing pressure recovery explains Doppler overestimation of the invasive
  gradient). "Pressure recovery explains Doppler overestimation of invasive pressure gradient across
  segmental vascular stenosis." PubMed: 19845724.

- Correlation with the catheter peak-to-peak gradient improves markedly only when the PROXIMAL (pre-coarctation)
  velocity is retained in the expanded Bernoulli relation delta_P = 4 * (v_max^2 - v_prox^2); using v_max
  alone correlates poorly with catheter. (Seifert BL, et al. 1986, DOI: 10.1016/S0735-1097(86)80160-7.)

- Additional clinical confounders that break the single-velocity Doppler estimate in CoA: extensive
  collateral flow (unloads the true gradient), long-segment or tandem narrowing (cumulative viscous loss
  the simplified equation ignores), and post-repair residual/aneurysmal geometry. (2018 AHA/ACC guideline,
  DOI: 10.1161/CIR.0000000000000603, notes collateral flow can make the gradient criterion misleading and
  therefore adds the imaging + collateral pathway.)

### What 4D-flow MRI measures and its acquisition parameters

- 4D-flow MRI is time-resolved (cine), 3D, three-directional phase-contrast MRI: it encodes the full
  velocity vector (three directions) at every voxel of a 3D volume covering the whole thoracic aorta,
  across the cardiac cycle. It is non-invasive and can be acquired without contrast (contrast improves
  velocity-to-noise ratio). Source: Bissell MM, et al. / review "A clinician's guide to understanding
  aortic 4D flow MRI." Insights Imaging. 2023;14:122. DOI: 10.1186/s13244-023-01458-x. PMC10317921.

- Recommended acquisition for the aorta: spatial resolution 2.5 x 2.5 x 2.5 mm or smaller; temporal
  resolution 30 ms or shorter; acquisition time 5 to 25 min. VENC (velocity-encoding limit) must be set
  equal to or just above the expected peak velocity: too low causes aliasing, too high lowers
  velocity-to-noise ratio. Source: same clinician's guide, DOI: 10.1186/s13244-023-01458-x.

- Pressure is not measured directly. Relative-pressure fields are computed from the measured velocity
  field by solving the Navier-Stokes momentum equation, typically via the Pressure Poisson Equation
  (PPE) or work-energy relative pressure (WERP/virtual-work) formulations. Source: clinician's guide,
  DOI: 10.1186/s13244-023-01458-x; and method paper Rengier F, et al., below.

### 4D-flow-derived pressure vs invasive/reference pressure (validation literature)

- Method + patient demonstration: Rengier F, et al. "Noninvasive pressure difference mapping derived
  from 4D flow MRI in patients with unrepaired and repaired aortic coarctation." Cardiovasc Diagn Ther.
  2014;4(2):97-103. DOI: 10.3978/j.issn.2223-3652.2014.03.03. PMC3996241. Pressure computed by
  integrating the Navier-Stokes momentum equation over multiple integration paths. In 4 CoA patients vs
  4 volunteers: healthy proximal-aorta pressure differences ~0 to 2.5 mmHg, distal arch ~5 to 7.5 mmHg;
  a pressure drop of ~12 mmHg across the isthmus in coarctation. VENC 350 cm/s (patients), reconstructed
  voxel 1.6 x 1.6 x 2.1 mm, temporal resolution 28 ms.

- Accuracy of the PPE/STE pressure estimator against a high-fidelity reference: Saitta S, et al.
  "Evaluation of 4D flow MRI-based non-invasive pressure assessment in aortic coarctations."
  J Biomech. 2019;94:13-21. DOI: 10.1016/j.jbiomech.2019.07.004. PubMed: 31326119. Against
  fluid-structure-interaction ground truth, Bland-Altman bias +0.4 mmHg (limits +/- 0.978) at peak
  systole, -1.1 mmHg (+/- 1.06) at end-diastole, +0.6 mmHg (+/- 1.97) time-averaged; peak-to-peak
  trans-coarctation pressure-drop difference 0.75 mmHg.

- Estimator comparison and resolution robustness: Bertoglio C / Marlevi D, et al. "Validation of 4D
  Flow based relative pressure maps in aortic flows." Med Image Anal. 2021;74:102214.
  DOI: 10.1016/j.media.2021.102214. The STE (virtual-work / work-energy) estimator is more accurate than
  the simpler PPE for high-severity, convection-dominated flow and is more robust to segmentation and
  boundary errors; both are robust across MRI resolutions.

### Honest limitations of 4D-flow pressure in CoA (state of the evidence)

- Direct IN-VIVO validation of 4D-flow-derived pressure against simultaneous catheter peak-to-peak
  gradients in CoA patients remains limited; most quantitative validation is in-vitro (phantom vs
  catheter) or against CFD/FSI ground truth. This is an honest gap: the app should present 4D-flow
  pressure as a physically-grounded, non-invasive ESTIMATE, not a proven catheter substitute. (Basis:
  the validation studies above use in-vitro or CFD/FSI references; the patient series are small, e.g.
  n=4 in Rengier 2014.)

## Draft prose (for the app)

Coarctation of the aorta is not graded by how narrow the arch looks; it is graded by the pressure it
costs. Both the 2018 AHA/ACC and the 2020 ESC adult-congenital guidelines converge on one number: a
peak-to-peak catheter gradient of 20 mmHg or more across the lesion. In a hypertensive patient with that
confirmed gradient, repair (surgical or, preferably, catheter stenting) is a Class I indication; in a
normotensive patient it is a weaker "should be considered." The word peak-to-peak is doing real work
here: the reference is the difference between the peak systolic pressures measured proximal and distal
to the narrowing at catheterization, the true pressure the left ventricle must overcome, not an
instantaneous velocity peak. The guidelines add a deliberate escape hatch, because the gradient alone
can lie: intervention is still recommended when the gradient is below 20 mmHg if imaging shows a tight
coarctation feeding significant collateral flow, since collaterals bleed off the very gradient that is
supposed to signal severity.

That escape hatch exists largely because the non-invasive gradient we get at the bedside is untrustworthy
in exactly this lesion. Echocardiography estimates the gradient from the peak jet velocity through the
simplified Bernoulli equation, delta_P = 4 v_max squared, which silently discards the proximal velocity,
the viscous losses along a long or tandem narrowing, and the unsteady flow-acceleration term. In
coarctation this overestimates the catheter gradient, and the mechanism is well characterized: pressure
recovery. Downstream of the throat, part of the jet's kinetic energy is reconverted to pressure, so the
net gradient the ventricle actually sees is smaller than the maximal instantaneous drop implied by peak
velocity. The overestimation is worst in mild lesions and where the distal aorta is not much wider than
the coarctation. Correlation with catheter is restored only when the proximal velocity is put back in,
delta_P = 4 (v_max squared minus v_proximal squared), which is precisely the term routine single-window
Doppler tends to omit. Long segments, collaterals, and post-repair geometry compound the error, which is
why the guidelines insist on invasive confirmation before intervening on the gradient criterion.

This is the gap 4D-flow MRI is meant to close. A 4D-flow acquisition is time-resolved, three-directional
phase-contrast MRI: it records the full velocity vector at every voxel of a 3D volume spanning the entire
thoracic aorta across the cardiac cycle, non-invasively and without contrast if needed, at a recommended
2.5 mm isotropic spatial resolution and 30 ms or better temporal resolution in a 5 to 25 minute scan. The
velocity-encoding limit (VENC) is tuned just above the expected peak velocity to avoid aliasing while
preserving velocity-to-noise ratio. Crucially, MRI does not measure pressure; it measures the velocity
field, and pressure is recovered by solving the Navier-Stokes momentum equation for a relative-pressure
field, using either the Pressure Poisson formulation or a work-energy (virtual-work) estimator. That
reconstruction sees the whole flow field, including the proximal velocity and the spatial acceleration
that Doppler's single number cannot, so it recovers the physically correct pressure drop rather than an
overestimate.

The honest state of the evidence is that this works well against controlled references and is promising,
not yet a proven catheter replacement. Reconstructed pressure agrees closely with fluid-structure-interaction
ground truth (peak-systole bias about 0.4 mmHg, limits under 1 mmHg; peak-to-peak trans-coarctation
difference under 1 mmHg), and the work-energy estimator is more accurate and more robust to segmentation
error than the simpler Poisson approach for the severe, convection-dominated jets that coarctation
produces. Patient demonstrations recover physiologically sensible maps, for example an isthmic pressure
drop near 12 mmHg in coarctation against roughly 0 to 2.5 mmHg proximally in healthy aortas. What is still
thin is direct in-vivo comparison against simultaneous catheter peak-to-peak gradients in coarctation
patients, where the series remain small (single-digit n) and most quantitative validation is in-vitro or
against computational ground truth. The right framing for the app is therefore precise: 4D-flow pressure
mapping is a physically grounded, non-invasive estimate of the same peak-to-peak drop the guidelines care
about, computed from the full velocity field rather than a lossy single-velocity shortcut, and its value
is in visualizing where and when pressure is lost along the aorta, not in claiming to have retired the
catheter.
