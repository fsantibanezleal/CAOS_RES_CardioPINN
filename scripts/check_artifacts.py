"""Validate the committed REAL-case artifact (the derived reconstruction the web reads). Stdlib only (runs in
CI without installing the package). Exit non-zero on any drift. The product is real-data-first: the app reads
data/derived/real-ecgi-catalogue/catalogue.json (a catalogue of EDGAR ECGi reconstructions across independent
real experiments); raw datasets are not committed (data-use agreements)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Completeness floor: the catalogue must not silently shrink to a single case/beat (a test or partial bake must
# never overwrite the committed multi-dataset catalogue). Raise these when the catalogue grows.
MIN_CASES = 2
MIN_BEATS = 4


def main() -> int:
    art = ROOT / "data" / "derived" / "real-ecgi-catalogue" / "catalogue.json"
    if not art.exists():
        print(f"FAIL: missing {art} (run the real ECGi catalogue bake)")
        return 1
    try:
        d = json.loads(art.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"FAIL: {art} is not valid JSON: {e}")
        return 1
    cases = d.get("cases", [])
    if len(cases) < MIN_CASES:
        print(f"FAIL: catalogue has {len(cases)} cases, expected >= {MIN_CASES} (partial bake?)")
        return 1
    total_beats = 0
    for c in cases:
        beats = c.get("beats", {})
        if not beats:
            print(f"FAIL: case {c.get('id')} has no beats")
            return 1
        for bname, rd in beats.items():
            total_beats += 1
            for key in ("mesh", "times_ms", "fields_over_time", "metrics"):
                if key not in rd:
                    print(f"FAIL: {c.get('id')}/{bname} missing '{key}'")
                    return 1
            m = rd["metrics"]
            for mk in ("relative_error_tikhonov", "correlation_tikhonov", "uq_calibration_2sigma",
                       "n_heart_electrodes", "n_torso_electrodes"):
                if mk not in m:
                    print(f"FAIL: {c.get('id')}/{bname} missing metric '{mk}'")
                    return 1
            # sanity: correlation in [-1,1], relative error non-negative, reconstruction not degenerate
            if not (-1.0 <= m["correlation_tikhonov"] <= 1.0):
                print(f"FAIL: {c.get('id')}/{bname} correlation out of range: {m['correlation_tikhonov']}")
                return 1
            if m["relative_error_tikhonov"] < 0:
                print(f"FAIL: {c.get('id')}/{bname} negative relative error")
                return 1
    if total_beats < MIN_BEATS:
        print(f"FAIL: catalogue has {total_beats} beats, expected >= {MIN_BEATS} (partial bake?)")
        return 1
    print(f"REAL catalogue OK: {len(cases)} cases, {total_beats} beats, all validated fields + metrics present.")
    return _check_flow4d()


def _check_flow4d() -> int:
    """Validate the real 4D-flow aortic pressure artifact: physiological pressure map + honest metrics."""
    art = ROOT / "data" / "derived" / "real-flow4d-pressure" / "trace.json"
    if not art.exists():
        print(f"FAIL: missing {art} (run the 4D-flow bake)")
        return 1
    try:
        d = json.loads(art.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"FAIL: {art} is not valid JSON: {e}")
        return 1
    for key in ("points_mm", "pressure_mmHg", "speed_ms_over_time", "metrics"):
        if key not in d:
            print(f"FAIL: 4D-flow trace missing '{key}'")
            return 1
    n = len(d["points_mm"])
    if n < 1000 or len(d["pressure_mmHg"]) != n:
        print(f"FAIL: 4D-flow point cloud degenerate (points={n}, pressure={len(d['pressure_mmHg'])})")
        return 1
    m = d["metrics"]
    # pressure must be PHYSIOLOGICAL: the recovered range is not thousands of mmHg (the bug we guard against)
    if not (0.0 < m["ppe_pressure_drop_mmHg"] < 60.0):
        print(f"FAIL: 4D-flow pressure range non-physiological: {m['ppe_pressure_drop_mmHg']} mmHg")
        return 1
    if not (0.1 < m["peak_velocity_ms"] < 6.0):
        print(f"FAIL: 4D-flow peak velocity non-physiological: {m['peak_velocity_ms']} m/s")
        return 1
    print(f"REAL 4D-flow OK: {m['n_lumen_voxels']} voxels, pressure range {m['ppe_pressure_drop_mmHg']} mmHg, "
          f"Bernoulli {m['bernoulli_mmHg']} mmHg, peak {m['peak_velocity_ms']} m/s.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
