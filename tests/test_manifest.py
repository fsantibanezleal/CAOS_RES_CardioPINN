"""CONTRACT 2 (artifact) tests, pure-python (no torch): the ONNX lane gate classifies correctly, the manifest
carries the required fields, and the mesh-field trace has the shape the frontend contract mirrors."""
import types

import numpy as np

from cardiopinnlab.core.gate import ONNX_BYTES_GATE, classify_lane
from cardiopinnlab.core.manifest import build_case_manifest, build_index
from cardiopinnlab.core.trace import build_mesh_field_trace


def _fake_case():
    return types.SimpleNamespace(
        id="demo", title="Demo", category="cat", system_type="activation-surface",
        view_kit="CardiacMeshKit", real_or_synthetic="synthetic", expected_band="band",
        ladder={"classical": "c", "sota": "s", "novel": "n"}, engine_desc="engine",
        references=[{"cite": "x", "doi_or_arxiv": "10.0/0", "note": "n"}],
    )


def test_gate_live_when_small_and_drivable():
    onnx = {"bytes": 70_000, "parity_max_abs": 6e-5}
    g = classify_lane(onnx=onnx, trace_bytes=150_000, web_drivable=True)
    assert g["lane"] == "live" and not g["reasons"]


def test_gate_precompute_when_not_drivable_or_bad_parity():
    assert classify_lane(onnx={"bytes": 1, "parity_max_abs": 1e-6}, trace_bytes=1, web_drivable=False)["lane"] == "precompute"
    assert classify_lane(onnx={"bytes": 1, "parity_max_abs": 1e-2}, trace_bytes=1, web_drivable=True)["lane"] == "precompute"
    assert classify_lane(onnx={"bytes": ONNX_BYTES_GATE + 1, "parity_max_abs": 1e-6}, trace_bytes=1, web_drivable=True)["lane"] == "precompute"
    assert classify_lane(onnx=None, trace_bytes=1, web_drivable=True)["lane"] == "precompute"


def test_manifest_fields_present():
    onnx = {"path": "demo.onnx", "bytes": 100, "opset": 17, "input_dim": 2,
            "output_names": ["t"], "parity_max_abs": 6e-5}
    gate = classify_lane(onnx=onnx, trace_bytes=100, web_drivable=True)
    m = build_case_manifest(case=_fake_case(), seed=42, artifact_rel="demo/trace.json", trace_bytes=100,
                            onnx=onnx, gate=gate, flags=[], metrics={"rel_l2_pinn": 0.08}, params={"n_grid": 41})
    assert m["schema"].startswith("cardiopinn.manifest/")
    assert m["lane"] == m["gate"]["lane"] == "live"
    for key in ("case_id", "title", "ladder", "engine", "onnx", "references", "system_type", "view_kit"):
        assert key in m
    idx = build_index([{"case_id": "demo", "category": "cat", "title": "Demo",
                        "manifest_path": "manifests/demo.json", "lane": "live"}])
    assert idx["n_cases"] == 1 and idx["schema"].startswith("cardiopinn.index/")


def test_trace_mesh_shape():
    verts = np.array([[0.0, 0.0], [1.0, 0.0], [0.0, 1.0]])
    tris = np.array([[0, 1, 2]])
    tr = build_mesh_field_trace(
        case_id="demo", view_kit="CardiacMeshKit", vertices=verts, triangles=tris,
        fields={"T": np.array([0.0, 1.0, 2.0])}, field_units={"T": "ms"},
        sensors=np.array([[0.0, 0.0, 0.0]]), isochrones_ms=[0.5, 1.0],
        summary={"rel_l2_pinn": 0.08},
    )
    assert tr["schema"].startswith("cardiopinn.trace/")
    assert tr["mesh"]["n_vertices"] == 3 and tr["mesh"]["n_triangles"] == 1
    assert len(tr["mesh"]["vertices"][0]) == 3  # 2D embedded at z = 0
    assert "T" in tr["fields"]
