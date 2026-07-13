"""The staged pipeline (ADR-0057). For the cardiac verticals the six conceptual stages
(preprocess -> feature_extraction -> train -> infer -> evaluate -> export) run INSIDE each vertical's
build() because the physics differs per vertical (Eikonal activation, fiber inverse, Navier-Stokes flow):
build() generates or ingests the ground truth (preprocess/feature_extraction), trains the PINN (train),
bakes the field (infer), scores it against ground truth and the classical baselines (evaluate), and returns
a BakeResult. The one uniform stage is `export` (CONTRACT 2: write the trace + ONNX + manifest), so it lives
here; the per-vertical steps live in cases/<vertical>.py using the shared core/ engine."""
