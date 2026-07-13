"""CONTRACT 1, ingestion (raw -> pipeline). The bring-your-own-data gate for a cardiac electroanatomical map.

Declares the required schema (columns, units, ranges) of an ingested local-activation-time (LAT) table and
an EXPLICIT outlier policy. A row is ACCEPTED iff it passes; a malformed row is REJECTED with a reason (never
silently coerced); a plausible-but-suspicious row (an activation time outside the physiological window, an
out-of-domain coordinate) is FLAGGED (accepted, but the manifest records the flag). This is what lets the
activation-mapping vertical be applied to a NEW clinical map, not only replay the baked synthetic cases.

Columns: x_mm, y_mm, z_mm (endocardial coordinates), t_ms (measured local activation time). Documented in
data/README.md."""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from .schema import LATSample

REQUIRED_COLUMNS: tuple[str, ...] = ("x_mm", "y_mm", "z_mm", "t_ms")

# name -> (min, max, unit). Physiologically/operationally plausible ranges; outside => REJECT.
RANGES: dict[str, tuple[float, float, str]] = {
    "x_mm": (-500.0, 500.0, "mm (endocardial x)"),
    "y_mm": (-500.0, 500.0, "mm (endocardial y)"),
    "z_mm": (-500.0, 500.0, "mm (endocardial z)"),
    "t_ms": (0.0, 1000.0, "ms (local activation time)"),
}
LAT_FLAG_MAX_MS = 400.0  # a single-beat activation map rarely exceeds this window => FLAG (not reject)


@dataclass
class ContractReport:
    accepted: list[LATSample]
    rejected: list[dict[str, Any]]
    flagged: list[dict[str, Any]]

    @property
    def ok(self) -> bool:
        return len(self.accepted) > 0

    def summary(self) -> str:
        return f"{len(self.accepted)} accepted, {len(self.rejected)} rejected, {len(self.flagged)} flagged"


def validate_rows(raw_rows: list[dict[str, Any]]) -> ContractReport:
    """Apply CONTRACT 1 to raw rows (e.g. from an exported map CSV). Pure; deterministic; no I/O."""
    accepted: list[LATSample] = []
    rejected: list[dict[str, Any]] = []
    flagged: list[dict[str, Any]] = []

    for i, row in enumerate(raw_rows):
        tag = str(row.get("id", f"row{i}"))
        missing = [c for c in REQUIRED_COLUMNS if c not in row or row[c] in (None, "")]
        if missing:
            rejected.append({"row": i, "id": tag, "reason": f"missing/empty columns: {missing}"})
            continue
        try:
            vals = {k: float(row[k]) for k in REQUIRED_COLUMNS}
        except (TypeError, ValueError):
            rejected.append({"row": i, "id": tag, "reason": "non-numeric coordinate/time"})
            continue
        if any(math.isnan(v) or math.isinf(v) for v in vals.values()):
            rejected.append({"row": i, "id": tag, "reason": "NaN/Inf value"})
            continue
        bad: list[str] = []
        for name, (lo, hi, _unit) in RANGES.items():
            if not (lo <= vals[name] <= hi):
                bad.append(f"{name}={vals[name]:g} out of [{lo:g},{hi:g}]")
        if bad:
            rejected.append({"row": i, "id": tag, "reason": "; ".join(bad)})
            continue
        if vals["t_ms"] > LAT_FLAG_MAX_MS:
            flagged.append({"id": tag, "flag": f"t_ms={vals['t_ms']:.0f} > {LAT_FLAG_MAX_MS:g} (long window)"})
        accepted.append(LATSample(x_mm=vals["x_mm"], y_mm=vals["y_mm"], z_mm=vals["z_mm"], t_ms=vals["t_ms"]))
    return ContractReport(accepted=accepted, rejected=rejected, flagged=flagged)
