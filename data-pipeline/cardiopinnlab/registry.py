"""The vertical registry, research verticals grouped by CATEGORY. The App shows ONE selected vertical as a
deep workbench; Experiments/Benchmark show cross-vertical summaries by category. Each vertical is a CaseSpec
(cases/base.py) exporting a SPEC; add a new vertical by importing its SPEC here."""
from __future__ import annotations

from .cases.act_eikonal_mapping import SPEC as ACT_EIKONAL
from .cases.base import CaseSpec

CASES: list[CaseSpec] = [
    ACT_EIKONAL,
]

_BY_ID: dict[str, CaseSpec] = {c.id: c for c in CASES}


def list_cases() -> list[CaseSpec]:
    return list(CASES)


def get_case(case_id: str) -> CaseSpec:
    if case_id not in _BY_ID:
        raise KeyError(f"unknown vertical: {case_id!r}. known: {sorted(_BY_ID)}")
    return _BY_ID[case_id]


def list_categories() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for c in CASES:
        out.setdefault(c.category, []).append(c.id)
    return out
