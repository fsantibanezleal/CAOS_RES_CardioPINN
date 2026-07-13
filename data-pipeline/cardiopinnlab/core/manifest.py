"""CONTRACT 2, artifact (pipeline -> web). The manifest is the authoritative, versioned record of a baked
vertical: its identity + physics ladder (classical / SOTA / novel), the engine, the compact artifact + byte
size, the exported-ONNX block, the lane/gate verdict, the CONTRACT-1 flags, the evaluation metrics, and the
real DOI references. The web loads ONLY manifests + artifacts; frontend/src/lib/contract.types.ts mirrors
this schema so a drift fails the build. A flat index.json inventories every vertical."""
from __future__ import annotations

from typing import Any

from .. import __version__
from .trace import TRACE_SCHEMA

MANIFEST_SCHEMA = "cardiopinn.manifest/v1"
INDEX_SCHEMA = "cardiopinn.index/v1"


def build_case_manifest(
    *,
    case: Any,
    seed: int,
    artifact_rel: str,
    trace_bytes: int,
    onnx: dict | None,
    gate: dict,
    flags: list[dict],
    metrics: dict,
    params: dict,
) -> dict:
    # Deterministic: a pure function of (case, seed). No wall-clock here; the lane/gate verdict + budgets
    # carry the lane decision; live latency is measured in the browser, not committed.
    return {
        "schema": MANIFEST_SCHEMA,
        "case_id": case.id,
        "title": case.title,
        "category": case.category,
        "system_type": case.system_type,
        "view_kit": case.view_kit,
        "real_or_synthetic": case.real_or_synthetic,
        "expected_band": case.expected_band,
        "ladder": case.ladder,               # {classical, sota, novel} one-line each
        "engine": {"package": "cardiopinnlab", "version": __version__, "model": case.engine_desc},
        "params": params,
        "seed": seed,
        "artifact": {"path": artifact_rel, "format": "json", "trace_schema": TRACE_SCHEMA, "bytes": trace_bytes},
        "onnx": onnx,                         # None for a replay-only vertical
        "lane": gate["lane"],
        "gate": gate,
        "flags": flags,
        "metrics": metrics,
        "references": case.references,        # [{cite, doi_or_arxiv, note}]
    }


def build_index(entries: list[dict]) -> dict:
    """entries: [{case_id, category, title, manifest_path, lane}] -> the flat authoritative inventory."""
    return {
        "schema": INDEX_SCHEMA,
        "engine_version": __version__,
        "n_cases": len(entries),
        "cases": sorted(entries, key=lambda e: e["case_id"]),
    }
