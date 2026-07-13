"""Test the committed real ECGi artifact (no raw data / no torch needed): the reconstruction result exists,
covers the rhythms, and its validated metrics are physically sane (a real reconstruction, not perfect and
not garbage). The raw EDGAR data is not in CI (data-use agreement); this checks the derived result."""
import json
import pathlib

ART = pathlib.Path(__file__).resolve().parents[1] / "data" / "derived" / "real-ecgi-edgar" / "trace.json"


def test_real_ecgi_artifact():
    d = json.loads(ART.read_text(encoding="utf-8"))
    assert d["rhythms"], "no rhythms"
    for name, rd in d["rhythms"].items():
        m = rd["metrics"]
        assert 0.2 < m["relative_error_tikhonov"] < 1.0, (name, m)   # ill-posed inverse: not perfect, not garbage
        assert 0.5 < m["correlation_tikhonov"] <= 1.0, (name, m)     # real torso-tank ECGi range
        assert 0.5 <= m["uq_calibration_2sigma"] <= 1.0, (name, m)   # calibrated per-node uncertainty
        assert rd["mesh"]["n_vertices"] == m["n_heart_electrodes"]
