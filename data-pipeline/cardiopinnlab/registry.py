"""The vertical registry, research verticals grouped by CATEGORY. The App shows ONE selected vertical as a
deep workbench; Experiments/Benchmark show cross-vertical summaries by category. Each vertical is a CaseSpec
(cases/base.py) exporting a SPEC; add a new vertical by importing its SPEC here."""
from __future__ import annotations

from .cases.act_eikonal_mapping import SPEC as ACT_EIKONAL
from .cases.base import CaseSpec
from .cases.delta_pinn_geometry import SPEC as DELTA_PINN
from .cases.fiber_conductivity_inverse import SPEC as FIBER_INVERSE
from .cases.joint_cv_scar_uq import SPEC as JOINT_CV_SCAR
from .cases.active_sensing import SPEC as ACTIVE_SENSING
from .cases.af_phase_rotor import SPEC as AF_ROTOR
from .cases.flow4d_ns_pressure import SPEC as FLOW4D
from .cases.pa_pressure_1dns import SPEC as PA_PRESSURE
from .cases.inverse_ecgi import SPEC as INVERSE_ECGI
from .cases.amortized_operator import SPEC as AMORTIZED_OP

CASES: list[CaseSpec] = [
    ACT_EIKONAL,
    DELTA_PINN,
    FIBER_INVERSE,
    JOINT_CV_SCAR,
    ACTIVE_SENSING,
    AF_ROTOR,
    FLOW4D,
    PA_PRESSURE,
    INVERSE_ECGI,
    AMORTIZED_OP,
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
