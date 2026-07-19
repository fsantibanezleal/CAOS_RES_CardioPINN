import { Callout, Equation, InlineMath, Refs } from '@fasl-work/caos-app-shell';
import { useLang, pick } from '../store';

function PipelineSvg({ lang }: { lang: 'en' | 'es' }) {
  const ecgi: [string, string][] = [
    ['body-surface', pick(lang, 'measured', 'medido')],
    ['forward A', pick(lang, 'real geometry', 'geometría real')],
    ['regularize + prior', pick(lang, 'Tikhonov + mesh', 'Tikhonov + malla')],
    ['ensemble', pick(lang, 'per-node UQ', 'UQ por nodo')],
    ['validate', pick(lang, 'vs real cage', 'vs jaula real')],
  ];
  const flow: [string, string][] = [
    ['velocity v(x,t)', pick(lang, 'measured 4D-flow', '4D-flow medido')],
    ['div-free PINN', pick(lang, 'denoise ∇·v=0', 'suavizar ∇·v=0')],
    ['space-time net', pick(lang, 'analytic dv/dt', 'dv/dt analítico')],
    ['pressure-Poisson', pick(lang, '∇²p = S(v)', '∇²p = S(v)')],
    ['pressure map', pick(lang, 'vs Bernoulli', 'vs Bernoulli')],
  ];
  const row = (steps: [string, string][], y: number) => steps.map((s, i) => (
    <g key={i}>
      <rect x={10 + i * 145} y={y} width="126" height="42" rx="8" fill="var(--panel-2)" stroke={i === steps.length - 1 ? 'var(--good)' : i === 0 ? 'var(--accent)' : 'var(--border)'} />
      <text x={73 + i * 145} y={y + 20} textAnchor="middle" fill="var(--fg)" fontSize="12">{s[0]}</text>
      <text x={73 + i * 145} y={y + 34} textAnchor="middle" fill="var(--muted)" fontSize="10">{s[1]}</text>
      {i < steps.length - 1 && <path d={`M${136 + i * 145} ${y + 21} H${155 + i * 145}`} stroke="var(--accent-2)" strokeWidth="2" markerEnd="url(#pa)" />}
    </g>
  ));
  return (
    <div className="fig-svg wide">
      <svg viewBox="0 0 720 150" role="img" style={{ width: '100%', height: 'auto' }}>
        <text x="10" y="16" fill="var(--muted)" fontSize="10.5" fontWeight="600">A · ECG IMAGING (volume conduction)</text>
        {row(ecgi, 24)}
        <text x="10" y="92" fill="var(--muted)" fontSize="10.5" fontWeight="600">B · 4D-FLOW PRESSURE (Navier-Stokes)</text>
        {row(flow, 100)}
        <defs><marker id="pa" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--accent-2)" /></marker></defs>
      </svg>
      <div className="fig-cap">{pick(lang, 'Two real cases, two physics: (A) real body-surface data -> forward operator on real geometry -> regularized inverse with a surface prior -> ensemble uncertainty -> validation against the real measured heart cage; (B) real 4D-flow velocity -> divergence-free PINN denoiser -> analytic space-time unsteady term -> pressure-Poisson solve -> physiological pressure bracketing the clinical Bernoulli estimate.', 'Dos casos reales, dos físicas: (A) datos reales de superficie corporal -> operador directo sobre geometría real -> inverso regularizado con información previa de superficie -> incertidumbre por ensemble -> validación contra la jaula cardíaca real; (B) velocidad real de flujo 4D -> PINN sin divergencia -> término no estacionario analítico espacio-temporal -> resolución de Poisson de presión -> presión fisiológica que encuadra la estimación clínica de Bernoulli.')}</div>
    </div>
  );
}

export function Introduction() {
  const lang = useLang();
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>CardioPINN</h1>
        <p className="lede">
          {pick(lang,
            'An applied framework for physics-informed reconstruction of cardiac quantities that cannot be measured directly, from data that can. It spans two real cases in two different physics domains: recovering heart-surface potentials from a body-surface recording by volume conduction, ',
            'Un marco aplicado para la reconstrucción informada por física de cantidades cardíacas que no se pueden medir directamente, a partir de datos que sí. Abarca dos casos reales en dos dominios físicos distintos: recuperar potenciales de superficie cardíaca desde un registro de superficie corporal por conducción de volumen, ')}
          <InlineMath tex={String.raw`\phi_{\text{body}}=A\,\phi_{\text{heart}}`} />
          {pick(lang, ', and recovering the aortic pressure field from a 4D-flow scan by incompressible Navier-Stokes, ', ', y recuperar el campo de presión aórtica desde un escaneo de flujo 4D por Navier-Stokes incompresible, ')}
          <InlineMath tex={String.raw`\nabla^2 p = S(\mathbf{v})`} />
          {pick(lang, '. Case A is fit to a real measured signal and validated against a real heart-surface gold standard; Case B is fit to a real 4D-flow scan and checked against an analytic gate, the physiological pressure range, and the clinical Bernoulli estimate it brackets.', '. El caso A se ajusta a una señal real medida y se valida contra un patrón de oro real de superficie cardíaca; el caso B se ajusta a un escaneo real de flujo 4D y se contrasta contra una prueba analítica, el rango de presión fisiológico y la estimación clínica de Bernoulli que encuadra.')}
        </p>
      </div>

      <PipelineSvg lang={lang} />

      <section>
        <h2>{pick(lang, '1. The clinical problem', '1. El problema clínico')}</h2>
        <p>{pick(lang,
          'Cardiac arrhythmias (atrial fibrillation, ventricular tachycardia) are disorders of the heart’s electrical activation and a major cause of stroke and sudden death. The definitive treatment, catheter ablation, destroys the small region of tissue where the abnormal activity originates, so it depends entirely on localizing that origin. The routine 12-lead ECG cannot localize it; it is a projection of the whole heart onto a few leads. Electrocardiographic imaging (ECGi) reconstructs the full electrical map on the heart surface, non-invasively, from a body-surface electrode vest plus the patient’s torso geometry.',
          'Las arritmias cardíacas (fibrilación auricular, taquicardia ventricular) son trastornos de la activación eléctrica del corazón y una causa importante de accidente cerebrovascular y muerte súbita. El tratamiento definitivo, la ablación con catéter, destruye la pequeña región de tejido donde se origina la actividad anormal, así que depende por completo de localizar ese origen. El ECG de rutina de 12 derivaciones no puede localizarlo. La imagen electrocardiográfica (ECGi) reconstruye el mapa eléctrico completo en la superficie del corazón, de forma no invasiva.')}</p>
        <Refs ids={['ramanathan2004', 'rudy1988']} label="Refs" />
      </section>

      <section>
        <h2>{pick(lang, '2. The physics that links heart to body', '2. La física que enlaza corazón y cuerpo')}</h2>
        <p>{pick(lang,
          'The torso is a passive volume conductor: the heart is the source, and body tissue conducts the currents to the skin. At heartbeat frequencies the quasi-static approximation holds, so the extracellular potential is harmonic and the map from heart-surface to body-surface potentials is a single linear operator determined by the geometry and tissue conductivities. That operator is severely ill-conditioned, which is the entire difficulty of the inverse.',
          'El torso es un conductor de volumen pasivo: el corazón es la fuente, y el tejido conduce las corrientes a la piel. A frecuencias del latido vale la aproximación cuasiestática, así que el potencial extracelular es armónico y el mapa de superficie cardíaca a superficie corporal es un solo operador lineal determinado por la geometría y las conductividades. Ese operador está severamente mal condicionado, y ese mal condicionamiento concentra toda la dificultad del inverso.')}</p>
        <Refs ids={['barr1977', 'bear2018']} label="Refs" />
      </section>

      <section>
        <h2>{pick(lang, '3. The two governing equations', '3. Las dos ecuaciones gobernantes')}</h2>
        <p>{pick(lang,
          'The two cases live in two different physics. Case A (ECG imaging) is the quasi-static volume conduction of Section 2, written below as the forward operator A. Case B (4D-flow pressure) is incompressible Navier-Stokes: taking the divergence of the momentum equation and using incompressibility turns it into a Poisson equation for pressure whose source is built from the measured velocity’s spatial derivatives.',
          'Los dos casos viven en dos físicas distintas. El caso A (imagen de ECG) es la conducción de volumen cuasiestática de la Sección 2, escrita abajo como el operador directo A. El caso B (presión de flujo 4D) es Navier-Stokes incompresible: tomar la divergencia de la ecuación de momento y usar la incompresibilidad la convierte en una ecuación de Poisson para la presión cuya fuente se construye a partir de las derivadas espaciales de la velocidad medida.')}</p>
        <Equation tex={String.raw`\text{A: }\;\nabla\cdot(\sigma\nabla\phi)=0 \text{ in } \Omega,\;\; \phi=\phi_{\text{heart}} \text{ on } \Gamma_H,\;\; \sigma\partial_n\phi=0 \text{ on } \Gamma_B \;\Rightarrow\; \phi_{\text{body}}=A\,\phi_{\text{heart}}`}
          caption={pick(lang, 'Case A: quasi-static volume conduction reduces to a linear forward operator A between the two surfaces.', 'Caso A: la conducción de volumen cuasiestática se reduce a un operador directo lineal A entre las dos superficies.')} />
        <Equation tex={String.raw`\text{B: }\;\rho(\partial_t\mathbf{v}+(\mathbf{v}\cdot\nabla)\mathbf{v})=-\nabla p+\mu\nabla^2\mathbf{v},\;\; \nabla\cdot\mathbf{v}=0`}
          caption={pick(lang, 'Case B: incompressible Navier-Stokes relates the pressure gradient to the fluid acceleration and viscous friction.', 'Caso B: Navier-Stokes incompresible relaciona el gradiente de presión con la aceleración del fluido y la fricción viscosa.')} />
        <Equation tex={String.raw`\text{B} \Rightarrow \;\nabla^2 p=-\rho\,\nabla\cdot[(\mathbf{v}\cdot\nabla)\mathbf{v}]\equiv S(\mathbf{v})`}
          caption={pick(lang, 'Its divergence gives the pressure-Poisson equation: a well-posed elliptic problem whose source is a quadratic form of the measured velocity gradients.', 'Su divergencia da la ecuación de Poisson de presión: un problema elíptico bien planteado cuya fuente es una forma cuadrática de los gradientes de velocidad medidos.')} />
        <dl className="def-grid">
          <dt>{'φ, σ'}</dt><dd>{pick(lang, 'extracellular potential; tissue conductivity', 'potencial extracelular; conductividad del tejido')}</dd>
          <dt>{'Ω, Γ_H, Γ_B'}</dt><dd>{pick(lang, 'torso volume; heart surface; body surface', 'volumen del torso; superficie cardíaca; superficie corporal')}</dd>
          <dt>{'∂_n'}</dt><dd>{pick(lang, 'outward normal derivative', 'derivada normal saliente')}</dd>
          <dt>A</dt><dd>{pick(lang, 'forward transfer matrix (single-layer or BEM)', 'matriz de transferencia directa (capa simple o BEM)')}</dd>
          <dt>{'φ_body, φ_heart'}</dt><dd>{pick(lang, 'measured body-surface / heart-surface potentials', 'potenciales medidos de superficie corporal / cardíaca')}</dd>
          <dt>{'v, p'}</dt><dd>{pick(lang, 'measured blood velocity; relative pressure to recover', 'velocidad sanguínea medida; presión relativa a recuperar')}</dd>
          <dt>{'ρ, μ'}</dt><dd>{pick(lang, 'blood density 1060 kg/m³; dynamic viscosity 0.0035 Pa·s', 'densidad de la sangre 1060 kg/m³; viscosidad dinámica 0.0035 Pa·s')}</dd>
          <dt>{'S(v)'}</dt><dd>{pick(lang, 'the pressure-Poisson source (velocity-gradient product)', 'la fuente de Poisson de presión (producto de gradientes de velocidad)')}</dd>
          <dt>{'∇²'}</dt><dd>{pick(lang, 'the Laplacian operator', 'el operador Laplaciano')}</dd>
        </dl>
        <Refs ids={['barr1977', 'rudy1988', 'raissi2020', 'krittian2012']} label="Refs" />
      </section>

      <section>
        <h2>{pick(lang, '4. The two end-to-end pipelines', '4. Los dos pipelines de extremo a extremo')}</h2>
        <h3>{pick(lang, 'A. ECGi (volume conduction)', 'A. ECGi (conducción de volumen)')}</h3>
        <ol>
          <li>{pick(lang, 'Load the real EDGAR torso-tank data: 192 body-surface + 256 heart-cage measured potentials over the beat, plus the real electrode geometries and triangulations.', 'Cargar los datos reales del tanque de torso EDGAR: 192 potenciales medidos de superficie corporal + 256 de la jaula cardíaca durante el latido, más las geometrías reales de electrodos y triangulaciones.')}</li>
          <li>{pick(lang, 'Build the forward operator A on the real geometry (single-layer kernel, calibrated gain).', 'Construir el operador directo A sobre la geometría real (núcleo de capa simple, ganancia calibrada).')}</li>
          <li>{pick(lang, 'Reconstruct: Tikhonov (oracle lambda) and a graph-Laplacian-regularized inverse.', 'Reconstruir: Tikhonov (lambda oráculo) y un inverso regularizado por Laplaciano de grafo.')}</li>
          <li>{pick(lang, 'Deep ensemble over measurement-noise draws, recalibrated, for a per-node uncertainty.', 'Ensemble profundo sobre realizaciones de ruido de medición, recalibrado, para una incertidumbre por nodo.')}</li>
          <li>{pick(lang, 'Validate against the real measured heart-cage potentials (relative error, correlation).', 'Validar contra los potenciales reales medidos de la jaula cardíaca (error relativo, correlación).')}</li>
        </ol>
        <h3>{pick(lang, 'B. 4D-flow pressure (Navier-Stokes)', 'B. Presión de flujo 4D (Navier-Stokes)')}</h3>
        <ol>
          <li>{pick(lang, 'Load the real 4D-flow scan: the measured aortic velocity field v(x,t) over the cardiac cycle inside the segmented lumen, with its velocity-encoding (venc) for de-aliasing.', 'Cargar el escaneo real de flujo 4D: el campo de velocidad aórtica medido v(x,t) durante el ciclo cardíaco dentro del lumen segmentado, con su codificación de velocidad (venc) para el des-aliasing.')}</li>
          <li>{pick(lang, 'Denoise with a divergence-free PINN that enforces incompressibility (∇·v=0) on the measured velocity.', 'Suavizar con un PINN sin divergencia que impone la incompresibilidad (∇·v=0) sobre la velocidad medida.')}</li>
          <li>{pick(lang, 'Build the analytic space-time source: differentiate the smoothed velocity to form the unsteady and convective terms S(v).', 'Construir la fuente analítica espacio-temporal: derivar la velocidad suavizada para formar los términos no estacionario y convectivo S(v).')}</li>
          <li>{pick(lang, 'Solve the pressure-Poisson equation ∇²p = S(v) for the relative pressure field.', 'Resolver la ecuación de Poisson de presión ∇²p = S(v) para el campo de presión relativa.')}</li>
          <li>{pick(lang, 'Validate: gate on an analytic known-answer flow, check the physiological range, and confirm the recovered drop brackets the clinical Bernoulli estimate.', 'Validar: prueba sobre un flujo analítico de respuesta conocida, verificar el rango fisiológico y confirmar que la caída recuperada encuadra la estimación clínica de Bernoulli.')}</li>
        </ol>
      </section>

      <section>
        <h2>{pick(lang, '5. Honesty and scope', '5. Honestidad y alcance')}</h2>
        <Callout>
          {pick(lang,
            'Case A (ECG imaging) runs on real torso-tank experiments, the one setting where a real heart-surface gold standard exists (clinical ECGi has none), so every number is the measured reconstruction quality against that real truth, never a synthetic field. Case B (4D-flow) has no invasive pressure gold standard, which is exactly why the method exists; there the validated claims are the exact analytic gate (a known-answer flow), the physiological range, and the bracket of the clinical Bernoulli estimate, and the absolute magnitude carries the method uncertainty. Every engine is gated on an analytic problem before real data; raw datasets are used under their data-use agreements and not redistributed. Not clinically deployed.',
            'El caso A (imagen de ECG) se ejecuta sobre experimentos reales de tanque de torso, el único entorno donde existe un patrón de oro real de superficie cardíaca (el ECGi clínico no tiene ninguno), así que cada número es la calidad de reconstrucción medida contra esa verdad real, nunca un campo sintético. El caso B (flujo 4D) no tiene patrón de oro de presión invasivo, que es justo por lo que existe el método; allí las afirmaciones validadas son la prueba analítica exacta (un flujo de respuesta conocida), el rango fisiológico, y el encuadre de la estimación clínica de Bernoulli, y la magnitud absoluta lleva la incertidumbre del método. Cada motor pasa una prueba analítica antes de datos reales; los datos crudos se usan bajo sus acuerdos y no se redistribuyen. No desplegado clínicamente.')}
        </Callout>
        <Refs ids={['aras2015', 'cluitmans2018', 'raissi2020']} label="Refs" />
      </section>
    </div>
  );
}
