"""Test the committed real 4D-flow aortic pressure artifact: the point cloud + pressure field exist and the
recovered pressure is PHYSIOLOGICAL (the guard against the finite-difference boundary artifact that produced
thousands of mmHg before the analytic-derivative fix). No raw data / no torch needed."""
import json
import pathlib

ART = pathlib.Path(__file__).resolve().parents[1] / "data" / "derived" / "real-flow4d-pressure" / "trace.json"


def test_flow4d_pressure_artifact():
    d = json.loads(ART.read_text(encoding="utf-8"))
    n = len(d["points_mm"])
    assert n >= 1000, n
    assert len(d["pressure_mmHg"]) == n
    assert len(d["speed_ms_over_time"]) == d["metrics"]["n_frames"]
    m = d["metrics"]
    assert 0.0 < m["ppe_pressure_drop_mmHg"] < 60.0, m       # physiological, not thousands of mmHg
    assert 0.1 < m["peak_velocity_ms"] < 6.0, m               # physiological aortic velocity
    assert m["bernoulli_mmHg"] > 0.0, m
