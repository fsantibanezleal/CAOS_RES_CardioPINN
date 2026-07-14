"""Analytic gate for the space-time 4D-flow PINN's temporal derivative. On a time-varying Poiseuille flow
w(r,t) = U0(1 + A sin(w t))(1 - (r/R)^2), the exact axial unsteady acceleration on the axis is
dw/dt = U0 A w cos(w t). The space-time net must recover it (correlation + amplitude), which is what makes the
unsteady pressure term analytic instead of a three-frame finite difference. Marked slow (trains a PINN)."""
import pytest

torch = pytest.importorskip("torch")


@pytest.mark.slow
def test_spacetime_recovers_unsteady_acceleration():
    from cardiopinnlab.real.flow4d_spacetime import verify_unsteady_poiseuille
    r = verify_unsteady_poiseuille(seed=0)
    assert r["dwdt_corr"] > 0.98, r                          # the temporal pattern is recovered
    assert 0.8 < r["dwdt_scale"] < 1.2, r                    # amplitude within 20%
