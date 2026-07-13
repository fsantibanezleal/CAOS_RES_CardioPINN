import { useState } from 'react';
import { Callout } from '../components/Callout';
import { Cite } from '../components/Cite';
import { Equation } from '../components/Equation';
import { Refs } from '../components/Refs';
import { SubTabs } from '../components/SubTabs';
import { useLang, pick } from '../store';

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
              <Refs ids={['lakshminarayanan2017', 'cluitmans2018']} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
