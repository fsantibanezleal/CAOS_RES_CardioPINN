"""Stage: export (CONTRACT 2). Write the compact field trace, the exported ONNX net (if any), and the case
manifest. The manifest records the measured lane/gate verdict, the artifact byte sizes, the ONNX parity, the
CONTRACT-1 flags, and the evaluation metrics. This is the single uniform stage across all verticals."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from ..core.gate import classify_lane
from ..core.manifest import build_case_manifest
from ..io.formats import write_json
from ..io.schema import BakeResult


def run(
    *,
    case: Any,
    bake: BakeResult,
    seed: int,
    derived_dir: str,
    manifests_dir: str,
    models_dir: str,
) -> dict:
    # 1. field trace artifact
    artifact_rel = f"{case.id}/trace.json"
    trace_bytes = write_json(Path(derived_dir) / artifact_rel, bake.trace)

    # 2. ONNX net (if the vertical exported one)
    onnx_meta = None
    if bake.onnx is not None:
        blob = bake.extra.get("onnx_blob")
        if blob is None:
            raise ValueError(f"{case.id}: onnx meta present but no onnx_blob in extra")
        onnx_name = f"{case.id}.onnx"
        p = Path(models_dir) / onnx_name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(blob)
        onnx_meta = {**bake.onnx, "path": onnx_name}

    # 3. lane gate + manifest
    gate = classify_lane(onnx=onnx_meta, trace_bytes=trace_bytes, web_drivable=bake.web_drivable)
    manifest = build_case_manifest(
        case=case, seed=seed, artifact_rel=artifact_rel, trace_bytes=trace_bytes,
        onnx=onnx_meta, gate=gate, flags=bake.flags, metrics=bake.metrics, params=bake.params,
    )
    write_json(Path(manifests_dir) / f"{case.id}.json", manifest)
    return manifest
