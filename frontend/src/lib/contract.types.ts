// Artifact-contract mirror (frontend side). These interfaces mirror the two REAL committed JSON traces the
// offline pipeline bakes and the static web reads: the ECGi catalogue (data/derived/real-ecgi-catalogue/
// catalogue.json, baked by cardiopinnlab.real.ecgi_catalogue) and the 4D-flow pressure trace
// (data/derived/real-flow4d-pressure/trace.json, baked by cardiopinnlab.real.flow4d_bake). Keep in lock-step
// with those bakers; any drift makes `tsc` fail where the pages consume these shapes.

// ---- Case A: ECG imaging catalogue (schema "cardiopinn.ecgi-catalogue/v2") ---------------------------------

export interface EcgiMesh {
  vertices: number[][];   // [n][3] mm, centred + scaled heart-cage geometry
  triangles: number[][];  // [m][3] vertex indices
  n_vertices: number;
  n_triangles: number;
}

export interface EcgiBeat {
  mesh: EcgiMesh;
  times_ms: number[];                          // decimated frame times over the beat
  fields_over_time: {
    recovered_mV: number[][];                  // [frame][node] our reconstruction (signed)
    measured_mV: number[][];                   // [frame][node] the REAL cage gold standard (signed)
    abs_error_mV: number[][];                  // [frame][node]
    uncertainty_mV: number[][];                // [frame][node] recalibrated per-node spread
  };
  metrics: Record<string, number>;             // relative_error_tikhonov, correlation_tikhonov, *_graph_reg,
  //                                              *_ensemble, uq_calibration_2sigma, n_torso_electrodes,
  //                                              n_heart_electrodes, n_time_frames
}

export interface EcgiForwardComparison {
  beat: string;
  bem_applicable: boolean;
  reason?: string;                             // present when the BEM does not apply (open surface)
  single_layer?: { RE: number; CC: number };
  bem?: { RE: number; CC: number };
}

export interface EcgiCase {
  id: string;
  name: string;
  context_en: string;
  context_es: string;
  beats: Record<string, EcgiBeat>;             // beat label -> beat
  forward_comparison?: EcgiForwardComparison;
}

export interface EcgiCatalogue {
  schema: string;                              // "cardiopinn.ecgi-catalogue/v2"
  cases: EcgiCase[];
}

// ---- Case B: 4D-flow aortic pressure (schema "cardiopinn.flow4d-pressure/v3") ------------------------------

export interface Flow4dTrace {
  schema: string;                              // "cardiopinn.flow4d-pressure/v3"
  unsteady_term?: string;                      // "space-time PINN (analytic dv/dt over the whole cycle)"
  points_mm: number[][];                       // [n][3] mm, centred + scaled aortic-lumen point cloud
  pressure_mmHg: number[];                     // [n] recovered relative pressure at peak systole (signed)
  speed_ms_peak: number[];                     // [n] measured speed at the peak frame
  speed_ms_over_time: number[][];              // [frame][n] measured speed over the cardiac cycle
  times_ms: number[];
  peak_frame: number;
  metrics: Record<string, number>;             // n_lumen_voxels, peak_velocity_ms, bernoulli_mmHg,
  //                                              ppe_pressure_drop_mmHg, noise_sensitivity_mmHg,
  //                                              ensemble_members, aliasing_corrected_samples, venc_cm_s, n_frames
}
