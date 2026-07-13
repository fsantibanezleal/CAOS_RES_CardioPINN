"""The CaseSpec: the identity + physics-ladder metadata of a research vertical, plus a handle to its builder.

Each vertical is a real research topic (activation mapping, fiber inverse, Delta-PINN geometry, AF phase,
4D-flow, ...). The App shows ONE selected vertical as a deep workbench; Experiments/Benchmark show cross-
vertical summaries by category. The `build` callable runs the offline compute (ground truth + PINN training
+ evaluation + ONNX export) and returns a BakeResult; the pipeline handles the gate + manifest + index."""
from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field

from ..io.schema import BakeResult


@dataclass(frozen=True)
class CaseSpec:
    id: str
    title: str
    category: str
    system_type: str            # drives the web view kit (e.g. "activation-surface")
    view_kit: str               # "CardiacMeshKit" | "HeatmapKit" | ...
    real_or_synthetic: str      # "synthetic" | "synthetic-real-geometry" | "real"
    expected_band: str          # what a domain expert should see (honest, plain language)
    engine_desc: str            # short engine description for the manifest
    ladder: dict                # {"classical": str, "sota": str, "novel": str}
    references: list[dict]       # [{"cite": str, "doi_or_arxiv": str, "note": str}]
    build: Callable[[int], BakeResult]  # build(seed) -> BakeResult
    tags: list[str] = field(default_factory=list)
