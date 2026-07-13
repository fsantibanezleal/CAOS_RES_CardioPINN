import { Equation } from '../components/Equation';
import { Refs } from '../components/Refs';
import { useLang, pick } from '../store';

export function Methodology() {
  const lang = useLang();
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="panel">
        <h1 style={{ marginTop: 0 }}>{pick(lang, 'Methodology', 'Metodologia')}</h1>
        <p>{pick(lang,
          'A PINN represents a physical field by a neural network and trains it to minimize a loss that combines a data-misfit term with the residual of a governing partial differential equation evaluated at collocation points, plus problem-specific priors and boundary conditions. The optimizer is the canonical Adam then L-BFGS recipe. The novelty across cardiac verticals lives in the input space (Fourier features, or Laplace-Beltrami eigenfunctions of the real cardiac mesh) and the physics residual, not in the optimizer, which is why the engine is a compact custom PyTorch loop rather than a turnkey framework.',
          'Una PINN representa un campo fisico con una red neuronal y la entrena para minimizar una perdida que combina un termino de ajuste a datos con el residuo de una ecuacion en derivadas parciales gobernante evaluado en puntos de colocacion, mas priors y condiciones de borde especificas del problema. El optimizador es la receta canonica Adam luego L-BFGS. La novedad en los verticales cardiacos vive en el espacio de entrada (features de Fourier, o autofunciones de Laplace-Beltrami de la malla cardiaca real) y el residuo fisico, no en el optimizador.')}</p>
      </div>
      <div className="panel">
        <h2>{pick(lang, 'The Eikonal model of activation', 'El modelo Eikonal de la activacion')}</h2>
        <p>{pick(lang, 'Activation time under the front-arrival limit obeys', 'El tiempo de activacion bajo el limite de llegada de frente obedece')}</p>
        <Equation tex={String.raw`\lVert \nabla T(x) \rVert \, V(x) = 1, \qquad T(x_{\text{stim}}) = 0.`} />
        <p className="small">{pick(lang, 'The anisotropic form uses a fiber conductivity tensor D:', 'La forma anisotropa usa un tensor de conductividad de fibra D:')}</p>
        <Equation tex={String.raw`\sqrt{(\nabla T)^{\top} D\, \nabla T} = 1.`} />
      </div>
      <div className="panel">
        <h2>{pick(lang, 'Reaction-diffusion (monodomain)', 'Reaccion-difusion (monodominio)')}</h2>
        <p>{pick(lang, 'For full potential dynamics (used in the atrial-fibrillation vertical) the monodomain equation couples diffusion with a cellular ionic model:', 'Para la dinamica completa del potencial (usada en el vertical de fibrilacion auricular) la ecuacion monodominio acopla difusion con un modelo ionico celular:')}</p>
        <Equation tex={String.raw`\frac{\partial u}{\partial t} = \nabla\cdot(D\,\nabla u) + f_{\text{ion}}(u, w), \qquad \frac{\partial w}{\partial t} = g(u, w).`} />
      </div>
      <div className="panel">
        <h2>{pick(lang, 'Hemodynamics (Navier-Stokes)', 'Hemodinamica (Navier-Stokes)')}</h2>
        <p>{pick(lang, 'The 4D-flow and pulmonary-artery verticals enforce mass and momentum conservation of incompressible flow:', 'Los verticales de 4D-flow y arteria pulmonar imponen conservacion de masa y momento del flujo incompresible:')}</p>
        <Equation tex={String.raw`\nabla\cdot u = 0, \qquad \rho\left(\frac{\partial u}{\partial t} + u\cdot\nabla u\right) = -\nabla p + \nabla\cdot\big(\mu(\dot\gamma)(\nabla u + \nabla u^{\top})\big).`} />
      </div>
      <Refs items={[
        { cite: 'Sahli Costabal, Yang, Perdikaris, Hurtado, Kuhl (2020). PINNs for Cardiac Activation Mapping. Frontiers in Physics 8:42', doi_or_arxiv: '10.3389/fphy.2020.00042', note: 'Eikonal activation mapping' },
        { cite: 'Grandits, Pezzuto, Sahli Costabal, Perdikaris, Pock, Plank, Krause (2021). Learning atrial fiber orientations (PIEMAP)', doi_or_arxiv: 'arXiv:2102.10863', note: 'anisotropic fiber/conductivity inverse' },
        { cite: 'Sahli Costabal, Pezzuto, Perdikaris (2024). Delta-PINNs on complex geometries. Eng. Appl. AI 127', doi_or_arxiv: '10.1016/j.engappai.2023.107324', note: 'Laplace-Beltrami eigenbasis' },
        { cite: 'Sierpe, Castillo, Mella, Galarce (2025). Hemodynamic parameters via PINNs with hematocrit rheology', doi_or_arxiv: 'arXiv:2508.03326', note: '4D-flow pressure' },
      ]} />
    </div>
  );
}
