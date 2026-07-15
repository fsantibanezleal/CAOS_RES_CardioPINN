// The citation registry (ADR-0016 §7 / ADR-0017 §4): every entry carries a real DOI or URL. Inline <Cite id>
// references an entry; a per-section <Refs ids={[...]}> lists only that section's sources. Never a
// bottom-of-page bibliography dump.
export interface Citation {
  id: string;
  label: string;      // short in-text label, e.g. "Barr 1977"
  citation: string;   // full reference
  doi?: string;
  url?: string;
}

export const CITATIONS: Record<string, Citation> = {
  barr1977: {
    id: 'barr1977', label: 'Barr 1977',
    citation: 'Barr RC, Ramsey M, Spach MS (1977). Relating epicardial to body surface potential distributions by means of transfer coefficients based on geometry measurements. IEEE Trans. Biomed. Eng. 24(1):1-11.',
    doi: '10.1109/TBME.1977.326201',
  },
  rudy1988: {
    id: 'rudy1988', label: 'Rudy 1988',
    citation: 'Rudy Y, Messinger-Rapport BJ (1988). The inverse problem in electrocardiography: solutions in terms of epicardial potentials. Crit. Rev. Biomed. Eng. 16(3):215-268.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/3064971/',
  },
  ramanathan2004: {
    id: 'ramanathan2004', label: 'Ramanathan 2004',
    citation: 'Ramanathan C, Ghanem RN, Jia P, Ryu K, Rudy Y (2004). Noninvasive electrocardiographic imaging for cardiac electrophysiology and arrhythmia. Nature Medicine 10(4):422-428.',
    doi: '10.1038/nm1011',
  },
  hansen1992: {
    id: 'hansen1992', label: 'Hansen 1992',
    citation: 'Hansen PC (1992). Analysis of discrete ill-posed problems by means of the L-curve. SIAM Review 34(4):561-580.',
    doi: '10.1137/1034115',
  },
  tikhonov1977: {
    id: 'tikhonov1977', label: 'Tikhonov 1977',
    citation: 'Tikhonov AN, Arsenin VY (1977). Solutions of Ill-Posed Problems. Winston & Sons, Washington DC.',
    url: 'https://archive.org/details/solutionsofillpo0000tikh',
  },
  aras2015: {
    id: 'aras2015', label: 'Aras 2015 (EDGAR)',
    citation: 'Aras K, Good W, Tate J, et al. (2015). Experimental Data and Geometric Analysis Repository (EDGAR). Journal of Electrocardiology 48(6):975-981.',
    doi: '10.1016/j.jelectrocard.2015.08.008',
  },
  cluitmans2018: {
    id: 'cluitmans2018', label: 'Cluitmans 2018',
    citation: 'Cluitmans M, Brooks DH, MacLeod R, et al. (2018). Validation and Opportunities of Electrocardiographic Imaging: From Technical Achievements to Clinical Applications. Front. Physiol. 9:1305.',
    doi: '10.3389/fphys.2018.01305',
  },
  ghosh2009: {
    id: 'ghosh2009', label: 'Ghosh 2009',
    citation: 'Ghosh S, Rudy Y (2009). Application of L1-norm regularization to epicardial potential solution of the inverse electrocardiography problem. Ann. Biomed. Eng. 37(5):902-912.',
    doi: '10.1007/s10439-009-9665-6',
  },
  raissi2019: {
    id: 'raissi2019', label: 'Raissi 2019',
    citation: 'Raissi M, Perdikaris P, Karniadakis GE (2019). Physics-informed neural networks: A deep learning framework for solving forward and inverse problems involving nonlinear PDEs. J. Comput. Phys. 378:686-707.',
    doi: '10.1016/j.jcp.2018.10.045',
  },
  sahli2020: {
    id: 'sahli2020', label: 'Sahli Costabal 2020',
    citation: 'Sahli Costabal F, Yang Y, Perdikaris P, Hurtado DE, Kuhl E (2020). Physics-Informed Neural Networks for Cardiac Activation Mapping. Frontiers in Physics 8:42.',
    doi: '10.3389/fphy.2020.00042',
  },
  // Legacy key 'bear2018' is a misnomer: the paper is Bear et al. 2015 (label/year/DOI below are correct).
  // Kept so the existing <Refs id="bear2018"> in the pages still resolve; renaming the key would require
  // coordinated edits to Introduction/Methodology/Implementation/RealEcgi, which is out of this file's scope.
  bear2018: {
    id: 'bear2018', label: 'Bear 2015',
    citation: 'Bear LR, Cheng LK, LeGrice IJ, Sands GB, Lever NA, Paterson DJ, Smaill BH (2015). Forward problem of electrocardiography: is it solved? Circulation: Arrhythmia and Electrophysiology 8(3):677-684.',
    doi: '10.1161/CIRCEP.114.001573',
  },
  diffusion2026: {
    id: 'diffusion2026', label: 'Diffusion inverse-ECG 2026',
    citation: 'Valdes Jara R, Meyers A (2026). Geometry-Free Conditional Diffusion Modeling for Solving the Inverse Electrocardiography Problem. arXiv:2601.18615.',
    url: 'https://arxiv.org/abs/2601.18615',
  },
  lakshminarayanan2017: {
    id: 'lakshminarayanan2017', label: 'Lakshminarayanan 2017',
    citation: 'Lakshminarayanan B, Pritzel A, Blundell C (2017). Simple and scalable predictive uncertainty estimation using deep ensembles. NeurIPS 30.',
    url: 'https://arxiv.org/abs/1612.01474',
  },
  raissi2020: {
    id: 'raissi2020', label: 'Raissi 2020 (HFM)',
    citation: 'Raissi M, Yazdani A, Karniadakis GE (2020). Hidden fluid mechanics: Learning velocity and pressure fields from flow visualizations. Science 367(6481):1026-1030.',
    doi: '10.1126/science.aaw4741',
  },
  krittian2012: {
    id: 'krittian2012', label: 'Krittian 2012',
    citation: 'Krittian SBS, Lamata P, Michler C, Nordsletten DA, Bock J, Bradley CP, Pitcher A, Kilner PJ, Markl M, Smith NP (2012). A finite-element approach to the direct computation of relative cardiovascular pressure from time-resolved MR velocity data. Medical Image Analysis 16(5):1029-1037.',
    doi: '10.1016/j.media.2012.04.003',
  },
  vanoosterom1983: {
    id: 'vanoosterom1983', label: 'Van Oosterom 1983',
    citation: 'Van Oosterom A, Strackee J (1983). The solid angle of a plane triangle. IEEE Transactions on Biomedical Engineering BME-30(2):125-126.',
    doi: '10.1109/TBME.1983.325207',
  },

  // --- Aortic stenosis / coarctation clinical grading (4D-flow problem statement) ---
  otto2020vhd: {
    id: 'otto2020vhd', label: 'Otto 2020 (ACC/AHA VHD)',
    citation: 'Otto CM, Nishimura RA, Bonow RO, et al. (2021). 2020 ACC/AHA Guideline for the Management of Patients With Valvular Heart Disease. Circulation 143(5):e72-e227.',
    doi: '10.1161/CIR.0000000000000923',
  },
  vahanian2021esc: {
    id: 'vahanian2021esc', label: 'Vahanian 2021 (ESC/EACTS VHD)',
    citation: 'Vahanian A, Beyersdorf F, Praz F, et al. (2022). 2021 ESC/EACTS Guidelines for the management of valvular heart disease. European Heart Journal 43(7):561-632.',
    doi: '10.1093/eurheartj/ehab395',
  },
  baumgartner1999: {
    id: 'baumgartner1999', label: 'Baumgartner 1999',
    citation: 'Baumgartner H, Stefenelli T, Niederberger J, Schima H, Maurer G (1999). Overestimation of catheter gradients by Doppler ultrasound in patients with aortic stenosis: a predictable manifestation of pressure recovery. Journal of the American College of Cardiology 33(6):1655-1661.',
    doi: '10.1016/S0735-1097(99)00066-2',
  },
  osnabrugge2013: {
    id: 'osnabrugge2013', label: 'Osnabrugge 2013',
    citation: 'Osnabrugge RLJ, Mylotte D, Head SJ, et al. (2013). Aortic stenosis in the elderly: disease prevalence and number of candidates for transcatheter aortic valve replacement. Journal of the American College of Cardiology 62(11):1002-1012.',
    doi: '10.1016/j.jacc.2013.05.015',
  },
  stout2018achd: {
    id: 'stout2018achd', label: 'Stout 2018 (AHA/ACC ACHD)',
    citation: 'Stout KK, Daniels CJ, Aboulhosn JA, et al. (2019). 2018 AHA/ACC Guideline for the Management of Adults With Congenital Heart Disease. Circulation 139(14):e698-e800.',
    doi: '10.1161/CIR.0000000000000603',
  },
  // NOTE: real 4D-flow coarctation source, currently defined but not yet wired into any <Refs>
  // (wiring belongs in Flow4d.tsx, out of this file's scope); kept rather than dropped.
  rengier2014: {
    id: 'rengier2014', label: 'Rengier 2014',
    citation: 'Rengier F, Delles M, Eichhorn J, et al. (2014). Noninvasive pressure difference mapping derived from 4D flow MRI in patients with unrepaired and repaired aortic coarctation. Cardiovascular Diagnosis and Therapy 4(2):97-103.',
    doi: '10.3978/j.issn.2223-3652.2014.03.03',
  },
  saitta2019: {
    id: 'saitta2019', label: 'Saitta 2019',
    citation: 'Saitta S, Pirola S, Piatti F, et al. (2019). Evaluation of 4D flow MRI-based non-invasive pressure assessment in aortic coarctations. Journal of Biomechanics 94:13-21.',
    doi: '10.1016/j.jbiomech.2019.07.004',
  },
  // NOTE: real 4D-flow primer, currently defined but not yet wired into any <Refs>
  // (wiring belongs in Flow4d.tsx, out of this file's scope); kept rather than dropped.
  bissell2023: {
    id: 'bissell2023', label: 'Bissell 2023',
    citation: 'Bissell MM, et al. (2023). A clinician\'s guide to understanding aortic 4D flow MRI. Insights into Imaging 14:122.',
    doi: '10.1186/s13244-023-01458-x',
  },

  // --- 4D-flow relative-pressure method family (SOTA for the 4D-flow case) ---
  ebbers2001: {
    id: 'ebbers2001', label: 'Ebbers 2001',
    citation: 'Ebbers T, Wigstrom L, Bolger AF, Engvall J, Karlsson M (2001). Estimation of relative cardiovascular pressures using time-resolved three-dimensional phase contrast MRI. Magnetic Resonance in Medicine 45(5):872-879.',
    doi: '10.1002/mrm.1116',
  },
  donati2015: {
    id: 'donati2015', label: 'Donati 2015 (WERP)',
    citation: 'Donati F, Figueroa CA, Smith NP, Lamata P, Nordsletten DA (2015). Non-invasive pressure difference estimation from PC-MRI using the work-energy equation. Medical Image Analysis 26(1):159-172.',
    doi: '10.1016/j.media.2015.08.012',
  },
  marlevi2019: {
    id: 'marlevi2019', label: 'Marlevi 2019 (vWERP)',
    citation: 'Marlevi D, Ruijsink B, Balmus M, et al. (2019). Estimation of cardiovascular relative pressure using virtual work-energy. Scientific Reports 9:1375.',
    doi: '10.1038/s41598-018-37714-0',
  },
  ong2015: {
    id: 'ong2015', label: 'Ong 2015',
    citation: 'Ong F, Uecker M, Tariq U, et al. (2015). Robust 4D flow denoising using divergence-free wavelet transform. Magnetic Resonance in Medicine 73(2):828-842.',
    doi: '10.1002/mrm.25176',
  },
  kissas2020: {
    id: 'kissas2020', label: 'Kissas 2020',
    citation: 'Kissas G, Yang Y, Hwuang E, Witschey WR, Detre JA, Perdikaris P (2020). Machine learning in cardiovascular flows modeling: predicting arterial blood pressure from non-invasive 4D flow MRI data using physics-informed neural networks. Computer Methods in Applied Mechanics and Engineering 358:112623.',
    doi: '10.1016/j.cma.2019.112623',
  },
  fathi2020: {
    id: 'fathi2020', label: 'Fathi 2020',
    citation: 'Fathi MF, Perez-Raya I, Baghaie A, et al. (2020). Super-resolution and denoising of 4D-flow MRI using physics-informed deep neural nets. Computer Methods and Programs in Biomedicine 197:105729.',
    doi: '10.1016/j.cmpb.2020.105729',
  },
  hardy2025: {
    id: 'hardy2025', label: 'Hardy 2025',
    citation: 'Hardy B, Zimmermann J, Lechner V, et al. (2025). Comprehensive Analysis of Relative Pressure Estimation Methods Utilizing 4D Flow MRI. arXiv:2503.02847.',
    doi: '10.48550/arXiv.2503.02847',
  },

  // --- ECGi clinical problem depth ---
  wolf1991: {
    id: 'wolf1991', label: 'Wolf 1991 (Framingham)',
    citation: 'Wolf PA, Abbott RD, Kannel WB (1991). Atrial fibrillation as an independent risk factor for stroke: the Framingham Study. Stroke 22(8):983-988.',
    doi: '10.1161/01.STR.22.8.983',
  },
  duchateau2019: {
    id: 'duchateau2019', label: 'Duchateau 2019',
    citation: 'Duchateau J, Sacher F, Pambrun T, et al. (2019). Performance and limitations of noninvasive cardiac activation mapping. Heart Rhythm 16(3):435-442.',
    doi: '10.1016/j.hrthm.2018.10.010',
  },
  // Legacy key 'gharib2024digitaltwin' is a misnomer: the survey has no Gharib author (first author is Li).
  // Key kept so the existing <Refs id="gharib2024digitaltwin"> in RealEcgi still resolves; renaming is out of this file's scope.
  gharib2024digitaltwin: {
    id: 'gharib2024digitaltwin', label: 'Digital-twin ECGi survey 2024',
    citation: 'Li L, Camps J, Rodriguez B, Grau V (2024). Solving the Inverse Problem of Electrocardiography for Cardiac Digital Twins: A Survey. arXiv:2406.11445.',
    url: 'https://arxiv.org/abs/2406.11445',
  },
};
