# Fiber and conductivity inference (FiberNet)

Vertical id: `fiber-conductivity-inverse` - category: electrophysiology-fiber - lane: live (the fiber-angle
network is coordinate-driven and re-runs in the browser).

## The research topic

Myocardium is anisotropic: it conducts faster along the muscle fiber than across it. Activation therefore
obeys the anisotropic Eikonal equation

$$\sqrt{(\nabla T)^{\top} D\, \nabla T} = 1, \qquad D(x) = R(\alpha(x))\,\mathrm{diag}(c_l^2, c_t^2)\,R(\alpha(x))^{\top},$$

where `alpha(x)` is the local fiber angle and `cl`, `ct` are the conduction velocities along and across the
fiber. Recovering the fiber field and the anisotropy from measured activation is the FiberNet / PIEMAP problem
(Grandits, Pezzuto, Sahli Costabal, Perdikaris, Pock, Plank, Krause, arXiv:2102.10863; FiberNet extension,
Engineering with Computers 2022, DOI 10.1007/s00366-022-01709-3).

## Why several maps

A single activation map under-determines the fiber field: the wavefront from one stimulus only probes certain
directions, so many fiber configurations explain it equally well. Using several maps from different stimulus
sites, which sweep the wavefront across the tissue in different directions, jointly constrains a shared fiber
field and the anisotropy. The PINN shares one fiber-angle network and the two conduction velocities across
per-map activation networks, enforcing the anisotropic Eikonal residual for every map.

## Uncertainty (deep ensemble)

K independent fits (a deep ensemble) give the epistemic uncertainty of the recovered fiber field: where the
maps constrain the fibers, the ensemble agrees (low spread); where they do not, it disagrees. The fiber
orientation is recovered modulo pi (a fiber has no head or tail), so the ensemble is averaged with angle
doubling.

## Results (measured bake, seed 42)

| Quantity | recovered | truth |
|---|---|---|
| Fiber-angle RMSE | ~16 deg | - |
| Along-fiber CV cl | ~0.65 mm/ms | 0.70 |
| Across-fiber CV ct | ~0.42 mm/ms | 0.30 |
| Anisotropy ratio cl/ct | ~1.5 | ~2.3 |
| Mean ensemble uncertainty | ~1.4 deg | - |

The fiber orientation is recovered well (about 16 degrees RMSE over the whole field). The along-fiber velocity
is close to truth; the across-fiber velocity is harder to identify from sparse maps and is overestimated, so
the anisotropy ratio is underestimated (a known limitation of the inverse: transverse conduction is weakly
observed). The ensemble spread is small, which means the ensemble members agree, not that the estimate is
unbiased; epistemic UQ does not capture the systematic transverse-CV bias, which is stated honestly rather
than hidden.

## Scope and honesty

- Synthetic tissue with a smoothly rotating fiber field and a graph-based anisotropic-Eikonal ground truth.
  Real electroanatomical maps + a DT-MRI fiber atlas are the next data step.
- Not clinically validated. The recovered fiber network re-runs live in the browser (coordinate input).

## References

- Grandits T, Pezzuto S, Sahli Costabal F, Perdikaris P, Pock T, Plank G, Krause R (2021). Learning atrial
  fiber orientations and conductivity tensors from intracardiac maps using physics-informed neural networks.
  arXiv:2102.10863 (STACOM 2021).
- Grandits T et al. (2022). An inverse-problem approach to learn cardiac fiber orientation from multiple
  electroanatomical maps (FiberNet). Engineering with Computers. DOI 10.1007/s00366-022-01709-3.
