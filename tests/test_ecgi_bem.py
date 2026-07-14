"""Analytic gate for the ECGi boundary-element forward operator: on two concentric spheres (heart radius a,
insulating body radius b) the heart-to-body transfer of the degree-1 harmonic is known in closed form. The
BEM must recover it, and converge to it as the mesh refines. This is the same discipline as the 4D-flow
analytic gate: the operator is proven on a known-answer problem before it is used on any real geometry."""

from cardiopinnlab.real.ecgi_bem import verify_bem_spheres


def test_bem_recovers_analytic_transfer():
    r = verify_bem_spheres(subdiv=3)
    assert r["correlation"] > 0.999, r                       # the spatial pattern is exact
    assert abs(r["recovered_scale"] - 1.0) < 0.08, r         # magnitude within 8% at this resolution
    assert r["relative_error"] < 0.08, r


def test_bem_converges_with_refinement():
    errs = [verify_bem_spheres(subdiv=s)["relative_error"] for s in (2, 3)]
    assert errs[1] < errs[0] * 0.75, errs                    # first-order convergence: error shrinks with h
