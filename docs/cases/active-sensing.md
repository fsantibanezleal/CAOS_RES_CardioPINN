# Uncertainty-driven active sensing (next-best electrode)

Vertical id: `active-sensing` - category: electrophysiology-inverse - lane: live (the final activation
network is coordinate-driven and re-runs in the browser).

## The research topic

A mapping catheter acquires points one at a time and the procedure is long, so where the next point goes
matters. If the reconstruction exposes an uncertainty, that uncertainty can drive acquisition: place the next
electrode where the model is least certain, so accuracy rises fastest per point. The state-of-the-art
activation-mapping PINN exposes an uncertainty but does not act on it; closing that loop is the contribution.

## The study

This is an offline re-simulation study: the true activation is known, so any location can be queried. Starting
from a small seed set, electrodes are added one at a time under three strategies:

- **active**: the next site is the maximum posterior uncertainty (Gaussian-process posterior standard
  deviation, a closed-form instant instance of the deep-ensemble epistemic variance from the flagship vertical),
- **random**: a random site,
- **uniform**: a space-filling grid subsample.

After each addition the reconstruction error is recorded. At the end the Eikonal PINN is fit on the
actively-chosen versus the randomly-chosen sites to confirm the physics-informed reconstruction also benefits.

## Results (measured bake, seed 42)

| Strategy | electrodes to reach 10% rel-L2 |
|---|---|
| Active (uncertainty-driven) | 15 |
| Random | 30 |
| Uniform | 44 |

Active sensing reaches the target accuracy with about **half** the electrodes of random placement, and fewer
still than uniform. At the full budget the actively-chosen sites give a lower reconstruction error for both
the Gaussian-process (0.037 vs 0.063) and the physics-informed PINN (0.044 vs 0.050). The actively-chosen
electrodes cluster where the field is hard to reconstruct (the slow-conduction region and the wavefront
boundaries).

## Scope and honesty

- Synthetic tissue with a known ground truth (required to run the acquisition study). The uncertainty here is
  the Gaussian-process posterior variance, used as a fast, closed-form stand-in for the deep-ensemble PINN
  variance; the final reconstruction is the Eikonal PINN.
- Not clinically validated. A real acquisition loop would run inside the mapping system and use the PINN
  ensemble variance directly. The final actively-trained activation network re-runs live in the browser.

## References

- Sahli Costabal F, Yang Y, Perdikaris P, Hurtado DE, Kuhl E (2020). Physics-Informed Neural Networks for
  Cardiac Activation Mapping. Frontiers in Physics 8:42. DOI 10.3389/fphy.2020.00042.
- Settles B (2009). Active Learning Literature Survey. University of Wisconsin-Madison, Computer Sciences
  Technical Report 1648.
