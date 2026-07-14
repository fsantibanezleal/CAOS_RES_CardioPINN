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
  bear2018: {
    id: 'bear2018', label: 'Bear 2015',
    citation: 'Bear LR, Cheng LK, LeGrice IJ, Sands GB, Lever NA, Paterson DJ, Smaill BH (2015). Forward problem of electrocardiography: is it solved? Circulation: Arrhythmia and Electrophysiology 8(3):677-684.',
    doi: '10.1161/CIRCEP.114.001573',
  },
  diffusion2026: {
    id: 'diffusion2026', label: 'Diffusion inverse-ECG 2026',
    citation: 'Geometry-Free Conditional Diffusion Modeling for Solving the Inverse Electrocardiography Problem (2026).',
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
};
