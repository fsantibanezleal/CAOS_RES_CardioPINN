"""The full GPU bake, marked slow (skipped in the light CI lane; run locally with `pytest -m slow`). Trains
the Eikonal PINN and checks the physics-informed reconstruction beats the smoothness-only GP baseline and
recovers a plausible conduction-velocity field, and that the exported ONNX passes the parity gate."""
import pytest

pytest.importorskip("torch")

from cardiopinnlab import registry  # noqa: E402


@pytest.mark.slow
def test_act_eikonal_bake():
    case = registry.get_case("act-eikonal-mapping")
    bake = case.build(seed=42)
    m = bake.metrics
    assert m["rel_l2_pinn"] < 0.15, m
    assert m["rel_l2_pinn"] <= m["rel_l2_gp"] + 1e-3, m          # physics >= smoothness-only GP
    assert m["cv_rmse_mm_per_ms"] < 0.20, m                     # recovered CV field is plausible
    assert bake.onnx is not None and bake.onnx["parity_max_abs"] < 1e-4, bake.onnx
    assert bake.web_drivable is True
