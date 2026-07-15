"""Gate the engine's decisive design choice: computing the pressure-Poisson source/flux from the velocity
network's ANALYTIC (autograd) derivatives, rather than FINITE DIFFERENCES on the sampled grid (what a standard
PPE/WERP pipeline uses). On an analytic converging duct with EXACT pressure, a denoiser is fit to noisy
velocity; the analytic path recovers the exact pressure drop to a few hundredths of a mmHg, the finite-
difference path inflates it several-fold. Proven on a known answer (research dossier beyond-sota-pinn-2026-07-14).
Marked slow (trains a PINN)."""
import pytest

torch = pytest.importorskip("torch")


@pytest.mark.slow
def test_analytic_source_beats_finite_difference():
    from cardiopinnlab.real.flow4d_denoise import gate_analytic_vs_fd
    r = gate_analytic_vs_fd(seed=0)
    assert r["analytic_drop_err_mmHg"] < 0.5, r        # analytic recovers the exact drop closely
    assert r["fd_drop_err_mmHg"] > 2.0, r              # finite differences inflate it several-fold
    assert r["ratio_fd_over_analytic"] > 5.0, r        # a large, decisive margin
