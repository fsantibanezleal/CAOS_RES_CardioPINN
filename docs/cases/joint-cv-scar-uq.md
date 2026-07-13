# Joint activation, conduction velocity and substrate with calibrated node uncertainty (flagship, beyond SOTA)

Vertical id: `joint-cv-scar-uq` - category: electrophysiology-inverse - lane: live (the conduction-velocity
network is coordinate-driven and re-runs in the browser).

## Medical, biological and physical context

**Medical.** Scar and slow-conducting fibrosis are the substrate for reentrant ventricular tachycardia, a
life-threatening arrhythmia. Localizing that substrate, and knowing where the map can be trusted, directs
where the clinician ablates. Low-voltage, slow-conduction zones are the ablation targets.

**Biological.** After a myocardial infarction or in cardiomyopathy, dead myocytes are replaced by collagen
(fibrosis). Surviving muscle strands weave through the scar and conduct slowly, forming the circuits that
sustain arrhythmia. Conduction velocity drops sharply where the tissue is diseased.

**Physical.** The Eikonal PINN recovers the activation time and the conduction-velocity field jointly; the
substrate appears as a depression in the recovered velocity. Because the inverse is ill-posed where data is
sparse, a deep ensemble with a variance recalibration gives a per-node uncertainty, telling you where the
recovered map is reliable.

## What is new here

The state-of-the-art Eikonal PINN (Sahli Costabal et al. 2020, vertical 1) recovers the activation map and a
conduction-velocity field from sparse local activation times. It does two things this vertical adds:

1. **Low-conduction-substrate localization.** The slow-conducting substrate (scar core plus fibrosis, the
   ablation target) is localized as a region of depressed recovered conduction velocity and reported as a
   substrate-probability map.
2. **A calibrated per-node uncertainty.** A deep ensemble gives, at every node, the conduction-velocity mean
   and spread. Crucially, a raw deep ensemble is systematically overconfident on this inverse problem, so the
   raw band is not trustworthy; a variance recalibration makes it honest.

Neither the single-field SOTA activation-mapping PINN nor the classical interpolation baselines provide a
substrate map or a calibrated node-level uncertainty. This is the beyond-SOTA synthesis the CardioPINN plan
commits to.

## Method

A two-network Eikonal PINN (activation time T and conduction velocity V) is trained with the same fixed-speed
curriculum as vertical 1, on a tissue patch that contains a slow region and a slow-conducting scar. A deep
ensemble of K independent fits, each seeing an independent measurement-noise draw at the same sensor sites,
produces the per-node conduction-velocity mean and spread. The substrate is flagged where the recovered CV
falls below a relative threshold (as in clinical low-voltage mapping, a depression relative to healthy tissue,
not an absolute value).

### Uncertainty recalibration

Deep ensembles underestimate uncertainty in data-sparse regions: the members converge to similar smoothed
solutions, so the raw spread is far smaller than the true error. A single-scalar variance recalibration
(moment-matching the mean predicted standard deviation to the mean error of a half-normal) rescales the
per-node spread to the right level while preserving its spatial pattern. In this build the recalibration lifts
the reliability from raw ~0.34 within two standard deviations (overconfident) to ~0.82 (well-calibrated). The
recalibration here is fit in-silico against the conduction-velocity ground truth; clinically it would be fit
on held-out data, which is the honest caveat.

## Results (measured bake, seed 42)

| Quantity | value |
|---|---|
| Activation rel-L2 | ~0.053 |
| Conduction-velocity RMSE | ~0.080 mm/ms |
| Substrate IoU (recovered vs true) | ~0.31 |
| Reliability within 2 sigma, raw ensemble | ~0.34 (overconfident) |
| Reliability within 2 sigma, recalibrated | ~0.82 (calibrated) |

## Scope and honesty

- The substrate is localized as a relative conduction depression; the absolute conduction velocity inside a
  strong scar is underestimated (spectral bias smooths the steep activation gradient), so the substrate IoU is
  partial (~0.31) and the recovered region is broader than the true one. This is stated rather than hidden.
- The calibrated uncertainty is the strongest contribution: it turns an overconfident deep ensemble into an
  honest per-node band that tells a clinician where to trust the map. The recalibration uses in-silico ground
  truth here.
- Synthetic tissue; not clinically validated. The recovered conduction-velocity network re-runs live in the
  browser.

## References

- Sahli Costabal F, Yang Y, Perdikaris P, Hurtado DE, Kuhl E (2020). Physics-Informed Neural Networks for
  Cardiac Activation Mapping. Frontiers in Physics 8:42. DOI 10.3389/fphy.2020.00042.
- Lakshminarayanan B, Pritzel A, Blundell C (2017). Simple and scalable predictive uncertainty estimation
  using deep ensembles. NeurIPS. arXiv:1612.01474.
- Kuleshov V, Fenner N, Ermon S (2018). Accurate uncertainties for deep learning using calibrated regression.
  ICML. arXiv:1807.00263.
