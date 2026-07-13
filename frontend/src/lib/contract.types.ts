// CONTRACT 2 mirror (frontend side). MUST stay in lock-step with the Python schemas in
// data-pipeline/cardiopinnlab/core/{trace.py, manifest.py}. A drift here makes `tsc` fail, so the contract
// is enforced at BUILD time (the web cannot ship reading a shape the pipeline does not produce).

export interface TraceMesh {
  vertices: number[][];   // [n][3] mm (a 2D patch is embedded at z = 0)
  triangles: number[][];  // [m][3] vertex indices
  n_vertices: number;
  n_triangles: number;
}

export interface Trace {
  schema: string;                       // "cardiopinn.trace/v1"
  case_id: string;
  view_kit: string;                     // "CardiacMeshKit" | ...
  mesh: TraceMesh;
  fields: Record<string, number[]>;     // name -> per-vertex scalar field (T, CV, residual, ...)
  field_units: Record<string, string>;
  sensors: number[][];                  // [k][3] sparse measurement sites (x, y, measured value)
  isochrones_ms: number[];              // activation-time levels for the wavefront animation
  summary: Record<string, number>;
}

export interface OnnxBlock {
  path: string;                         // "<case>.onnx" under public/models
  bytes: number;
  opset: number;
  input_dim: number;
  output_names: string[];
  parity_max_abs: number;               // PyTorch vs onnxruntime max-abs (the browser-re-run guarantee)
}

export interface GateVerdict {
  lane: 'live' | 'precompute';
  web_drivable: boolean;
  onnx_bytes: number;
  onnx_bytes_budget: number;
  trace_bytes: number;
  trace_bytes_budget: number;
  parity_max_abs: number | null;
  parity_budget: number;
  reasons: string[];
}

export interface LadderRungs {
  classical: string;
  sota: string;
  novel: string;
}

export interface Reference {
  cite: string;
  doi_or_arxiv: string;
  note: string;
}

export interface CaseManifest {
  schema: string;                       // "cardiopinn.manifest/v1"
  case_id: string;
  title: string;
  category: string;
  system_type: string;
  view_kit: string;
  real_or_synthetic: string;
  expected_band: string;
  ladder: LadderRungs;
  engine: { package: string; version: string; model: string };
  params: Record<string, number>;
  seed: number;
  artifact: { path: string; format: string; trace_schema: string; bytes: number };
  onnx: OnnxBlock | null;
  lane: 'live' | 'precompute';
  gate: GateVerdict;
  flags: Array<Record<string, string>>;
  metrics: Record<string, number>;
  references: Reference[];
}

export interface CaseIndexEntry {
  case_id: string;
  category: string;
  title: string;
  manifest_path: string;
  lane: 'live' | 'precompute';
}

export interface CaseIndex {
  schema: string;                       // "cardiopinn.index/v1"
  engine_version: string;
  n_cases: number;
  cases: CaseIndexEntry[];
}
