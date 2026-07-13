"""Validate the committed REAL-case artifact (the derived reconstruction the web reads). Stdlib only (runs in
CI without installing the package). Exit non-zero on any drift. The product is real-data-first: the app reads
data/derived/real-ecgi-edgar/trace.json (the EDGAR ECGi reconstruction); raw datasets are not committed
(data-use agreements)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    art = ROOT / "data" / "derived" / "real-ecgi-edgar" / "trace.json"
    if not art.exists():
        print(f"FAIL: missing {art} (run the real ECGi bake)")
        return 1
    try:
        d = json.loads(art.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"FAIL: {art} is not valid JSON: {e}")
        return 1
    rhythms = d.get("rhythms", {})
    if not rhythms:
        print("FAIL: no rhythms in the real ECGi artifact")
        return 1
    for name, rd in rhythms.items():
        for key in ("mesh", "times_ms", "fields_over_time", "metrics"):
            if key not in rd:
                print(f"FAIL: rhythm {name} missing '{key}'")
                return 1
        m = rd["metrics"]
        for mk in ("relative_error_tikhonov", "correlation_tikhonov", "uq_calibration_2sigma"):
            if mk not in m:
                print(f"FAIL: rhythm {name} missing metric '{mk}'")
                return 1
    print(f"REAL artifact OK: {len(rhythms)} rhythms, real EDGAR ECGi reconstruction validated fields present.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
