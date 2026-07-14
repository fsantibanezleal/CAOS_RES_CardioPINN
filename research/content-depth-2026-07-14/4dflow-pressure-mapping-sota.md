# 4D-flow MRI pressure mapping: state of the art (method family this app implements)

Dossier section. Compiled 2026-07-14. Every quantitative claim below is tied to a primary source
(guideline, peer-reviewed paper with DOI, or arXiv). Claims that could not be primary-source-confirmed
are listed under "Unverified / needs check".

Scope: how a relative pressure field is recovered from a measured 4D-flow (time-resolved 3D three-directional
phase-contrast MRI) velocity field. The method families are: (A) pressure-Poisson estimation (PPE), including
the iterative finite-element PPE; (B) work-energy relative pressure (WERP) and virtual WERP (vWERP), plus the
Stokes estimator (STE); (C) divergence-free / solenoidal denoising as a pre-conditioner and why the PPE source
term amplifies velocity noise; (D) physics-informed neural networks (PINNs) for hemodynamics, super-resolving
4D-flow and recovering pressure; and (E) the dominance of the unsteady acceleration term at peak systole.

## Verified facts

- 4D-flow MRI measures relative (not absolute) pressure only: it yields a time-resolved 3D + time velocity
  field, and pressure is reconstructed up to an additive constant per frame; unlike catheter or Doppler, which
  give a 1D pressure drop, 4D-flow can produce a full 3D relative pressure field.
  Source: Marlevi et al. 2019, Scientific Reports 9:1375. DOI 10.1038/s41598-018-37714-0.

- Pressure-Poisson estimation (PPE) is derived by taking the divergence of the incompressible Navier-Stokes
  momentum equation, which cancels the pressure-time coupling and leaves a Poisson equation for pressure,
  Laplacian(p) = div(R), with R the momentum residual (transient + convective + viscous terms) evaluated from
  the measured velocity, solved with Neumann boundary conditions. Seminal application to cardiovascular MRI:
  relative pressure computed along the Navier-Stokes equations inside a time-resolved 3D PC-MRI dataset.
  Source: Ebbers et al. 2001, Magnetic Resonance in Medicine 45(5):872-879. DOI 10.1002/mrm.1116.

- The iterative / direct finite-element PPE (FE-PPE) discretizes the pressure-Poisson problem with a Galerkin
  finite-element formulation over the segmented flow domain and solves for the unknown relative pressure field
  directly from the measured velocities; reported cost about 10 minutes per frame in a Fortran 2008
  implementation. The method depends heavily on accurate spatial velocity gradients and an accurate flow-domain
  segmentation.
  Source: Krittian et al. 2012, Medical Image Analysis 16(5):1029-1037. DOI 10.1016/j.media.2012.04.003.

- Work-Energy Relative Pressure (WERP) recasts the problem as an integral energy balance of the Navier-Stokes
  equation over the vessel volume, so pressure difference between two planes is obtained without a computational
  mesh and by direct integration of the velocity field; validated in silico and on a cohort of 9 subjects, with
  good accuracy, robustness to noise, and robustness to segmentation.
  Source: Donati et al. 2015, Medical Image Analysis 26(1):159-172. DOI 10.1016/j.media.2015.08.012.

- Virtual WERP (vWERP) generalizes WERP using a virtual (auxiliary) field and a temporal-domain intersect so
  that relative pressure can be probed through arbitrary vascular and cardiac structures (including intracardiac
  flow), reducing sensitivity to the outer boundary; it produces realistic ventricular relative pressure
  patterns from clinical 4D-flow.
  Source: Marlevi et al. 2019, Scientific Reports 9:1375. DOI 10.1038/s41598-018-37714-0.
  Intracardiac extension: Marlevi et al. 2021, Medical Image Analysis 68:101948
  (Non-invasive estimation of relative pressure for intracardiac flows using virtual work-energy),
  PubMed 33383332.

- Head-to-head comparison of the three current estimators (vWERP, PPE, STE) across in silico, in vitro and in
  vivo data: in silico, the Stokes estimator (STE) had lower pressure-field error than PPE, but PPE was less
  noise sensitive; in the flow phantom, vWERP was the most accurate, followed by STE then PPE; low temporal
  resolution caused systematic underestimation of highly transient peak pressure events (peak systole).
  Source: Hardy, Zimmermann, Lechner, Bonini, Sotelo, Burris, Ennis, Marlevi, Nordsletten 2025,
  Comprehensive Analysis of Relative Pressure Estimation Methods Utilizing 4D-Flow MRI,
  arXiv:2503.02847 (submitted to IEEE Transactions on Medical Imaging). DOI 10.48550/arXiv.2503.02847.
  Also indexed at PMC11908371.

- Why the PPE source amplifies noise: the Poisson source is the divergence of the momentum residual, which
  contains a velocity-gradient product (convective term div(u . grad u)); forming spatial derivatives of a
  noisy, low velocity-to-noise-ratio velocity field amplifies high-frequency noise, so PPE accuracy is
  strongly gated by velocity-gradient quality and domain segmentation.
  Sources (gradient dependence): Krittian et al. 2012, Med Image Anal 16(5):1029-1037,
  DOI 10.1016/j.media.2012.04.003; (low velocity-to-noise ratio of clinical 4D-flow and its propagation into
  flow-derived quantities such as pressure gradients and wall shear stress): Ong et al. 2015, Magnetic Resonance
  in Medicine 73:828-842, DOI 10.1002/mrm.25176.

- Divergence-free (solenoidal) denoising exploits that blood is incompressible, so the true velocity field is
  nominally divergence-free; projecting the measured field onto (or penalizing departures from) the
  divergence-free subspace removes the noise-induced compressible component before pressure is computed.
  Divergence-free wavelet denoising: Ong et al. 2015, Magnetic Resonance in Medicine 73:828-842,
  DOI 10.1002/mrm.25176. A neural variant parameterizes velocity as the curl of a vector potential so that
  mass conservation (div u = 0) holds by construction: DAF-FlowNet, arXiv:2604.00205 (2026).

- Hidden Fluid Mechanics (HFM): a physics-informed deep-learning framework that encodes the Navier-Stokes
  equations into a neural network, is agnostic to geometry and boundary/initial conditions, and recovers the
  full velocity and pressure fields from partial observations (e.g. a passive scalar), shown to be robust to
  low resolution and substantial noise.
  Source: Raissi, Yazdani, Karniadakis 2020, Science 367(6481):1026-1030. DOI 10.1126/science.aaw4741.

- First PINN applied to real, noisy clinical cardiovascular data to predict arterial blood pressure from
  non-invasive 4D-flow (blood velocity plus wall displacement), enforcing conservation of mass and momentum as
  a soft PDE regularizer so the network yields physically consistent pressure with limited data.
  Source: Kissas, Yang, Hwuang, Witschey, Detre, Karniadakis 2020, Computer Methods in Applied Mechanics and
  Engineering 358:112623. DOI 10.1016/j.cma.2019.112623.

- Physics-informed super-resolution and denoising of 4D-flow: velocities, pressure, and MRI magnitude are
  modeled as a patient-specific neural network trained with data fidelity in complex Cartesian space plus
  Navier-Stokes and continuity residuals as regularization, producing CFD-quality velocity and a recovered
  pressure field on an arbitrary region of interest without specifying vascular geometry or boundary conditions.
  Source: Fathi, Perez-Raya, Baghaie, Berg, Janiga, Arzani, D'Souza 2020, Computer Methods and Programs in
  Biomedicine 197:105729. DOI 10.1016/j.cmpb.2020.105729.

- Unsteady (dv/dt) acceleration term dominates at peak systole: pressure-estimation accuracy falls when
  temporal resolution drops because the estimators no longer have the frames to resolve the highly transient
  pressure drop at peak systole, which is driven by the local acceleration (temporal-derivative) term of the
  momentum balance; insufficient temporal resolution systematically underestimates the transient peak.
  Source: Hardy et al. 2025, arXiv:2503.02847, DOI 10.48550/arXiv.2503.02847 (PMC11908371).

## Draft prose (for the app)

Blood flow does not tell you pressure directly; 4D-flow MRI measures a time-resolved 3D velocity field, and a
pressure field has to be reconstructed from it. Because the measurement fixes only velocity, the result is a
relative pressure field, recovered up to an additive constant per frame, but that is already far richer than
what a catheter pullback or a Doppler jet gives you, which is a single one-dimensional pressure drop. The
classical route is the pressure-Poisson equation (PPE): take the divergence of the incompressible
Navier-Stokes momentum equation, which cancels the awkward pressure-time coupling and leaves a Poisson problem,
Laplacian(p) = div(R), where R collects the transient, convective and viscous terms evaluated from the measured
velocity (Ebbers et al., Magn Reson Med 2001; Krittian et al., Med Image Anal 2012). Solved with a finite-element
Galerkin scheme over the segmented lumen and Neumann boundaries, this yields a full 4D relative pressure map,
but at a real cost: the source term contains a velocity-gradient product, so it differentiates a noisy,
low velocity-to-noise-ratio field, and any error in the gradients or in the segmentation propagates straight
into the pressure (Krittian et al. 2012; Ong et al., Magn Reson Med 2015).

The work-energy family was built to sidestep that fragility. WERP integrates the Navier-Stokes equation as an
energy balance over the vessel volume, so a pressure difference between two planes drops out of a direct
integral of the velocity field with no computational mesh, and it was shown to be robust to noise and to
segmentation in a 9-subject cohort (Donati et al., Med Image Anal 2015). Its virtual extension, vWERP,
introduces an auxiliary (virtual) field and a temporal intersect so that relative pressure can be probed
through arbitrary vascular and intracardiac structures without being dominated by the outer boundary (Marlevi
et al., Sci Rep 2019; Marlevi et al., Med Image Anal 2021). The honest picture from the most recent head-to-head
study is that no single estimator wins everywhere: in silico the Stokes estimator gave lower field error than
PPE while PPE was the least noise sensitive, and in a physical flow phantom vWERP was the most accurate,
followed by the Stokes estimator and then PPE (Hardy et al., arXiv:2503.02847, 2025).

A recurring failure mode ties all of these methods together: the transient, local-acceleration term. At peak
systole the pressure gradient is driven largely by dv/dt, and when the temporal resolution of the acquisition
is too coarse the estimators simply do not have the frames to resolve that spike, which produces a systematic
underestimation of the peak pressure regardless of the spatial method used (Hardy et al. 2025). This is why the
denoising problem is not cosmetic. Because blood is effectively incompressible, the true velocity field is
solenoidal (div u = 0), so projecting the measurement onto the divergence-free subspace, classically with a
divergence-free wavelet transform (Ong et al. 2015) or, more recently, by parameterizing velocity as the curl
of a learned vector potential so mass conservation holds by construction (DAF-FlowNet, arXiv:2604.00205, 2026),
removes exactly the compressible, noise-induced component that the PPE source would otherwise amplify.

The physics-informed neural network line reframes the whole pipeline as one inverse problem. Hidden Fluid
Mechanics encodes the Navier-Stokes equations inside the network and recovers velocity and pressure jointly
from partial, noisy observations, agnostic to geometry and boundary conditions (Raissi, Yazdani, Karniadakis,
Science 2020). Applied to imaging, Kissas et al. (Comput Methods Appl Mech Eng 2020) put a PINN on real noisy
clinical 4D-flow, enforcing conservation of mass and momentum as a soft constraint to predict arterial pressure
from velocity and wall motion, and Fathi et al. (Comput Methods Programs Biomed 2020) modeled velocity, pressure
and MRI magnitude as one patient-specific network trained with data fidelity plus Navier-Stokes and continuity
residuals, super-resolving and denoising the field and recovering pressure without a prescribed mesh or boundary
conditions. The common thread with WERP/PPE is the same physics; the PINN just enforces it as a training
regularizer instead of a discretized operator, which is what lets it absorb noise and sparse sampling rather
than amplify them.

## Unverified / needs check

- Marlevi et al. 2021 intracardiac vWERP: journal volume/pages recorded here as Medical Image Analysis 68:101948
  from secondary indexing; DOI not independently confirmed in this pass (PubMed 33383332 confirmed). Verify the
  exact volume and DOI before adding to the citation registry.
- The Stokes estimator (STE) is evaluated in Hardy et al. 2025 and in Marlevi et al. 2021 (Validation of 4D Flow
  based relative pressure maps in aortic flows, Med Image Anal 2021, ScienceDirect PII S1361841521002401); the
  primary paper that first introduces STE and its exact DOI were not pinned down in this pass.
- DAF-FlowNet (arXiv:2604.00205) is a 2026 preprint; treat as preprint (not peer-reviewed) and re-verify the
  author list and arXiv number before citing.
