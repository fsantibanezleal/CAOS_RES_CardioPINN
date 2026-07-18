import { useState } from 'react';
import { Callout, Cite, Equation, Refs, SubTabs, type SubTabDef } from '@fasl-work/caos-app-shell';
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
    <Fig lang={lang} caption={['The L-curve: solution norm vs data misfit as λ varies; the corner is the classical balance between fitting the data and staying stable.', 'La curva L: norma de la solucion vs desajuste a datos al variar λ; la esquina es el balance clásico entre ajustar los datos y mantener estabilidad.']}>
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
    <Fig lang={lang} caption={['The reconstruction error as a function of λ is U-shaped; we report the ORACLE minimum (fair to every method) rather than an L-curve heuristic.', 'El error de reconstrucción en funcion de λ tiene forma de U; reportamos el mínimo ORACULO (justo para todo método) en lugar de una heuristica de curva L.']}>
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
    <Fig lang={lang} caption={['The objective: the recovered potentials must reproduce the REAL measured body data through A (physics), while the mesh prior keeps them smooth on the surface.', 'El objetivo: los potenciales recuperados deben reproducir los datos REALES medidos a traves de A (física), mientras el prior de malla los mantiene suaves en la superficie.']}>
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

function NsSvg({ lang }: { lang: Lang }) {
  return (
    <Fig lang={lang} caption={['Incompressible Navier-Stokes; taking the divergence and using ∇·v=0 removes the acceleration and pressure gradient couplings into a single Poisson equation for pressure.', 'Navier-Stokes incompresible; tomar la divergencia y usar ∇·v=0 elimina los acoplamientos y deja una sola ecuacion de Poisson para la presion.']}>
      <rect x="20" y="70" width="180" height="56" rx="8" fill="var(--panel-2)" stroke="var(--accent)" strokeWidth="1.3" />
      {T(110, 92, 'momentum + ∇·v=0', 'fg', 'middle')}{T(110, 110, 'ρ(∂ₜv+(v·∇)v)=-∇p+μ∇²v', 'muted', 'middle', 9)}
      <path d="M200 98 H250" stroke="var(--accent-2)" strokeWidth="1.6" markerEnd="url(#mah2)" />{T(225, 90, 'div', 'muted', 'middle', 9)}
      <rect x="252" y="70" width="150" height="56" rx="8" fill="var(--panel-2)" stroke="var(--border)" />
      {T(327, 92, 'pressure-Poisson', 'fg', 'middle')}{T(327, 110, '∇²p = S(v)', 'muted', 'middle', 10)}
      <path d="M402 98 H452" stroke="var(--good)" strokeWidth="1.6" markerEnd="url(#mahg2)" />
      <rect x="454" y="72" width="86" height="52" rx="8" fill="color-mix(in srgb, var(--good) 12%, var(--panel))" stroke="var(--good)" strokeWidth="1.3" />
      {T(497, 94, 'p(x)', 'fg', 'middle')}{T(497, 111, 'relative', 'good', 'middle', 9)}
      <defs><marker id="mah2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--accent-2)" /></marker><marker id="mahg2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--good)" /></marker></defs>
    </Fig>
  );
}
function DenoiseSvg({ lang }: { lang: Lang }) {
  return (
    <Fig lang={lang} caption={['A network fits the measured velocity while enforcing ∇·v=0, projecting out the continuity-violating noise; its analytic derivatives make the pressure-Poisson source clean.', 'Una red ajusta la velocidad medida imponiendo ∇·v=0, proyectando el ruido que viola continuidad; sus derivadas analiticas limpian la fuente de Poisson.']}>
      <rect x="20" y="72" width="150" height="52" rx="8" fill="var(--panel-2)" stroke="var(--accent)" strokeWidth="1.3" />
      {T(95, 92, 'noisy v(measured)', 'fg', 'middle', 10)}{T(95, 109, '|div v| large', 'muted', 'middle', 9)}
      <path d="M170 98 H214" stroke="var(--accent-2)" strokeWidth="1.6" markerEnd="url(#mah2)" />
      <rect x="216" y="72" width="170" height="52" rx="8" fill="var(--panel-2)" stroke="var(--accent-2)" strokeWidth="1.3" />
      {T(301, 90, 'div-free PINN v_θ', 'fg', 'middle')}{T(301, 108, 'data fit + λ||∇·v||²', 'muted', 'middle', 9)}
      <path d="M386 98 H430" stroke="var(--good)" strokeWidth="1.6" markerEnd="url(#mahg2)" />
      <rect x="432" y="72" width="108" height="52" rx="8" fill="color-mix(in srgb, var(--good) 12%, var(--panel))" stroke="var(--good)" strokeWidth="1.3" />
      {T(486, 92, 'smooth v', 'fg', 'middle')}{T(486, 109, '|div v| ~0', 'good', 'middle', 9)}
    </Fig>
  );
}

export function Methodology() {
  const lang = useLang();
  const [dom, setDom] = useState<'ecgi' | 'flow'>('ecgi');

  const ecgiTabs: SubTabDef[] = [
    {
      id: 'forward', label: pick(lang, 'Forward operator', 'Operador directo'),
      content: (
        <section>
          <h2>{pick(lang, 'The forward operator: torso volume conduction', 'El operador directo: conduccion de volumen del torso')}</h2>
          <p>{pick(lang,
            'The forward problem maps a given heart-surface potential distribution to the potentials it produces on the body surface. In the quasi-static regime of the heartbeat the extracellular potential is harmonic in the torso, so the map is linear and encoded by a single transfer matrix A that depends only on the geometry and the tissue conductivities, not on the signal.',
            'El problema directo mapea una distribución dada de potencial de superficie cardiaca a los potenciales que produce en la superficie corporal. En el régimen cuasi-estático del latido el potencial extracelular es armonico en el torso, así que el mapa es lineal y esta codificado por una sola matriz de transferencia A que depende solo de la geometría y las conductividades del tejido, no de la señal.')}</p>
          <p>{pick(lang,
            'The operator this build actually bakes and inverts is an unbounded-medium point-source (single-layer) approximation: A maps every heart-cage node to every body electrode by the reciprocal of their distance, softened and row-normalized for conditioning, with one scalar gain calibrated on the first half of the beat, then fixed and applied to the whole matrix. It is evaluated on the REAL electrode positions of the EDGAR experiment, not a generic mesh. A homogeneous boundary-element operator IS also implemented and analytic-gated on the concentric-sphere problem (see the Analytic gates tab), but the EDGAR electrode surfaces are open point clouds, not the closed 2-manifolds a BEM needs, so the reconstruction falls back to the single-layer operator and the BEM runs only as an offline comparison on closed-manifold catalogue geometries. The full closed-torso BEM with per-tissue conductivities is the natural next step.',
            'El operador que esta implementacion realmente calcula e invierte es una aproximación de fuente puntual en medio no acotado (capa simple): A mapea cada nodo de la jaula cardiaca a cada electrodo corporal por el reciproco de su distancia, suavizado y normalizado por filas para el condicionamiento, con una ganancia escalar calibrada en la primera mitad del latido, luego fijada y aplicada a toda la matriz. Se evalua sobre las posiciones REALES de los electrodos del experimento EDGAR, no sobre una malla generica. Un operador de elementos de contorno homogeneo también esta implementado y probado analiticamente en el problema de esferas concentricas (ver la pestana Pruebas analiticas), pero las superficies de electrodos de EDGAR son nubes de puntos abiertas, no las 2-variedades cerradas que un BEM necesita, así que la reconstrucción recae en el operador de capa simple y el BEM corre solo como comparación offline en geometrias de catalogo de variedad cerrada. El BEM completo de torso cerrado con conductividades por tejido es el siguiente paso natural.')}</p>
          <Equation tex={String.raw`\phi_{\text{body}} = g\,A\,\phi_{\text{heart}}, \qquad A_{ij} = \frac{1}{\lVert x^{b}_i - x^{h}_j\rVert + 1}\Big/\textstyle\sum_j(\cdot), \qquad A = U\Sigma V^{\top}`}
            caption={pick(lang, 'The linear forward map with the separately-calibrated scalar gain g, its row-normalized softened inverse-distance (single-layer) kernel on the real geometry, and its SVD.', 'El mapa directo lineal con la ganancia escalar g calibrada por separado, su nucleo de capa simple de distancia inversa suavizada normalizado por filas sobre la geometría real, y su SVD.')} />
          <Equation tex={String.raw`\text{condition number } \kappa(A) = \sigma_1/\sigma_n \gg 1, \qquad \sigma_k \searrow 0`}
            caption={pick(lang, 'The singular values decay to zero: A is severely ill-conditioned, which is why the inverse must be regularized.', 'Los valores singulares decaen a cero: A esta severamente mal condicionado, por lo que el inverso debe regularizarse.')} />
          <Callout>{pick(lang,
            'Single-layer approximation, not full BEM; it caps the absolute accuracy but is honest and self-contained. The real electrode geometry (192 torso, 256 cage nodes + triangulations) is used exactly.',
            'Aproximacion de capa simple, no BEM completo; limita la precision absoluta pero es honesta y autocontenida. La geometría real de electrodos (192 torso, 256 nodos de jaula + triangulaciones) se usa exactamente.')}</Callout>
          <ForwardSvg lang={lang} />
          <Refs ids={['barr1977', 'rudy1988', 'bear2018']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'tikhonov', label: pick(lang, 'Tikhonov inverse', 'Inverso de Tikhonov'),
      content: (
        <section>
          <h2>{pick(lang, 'Tikhonov regularization', 'Regularizacion de Tikhonov')} <Cite id="tikhonov1977" /></h2>
          <p>{pick(lang,
            'Directly solving A phi = phi_body is unstable because the small singular values of A amplify noise without bound. Tikhonov regularization replaces the unstable inverse with a well-posed minimization: fit the data AND keep the solution controlled, weighting the two with a parameter lambda. Zeroth-order Tikhonov penalizes the solution magnitude; higher orders penalize a surface derivative to enforce smoothness.',
            'Resolver directamente A phi = phi_body es inestable porque los valores singulares pequeños de A amplifican el ruido sin limite. La regularizacion de Tikhonov reemplaza el inverso inestable por una minimizacion bien planteada: ajustar los datos Y mantener la solucion controlada, ponderando ambos con un parámetro lambda.')}</p>
          <p>{pick(lang,
            'The minimization has a closed form, a single linear solve, which makes Tikhonov fast and the standard clinical-research baseline. Its cost is a bias: the penalty smooths the solution, blurring sharp activation fronts, and it returns a single estimate with no uncertainty. This build computes the zeroth-order Tikhonov reconstruction per time frame.',
            'La minimizacion tiene forma cerrada, un solo sistema lineal, lo que hace a Tikhonov rápido y el baseline estandar de investigacion clinica. Su costo es un sesgo: la penalizacion suaviza la solucion, difuminando los frentes de activacion agudos, y devuelve una sola estimación sin incertidumbre. Esta implementacion computa la reconstrucción de Tikhonov de orden cero por cuadro de tiempo.')}</p>
          <Equation tex={String.raw`\hat\phi = \arg\min_\phi \lVert A\phi - \phi_{\text{body}}\rVert_2^2 + \lambda^2\lVert\phi\rVert_2^2 = (A^{\top}A + \lambda^2 I)^{-1}A^{\top}\phi_{\text{body}}`}
            caption={pick(lang, 'Zeroth-order Tikhonov: the regularized normal equations, solved per time frame.', 'Tikhonov de orden cero: las ecuaciones normales regularizadas, resueltas por cuadro de tiempo.')} />
          <Equation tex={String.raw`\hat\phi = \sum_k \frac{\sigma_k}{\sigma_k^2 + \lambda^2}\,(u_k^{\top}\phi_{\text{body}})\,v_k`}
            caption={pick(lang, 'In the SVD basis, the filter factor sigma_k^2/(sigma_k^2+lambda^2) damps the noise-dominated small singular values.', 'En la base SVD, el factor de filtro sigma_k^2/(sigma_k^2+lambda^2) amortigua los valores singulares pequeños dominados por ruido.')} />
          <Callout>{pick(lang,
            'L1 / total-variation variants sharpen fronts but stay deterministic. We keep the classical L2 Tikhonov as the honest, well-understood baseline and give it its oracle-best lambda (Parameter choice tab).',
            'Las variantes L1 / de variacion total agudizan los frentes pero siguen siendo deterministas. Mantenemos el Tikhonov L2 clásico como el baseline honesto y bien entendido y le damos su mejor lambda por oraculo (pestana Eleccion del parámetro).')}</Callout>
          <TikhonovSvg lang={lang} />
          <Refs ids={['tikhonov1977', 'ghosh2009']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'param', label: pick(lang, 'Parameter choice', 'Eleccion del parámetro'),
      content: (
        <section>
          <h2>{pick(lang, 'Choosing the regularization strength', 'Eleccion de la fuerza de regularizacion')} <Cite id="hansen1992" /></h2>
          <p>{pick(lang,
            'Lambda controls the trade-off between fidelity to the data and stability of the solution: too small and noise dominates, too large and the reconstruction is over-smoothed to near zero. Classically it is chosen by the L-curve, a log-log plot of the solution norm against the residual norm as lambda varies, whose corner marks the best compromise, or by the CRESO and GCV criteria.',
            'Lambda controla el compromiso entre fidelidad a los datos y estabilidad de la solucion: muy pequeño y el ruido domina, muy grande y la reconstrucción se sobre-suaviza a casi cero. Clasicamente se elige por la curva L, un gráfico log-log de la norma de la solucion contra la norma del residuo al variar lambda, cuya esquina marca el mejor compromiso, o por los criterios CRESO y GCV.')}</p>
          <p>{pick(lang,
            'Because this experiment has the true heart-surface potentials, we compare methods fairly by giving each its ORACLE-best lambda, the value on a logarithmic sweep that minimizes the true reconstruction error. This judges the classical baseline at its best, not strawmanned; a clinical pipeline that lacks the ground truth would use the L-curve instead, which is typically close to the oracle.',
            'Como este experimento tiene los potenciales verdaderos de superficie cardiaca, comparamos los métodos de forma justa dando a cada uno su mejor lambda por ORACULO, el valor en un barrido logaritmico que minimiza el error real de reconstrucción. Esto juzga el baseline clásico en su mejor version; un pipeline clinico sin la verdad de referencia usaria la curva L, que tipicamente esta cerca del oraculo.')}</p>
          <Equation tex={String.raw`\lambda^\star = \arg\min_{\lambda}\; \frac{\lVert \hat\phi(\lambda) - \phi_{\text{heart}}^{\text{measured}}\rVert}{\lVert \phi_{\text{heart}}^{\text{measured}}\rVert} \quad\text{(oracle, real ground truth available)}`}
            caption={pick(lang, 'The oracle criterion used for a fair comparison; the clinical L-curve corner approximates it without the truth.', 'El criterio oraculo usado para una comparación justa; la esquina de la curva L clinica lo aproxima sin la verdad.')} />
          <Callout>{pick(lang,
            'The oracle lambda uses the ground truth ONLY to pick the fairest baseline, never to fit the reconstruction. The reconstruction itself sees only the body-surface data.',
            'El lambda oraculo usa la verdad de referencia SOLO para elegir el baseline mas justo, nunca para ajustar la reconstrucción. La reconstrucción en si solo ve los datos de superficie corporal.')}</Callout>
          <ParamSvg lang={lang} />
          <Refs ids={['hansen1992']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'prior', label: pick(lang, 'Graph-Laplacian prior', 'Prior de Laplaciano de grafo'),
      content: (
        <section>
          <h2>{pick(lang, 'A spatial prior on the real heart surface', 'Un prior espacial sobre la superficie cardiaca real')}</h2>
          <p>{pick(lang,
            'A generic magnitude penalty ignores that the heart-surface potentials are a smooth field on a curved surface: neighbouring electrodes should have similar values because the tissue is continuous. We encode that by penalizing the graph Laplacian of the real heart-cage triangulation, which measures how much each node differs from its mesh neighbours.',
            'Una penalizacion generica de magnitud ignora que los potenciales de superficie cardiaca son un campo suave sobre una superficie curva: los electrodos vecinos deberian tener valores similares porque el tejido es continuo. Codificamos eso penalizando el Laplaciano de grafo de la triangulacion real de la jaula cardiaca, que mide cuanto difiere cada nodo de sus vecinos en la malla.')}</p>
          <p>{pick(lang,
            'This replaces the identity penalty with a geometry-aware one built from the actual mesh connectivity, so the smoothness is imposed along the tissue rather than in an abstract coordinate space. It is the discrete analogue of penalizing the surface gradient of the potential.',
            'Esto reemplaza la penalizacion de identidad por una consciente de la geometría construida a partir de la conectividad real de la malla, así que la suavidad se impone a lo largo del tejido en lugar de en un espacio de coordenadas abstracto. Es el analogo discreto de penalizar el gradiente superficial del potencial.')}</p>
          <Equation tex={String.raw`\hat\phi = (A^{\top}A + \lambda^2 L_{\text{mesh}}^{\top}L_{\text{mesh}})^{-1}A^{\top}\phi_{\text{body}}, \qquad (L_{\text{mesh}})_{ij} = \deg(i)\,[i{=}j] - [\,i\sim j\,]`}
            caption={pick(lang, 'The graph-Laplacian-regularized inverse; L_mesh is the combinatorial Laplacian of the cage triangulation.', 'El inverso regularizado por Laplaciano de grafo; L_mesh es el Laplaciano combinatorio de la triangulacion de la jaula.')} />
          <Callout>{pick(lang,
            'On this data the graph prior matches zeroth-order Tikhonov on relative error and slightly changes the correlation; its value is a physically meaningful smoothness that also stabilizes the ensemble uncertainty. A cotangent (metric) Laplacian would be a refinement.',
            'Sobre estos datos el prior de grafo iguala al Tikhonov de orden cero en error relativo y cambia ligeramente la correlación; su valor es una suavidad fisicamente significativa que además estabiliza la incertidumbre por ensemble. Un Laplaciano cotangente (metrico) seria un refinamiento.')}</Callout>
          <PriorSvg lang={lang} />
          <Refs ids={['ghosh2009']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'physics', label: pick(lang, 'Physics-constrained', 'Restringido por física'),
      content: (
        <section>
          <h2>{pick(lang, 'Physics-constrained reconstruction', 'Reconstruccion restringida por física')} <Cite id="raissi2019" /></h2>
          <p>{pick(lang,
            'The physics-informed view is that the recovered field must be consistent with the governing operator: whatever heart-surface potentials we output, projecting them forward through A must reproduce the REAL measured body-surface data. That data-consistency term is the physics constraint; the spatial prior is the regularizer; together they define the objective we minimize.',
            'La vision informada por física es que el campo recuperado debe ser consistente con el operador gobernante: cualesquiera potenciales de superficie cardiaca que emitamos, proyectarlos hacia adelante a traves de A debe reproducir los datos REALES medidos de superficie corporal. Ese termino de consistencia con datos es la restriccion física; el prior espacial es el regularizador; juntos definen el objetivo que minimizamos.')}</p>
          <p>{pick(lang,
            'This is the same principle as a physics-informed neural network, enforce the governing equation as a soft constraint while the measured data drives the fit, here applied to the linear inverse problem so the solve stays a fast, well-understood least squares. The cardiac PINN literature (Sahli Costabal 2020) applies the same idea to the nonlinear Eikonal activation problem. The 2026 frontier replaces the hand-chosen prior with a learned generative (diffusion) prior that carries its own uncertainty.',
            'Este es el mismo principio que una red neuronal informada por física, imponer la ecuacion gobernante como restriccion suave mientras los datos medidos guian el ajuste, aquí aplicado al problema inverso lineal para que la solucion siga siendo un minimos cuadrados rápido y bien entendido. La literatura de PINN cardiaco (Sahli Costabal 2020) aplica la misma idea al problema no lineal de activacion Eikonal.')}</p>
          <Equation tex={String.raw`\mathcal{L}(\phi) = \underbrace{\lVert A\phi - \phi_{\text{body}}^{\text{measured}}\rVert_2^2}_{\text{physics / data consistency}} + \underbrace{\lambda^2\lVert L_{\text{mesh}}\phi\rVert_2^2}_{\text{surface prior}}`}
            caption={pick(lang, 'The physics-constrained objective: forward-consistency with the real measurement plus the geometry-aware prior.', 'El objetivo restringido por física: consistencia directa con la medicion real mas el prior consciente de la geometría.')} />
          <Callout>{pick(lang,
            'Because the operator here is linear, the physics-constrained solve equals the regularized least squares; the PINN framing matters more for the nonlinear cardiac problems (activation, flow) where the constraint is a PDE residual evaluated by autograd.',
            'Como el operador aquí es lineal, la solucion restringida por física equivale al minimos cuadrados regularizado; el encuadre PINN importa mas para los problemas cardiacos no lineales (activacion, flujo) donde la restriccion es un residuo de PDE evaluado por autograd.')}</Callout>
          <PhysicsSvg lang={lang} />
          <Refs ids={['raissi2019', 'sahli2020', 'diffusion2026']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'uq', label: pick(lang, 'Ensemble uncertainty', 'Incertidumbre por ensemble'),
      content: (
        <section>
          <h2>{pick(lang, 'Calibrated per-node uncertainty by deep ensemble', 'Incertidumbre por nodo calibrada por ensemble profundo')} <Cite id="lakshminarayanan2017" /></h2>
          <p>{pick(lang,
            'A single reconstruction cannot say where it should be trusted, which for an ill-posed clinical inverse is essential: the clinician must know which parts of the map are reliable. We estimate this by a deep ensemble: repeat the reconstruction many times, each on the measured data perturbed by an independent draw of realistic measurement noise, and take the spread across the ensemble as the per-node uncertainty.',
            'Una sola reconstrucción no puede decir donde debe confiarse, lo cual para un inverso clinico mal planteado es esencial: el clinico debe saber que partes del mapa son confiables. Estimamos esto por un ensemble profundo: repetir la reconstrucción muchas veces, cada una sobre los datos medidos perturbados por una realizacion independiente de ruido de medicion realista, y tomar la dispersion en el ensemble como la incertidumbre por nodo.')}</p>
          <p>{pick(lang,
            'Raw ensemble spreads are usually miscalibrated (over- or under-confident). We recalibrate with a single temperature so that the average two-standard-deviation band matches the average true error; on this data the reliability, the fraction of nodes whose true error falls within two standard deviations, rises to about 0.90. That calibrated map is the concrete added value over a single Tikhonov estimate.',
            'Las dispersiones crudas del ensemble suelen estar mal calibradas (sobre o sub-confiadas). Recalibramos con una sola temperatura para que la banda promedio de dos desviaciones estandar iguale el error promedio real; sobre estos datos la confiabilidad, la fraccion de nodos cuyo error real cae dentro de dos desviaciones estandar, sube a cerca de 0.90. Ese mapa calibrado es el valor agregado concreto sobre una sola estimación de Tikhonov.')}</p>
          <Equation tex={String.raw`\bar\phi = \tfrac1K\sum_{k=1}^{K}\hat\phi^{(k)}, \quad s_0 = \operatorname{std}_k\hat\phi^{(k)}, \quad \tau = \frac{\overline{|\bar\phi-\phi^{\text{true}}|}\,\sqrt{\pi/2}}{\overline{s_0}}, \quad s = \tau\,s_0`}
            caption={pick(lang, 'Ensemble mean, raw spread, the recalibration temperature, and the calibrated per-node uncertainty s.', 'Media del ensemble, dispersion cruda, la temperatura de recalibracion, y la incertidumbre por nodo calibrada s.')} />
          <Callout>{pick(lang,
            'The recalibration uses the true error only to set one global scalar; it does not fit the reconstruction. A fully blind calibration (cross-validation on the body surface) is the honest clinical version and a next step.',
            'La recalibracion usa el error real solo para fijar un escalar global; no ajusta la reconstrucción. Una calibracion totalmente ciega (validación cruzada en la superficie corporal) es la version clinica honesta y un siguiente paso.')}</Callout>
          <UqSvg lang={lang} />
          <Refs ids={['lakshminarayanan2017', 'cluitmans2018']} label="Refs" />
        </section>
      ),
    },
  ];

  const flowTabs: SubTabDef[] = [
    {
      id: 'navier', label: pick(lang, 'Navier-Stokes to Poisson', 'Navier-Stokes a Poisson'),
      content: (
        <section>
          <h2>{pick(lang, 'From Navier-Stokes to the pressure-Poisson equation', 'De Navier-Stokes a la ecuacion de Poisson de presion')}</h2>
          <p>{pick(lang,
            'Blood in a large artery is an incompressible Newtonian fluid, so its motion obeys the incompressible Navier-Stokes equations: conservation of momentum, which ties the pressure gradient to the fluid acceleration and viscous friction, plus the incompressibility (zero-divergence) constraint. The pressure appears only through its gradient, and it is never measured.',
            'La sangre en una arteria grande es un fluido newtoniano incompresible, así que su movimiento obedece las ecuaciones de Navier-Stokes incompresibles: conservacion del momento, que liga el gradiente de presion a la aceleración del fluido y la friccion viscosa, mas la restriccion de incompresibilidad (divergencia cero). La presion aparece solo por su gradiente, y nunca se mide.')}</p>
          <p>{pick(lang,
            'Taking the divergence of the momentum equation and using incompressibility eliminates the acceleration term and turns the relation into a single elliptic Poisson equation for pressure, whose right-hand side is built entirely from the measured velocity and its spatial derivatives. This is a well-posed problem, unlike a naive inversion; the whole difficulty moves into computing a clean source from noisy measured velocity.',
            'Tomar la divergencia de la ecuacion de momento y usar la incompresibilidad elimina el termino de aceleración y convierte la relacion en una sola ecuacion eliptica de Poisson para la presion, cuyo lado derecho se construye enteramente de la velocidad medida y sus derivadas espaciales. Es un problema bien planteado, a diferencia de una inversion ingenua; toda la dificultad se traslada a calcular una fuente limpia desde una velocidad medida ruidosa.')}</p>
          <Equation tex={String.raw`\rho\big(\partial_t\mathbf{v}+(\mathbf{v}\cdot\nabla)\mathbf{v}\big)=-\nabla p+\mu\nabla^2\mathbf{v},\qquad \nabla\cdot\mathbf{v}=0`}
            caption={pick(lang, 'Incompressible Navier-Stokes: momentum balance plus zero divergence. rho = 1060 kg/m3, mu = 0.0035 Pa s.', 'Navier-Stokes incompresible: balance de momento mas divergencia cero. rho = 1060 kg/m3, mu = 0.0035 Pa s.')} />
          <Equation tex={String.raw`\nabla^2 p = -\rho\sum_{i,j}\frac{\partial v_i}{\partial x_j}\frac{\partial v_j}{\partial x_i}\equiv S(\mathbf{v})`}
            caption={pick(lang, 'The pressure-Poisson equation: the source S is a quadratic form of the velocity gradients, so noise in v is amplified, hence the divergence-free denoising.', 'La ecuacion de Poisson de presion: la fuente S es una forma cuadratica de los gradientes de velocidad, así que el ruido en v se amplifica, de ahi el suavizado sin divergencia.')} />
          <NsSvg lang={lang} />
          <Callout>{pick(lang, 'There is no invasive pressure gold standard, which is exactly why the method exists; the pressure is forced out of the measured velocity by the physics.', 'No hay patron de oro de presion invasivo, que es justo por lo que existe el método; la presion la fuerza la física desde la velocidad medida.')}</Callout>
          <Refs ids={['krittian2012', 'raissi2020']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'denoise', label: pick(lang, 'Divergence-free PINN', 'PINN sin divergencia'),
      content: (
        <section>
          <h2>{pick(lang, 'The divergence-free velocity PINN denoiser', 'El suavizador PINN de velocidad sin divergencia')}</h2>
          <p>{pick(lang,
            'Because the pressure-Poisson source is a product of velocity derivatives, raw measurement noise (which violates incompressibility) is amplified into a non-physiological pressure. The fix is a physics-informed velocity step: a network is trained to reproduce the measured velocity while satisfying zero divergence at collocation points, producing a smooth, divergence-free field whose analytic derivatives are clean.',
            'Como la fuente de la Poisson de presion es un producto de derivadas de velocidad, el ruido de medicion crudo (que viola la incompresibilidad) se amplifica en una presion no fisiologica. La solucion es un paso de velocidad informado por física: una red se entrena para reproducir la velocidad medida satisfaciendo divergencia cero en puntos de colocacion, produciendo un campo suave y sin divergencia cuyas derivadas analiticas son limpias.')}</p>
          <p>{pick(lang,
            'Unlike pressure, velocity is strongly constrained by the data, so this denoising is well-posed and robust. A plain momentum-residual network that tries to output pressure directly cannot recover it at aortic Reynolds numbers (pressure is gauge-free and weakly coupled); that failed approach is kept as the documented baseline. Separating the well-posed velocity fit from the elliptic pressure solve is what works.',
            'A diferencia de la presion, la velocidad esta fuertemente restringida por los datos, así que este suavizado esta bien planteado y es robusto. Una red simple de residuo de momento que intenta emitir presion directamente no puede recuperarla a Reynolds aortico (la presion no tiene calibre y se acopla debil); ese enfoque fallido se conserva como baseline documentado. Separar el ajuste de velocidad bien planteado de la resolucion eliptica es lo que funciona.')}</p>
          <Equation tex={String.raw`\min_\theta\; \big\lVert \mathbf{v}_\theta-\mathbf{v}^{\text{measured}}\big\rVert^2 \;+\; \lambda\,\big\lVert \nabla\cdot\mathbf{v}_\theta\big\rVert^2`}
            caption={pick(lang, 'The divergence-free objective: fit the measured velocity while penalizing any divergence at random collocation points. Trained Adam then L-BFGS.', 'El objetivo sin divergencia: ajustar la velocidad medida penalizando cualquier divergencia en puntos de colocacion. Entrenado Adam luego L-BFGS.')} />
          <Equation tex={String.raw`S=-\rho\sum_{i,j}\frac{\partial v_{\theta,i}}{\partial x_j}\frac{\partial v_{\theta,j}}{\partial x_i},\qquad \mathbf{b}=-\rho(\mathbf{v}_\theta\cdot\nabla)\mathbf{v}_\theta+\mu\nabla^2\mathbf{v}_\theta \;\;(\text{analytic, autograd})`}
            caption={pick(lang, 'The pressure-Poisson source and Neumann wall flux, computed from the network ANALYTIC derivatives, not finite differences at the lumen edge (which is what removes the boundary artifact).', 'La fuente de Poisson y el flujo Neumann de pared, calculados de las derivadas ANALITICAS de la red, no diferencias finitas en el borde (que es lo que elimina el artefacto de frontera).')} />
          <DenoiseSvg lang={lang} />
          <Callout>{pick(lang, 'A velocity-noise ensemble (5% of the venc) moves the recovered pressure under 0.01 mmHg: the denoiser makes the pressure robust to velocity noise, so the dominant uncertainty is the absent gold standard, not the noise.', 'Un ensemble de ruido (5% del venc) mueve la presion recuperada menos de 0.01 mmHg: el suavizador hace la presion robusta al ruido, así que la incertidumbre dominante es el patron de oro ausente, no el ruido.')}</Callout>
          <Refs ids={['raissi2020', 'raissi2019']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'spacetime', label: pick(lang, 'Space-time unsteady term', 'Termino no estacionario'),
      content: (
        <section>
          <h2>{pick(lang, 'The space-time network: an analytic unsteady term', 'La red espacio-temporal: un termino no estacionario analitico')}</h2>
          <p>{pick(lang,
            'The unsteady acceleration dominates the pressure at peak systole. A space-time network v(x,y,z,t) is trained divergence-free over the WHOLE cardiac cycle, so the pressure-Poisson source AND the unsteady acceleration dv/dt are both analytic (differentiated exactly in time by autograd), replacing an earlier noisy three-frame finite difference.',
            'La aceleración no estacionaria domina la presion en sistole pico. Una red espacio-temporal v(x,y,z,t) se entrena sin divergencia sobre TODO el ciclo cardiaco, así que la fuente de la Poisson Y la aceleración no estacionaria dv/dt son ambas analiticas (derivadas exactamente en el tiempo por autograd), reemplazando una diferencia finita ruidosa de tres cuadros.')}</p>
          <p>{pick(lang,
            'On the real scan the analytic unsteady term takes the recovered relative-pressure range from an inflated 14.87 mmHg (the noisy finite difference) to a small, physiological 0.79 mmHg, the same order as the clinical Bernoulli estimate (2.51 mmHg) from the same scan. This is a genuine improvement measured on the real data, not a tuning choice.',
            'En el escaneo real el termino analitico lleva el rango de presion relativa de 14.87 mmHg inflado (la diferencia finita ruidosa) a un pequeño y fisiologico 0.79 mmHg, del mismo orden que la estimación clinica de Bernoulli (2.51 mmHg) del mismo escaneo. Es una mejora real medida sobre los datos, no una eleccion de ajuste.')}</p>
          <Equation tex={String.raw`\partial_t\mathbf{v}=\frac{U}{T}\,\partial_{\tilde t}\,\mathbf{v}_\theta(\tilde x,\tilde t)\quad(\text{analytic, autograd in the non-dimensional time})`}
            caption={pick(lang, 'The analytic temporal derivative via the chain rule through the non-dimensional time; it feeds the full Neumann flux with the exact unsteady contribution.', 'La derivada temporal analitica por la regla de la cadena en el tiempo adimensional; alimenta el flujo Neumann completo con la contribucion no estacionaria exacta.')} />
          <Equation tex={String.raw`\mathbf{b}=\mathbf{b}_{\text{steady}}-\rho\,\partial_t\mathbf{v}`}
            caption={pick(lang, 'The full Neumann wall flux = the steady (convective + viscous) part minus the analytic unsteady acceleration.', 'El flujo Neumann completo = la parte estacionaria (convectiva + viscosa) menos la aceleración no estacionaria analitica.')} />
          <Fig lang={lang} caption={['A single net over (x,y,z,t) gives the velocity and, by autograd in t, the exact acceleration at every phase; the earlier 3-frame difference is dropped.', 'Una sola red sobre (x,y,z,t) da la velocidad y, por autograd en t, la aceleración exacta en cada fase; se descarta la diferencia de 3 cuadros.']}>
            <rect x="40" y="72" width="180" height="52" rx="8" fill="var(--panel-2)" stroke="var(--accent)" strokeWidth="1.3" />{T(130, 92, 'v_θ(x,y,z,t)', 'fg', 'middle')}{T(130, 109, 'div-free over the cycle', 'muted', 'middle', 9)}
            <path d="M220 98 H264" stroke="var(--accent-2)" strokeWidth="1.6" markerEnd="url(#mah2)" />{T(242, 90, '∂ₜ', 'muted', 'middle', 10)}
            <rect x="266" y="72" width="150" height="52" rx="8" fill="var(--panel-2)" stroke="var(--good)" strokeWidth="1.3" />{T(341, 92, 'analytic dv/dt', 'fg', 'middle')}{T(341, 109, 'gate corr 0.995', 'good', 'middle', 9)}
          </Fig>
          <Callout>{pick(lang, 'Gated on an analytic time-varying Poiseuille flow whose exact dw/dt is known: the network recovers it at correlation 0.995 before real data is trusted.', 'Prueba en un flujo analitico de Poiseuille variable en el tiempo cuyo dw/dt exacto se conoce: la red lo recupera con correlación 0.995 antes de confiar en datos reales.')}</Callout>
          <Refs ids={['raissi2020', 'krittian2012']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'ppe', label: pick(lang, 'Pressure-Poisson solve', 'Resolucion de Poisson'),
      content: (
        <section>
          <h2>{pick(lang, 'The elliptic pressure-Poisson solve', 'La resolucion eliptica de Poisson de presion')}</h2>
          <p>{pick(lang,
            'With a clean analytic source and Neumann boundary flux from the denoised field, the pressure is the solution of a Poisson equation on the segmented aortic lumen with a Neumann condition on the wall and one Dirichlet pin (pressure is defined up to a constant). It is solved by a sparse DIRECT method on the largest connected component, robust where an iterative solver stalls on the irregular, ill-conditioned real lumen.',
            'Con una fuente analitica limpia y un flujo Neumann de frontera del campo suavizado, la presion es la solucion de una ecuacion de Poisson sobre el lumen aortico segmentado con condicion Neumann en la pared y un pin de Dirichlet (la presion se define salvo constante). Se resuelve por un método DIRECTO disperso en la mayor componente conexa, robusto donde un solver iterativo se estanca en el lumen real irregular y mal condicionado.')}</p>
          <p>{pick(lang,
            'Computing the source S and the Neumann flux b from the network analytic derivatives (rather than finite differences at the lumen edge) is the decisive step: the edge, where a grid field meets the zeroed exterior, is where finite differences manufacture the worst artifacts. Doing it analytically is what takes the map from a non-physiological thousands of mmHg to a physiological range.',
            'Calcular la fuente S y el flujo Neumann b de las derivadas analiticas de la red (en lugar de diferencias finitas en el borde) es el paso decisivo: el borde, donde un campo de rejilla encuentra el exterior en cero, es donde las diferencias finitas fabrican los peores artefactos. Hacerlo analiticamente es lo que lleva el mapa de miles de mmHg no fisiologicos a un rango fisiologico.')}</p>
          <Equation tex={String.raw`\nabla^2 p = S(\mathbf{v}_\theta) \text{ in } \Omega_{\text{lumen}},\qquad \partial_n p = \mathbf{b}(\mathbf{v}_\theta)\cdot\mathbf{n} \text{ on } \partial\Omega,\qquad p(x_0)=0`}
            caption={pick(lang, 'The elliptic boundary-value problem for the relative pressure: Poisson interior, Neumann wall, one Dirichlet pin to fix the additive constant.', 'El problema eliptico de valores de contorno para la presion relativa: Poisson interior, Neumann en la pared, un pin de Dirichlet para fijar la constante aditiva.')} />
          <Equation tex={String.raw`\text{sparse system } L\,\mathbf{p}=\mathbf{f},\qquad L=\text{7-point Laplacian on the lumen voxels}`}
            caption={pick(lang, 'Discretized as a sparse linear system on the lumen voxels and solved by a direct factorization.', 'Discretizado como un sistema lineal disperso sobre los voxeles del lumen y resuelto por una factorizacion directa.')} />
          <Fig lang={lang} caption={['The recovered relative pressure on the lumen; the range is small (~0.79 mmHg) and physiological for an unobstructed aorta.', 'La presion relativa recuperada sobre el lumen; el rango es pequeño (~0.79 mmHg) y fisiologico para una aorta sin obstruccion.']}>
            <rect x="40" y="70" width="150" height="56" rx="8" fill="var(--panel-2)" stroke="var(--accent-2)" strokeWidth="1.3" />{T(115, 92, 'S(v), b(v)', 'fg', 'middle')}{T(115, 110, 'analytic', 'muted', 'middle', 9)}
            <path d="M190 98 H234" stroke="var(--accent-2)" strokeWidth="1.6" markerEnd="url(#mah2)" />
            <rect x="236" y="70" width="150" height="56" rx="8" fill="var(--panel-2)" stroke="var(--border)" />{T(311, 92, 'sparse direct solve', 'fg', 'middle', 10)}{T(311, 110, 'L p = f', 'muted', 'middle', 10)}
            <path d="M386 98 H430" stroke="var(--good)" strokeWidth="1.6" markerEnd="url(#mahg2)" />
            <rect x="432" y="72" width="108" height="52" rx="8" fill="color-mix(in srgb, var(--good) 12%, var(--panel))" stroke="var(--good)" strokeWidth="1.3" />{T(486, 94, 'p 0.79 mmHg', 'fg', 'middle', 10)}{T(486, 111, 'physiological', 'good', 'middle', 9)}
          </Fig>
          <Refs ids={['krittian2012', 'raissi2020']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'gate', label: pick(lang, 'Analytic gates', 'Pruebas analiticas'),
      content: (
        <section>
          <h2>{pick(lang, 'The analytic gates: proof before real data', 'Las pruebas analiticas: prueba antes de datos reales')}</h2>
          <p>{pick(lang,
            'Because there is no invasive pressure gold standard, the engine is proven on analytic flows whose exact answer is known BEFORE any real data is trusted. The steady pressure solve is gated on an analytic converging duct whose exact pressure drop is known, recovered to within 1 percent (correlation 1.00, 4.74 vs 4.73 mmHg). The unsteady term is gated on a time-varying Poiseuille flow whose exact dw/dt is known, recovered at correlation 0.995.',
            'Como no hay patron de oro de presion invasivo, el motor se prueba en flujos analiticos de respuesta exacta conocida ANTES de confiar en datos reales. La resolucion de presion estacionaria se prueba en un ducto convergente analitico cuya caida de presion exacta se conoce, recuperada con menos de 1 por ciento de error (correlación 1.00, 4.74 vs 4.73 mmHg). El termino no estacionario se prueba en un flujo de Poiseuille variable en el tiempo cuyo dw/dt exacto se conoce, recuperado con correlación 0.995.')}</p>
          <p>{pick(lang,
            'These gates are pytest tests that must pass in continuous integration; only after they pass is the pipeline applied to the real scan. The homogeneous BEM forward operator for the ECGi case is gated the same way, on the concentric-sphere problem where the harmonic transfer is known in closed form (correlation 1.00, relative error shrinking with each mesh refinement); because the EDGAR electrode surfaces are open, that BEM is used only as an offline comparison on closed-manifold catalogue geometries, while the baked EDGAR reconstruction uses the gated single-layer operator. This is the discipline that separates a real result from a plausible-looking one.',
            'Estas pruebas son tests de pytest que deben pasar en integracion continua; solo tras pasar se aplica el pipeline al escaneo real. El operador directo BEM homogeneo del caso ECGi se prueba igual, en el problema de esferas concentricas donde la transferencia armonica se conoce en forma cerrada (correlación 1.00, error relativo que decrece con cada refinamiento de malla); como las superficies de electrodos de EDGAR son abiertas, ese BEM se usa solo como comparación offline en geometrias de catalogo de variedad cerrada, mientras que la reconstrucción de EDGAR usa el operador de capa simple probado. Esta es la disciplina que separa un resultado real de uno de apariencia plausible.')}</p>
          <Equation tex={String.raw`\text{converging duct: } \Delta p_{\text{true}}=4.73\text{ mmHg},\;\; \Delta p_{\text{rec}}=4.74\text{ mmHg},\;\; \text{corr }1.00`}
            caption={pick(lang, 'The steady pressure gate: the known analytic drop is recovered to within 1 percent before real data is used.', 'La prueba de presion estacionaria: la caida analitica conocida se recupera con menos de 1 por ciento de error antes de usar datos reales.')} />
          <Equation tex={String.raw`\text{time-varying Poiseuille: } \tfrac{dw}{dt}\Big|_{\text{rec}}\;\text{vs}\;\tfrac{dw}{dt}\Big|_{\text{true}},\;\; \text{corr }0.995`}
            caption={pick(lang, 'The unsteady gate: the analytic acceleration is recovered before the space-time term is trusted on the real scan.', 'La prueba no estacionaria: la aceleración analitica se recupera antes de confiar en el termino espacio-temporal sobre el escaneo real.')} />
          <Fig lang={lang} caption={['Every engine passes a known-answer analytic gate (green) before it is applied to the real scan; a failing gate blocks the pipeline in CI.', 'Cada motor pasa una prueba analitica de respuesta conocida (verde) antes de aplicarse al escaneo real; una prueba fallida bloquea el pipeline en CI.']}>
            <rect x="60" y="72" width="180" height="52" rx="8" fill="var(--panel-2)" stroke="var(--warn)" strokeWidth="1.3" />{T(150, 92, 'analytic gate', 'fg', 'middle')}{T(150, 109, 'known closed-form answer', 'muted', 'middle', 9)}
            <path d="M240 98 H288" stroke="var(--good)" strokeWidth="1.6" markerEnd="url(#mahg2)" />{T(264, 90, 'pass', 'good', 'middle', 9)}
            <rect x="290" y="72" width="180" height="52" rx="8" fill="color-mix(in srgb, var(--good) 12%, var(--panel))" stroke="var(--good)" strokeWidth="1.3" />{T(380, 92, 'apply to the real scan', 'fg', 'middle', 10)}{T(380, 109, 'CI-enforced', 'good', 'middle', 9)}
          </Fig>
          <Refs ids={['raissi2020', 'vanoosterom1983']} label="Refs" />
        </section>
      ),
    },
  ];

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{pick(lang, 'Methodology', 'Metodologia')}</h1>
        <p className="lede">{pick(lang,
          'The method landscape for BOTH cases: the inverse ECG problem (forward operator, regularized inverse, spatial prior, physics-constrained fit, calibrated uncertainty) and the 4D-flow pressure recovery (Navier-Stokes to pressure-Poisson, the divergence-free denoiser, the analytic unsteady term, the elliptic solve, the analytic gates). Switch the domain, then each family is a sub-tab with its governing equations, the exact choices this build makes, and its honest limits.',
          'El panorama de métodos para AMBOS casos: el problema inverso de ECG (operador directo, inverso regularizado, prior espacial, ajuste restringido por física, incertidumbre calibrada) y la recuperacion de presion de flujo 4D (Navier-Stokes a Poisson de presion, el suavizador sin divergencia, el termino no estacionario analitico, la resolucion eliptica, las pruebas analiticas). Cambia el dominio, luego cada familia es una sub-pestana con sus ecuaciones gobernantes, las decisiones exactas de esta implementacion, y sus limites honestos.')}</p>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        <span className="muted small">{pick(lang, 'Physics domain', 'Dominio físico')}:</span>
        <span className={`chip ${dom === 'ecgi' ? 'on' : ''}`} onClick={() => setDom('ecgi')}>{pick(lang, 'ECG imaging (volume conduction)', 'Imagen de ECG (conduccion de volumen)')}</span>
        <span className={`chip ${dom === 'flow' ? 'on' : ''}`} onClick={() => setDom('flow')}>{pick(lang, '4D-flow pressure (Navier-Stokes)', 'Presion de flujo 4D (Navier-Stokes)')}</span>
      </div>

      <SubTabs
        key={dom}
        orientation="vertical"
        tabs={dom === 'ecgi' ? ecgiTabs : flowTabs}
        ariaLabel={pick(lang, 'Method families', 'Familias de método')}
      />
    </div>
  );
}
