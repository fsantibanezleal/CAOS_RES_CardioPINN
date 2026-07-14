# Aortic valve stenosis: grading of severity and why the pressure gradient matters

Dossier section for the CardioPINN "why measure the gradient" problem statement.
Research date: 2026-07-14. All quantitative claims verified against a primary source (guideline, DOI paper, or arXiv). Numbers not confirmable to a primary source are listed under Unverified.

## Verified facts

### Guideline severity thresholds (severe, high-gradient AS)

- Peak aortic jet velocity: >= 4.0 m/s -> severe (high-gradient) AS.
  Source: Otto CM, Nishimura RA, Bonow RO, et al. 2020 ACC/AHA Guideline for the Management of Patients With Valvular Heart Disease. Circulation. 2021;143(5):e72-e227. DOI 10.1161/CIR.0000000000000923.
- Mean transvalvular pressure gradient: >= 40 mmHg -> severe (high-gradient) AS.
  Source: same 2020 ACC/AHA guideline (Stage D1 definition). DOI 10.1161/CIR.0000000000000923.
- Aortic valve area (AVA): <= 1.0 cm2 (typically < 1.0; "very severe" often quoted < 0.6-0.8 cm2), indexed AVA < 0.6 cm2/m2.
  Source: Vahanian A, Beyersdorf F, Praz F, et al. 2021 ESC/EACTS Guidelines for the management of valvular heart disease. Eur Heart J. 2022;43(7):561-632. DOI 10.1093/eurheartj/ehab395.
- Dimensionless index / velocity ratio (VTI_LVOT / VTI_AV, or V_LVOT / V_AV): < 0.25 -> severe AS.
  Source: 2021 ESC/EACTS guideline (DOI 10.1093/eurheartj/ehab395); reiterated in the EACVI/ASE echo recommendations, Baumgartner H, et al. Eur Heart J Cardiovasc Imaging. 2017;18(3):254-275, DOI 10.1093/ehjci/jew335.
- The three primary echo instruments for grading are: peak jet velocity (CW Doppler), mean gradient (from the velocity trace via the Bernoulli relation), and AVA (continuity equation). They should be concordant; discordance triggers a stepwise re-evaluation.
  Source: Baumgartner H, et al. EACVI/ASE recommendations. DOI 10.1093/ehjci/jew335.

### The non-invasive standard: simplified Bernoulli, and what it neglects

- Clinical gradients are computed from the CW Doppler jet velocity with the simplified Bernoulli equation, dp = 4 * Vmax^2 (dp in mmHg, V in m/s). It is a reduction of the full unsteady Bernoulli energy balance, dp = 4*(V2^2 - V1^2) + (convective/viscous/local-acceleration terms).
  Source: Heys JJ, Holyoak N, Calleja AM, et al. Revisiting the Simplified Bernoulli Equation. Open Biomed Eng J. 2010;4:123-128. DOI 10.2174/1874120701004010123. Formula also in EACVI/ASE (DOI 10.1093/ehjci/jew335).
- Four documented physical simplifications: (1) the proximal (LVOT/upstream) velocity V1 is dropped; (2) viscous friction losses are ignored; (3) the local (unsteady) flow-acceleration term is ignored, i.e. steady flow assumed; (4) pressure recovery downstream of the vena contracta is not modeled.
  Source: Heys et al. 2010, DOI 10.2174/1874120701004010123.
- Proximal velocity cannot be neglected when the LVOT velocity exceeds ~1.5 m/s (or when the valvular jet velocity is below ~3 m/s); in those cases the expanded form dp = 4*(V2^2 - V1^2) must be used or the gradient is overestimated.
  Source: EACVI/ASE recommendations, Baumgartner H, et al. 2017, DOI 10.1093/ehjci/jew335 (see also asecho.org 2017 valve-stenosis guideline PDF).
- Pressure recovery: CW Doppler captures the pressure drop from the LV to the vena contracta, but part of the kinetic energy is reconverted to pressure ("recovered") in the ascending aorta. Doppler therefore overestimates the net (catheter) gradient. It is clinically relevant when the ascending aorta is small; the accepted flag is ascending aorta diameter <= 30 mm.
  Source: Bignoto TC, et al. Echocardiographic Evaluation of Aortic Stenosis: A Comprehensive Review. 2023, PMC10417789; mechanism and energy-loss framing in Garcia D, Pibarot P, et al.
- Magnitude of the Doppler-vs-catheter discrepancy from pressure recovery: in a validated in vitro model, Doppler-catheter gradient differences ranged from about -2 mmHg (severe stenosis, large aorta) up to 66 mmHg, an ~80% overestimation by Doppler, when stenosis was only moderate and the aorta was small.
  Source: Baumgartner H, Stefenelli T, Niederberger J, Schima H, Maurer G. "Overestimation" of catheter gradients by Doppler ultrasound in patients with aortic stenosis: a predictable manifestation of pressure recovery. J Am Coll Cardiol. 1999;33(6):1655-1661. DOI 10.1016/S0735-1097(99)00066-2. In vitro determinants (aortic size, valve area, jet direction): Baumgartner H, et al. Circulation. 1996;94(8):1934-1943. DOI 10.1161/01.CIR.94.8.1934.
- Angle dependence and single-scanline sampling: CW Doppler measures only the velocity component along the beam, so a beam not aligned with the jet underestimates the true peak velocity; multiple acoustic windows (apical, right parasternal, suprasternal, subcostal) are mandatory to find the highest velocity. Relying only on non-apical or a single window misclassifies AS severity in up to ~23% of patients.
  Source: EACVI/ASE recommendations (DOI 10.1093/ehjci/jew335); 23% figure reported in Bignoto TC, et al. 2023 review, PMC10417789.

### Epidemiology of calcific AS in older adults

- Pooled prevalence in adults > 75 years: all-severity AS 12.4% (95% CI 6.6-18.2%); severe AS 3.4%. Meta-analysis of 7 studies / 9,723 subjects.
  Source: Osnabrugge RLJ, Mylotte D, Head SJ, et al. Aortic stenosis in the elderly: disease prevalence and number of candidates for TAVR. J Am Coll Cardiol. 2013;62(11):1002-1012. DOI 10.1016/j.jacc.2013.05.015.
- Calcific AS is broadly cited at ~2-3% prevalence in adults over 65, rising with age; the disease burden is projected to roughly double by 2050 with population aging.
  Source: 2020 ACC/AHA guideline background (DOI 10.1161/CIR.0000000000000923); consistent with Osnabrugge 2013 (DOI 10.1016/j.jacc.2013.05.015).

### Why a spatially resolved pressure field beats a single peak-gradient number

- A single peak/mean gradient collapses a 3D, time-varying flow into one scalar sampled along one Doppler line. It cannot localize the vena contracta, quantify how much pressure is recovered downstream, or separate viscous/turbulent energy loss from convective acceleration, exactly the terms the simplified Bernoulli equation discards.
  Source: Heys et al. 2010 (DOI 10.2174/1874120701004010123); Baumgartner 1999 (DOI 10.1016/S0735-1097(99)00066-2).
- A resolved field (from 4D-flow MRI or a physics-informed / Navier-Stokes reconstruction) yields the full pressure map, including the net transvalvular drop after recovery and an energy-loss-based severity index, which is what the catheter reference actually measures. This directly addresses the documented Doppler overestimation rather than applying a population correction to a single number.
  Source: methodological framing in reviews of AS hemodynamics from Bernoulli/Doppler to Navier-Stokes; pressure-recovery-distance mapping demonstrated with 4D-flow CMR (J Cardiovasc Magn Reson. 2023, DOI 10.1186/s12968-023-00914-3).

## Draft prose (for the app)

Aortic valve stenosis is the most common valve disease requiring intervention in the aging population: pooled prevalence in adults over 75 reaches 12.4% for any aortic stenosis and 3.4% for severe disease (Osnabrugge et al., JACC 2013), and the burden is projected to roughly double by 2050. The decision to replace a valve hinges almost entirely on hemodynamics. Both the 2020 ACC/AHA and 2021 ESC/EACTS guidelines define severe, high-gradient stenosis by three concordant numbers: a peak jet velocity of at least 4.0 m/s, a mean transvalvular gradient of at least 40 mmHg, and an aortic valve area at or below 1.0 cm2 (velocity ratio below 0.25). The pressure gradient is not a secondary readout; it is the pivot of the treatment decision.

Yet the number that drives that decision is produced by a deliberately simplified physics model. Clinical practice converts a Doppler jet velocity to pressure with dp = 4*Vmax^2, a reduction of the full Bernoulli energy balance that silently discards four physical terms: the upstream velocity, viscous friction, the unsteady flow-acceleration term, and pressure recovery. Each simplification has a documented failure mode. When the outflow-tract velocity exceeds about 1.5 m/s, dropping it overstates the gradient, and the expanded form dp = 4*(V2^2 - V1^2) is required (EACVI/ASE 2017). Because continuous-wave Doppler samples only the velocity component along a single scan line, a beam misaligned with the eccentric jet underestimates the true peak, so severity is misclassified in up to about 23% of patients when the highest-velocity window is not interrogated.

The most instructive error runs the other way. Doppler measures the pressure drop down to the vena contracta, but a fraction of that kinetic energy is reconverted to pressure a few centimeters downstream in the ascending aorta, the "pressure recovery" the catheter actually feels. Doppler therefore systematically overestimates the net gradient a surgeon or catheter would record, and the effect is largest exactly where it can flip a diagnosis: in a validated model, Doppler-catheter differences reached 66 mmHg, an 80% overestimation, when the stenosis was moderate and the aorta was small (Baumgartner et al., JACC 1999). Guidelines flag this whenever the ascending aorta is 30 mm or smaller. A patient can be labeled "severe" by echo yet carry a materially lower true gradient.

This is why a single peak-gradient scalar is a thin summary of a rich flow field. One number sampled along one line cannot localize the vena contracta, quantify how much pressure is recovered, or separate irreversible viscous and turbulent energy loss from reversible convective acceleration, which are precisely the terms the simplified equation throws away. A spatially resolved pressure field, reconstructed from 4D-flow data by enforcing the Navier-Stokes equations rather than a one-line approximation, recovers the net transvalvular drop after recovery and an energy-loss-based severity index that tracks the invasive reference. Measuring the gradient well, as a field and not a point, is what closes the documented gap between the non-invasive estimate and the physiology that determines whether a valve should be replaced.

## Unverified / caveats

- The "up to 23% misclassification when non-apical windows are neglected" figure is quoted from the 2023 review (PMC10417789) citing an original study; the original primary study was not opened directly in this pass.
- The exact AVA cutoff wording varies by guideline edition and by "severe" vs "very severe" (< 0.6-0.8 cm2 for very severe); the <= 1.0 cm2 severe threshold is consistent across ACC/AHA 2020 and ESC/EACTS 2021.
- The Bernoulli-to-Navier-Stokes review (ScienceDirect S1050173821001468) was found in search but not fetched in full; used only as directional framing, not as a numeric source.
