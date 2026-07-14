import { useState } from 'react';
import { Callout } from '../components/Callout';
import { Cite } from '../components/Cite';
import { Equation } from '../components/Equation';
import { Refs } from '../components/Refs';
import { SubTabs } from '../components/SubTabs';
import { useLang, pick, type Lang } from '../store';

// Hand-authored theme-aware method figures (ADR-0017 §2: >=1 SVG per method tab). All colours are CSS
// variables so they follow light/dark; bilingual captions.
function Fig({ lang, caption, children, vb = '0 0 560 200' }: { lang: Lang; caption: [string, string]; children: React.ReactNode; vb?: string }) {
  return (
    <div className="fig-svg">
      <svg viewBox={vb} role="img" style={{ width: '100%', height: 'auto' }}>{children}</svg>
      <div className="fig-cap">{pick(lang, caption[0], caption[1])}</div>
    </div>
  );
}
const AX = { stroke: 'var(--border)', strokeWidth: 1 };
const T = (x: number, y: number, s: string, cls = 'muted', anchor = 'start', size = 11) =>
  <text x={x} y={y} fill={cls === 'muted' ? 'var(--muted)' : cls === 'accent' ? 'var(--accent)' : cls === 'good' ? 'var(--good)' : 'var(--fg)'} fontSize={size} textAnchor={anchor as 'start'}>{s}</text>;

function ForwardSvg({ lang }: { lang: Lang }) {
  return (
    <Fig lang={lang} caption={['The torso as a volume conductor: a heart source maps to the body surface by A; A’s singular values decay to zero (right), the ill-conditioning.', 'El torso como conductor de volumen: una fuente cardiaca se mapea a la superficie por A; los valores singulares de A decaen a cero (derecha), el mal condicionamiento.']}>
      <ellipse cx="130" cy="100" rx="115" ry="80" fill="none" stroke="var(--border)" strokeWidth="1.5" />
      <ellipse cx="130" cy="103" rx="40" ry="32" fill="color-mix(in srgb, var(--accent) 20%, transparent)" stroke="var(--accent)" strokeWidth="1.5" />
      {T(130, 100, 'heart', 'fg', 'middle')}{T(130, 116, 'φ_heart', 'accent', 'middle', 10)}
      {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={130 + 115 * Math.cos((i / 6) * 6.28)} cy={100 + 80 * Math.sin((i / 6) * 6.28)} r="3.5" fill="var(--accent-2)" />)}
      {T(130, 190, 'φ_body (electrodes)', 'muted', 'middle', 10)}
      <path d="M250 100 H300" stroke="var(--good)" strokeWidth="1.6" markerEnd="url(#mah)" />
      {T(275, 92, 'A', 'good', 'middle')}
      <defs><marker id="mah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--good)" /></marker></defs>
      <line x1="330" y1="40" x2="330" y2="165" {...AX} /><line x1="330" y1="165" x2="545" y2="165" {...AX} />
      {T(322, 40, 'σ_k', 'muted', 'end', 10)}{T(540, 182, 'k', 'muted', 'end', 10)}
      <path d="M338 48 C 380 60, 430 150, 540 162" fill="none" stroke="var(--accent)" strokeWidth="2" />
      {T(430, 120, 'exponential decay', 'accent', 'middle', 10)}
    </Fig>
  );
}
function TikhonovSvg({ lang }: { lang: Lang }) {
  return (
    <Fig lang={lang} caption={['The L-curve: solution norm vs data misfit as λ varies; the corner is the classical balance between fitting the data and staying stable.', 'La curva L: norma de la solucion vs desajuste a datos al variar λ; la esquina es el balance clasico entre ajustar los datos y mantener estabilidad.']}>
      <line x1="70" y1="30" x2="70" y2="165" {...AX} /><line x1="70" y1="165" x2="520" y2="165" {...AX} />
      {T(60, 40, '||Lφ||', 'muted', 'end', 10)}{T(515, 182, '||Aφ - φ_body||', 'muted', 'end', 10)}
      <path d="M82 40 C 95 120, 130 150, 500 158" fill="none" stroke="var(--accent)" strokeWidth="2" />
      <circle cx="150" cy="146" r="5" fill="var(--good)" />{T(165, 140, 'corner (best λ)', 'good', 'start', 10)}
      {T(95, 60, 'under-regularized', 'muted', 'start', 9)}{T(360, 150, 'over-smoothed', 'muted', 'start', 9)}
    </Fig>
  );
}
function ParamSvg({ lang }: { lang: Lang }) {
  return (
    <Fig lang={lang} caption={['The reconstruction error as a function of λ is U-shaped; we report the ORACLE minimum (fair to every method) rather than an L-curve heuristic.', 'El error de reconstruccion en funcion de λ tiene forma de U; reportamos el minimo ORACULO (justo para todo metodo) en lugar de una heuristica de curva L.']}>
      <line x1="70" y1="30" x2="70" y2="165" {...AX} /><line x1="70" y1="165" x2="520" y2="165" {...AX} />
      {T(60, 40, 'RE', 'muted', 'end', 10)}{T(515, 182, 'log λ', 'muted', 'end', 10)}
      <path d="M90 50 C 160 150, 220 155, 300 150 C 380 145, 440 60, 500 45" fill="none" stroke="var(--accent)" strokeWidth="2" />
      <circle cx="300" cy="152" r="5" fill="var(--good)" />{T(300, 140, 'oracle-best λ', 'good', 'middle', 10)}
      {T(110, 70, 'unstable', 'muted', 'middle', 9)}{T(480, 70, 'blurred', 'muted', 'middle', 9)}
    </Fig>
  );
}
function PriorSvg({ lang }: { lang: Lang }) {
  const nb = [[0, -34], [30, -17], [30, 17], [0, 34], [-30, 17], [-30, -17]];
  return (
    <Fig lang={lang} caption={['The prior penalizes roughness on the REAL heart-cage triangulation via its graph Laplacian: each node is pulled toward the mean of its mesh neighbours.', 'El prior penaliza la rugosidad sobre la triangulacion REAL de la jaula cardiaca via su Laplaciano de grafo: cada nodo se atrae hacia la media de sus vecinos de malla.']}>
      <g transform="translate(150,100)">
        {nb.map(([x, y], i) => <g key={i}><line x1="0" y1="0" x2={x} y2={y} stroke="var(--border)" strokeWidth="1.2" /><circle cx={x} cy={y} r="6" fill="var(--panel-2)" stroke="var(--accent-2)" strokeWidth="1.3" /></g>)}
        <circle cx="0" cy="0" r="8" fill="color-mix(in srgb, var(--accent) 25%, transparent)" stroke="var(--accent)" strokeWidth="1.6" />
        {T(0, 4, 'i', 'accent', 'middle', 10)}
      </g>
      {T(300, 80, '(Lφ)_i = φ_i - mean of neighbours', 'fg', 'start', 11)}
      {T(300, 104, 'smooth ALONG the tissue,', 'muted', 'start', 10)}
      {T(300, 120, 'not in an abstract vector space', 'muted', 'start', 10)}
    </Fig>
  );
}
function PhysicsSvg({ lang }: { lang: Lang }) {
  return (
    <Fig lang={lang} caption={['The objective: the recovered potentials must reproduce the REAL measured body data through A (physics), while the mesh prior keeps them smooth on the surface.', 'El objetivo: los potenciales recuperados deben reproducir los datos REALES medidos a traves de A (fisica), mientras el prior de malla los mantiene suaves en la superficie.']}>
      <rect x="30" y="70" width="150" height="60" rx="8" fill="var(--panel-2)" stroke="var(--accent-2)" strokeWidth="1.3" />
      {T(105, 95, 'data fit', 'fg', 'middle')}{T(105, 112, '||Aφ - φ_body||²', 'muted', 'middle', 10)}
      {T(200, 105, '+', 'fg', 'middle', 16)}
      <rect x="220" y="70" width="150" height="60" rx="8" fill="var(--panel-2)" stroke="var(--accent)" strokeWidth="1.3" />
      {T(295, 95, 'physics prior', 'fg', 'middle')}{T(295, 112, 'λ² ||L_mesh φ||²', 'muted', 'middle', 10)}
      <path d="M375 100 H420" stroke="var(--good)" strokeWidth="1.6" markerEnd="url(#pah)" />
      <defs><marker id="pah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--good)" /></marker></defs>
      <rect x="428" y="72" width="110" height="56" rx="8" fill="color-mix(in srgb, var(--good) 12%, var(--panel))" stroke="var(--good)" strokeWidth="1.3" />
      {T(483, 95, 'φ_heart', 'fg', 'middle')}{T(483, 112, 'recovered', 'good', 'middle', 10)}
    </Fig>
  );
}
function UqSvg({ lang }: { lang: Lang }) {
  return (
    <Fig lang={lang} caption={['Calibration: after temperature recalibration the empirical coverage tracks the nominal (dashed identity); ~90% of nodes fall within the 2σ band of the true error.', 'Calibracion: tras recalibrar la temperatura la cobertura empirica sigue la identidad (linea punteada); ~90% de los nodos caen dentro de la banda 2σ del error real.']}>
      <line x1="70" y1="30" x2="70" y2="165" {...AX} /><line x1="70" y1="165" x2="470" y2="165" {...AX} />
      {T(60, 40, 'empirical', 'muted', 'end', 10)}{T(465, 182, 'nominal coverage', 'muted', 'end', 10)}
      <line x1="70" y1="165" x2="430" y2="35" stroke="var(--muted)" strokeWidth="1" strokeDasharray="4 3" />
      <path d="M70 165 C 180 120, 280 70, 430 40" fill="none" stroke="var(--good)" strokeWidth="2" />
      {T(250, 150, 'calibrated (≈ identity)', 'good', 'middle', 10)}
      <circle cx="360" cy="63" r="4" fill="var(--accent)" />{T(372, 60, '2σ → ~0.90', 'accent', 'start', 10)}
    </Fig>
  );
}

export function Methodology() {
  const lang = useLang();
  const [m, setM] = useState('forward');
  const methods = [
    { id: 'forward', label: pick(lang, 'Forward operator', 'Operador directo') },
    { id: 'tikhonov', label: pick(lang, 'Tikhonov inverse', 'Inverso de Tikhonov') },
    { id: 'param', label: pick(lang, 'Parameter choice', 'Eleccion del parametro') },
    { id: 'prior', label: pick(lang, 'Graph-Laplacian prior', 'Prior de Laplaciano de grafo') },
    { id: 'physics', label: pick(lang, 'Physics-constrained', 'Restringido por fisica') },
    { id: 'uq', label: pick(lang, 'Ensemble uncertainty', 'Incertidumbre por ensemble') },
  ];

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{pick(lang, 'Methodology', 'Metodologia')}</h1>
        <p className="lede">{pick(lang,
          'The method landscape for the inverse ECG problem, from the forward physics to the regularized inverse, the spatial prior, the physics-constrained fit, and the calibrated uncertainty. Each family is a tab with its governing equations, the exact choices this build makes, and its honest limits.',
          'El panorama de metodos para el problema inverso de ECG, desde la fisica directa hasta el inverso regularizado, el prior espacial, el ajuste restringido por fisica, y la incertidumbre calibrada. Cada familia es una pestana con sus ecuaciones gobernantes, las decisiones exactas de esta implementacion, y sus limites honestos.')}</p>
      </div>

      <div className="method-layout">
        <SubTabs tabs={methods} active={m} onChange={setM} />
        <div>
          {m === 'forward' && (
            <section>
              <h2>{pick(lang, 'The forward operator: torso volume conduction', 'El operador directo: conduccion de volumen del torso')}</h2>
              <p>{pick(lang,
                'The forward problem maps a given heart-surface potential distribution to the potentials it produces on the body surface. In the quasi-static regime of the heartbeat the extracellular potential is harmonic in the torso, so the map is linear and encoded by a single transfer matrix A that depends only on the geometry and the tissue conductivities, not on the signal.',
                'El problema directo mapea una distribucion dada de potencial de superficie cardiaca a los potenciales que produce en la superficie corporal. En el regimen cuasi-estatico del latido el potencial extracelular es armonico en el torso, asi que el mapa es lineal y esta codificado por una sola matriz de transferencia A que depende solo de la geometria y las conductividades del tejido, no de la senal.')}</p>
              <p>{pick(lang,
                'A is built by discretizing the boundary-value problem with the boundary element method on the meshed heart and torso surfaces. This build uses the physically simplest kernel, a single-layer (point-source) Green function evaluated on the REAL electrode positions of the EDGAR experiment, and row-normalizes it for conditioning; a scalar gain is calibrated once on the first half of the beat and then fixed. The full boundary-element operator with the closed torso mesh and per-tissue conductivities is more accurate and is the natural next step.',
                'A se construye discretizando el problema de valores de contorno con el metodo de elementos de contorno sobre las superficies malladas del corazon y el torso. Esta implementacion usa el nucleo fisicamente mas simple, una funcion de Green de capa simple (fuente puntual) evaluada sobre las posiciones REALES de los electrodos del experimento EDGAR, y lo normaliza por filas para el condicionamiento; una ganancia escalar se calibra una vez en la primera mitad del latido y luego se fija.')}</p>
              <Equation tex={String.raw`\phi_{\text{body}} = A\,\phi_{\text{heart}}, \qquad A_{ij} = \frac{g}{4\pi\,\lVert x^{b}_i - x^{h}_j\rVert}\Big/\textstyle\sum_j(\cdot), \qquad A = U\Sigma V^{\top}`}
                caption={pick(lang, 'The linear forward map, its single-layer kernel on the real geometry, and its SVD.', 'El mapa directo lineal, su nucleo de capa simple sobre la geometria real, y su SVD.')} />
              <Equation tex={String.raw`\text{condition number } \kappa(A) = \sigma_1/\sigma_n \gg 1, \qquad \sigma_k \searrow 0`}
                caption={pick(lang, 'The singular values decay to zero: A is severely ill-conditioned, which is why the inverse must be regularized.', 'Los valores singulares decaen a cero: A esta severamente mal condicionado, por lo que el inverso debe regularizarse.')} />
              <Callout>{pick(lang,
                'Single-layer approximation, not full BEM; it caps the absolute accuracy but is honest and self-contained. The real electrode geometry (192 torso, 256 cage nodes + triangulations) is used exactly.',
                'Aproximacion de capa simple, no BEM completo; limita la precision absoluta pero es honesta y autocontenida. La geometria real de electrodos (192 torso, 256 nodos de jaula + triangulaciones) se usa exactamente.')}</Callout>
              <ForwardSvg lang={lang} />
              <Refs ids={['barr1977', 'rudy1988', 'bear2018']} />
            </section>
          )}

          {m === 'tikhonov' && (
            <section>
              <h2>{pick(lang, 'Tikhonov regularization', 'Regularizacion de Tikhonov')} <Cite id="tikhonov1977" /></h2>
              <p>{pick(lang,
                'Directly solving A phi = phi_body is unstable because the small singular values of A amplify noise without bound. Tikhonov regularization replaces the unstable inverse with a well-posed minimization: fit the data AND keep the solution controlled, weighting the two with a parameter lambda. Zeroth-order Tikhonov penalizes the solution magnitude; higher orders penalize a surface derivative to enforce smoothness.',
                'Resolver directamente A phi = phi_body es inestable porque los valores singulares pequenos de A amplifican el ruido sin limite. La regularizacion de Tikhonov reemplaza el inverso inestable por una minimizacion bien planteada: ajustar los datos Y mantener la solucion controlada, ponderando ambos con un parametro lambda.')}</p>
              <p>{pick(lang,
                'The minimization has a closed form, a single linear solve, which makes Tikhonov fast and the standard clinical-research baseline. Its cost is a bias: the penalty smooths the solution, blurring sharp activation fronts, and it returns a single estimate with no uncertainty. This build computes the zeroth-order Tikhonov reconstruction per time frame.',
                'La minimizacion tiene forma cerrada, un solo sistema lineal, lo que hace a Tikhonov rapido y el baseline estandar de investigacion clinica. Su costo es un sesgo: la penalizacion suaviza la solucion, difuminando los frentes de activacion agudos, y devuelve una sola estimacion sin incertidumbre. Esta implementacion computa la reconstruccion de Tikhonov de orden cero por cuadro de tiempo.')}</p>
              <Equation tex={String.raw`\hat\phi = \arg\min_\phi \lVert A\phi - \phi_{\text{body}}\rVert_2^2 + \lambda^2\lVert\phi\rVert_2^2 = (A^{\top}A + \lambda^2 I)^{-1}A^{\top}\phi_{\text{body}}`}
                caption={pick(lang, 'Zeroth-order Tikhonov: the regularized normal equations, solved per time frame.', 'Tikhonov de orden cero: las ecuaciones normales regularizadas, resueltas por cuadro de tiempo.')} />
              <Equation tex={String.raw`\hat\phi = \sum_k \frac{\sigma_k}{\sigma_k^2 + \lambda^2}\,(u_k^{\top}\phi_{\text{body}})\,v_k`}
                caption={pick(lang, 'In the SVD basis, the filter factor sigma_k^2/(sigma_k^2+lambda^2) damps the noise-dominated small singular values.', 'En la base SVD, el factor de filtro sigma_k^2/(sigma_k^2+lambda^2) amortigua los valores singulares pequenos dominados por ruido.')} />
              <Callout>{pick(lang,
                'L1 / total-variation variants sharpen fronts but stay deterministic. We keep the classical L2 Tikhonov as the honest, well-understood baseline and give it its oracle-best lambda (Parameter choice tab).',
                'Las variantes L1 / de variacion total agudizan los frentes pero siguen siendo deterministas. Mantenemos el Tikhonov L2 clasico como el baseline honesto y bien entendido y le damos su mejor lambda por oraculo (pestana Eleccion del parametro).')}</Callout>
              <TikhonovSvg lang={lang} />
              <Refs ids={['tikhonov1977', 'ghosh2009']} />
            </section>
          )}

          {m === 'param' && (
            <section>
              <h2>{pick(lang, 'Choosing the regularization strength', 'Eleccion de la fuerza de regularizacion')} <Cite id="hansen1992" /></h2>
              <p>{pick(lang,
                'Lambda controls the trade-off between fidelity to the data and stability of the solution: too small and noise dominates, too large and the reconstruction is over-smoothed to near zero. Classically it is chosen by the L-curve, a log-log plot of the solution norm against the residual norm as lambda varies, whose corner marks the best compromise, or by the CRESO and GCV criteria.',
                'Lambda controla el compromiso entre fidelidad a los datos y estabilidad de la solucion: muy pequeno y el ruido domina, muy grande y la reconstruccion se sobre-suaviza a casi cero. Clasicamente se elige por la curva L, un grafico log-log de la norma de la solucion contra la norma del residuo al variar lambda, cuya esquina marca el mejor compromiso, o por los criterios CRESO y GCV.')}</p>
              <p>{pick(lang,
                'Because this experiment has the true heart-surface potentials, we compare methods fairly by giving each its ORACLE-best lambda, the value on a logarithmic sweep that minimizes the true reconstruction error. This judges the classical baseline at its best, not strawmanned; a clinical pipeline that lacks the ground truth would use the L-curve instead, which is typically close to the oracle.',
                'Como este experimento tiene los potenciales verdaderos de superficie cardiaca, comparamos los metodos de forma justa dando a cada uno su mejor lambda por ORACULO, el valor en un barrido logaritmico que minimiza el error real de reconstruccion. Esto juzga el baseline clasico en su mejor version; un pipeline clinico sin la verdad de referencia usaria la curva L, que tipicamente esta cerca del oraculo.')}</p>
              <Equation tex={String.raw`\lambda^\star = \arg\min_{\lambda}\; \frac{\lVert \hat\phi(\lambda) - \phi_{\text{heart}}^{\text{measured}}\rVert}{\lVert \phi_{\text{heart}}^{\text{measured}}\rVert} \quad\text{(oracle, real ground truth available)}`}
                caption={pick(lang, 'The oracle criterion used for a fair comparison; the clinical L-curve corner approximates it without the truth.', 'El criterio oraculo usado para una comparacion justa; la esquina de la curva L clinica lo aproxima sin la verdad.')} />
              <Callout>{pick(lang,
                'The oracle lambda uses the ground truth ONLY to pick the fairest baseline, never to fit the reconstruction. The reconstruction itself sees only the body-surface data.',
                'El lambda oraculo usa la verdad de referencia SOLO para elegir el baseline mas justo, nunca para ajustar la reconstruccion. La reconstruccion en si solo ve los datos de superficie corporal.')}</Callout>
              <ParamSvg lang={lang} />
              <Refs ids={['hansen1992']} />
            </section>
          )}

          {m === 'prior' && (
            <section>
              <h2>{pick(lang, 'A spatial prior on the real heart surface', 'Un prior espacial sobre la superficie cardiaca real')}</h2>
              <p>{pick(lang,
                'A generic magnitude penalty ignores that the heart-surface potentials are a smooth field on a curved surface: neighbouring electrodes should have similar values because the tissue is continuous. We encode that by penalizing the graph Laplacian of the real heart-cage triangulation, which measures how much each node differs from its mesh neighbours.',
                'Una penalizacion generica de magnitud ignora que los potenciales de superficie cardiaca son un campo suave sobre una superficie curva: los electrodos vecinos deberian tener valores similares porque el tejido es continuo. Codificamos eso penalizando el Laplaciano de grafo de la triangulacion real de la jaula cardiaca, que mide cuanto difiere cada nodo de sus vecinos en la malla.')}</p>
              <p>{pick(lang,
                'This replaces the identity penalty with a geometry-aware one built from the actual mesh connectivity, so the smoothness is imposed along the tissue rather than in an abstract coordinate space. It is the discrete analogue of penalizing the surface gradient of the potential.',
                'Esto reemplaza la penalizacion de identidad por una consciente de la geometria construida a partir de la conectividad real de la malla, asi que la suavidad se impone a lo largo del tejido en lugar de en un espacio de coordenadas abstracto. Es el analogo discreto de penalizar el gradiente superficial del potencial.')}</p>
              <Equation tex={String.raw`\hat\phi = (A^{\top}A + \lambda^2 L_{\text{mesh}}^{\top}L_{\text{mesh}})^{-1}A^{\top}\phi_{\text{body}}, \qquad (L_{\text{mesh}})_{ij} = \deg(i)\,[i{=}j] - [\,i\sim j\,]`}
                caption={pick(lang, 'The graph-Laplacian-regularized inverse; L_mesh is the combinatorial Laplacian of the cage triangulation.', 'El inverso regularizado por Laplaciano de grafo; L_mesh es el Laplaciano combinatorio de la triangulacion de la jaula.')} />
              <Callout>{pick(lang,
                'On this data the graph prior matches zeroth-order Tikhonov on relative error and slightly changes the correlation; its value is a physically meaningful smoothness that also stabilizes the ensemble uncertainty. A cotangent (metric) Laplacian would be a refinement.',
                'Sobre estos datos el prior de grafo iguala al Tikhonov de orden cero en error relativo y cambia ligeramente la correlacion; su valor es una suavidad fisicamente significativa que ademas estabiliza la incertidumbre por ensemble. Un Laplaciano cotangente (metrico) seria un refinamiento.')}</Callout>
              <PriorSvg lang={lang} />
              <Refs ids={['ghosh2009']} />
            </section>
          )}

          {m === 'physics' && (
            <section>
              <h2>{pick(lang, 'Physics-constrained reconstruction', 'Reconstruccion restringida por fisica')} <Cite id="raissi2019" /></h2>
              <p>{pick(lang,
                'The physics-informed view is that the recovered field must be consistent with the governing operator: whatever heart-surface potentials we output, projecting them forward through A must reproduce the REAL measured body-surface data. That data-consistency term is the physics constraint; the spatial prior is the regularizer; together they define the objective we minimize.',
                'La vision informada por fisica es que el campo recuperado debe ser consistente con el operador gobernante: cualesquiera potenciales de superficie cardiaca que emitamos, proyectarlos hacia adelante a traves de A debe reproducir los datos REALES medidos de superficie corporal. Ese termino de consistencia con datos es la restriccion fisica; el prior espacial es el regularizador; juntos definen el objetivo que minimizamos.')}</p>
              <p>{pick(lang,
                'This is the same principle as a physics-informed neural network, enforce the governing equation as a soft constraint while the measured data drives the fit, here applied to the linear inverse problem so the solve stays a fast, well-understood least squares. The cardiac PINN literature (Sahli Costabal 2020) applies the same idea to the nonlinear Eikonal activation problem. The 2026 frontier replaces the hand-chosen prior with a learned generative (diffusion) prior that carries its own uncertainty.',
                'Este es el mismo principio que una red neuronal informada por fisica, imponer la ecuacion gobernante como restriccion suave mientras los datos medidos guian el ajuste, aqui aplicado al problema inverso lineal para que la solucion siga siendo un minimos cuadrados rapido y bien entendido. La literatura de PINN cardiaco (Sahli Costabal 2020) aplica la misma idea al problema no lineal de activacion Eikonal.')}</p>
              <Equation tex={String.raw`\mathcal{L}(\phi) = \underbrace{\lVert A\phi - \phi_{\text{body}}^{\text{measured}}\rVert_2^2}_{\text{physics / data consistency}} + \underbrace{\lambda^2\lVert L_{\text{mesh}}\phi\rVert_2^2}_{\text{surface prior}}`}
                caption={pick(lang, 'The physics-constrained objective: forward-consistency with the real measurement plus the geometry-aware prior.', 'El objetivo restringido por fisica: consistencia directa con la medicion real mas el prior consciente de la geometria.')} />
              <Callout>{pick(lang,
                'Because the operator here is linear, the physics-constrained solve equals the regularized least squares; the PINN framing matters more for the nonlinear cardiac problems (activation, flow) where the constraint is a PDE residual evaluated by autograd.',
                'Como el operador aqui es lineal, la solucion restringida por fisica equivale al minimos cuadrados regularizado; el encuadre PINN importa mas para los problemas cardiacos no lineales (activacion, flujo) donde la restriccion es un residuo de PDE evaluado por autograd.')}</Callout>
              <PhysicsSvg lang={lang} />
              <Refs ids={['raissi2019', 'sahli2020', 'diffusion2026']} />
            </section>
          )}

          {m === 'uq' && (
            <section>
              <h2>{pick(lang, 'Calibrated per-node uncertainty by deep ensemble', 'Incertidumbre por nodo calibrada por ensemble profundo')} <Cite id="lakshminarayanan2017" /></h2>
              <p>{pick(lang,
                'A single reconstruction cannot say where it should be trusted, which for an ill-posed clinical inverse is essential: the clinician must know which parts of the map are reliable. We estimate this by a deep ensemble: repeat the reconstruction many times, each on the measured data perturbed by an independent draw of realistic measurement noise, and take the spread across the ensemble as the per-node uncertainty.',
                'Una sola reconstruccion no puede decir donde debe confiarse, lo cual para un inverso clinico mal planteado es esencial: el clinico debe saber que partes del mapa son confiables. Estimamos esto por un ensemble profundo: repetir la reconstruccion muchas veces, cada una sobre los datos medidos perturbados por una realizacion independiente de ruido de medicion realista, y tomar la dispersion en el ensemble como la incertidumbre por nodo.')}</p>
              <p>{pick(lang,
                'Raw ensemble spreads are usually miscalibrated (over- or under-confident). We recalibrate with a single temperature so that the average two-standard-deviation band matches the average true error; on this data the reliability, the fraction of nodes whose true error falls within two standard deviations, rises to about 0.90. That calibrated map is the concrete added value over a single Tikhonov estimate.',
                'Las dispersiones crudas del ensemble suelen estar mal calibradas (sobre o sub-confiadas). Recalibramos con una sola temperatura para que la banda promedio de dos desviaciones estandar iguale el error promedio real; sobre estos datos la confiabilidad, la fraccion de nodos cuyo error real cae dentro de dos desviaciones estandar, sube a cerca de 0.90. Ese mapa calibrado es el valor agregado concreto sobre una sola estimacion de Tikhonov.')}</p>
              <Equation tex={String.raw`\bar\phi = \tfrac1K\sum_{k=1}^{K}\hat\phi^{(k)}, \quad s_0 = \operatorname{std}_k\hat\phi^{(k)}, \quad \tau = \frac{\overline{|\bar\phi-\phi^{\text{true}}|}\,\sqrt{\pi/2}}{\overline{s_0}}, \quad s = \tau\,s_0`}
                caption={pick(lang, 'Ensemble mean, raw spread, the recalibration temperature, and the calibrated per-node uncertainty s.', 'Media del ensemble, dispersion cruda, la temperatura de recalibracion, y la incertidumbre por nodo calibrada s.')} />
              <Callout>{pick(lang,
                'The recalibration uses the true error only to set one global scalar; it does not fit the reconstruction. A fully blind calibration (cross-validation on the body surface) is the honest clinical version and a next step.',
                'La recalibracion usa el error real solo para fijar un escalar global; no ajusta la reconstruccion. Una calibracion totalmente ciega (validacion cruzada en la superficie corporal) es la version clinica honesta y un siguiente paso.')}</Callout>
              <UqSvg lang={lang} />
              <Refs ids={['lakshminarayanan2017', 'cluitmans2018']} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
