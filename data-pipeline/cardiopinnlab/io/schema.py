"""Typed objects passed between pipeline stages, the inter-stage contract. Plain dataclasses.

The cardiac verticals differ in physics (Eikonal activation, fiber inverse, Navier-Stokes flow), so the
per-vertical parameters live in each case module; this module holds the SHARED containers: an ingested
measurement sample (CONTRACT 1) and the BakeResult the export stage writes (CONTRACT 2)."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class LATSample:
    """One ingested local-activation-time measurement (a mapping-catheter site): position + activation time.
    z is optional (0.0 for a 2D tissue patch); a real electroanatomical map carries 3D coordinates."""
    x_mm: float
    y_mm: float
    z_mm: float
    t_ms: float


@dataclass
class BakeResult:
    """The per-vertical output the export stage turns into CONTRACT 2 (trace + ONNX + manifest). trace is the
    compact mesh+fields artifact; onnx is the exported-PINN block (None for a replay-only vertical);
    web_drivable says whether the browser can feed coordinates to the ONNX net for live re-inference."""
    case_id: str
    trace: dict
    metrics: dict
    params: dict
    onnx: dict | None = None
    web_drivable: bool = False
    flags: list[dict] = field(default_factory=list)
    extra: dict[str, Any] = field(default_factory=dict)
