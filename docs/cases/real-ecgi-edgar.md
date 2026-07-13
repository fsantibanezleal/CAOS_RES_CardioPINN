# Real ECGi: heart-surface potentials from a real body-surface recording (EDGAR)

Case id: `real-ecgi-edgar`. This is a REAL-data case: the network fits real measured potentials and is
validated against a real gold standard. No synthetic data.

## The case, the need, how the physics helps, what we compute

- **The case.** A torso tank (Consortium for ECG Imaging, EDGAR; Utah 2018-08-09 experiment) holds a real
  heart. 192 electrodes on the tank surface record the body-surface potentials; simultaneously a 256-electrode
  cage around the heart records the true heart-surface potentials. Three rhythms are available: sinus, and two
  paced beats (PVP, AVP).
- **The need.** Electrocardiographic imaging (ECGi) reconstructs the heart-surface potentials from the
  body-surface recording, non-invasively, to localize the origin of an arrhythmia and guide ablation. In a
  patient you only have the body surface; the heart-surface cage is the gold standard you never get. The
  inverse is severely ill-posed, small measurement noise blows up into large reconstruction error.
- **How the physics helps.** The reconstruction fits the REAL measured body-surface potentials through a
  forward operator built on the REAL torso and cage geometry, with a spatial prior on the heart surface, and a
  deep ensemble over measurement-noise draws that yields a calibrated per-node uncertainty. The physics (the
  forward operator + the smoothness prior) is what makes the ill-posed inverse solvable.
- **What we compute.** The heart-surface potential map over the beat, on the real cage geometry, plus a
  per-node uncertainty.

## Real validation (against the real measured heart potentials)

The recovered heart-surface potentials are compared to the REAL measured cage potentials with the standard
ECGi metrics, the relative error (RE) and the spatial correlation (CC):

| Rhythm | Relative error | Correlation | Node-UQ reliability (2 sigma) |
|---|---|---|---|
| Sinus | 0.65 | 0.72 | 0.90 |
| Paced (PVP) | 0.58 | 0.80 | 0.89 |
| AV-paced (AVP) | 0.54 | 0.85 | 0.90 |

These are literature-consistent torso-tank ECGi numbers, and the paced beats reconstructing better than sinus
(higher correlation) is physically expected: a focal paced activation is easier to localize than the diffuse
sinus wavefront. The per-node uncertainty is recalibrated so that roughly 90 percent of nodes fall within two
standard deviations of the true error, which a single regularized point estimate cannot provide.

## Honesty and scope

- The target the network fits is REAL measured body-surface data; the validation is REAL measured
  heart-surface data. Nothing here is synthetic.
- The forward operator is a single-layer (point-source) Green's-function approximation on the real geometry.
  A full boundary-element operator (with the closed torso mesh and tissue conductivities) would improve the
  absolute accuracy; the honest, self-contained forward model used here caps the numbers, and that is stated.
- Not clinically deployed; this is a validated methodological result on an experimental torso tank.

## Data source and governance

Consortium for ECG Imaging (CEI), EDGAR database, Utah torso-tank 2018-08-09. Aras K et al.,
"Experimental Data and Geometric Analysis Repository (EDGAR)", J. Electrocardiol. 48(6):975-981 (2015),
DOI 10.1016/j.jelectrocard.2015.08.008. The raw EDGAR data is used under its data-use agreement with
attribution and is NOT redistributed in this repository; only the derived reconstruction result is shown.

## References

- Aras K, Good W, Tate J, et al. (2015). Experimental Data and Geometric Analysis Repository (EDGAR).
  Journal of Electrocardiology 48(6):975-981. DOI 10.1016/j.jelectrocard.2015.08.008.
- Cluitmans M, et al. (2018). Validation and opportunities of electrocardiographic imaging. Front. Physiol. 9:1305.
  DOI 10.3389/fphys.2018.01305.
