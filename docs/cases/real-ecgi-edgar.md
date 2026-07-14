# Real ECGi: heart-surface potentials from a real body-surface recording (EDGAR)

Case id: `real-ecgi-edgar`. This is a REAL-data case: the network fits real measured potentials and is
validated against a real gold standard. No synthetic data.

## The case, the need, how the physics helps, what we compute

- **The case.** A MULTI-DATASET catalogue of real EDGAR experiments reconstructed by the identical pipeline
  (no per-heart retuning): (1) a human torso tank (Utah 2018-08-09) where 192 tank electrodes record the
  body-surface potentials and a 256-electrode cage records the true heart-surface potentials, in sinus and two
  paced beats (PVP, AVP); (2) an in-situ dog (Maastricht) where 140 body electrodes record the body surface and
  a 1321-node epicardial mesh records the true heart surface, in sinus. In each, the heart-surface recording is
  the gold standard a patient never has.
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

| Dataset | Beat | Relative error | Correlation | Node-UQ reliability (2 sigma) |
|---|---|---|---|---|
| Human torso tank | Sinus | 0.65 | 0.72 | 0.90 |
| Human torso tank | Paced (PVP) | 0.58 | 0.80 | 0.89 |
| Human torso tank | AV-paced (AVP) | 0.54 | 0.85 | 0.90 |
| In-situ dog | Sinus | 0.54 | 0.78 | 0.90 |

These are literature-consistent torso-tank ECGi numbers, and the paced beats reconstructing better than sinus
(higher correlation) is physically expected: a focal paced activation is easier to localize than the diffuse
sinus wavefront. The per-node uncertainty is recalibrated so that roughly 90 percent of nodes fall within two
standard deviations of the true error, which a single regularized point estimate cannot provide.

## Honesty and scope

- The target the network fits is REAL measured body-surface data; the validation is REAL measured
  heart-surface data. Nothing here is synthetic.
- Two forward operators are implemented: the single-layer (point-source) Green's-function approximation, and
  a full boundary-element operator (BEM) with exact triangle solid angles (Van Oosterom-Strackee) for the
  double layer. The BEM is analytic-gated on the concentric-sphere problem (correlation 1.00, error halving
  per mesh refinement). Honest finding: on the real electrode geometry the BEM does NOT beat the calibrated
  single-layer. It needs closed 2-manifold surfaces (the human torso-tank surface is open, so the BEM applies
  only to the dog case), and where it applies the coarse 140-node torso makes the reconstruction
  regularization-dominated (dog: single-layer RE 0.54 vs BEM RE 0.63), so forward-operator fidelity is not the
  bottleneck. The single-layer stays the default; the BEM matters as electrode density and mesh closure
  improve. This null result is reported, not hidden.
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
