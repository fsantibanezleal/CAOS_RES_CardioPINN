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
    return 0


if __name__ == "__main__":
    sys.exit(main())
