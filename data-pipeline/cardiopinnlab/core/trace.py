"""The compact TRACE = the web artifact (a decimated render mesh + per-method scalar fields + sensors + an
isochrone time axis). Part of CONTRACT 2: its shape is mirrored by frontend/src/lib/contract.types.ts, so a
drift fails the web build. Schema id is versioned.

A cardiac trace is a mesh, not a 1-D trajectory: nodes (2D or 3D vertex positions), triangles, one scalar
field per method (predicted T, ground-truth T, baseline T, conduction velocity, residual, ...), the sparse
sensor sites, and a small set of isochrone times for the user-driven wavefront animation. Values are rounded
so the committed artifact stays small (replay, not raw simulation output)."""
from __future__ import annotations

import numpy as np

TRACE_SCHEMA = "cardiopinn.trace/v1"


def _round_list(a: np.ndarray, nd: int) -> list:
    return np.round(np.asarray(a, dtype=np.float64), nd).tolist()


def build_mesh_field_trace(
    *,
    case_id: str,
    view_kit: str,
    vertices: np.ndarray,       # [n, 2] or [n, 3] mm
    triangles: np.ndarray,      # [m, 3] int
    fields: dict[str, np.ndarray],  # name -> [n] scalar field (activation time / CV / residual / ...)
    field_units: dict[str, str],
    sensors: np.ndarray | None,     # [k, 3] (x, y, t) sites, or None
    isochrones_ms: list[float],     # a few activation-time levels for the wavefront animation
    summary: dict,
    coord_nd: int = 2,
    field_nd: int = 3,
) -> dict:
    verts = np.asarray(vertices, dtype=np.float64)
    if verts.shape[1] == 2:  # embed a 2D patch as z=0 so the same 3D renderer draws every vertical
        verts = np.concatenate([verts, np.zeros((verts.shape[0], 1))], axis=1)
    return {
        "schema": TRACE_SCHEMA,
        "case_id": case_id,
        "view_kit": view_kit,
        "mesh": {
            "vertices": _round_list(verts, coord_nd),
            "triangles": np.asarray(triangles, dtype=np.int64).tolist(),
            "n_vertices": int(verts.shape[0]),
            "n_triangles": int(np.asarray(triangles).shape[0]),
        },
        "fields": {name: _round_list(v, field_nd) for name, v in fields.items()},
        "field_units": field_units,
        "sensors": _round_list(sensors, coord_nd) if sensors is not None else [],
        "isochrones_ms": [round(float(x), 2) for x in isochrones_ms],
        "summary": summary,
    }
