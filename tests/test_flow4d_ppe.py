"""Gate the pressure-Poisson (PPE) pressure engine on an analytic converging-duct flow whose exact pressure
drop is known. This is the honesty gate the 4D-flow case must pass BEFORE any real-scan pressure is trusted:
the momentum-residual NS-PINN failed it (recovered ~1% of the true gradient), whereas the PPE recovers the
analytic pressure to within 1%. No raw data / no torch needed."""
from cardiopinnlab.real.flow4d_ppe import gate_converging


def test_ppe_recovers_analytic_pressure():
    r = gate_converging()
    assert r["corr"] > 0.99, r                     # pressure field shape recovered
    assert 0.9 < r["scale"] < 1.1, r               # magnitude within 10%
    assert abs(r["rec_drop_mmHg"] - r["true_drop_mmHg"]) < 0.2, r   # pressure drop within 0.2 mmHg
