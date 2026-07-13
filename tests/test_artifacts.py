"""CONTRACT 2 on disk: the committed index references every vertical; each manifest + artifact exists with the
recorded byte size; the lane matches the gate. This mirrors scripts/check_artifacts.py as a pytest so the
committed artifacts are validated in the light (no-torch) CI lane."""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
DERIVED = ROOT / "data" / "derived"


def test_committed_artifacts_consistent():
    idx = json.loads((DERIVED / "manifests" / "index.json").read_text(encoding="utf-8"))
    assert idx["n_cases"] >= 1
    for entry in idx["cases"]:
        m = json.loads((DERIVED / entry["manifest_path"]).read_text(encoding="utf-8"))
        art = DERIVED / m["artifact"]["path"]
        assert art.exists(), f"missing artifact {art}"
        assert art.stat().st_size == m["artifact"]["bytes"], f"byte drift for {art}"
        assert m["lane"] == m["gate"]["lane"]
        if m["onnx"] is not None:
            assert (ROOT / "models" / m["onnx"]["path"]).exists()
            assert m["onnx"]["parity_max_abs"] <= m["gate"]["parity_budget"]
