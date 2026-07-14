"""Test the committed real ECGi catalogue artifact (no raw data / no torch needed): the reconstructions exist
across the independent real datasets, and each dataset/beat's validated metrics are physically sane (a real
reconstruction, not perfect and not garbage). The raw EDGAR data is not in CI (data-use agreement); this
checks the derived result. A completeness floor guards against a partial bake silently shrinking the catalogue."""
import json
import pathlib

ART = pathlib.Path(__file__).resolve().parents[1] / "data" / "derived" / "real-ecgi-catalogue" / "catalogue.json"

MIN_CASES = 2
MIN_BEATS = 4


def test_real_ecgi_catalogue():
    d = json.loads(ART.read_text(encoding="utf-8"))
    cases = d["cases"]
    assert len(cases) >= MIN_CASES, f"catalogue shrank to {len(cases)} cases"
    total_beats = 0
    for c in cases:
        assert c["beats"], f"{c['id']} has no beats"
        for name, rd in c["beats"].items():
            total_beats += 1
            m = rd["metrics"]
            assert 0.2 < m["relative_error_tikhonov"] < 1.0, (c["id"], name, m)   # ill-posed: not perfect, not garbage
            assert 0.5 < m["correlation_tikhonov"] <= 1.0, (c["id"], name, m)     # real ECGi range
            assert 0.5 <= m["uq_calibration_2sigma"] <= 1.0, (c["id"], name, m)   # calibrated per-node uncertainty
            assert rd["mesh"]["n_vertices"] == m["n_heart_electrodes"], (c["id"], name)
    assert total_beats >= MIN_BEATS, f"catalogue shrank to {total_beats} beats"
