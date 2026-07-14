"""A boundary-element (BEM) forward operator for the ECGi problem: the physically-correct transfer matrix from
heart-surface potentials to body-surface potentials, replacing the single-layer point-source approximation.

The torso is a homogeneous volume conductor bounded by the body surface (insulating, air outside) with the
heart surface as an inner boundary carrying the source potentials. Green's second identity discretized on the
two triangulated surfaces gives coupled boundary-integral equations; eliminating the unknown heart-surface
normal current yields a transfer matrix Z with phi_body = Z phi_heart (Barr, Ramsey, Spach 1977; Stenroos &
Haueisen 2008). The double-layer (dipole) coefficients are exact triangle solid angles (Van Oosterom &
Strackee 1983); the single-layer (monopole) coefficients are triangle 1/r integrals.

The assembly is GATED on the analytic concentric-sphere problem, where the heart-to-body transfer of every
spherical-harmonic degree is known in closed form, before it is used on any real geometry (see
verify_bem_spheres). Everything is NumPy; no torch needed."""
from __future__ import annotations

import numpy as np


# ----- geometry helpers -------------------------------------------------------------------------------------

def icosphere(subdiv: int = 3, radius: float = 1.0):
    """A subdivided icosahedron (watertight, near-uniform) for the analytic gate. Returns (nodes[N,3], tris[M,3])."""
    t = (1.0 + np.sqrt(5.0)) / 2.0
    verts = np.array([
        [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
        [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
        [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]], float)
    faces = np.array([
        [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
        [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
        [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
        [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]], int)
    verts = verts / np.linalg.norm(verts, axis=1, keepdims=True)
    mid_cache: dict[tuple[int, int], int] = {}
    verts_l = verts.tolist()

    def midpoint(a, b):
        key = (min(a, b), max(a, b))
        if key in mid_cache:
            return mid_cache[key]
        m = (np.array(verts_l[a]) + np.array(verts_l[b])) / 2.0
        m = m / np.linalg.norm(m)
        verts_l.append(m.tolist())
        idx = len(verts_l) - 1
        mid_cache[key] = idx
        return idx

    for _ in range(subdiv):
        new = []
        for a, b, c in faces:
            ab, bc, ca = midpoint(a, b), midpoint(b, c), midpoint(c, a)
            new += [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]
        faces = np.array(new, int)
    nodes = np.array(verts_l, float) * radius
    return nodes, faces


def _solid_angle(p, A, B, C):
    """Signed solid angle subtended by triangle (A,B,C) at point p (Van Oosterom & Strackee 1983), vectorized
    over p [N,3]. Returns [N]."""
    a = A - p; b = B - p; c = C - p
    la = np.linalg.norm(a, axis=1); lb = np.linalg.norm(b, axis=1); lc = np.linalg.norm(c, axis=1)
    num = np.einsum('ij,ij->i', a, np.cross(b, c))
    den = (la * lb * lc + np.einsum('ij,ij->i', a, b) * lc
           + np.einsum('ij,ij->i', a, c) * lb + np.einsum('ij,ij->i', b, c) * la)
    return 2.0 * np.arctan2(num, den)


def _tri_normals_areas(nodes, tris):
    v0 = nodes[tris[:, 0]]; v1 = nodes[tris[:, 1]]; v2 = nodes[tris[:, 2]]
    n = np.cross(v1 - v0, v2 - v0)
    area = 0.5 * np.linalg.norm(n, axis=1)
    return v0, v1, v2, area


def _double_layer(field_pts, nodes, tris):
    """Node-based double-layer matrix D [Nf, Nn]: D[i,k] = contribution of node k's potential to the dipole
    integral at field point i, with each triangle's solid angle lumped 1/3 to its nodes and divided by 4*pi."""
    Nf = field_pts.shape[0]; Nn = nodes.shape[0]
    D = np.zeros((Nf, Nn))
    A = nodes[tris[:, 0]]; B = nodes[tris[:, 1]]; C = nodes[tris[:, 2]]
    for j in range(tris.shape[0]):
        omega = _solid_angle(field_pts, A[j], B[j], C[j]) / (4.0 * np.pi)
        for k in tris[j]:
            D[:, k] += omega / 3.0
    return D


def _single_layer(field_pts, nodes, tris):
    """Node-based single-layer matrix S [Nf, Nn]: S[i,k] = contribution of node k's normal current to the 1/r
    integral at field point i. One-point (centroid) quadrature times area, lumped 1/3 to the triangle nodes,
    divided by 4*pi; self/near terms use the analytic 1/r integral over the triangle at its centroid."""
    Nf = field_pts.shape[0]; Nn = nodes.shape[0]
    S = np.zeros((Nf, Nn))
    v0, v1, v2, area = _tri_normals_areas(nodes, tris)
    cen = (v0 + v1 + v2) / 3.0
    for j in range(tris.shape[0]):
        r = np.linalg.norm(field_pts - cen[j], axis=1)
        # self term: the analytic integral of 1/(4 pi r) over a triangle equals R/2 for an equivalent disc of
        # radius R = sqrt(area/pi), so the effective radius that reproduces it via area/(4 pi r) is R/2.
        r = np.where(r < 1e-9, 0.5 * np.sqrt(area[j] / np.pi), r)
        g = area[j] / (4.0 * np.pi * r)
        for k in tris[j]:
            S[:, k] += g / 3.0
    return S


def transfer_matrix(heart_nodes, heart_tris, body_nodes, body_tris):
    """The BEM transfer matrix Z [Nb, Nh] with phi_body = Z phi_heart, for a homogeneous conductor bounded by
    the (insulating) body surface with the heart surface as the inner source boundary.

    The double-layer operator D folds the c(p) jump into a deflated diagonal, set so each combined row over
    the FULL boundary (self surface + other surface) sums to zero. Then a constant potential with zero normal
    current is annihilated by D on both surfaces (a valid physical state), which is exact and avoids the
    singular self solid angle. With the body insulating (b_B = 0), the coupled BIEs are:
        D_BB phi_B + D_BH phi_H = G_BH b_H       (field points on body)
        D_HB phi_B + D_HH phi_H = G_HH b_H       (field points on heart)
    Eliminating b_H = G_HH^{-1}[D_HB phi_B + D_HH phi_H] gives
        [D_BB - G_BH G_HH^{-1} D_HB] phi_B = [G_BH G_HH^{-1} D_HH - D_BH] phi_H,  i.e. phi_B = Z phi_H."""
    Hn, Ht, Bn, Bt = heart_nodes, heart_tris, body_nodes, body_tris
    D_HH = _double_layer(Hn, Hn, Ht); D_HB = _double_layer(Hn, Bn, Bt)
    D_BB = _double_layer(Bn, Bn, Bt); D_BH = _double_layer(Bn, Hn, Ht)
    G_HH = _single_layer(Hn, Hn, Ht); G_BH = _single_layer(Bn, Hn, Ht)
    # deflation: each combined double-layer row (self + other surface) sums to zero -> a constant is annihilated
    for D_self, D_other in ((D_HH, D_HB), (D_BB, D_BH)):
        residual = D_self.sum(1) + D_other.sum(1)
        np.fill_diagonal(D_self, np.diag(D_self) - residual)
    Ginv_DHB = np.linalg.solve(G_HH, D_HB)
    Ginv_DHH = np.linalg.solve(G_HH, D_HH)
    LHS = D_BB - G_BH @ Ginv_DHB
    RHS = G_BH @ Ginv_DHH - D_BH
    Z = np.linalg.solve(LHS, RHS)
    return Z


def verify_bem_spheres(subdiv: int = 3, a: float = 0.7, b: float = 1.0) -> dict:
    """Analytic gate: two concentric spheres (heart radius a, body radius b, insulating outer boundary). For a
    heart-surface potential equal to the degree-1 harmonic phi_H = z/a = cos(theta), the shell solution
    phi = (A r + B/r^2) cos(theta) with dphi/dr=0 at r=b gives B = A b^3 / 2 and A a + B/a^2 = 1, so the body
    potential is phi_B = (A b + B/b^2) cos(theta). The BEM must recover that ratio."""
    Hn, Ht = icosphere(subdiv, a)
    Bn, Bt = icosphere(subdiv, b)
    Z = transfer_matrix(Hn, Ht, Bn, Bt)
    phi_H = Hn[:, 2] / a                                     # cos(theta) on the heart sphere
    phi_B = Z @ phi_H
    A = 1.0 / (a + (b ** 3 / 2.0) / a ** 2)                  # from A a + B/a^2 = 1 with B = A b^3/2
    B = A * b ** 3 / 2.0
    ratio_true = (A * b + B / b ** 2)                        # phi_B / cos(theta)
    ctheta_B = Bn[:, 2] / b
    pred = phi_B
    truth = ratio_true * ctheta_B
    mask = np.abs(ctheta_B) > 0.15                           # avoid the equator where cos(theta) ~ 0
    corr = float(np.corrcoef(pred[mask], truth[mask])[0, 1])
    scale = float(np.polyfit(truth[mask], pred[mask], 1)[0])
    rel_err = float(np.linalg.norm(pred - truth) / (np.linalg.norm(truth) + 1e-12))
    return {"ratio_true": round(ratio_true, 4), "recovered_scale": round(scale, 4),
            "correlation": round(corr, 4), "relative_error": round(rel_err, 4),
            "n_heart": int(Hn.shape[0]), "n_body": int(Bn.shape[0])}
