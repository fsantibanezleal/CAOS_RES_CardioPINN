"""The measured live-vs-replay GATE (ADR-0054, specialized to the ONNX / onnxruntime-web lane like PINN-Lab).

A cardiac vertical runs LIVE in the browser (onnxruntime-web re-inference of the exported PINN) iff:
  - it exported an ONNX net (a coordinate-in / field-out module the browser can feed), AND
  - the ONNX is small enough (onnx_bytes <= budget), AND
  - the committed field trace is small enough (trace_bytes <= budget), AND
  - it is web_drivable (a coordinate/parameter the browser supplies; a field-in operator or a heavy 3D solve
    that is not a pure coordinate map is NOT), AND
  - the measured PyTorch-vs-onnxruntime parity is within tolerance.
Otherwise it is REPLAY and the SPA animates the committed field trace under a "precomputed" banner. The
verdict + measured numbers go into the manifest; CI fails on a mislabel. This is a MEASUREMENT, not a
hand-wave. The live inference latency is measured separately in the browser, never committed."""
from __future__ import annotations

ONNX_BYTES_GATE = 4 * 1024 * 1024      # <= 4 MB exported net
TRACE_BYTES_GATE = 2 * 1024 * 1024     # <= 2 MB committed field trace (a decimated mesh + a few scalar fields)
PARITY_GATE = 1e-4                      # PyTorch vs onnxruntime max-abs must be below this to claim live re-run


def classify_lane(*, onnx: dict | None, trace_bytes: int, web_drivable: bool) -> dict:
    reasons: list[str] = []
    live = True
    onnx_bytes = int(onnx["bytes"]) if onnx else 0
    parity = float(onnx["parity_max_abs"]) if onnx else float("inf")

    if onnx is None:
        live = False
        reasons.append("no ONNX net exported (replay-only field)")
    if not web_drivable:
        live = False
        reasons.append("not web-drivable (input is not a browser-suppliable coordinate/parameter)")
    if onnx and onnx_bytes > ONNX_BYTES_GATE:
        live = False
        reasons.append(f"onnx_bytes {onnx_bytes} > {ONNX_BYTES_GATE}")
    if trace_bytes > TRACE_BYTES_GATE:
        live = False
        reasons.append(f"trace_bytes {trace_bytes} > {TRACE_BYTES_GATE}")
    if onnx and parity > PARITY_GATE:
        live = False
        reasons.append(f"onnx parity {parity:.2e} > {PARITY_GATE:.0e}")

    return {
        "lane": "live" if live else "precompute",
        "web_drivable": web_drivable,
        "onnx_bytes": onnx_bytes,
        "onnx_bytes_budget": ONNX_BYTES_GATE,
        "trace_bytes": trace_bytes,
        "trace_bytes_budget": TRACE_BYTES_GATE,
        "parity_max_abs": parity if onnx else None,
        "parity_budget": PARITY_GATE,
        "reasons": reasons,
    }
