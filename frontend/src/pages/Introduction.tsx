import { Callout } from '../components/Callout';
import { Equation, InlineMath } from '../components/Equation';
import { Refs } from '../components/Refs';
import { useLang, pick } from '../store';

function PipelineSvg({ lang }: { lang: 'en' | 'es' }) {
  const steps: [string, string][] = [
    ['body-surface', pick(lang, 'measured', 'medido')],
    ['forward A', pick(lang, 'real geometry', 'geometria real')],
    ['regularize + prior', pick(lang, 'Tikhonov + mesh', 'Tikhonov + malla')],
    ['ensemble', pick(lang, 'per-node UQ', 'UQ por nodo')],
    ['validate', pick(lang, 'vs real cage', 'vs jaula real')],
  ];
  return (
    <div className="fig-svg wide">
      <svg viewBox="0 0 720 90" role="img">
        {steps.map((s, i) => (
          <g key={i}>
            <rect x={10 + i * 145} y="24" width="126" height="42" rx="8" fill="var(--panel-2)" stroke={i === steps.length - 1 ? 'var(--good)' : 'var(--border)'} />
            <text x={73 + i * 145} y="44" textAnchor="middle" fill="var(--fg)" fontSize="12">{s[0]}</text>
            <text x={73 + i * 145} y="58" textAnchor="middle" fill="var(--muted)" fontSize="10">{s[1]}</text>
            {i < steps.length - 1 && <path d={`M${136 + i * 145} 45 H${155 + i * 145}`} stroke="var(--accent-2)" strokeWidth="2" markerEnd="url(#pa)" />}
          </g>
        ))}
        <defs><marker id="pa" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--accent-2)" /></marker></defs>
      </svg>
      <div className="fig-cap">{pick(lang, 'End-to-end: real body-surface data -> forward operator on real geometry -> regularized inverse with a surface prior -> ensemble uncertainty -> validation against the real measured heart cage.', 'De extremo a extremo: datos reales de superficie corporal -> operador directo sobre geometria real -> inverso regularizado con prior de superficie -> incertidumbre por ensemble -> validacion contra la jaula cardiaca real medida.')}</div>
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
            'Un marco aplicado para la reconstruccion informada por fisica de cantidades cardiacas que no se pueden medir directamente, a partir de datos que si. Abarca dos casos reales en dos dominios fisicos distintos: recuperar potenciales de superficie cardiaca desde un registro de superficie corporal por conduccion de volumen, ')}
          <InlineMath tex={String.raw`\phi_{\text{body}}=A\,\phi_{\text{heart}}`} />
          {pick(lang, ', and recovering the aortic pressure field from a 4D-flow scan by incompressible Navier-Stokes, ', ', y recuperar el campo de presion aortica desde un escaneo de flujo 4D por Navier-Stokes incompresible, ')}
          <InlineMath tex={String.raw`\nabla^2 p = S(\mathbf{v})`} />
          {pick(lang, '. Every case fits a real measured signal and is checked against a real reference.', '. Cada caso ajusta una senal real medida y se contrasta con una referencia real.')}
        </p>
      </div>

      <PipelineSvg lang={lang} />

      <section>
        <h2>{pick(lang, '1. The clinical problem', '1. El problema clinico')}</h2>
        <p>{pick(lang,
          'Cardiac arrhythmias (atrial fibrillation, ventricular tachycardia) are disorders of the heart’s electrical activation and a major cause of stroke and sudden death. The definitive treatment, catheter ablation, destroys the small region of tissue where the abnormal activity originates, so it depends entirely on localizing that origin. The routine 12-lead ECG cannot localize it; it is a projection of the whole heart onto a few leads. Electrocardiographic imaging (ECGi) reconstructs the full electrical map on the heart surface, non-invasively, from a body-surface electrode vest plus the patient’s torso geometry.',
          'Las arritmias cardiacas (fibrilacion auricular, taquicardia ventricular) son trastornos de la activacion electrica del corazon y una causa mayor de accidente cerebrovascular y muerte subita. El tratamiento definitivo, la ablacion con cateter, destruye la pequena region de tejido donde se origina la actividad anormal, asi que depende por completo de localizar ese origen. El ECG de rutina de 12 derivaciones no puede localizarlo. La imagen electrocardiografica (ECGi) reconstruye el mapa electrico completo en la superficie del corazon, de forma no invasiva.')}</p>
        <Refs ids={['ramanathan2004', 'rudy1988']} />
      </section>

      <section>
        <h2>{pick(lang, '2. The physics that links heart to body', '2. La fisica que enlaza corazon y cuerpo')}</h2>
        <p>{pick(lang,
          'The torso is a passive volume conductor: the heart is the source, and body tissue conducts the currents to the skin. At heartbeat frequencies the quasi-static approximation holds, so the extracellular potential is harmonic and the map from heart-surface to body-surface potentials is a single linear operator determined by the geometry and tissue conductivities. That operator is severely ill-conditioned, which is the entire difficulty of the inverse.',
          'El torso es un conductor de volumen pasivo: el corazon es la fuente, y el tejido conduce las corrientes a la piel. A frecuencias del latido vale la aproximacion cuasi-estatica, asi que el potencial extracelular es armonico y el mapa de superficie cardiaca a superficie corporal es un solo operador lineal determinado por la geometria y las conductividades. Ese operador esta severamente mal condicionado, que es toda la dificultad del inverso.')}</p>
        <Refs ids={['barr1977', 'bear2018']} />
      </section>

      <section>
        <h2>{pick(lang, '3. The two governing equations', '3. Las dos ecuaciones gobernantes')}</h2>
        <p>{pick(lang,
          'The two cases live in two different physics. Case A (ECG imaging) is quasi-static volume conduction: the extracellular potential is harmonic in the torso, so the heart-to-body map is a single linear operator A, severely ill-conditioned. Case B (4D-flow pressure) is incompressible Navier-Stokes: taking the divergence of the momentum equation and using incompressibility turns it into a Poisson equation for pressure whose source is built from the measured velocity’s spatial derivatives.',
          'Los dos casos viven en dos fisicas distintas. El caso A (imagen de ECG) es conduccion de volumen cuasi-estatica: el potencial extracelular es armonico en el torso, asi que el mapa corazon-cuerpo es un solo operador lineal A, severamente mal condicionado. El caso B (presion de flujo 4D) es Navier-Stokes incompresible: tomar la divergencia de la ecuacion de momento y usar la incompresibilidad la convierte en una ecuacion de Poisson para la presion cuya fuente se construye de las derivadas espaciales de la velocidad medida.')}</p>
        <Equation tex={String.raw`\text{A: }\;\nabla\cdot(\sigma\nabla\phi)=0 \text{ in } \Omega,\;\; \phi=\phi_{\text{heart}} \text{ on } \Gamma_H,\;\; \sigma\partial_n\phi=0 \text{ on } \Gamma_B \;\Rightarrow\; \phi_{\text{body}}=A\,\phi_{\text{heart}}`}
          caption={pick(lang, 'Case A: quasi-static volume conduction reduces to a linear forward operator A between the two surfaces.', 'Caso A: la conduccion de volumen cuasi-estatica se reduce a un operador directo lineal A entre las dos superficies.')} />
        <Equation tex={String.raw`\text{B: }\;\rho(\partial_t\mathbf{v}+(\mathbf{v}\cdot\nabla)\mathbf{v})=-\nabla p+\mu\nabla^2\mathbf{v},\;\; \nabla\cdot\mathbf{v}=0`}
          caption={pick(lang, 'Case B: incompressible Navier-Stokes relates the pressure gradient to the fluid acceleration and viscous friction.', 'Caso B: Navier-Stokes incompresible relaciona el gradiente de presion con la aceleracion del fluido y la friccion viscosa.')} />
        <Equation tex={String.raw`\text{B} \Rightarrow \;\nabla^2 p=-\rho\,\nabla\cdot[(\mathbf{v}\cdot\nabla)\mathbf{v}]\equiv S(\mathbf{v})`}
          caption={pick(lang, 'Its divergence gives the pressure-Poisson equation: a well-posed elliptic problem whose source is a quadratic form of the measured velocity gradients.', 'Su divergencia da la ecuacion de Poisson de presion: un problema eliptico bien planteado cuya fuente es una forma cuadratica de los gradientes de velocidad medidos.')} />
        <dl className="def-grid">
          <dt>{'φ, σ'}</dt><dd>{pick(lang, 'extracellular potential; tissue conductivity', 'potencial extracelular; conductividad del tejido')}</dd>
          <dt>{'Ω, Γ_H, Γ_B'}</dt><dd>{pick(lang, 'torso volume; heart surface; body surface', 'volumen del torso; superficie cardiaca; superficie corporal')}</dd>
          <dt>{'∂_n'}</dt><dd>{pick(lang, 'outward normal derivative', 'derivada normal saliente')}</dd>
          <dt>A</dt><dd>{pick(lang, 'forward transfer matrix (single-layer or BEM)', 'matriz de transferencia directa (capa simple o BEM)')}</dd>
          <dt>{'φ_body, φ_heart'}</dt><dd>{pick(lang, 'measured body-surface / heart-surface potentials', 'potenciales medidos de superficie corporal / cardiaca')}</dd>
          <dt>{'λ, L, σ_k'}</dt><dd>{pick(lang, 'regularization strength; penalty operator; singular values of A', 'fuerza de regularizacion; operador de penalizacion; valores singulares de A')}</dd>
          <dt>{'v, p'}</dt><dd>{pick(lang, 'measured blood velocity; relative pressure to recover', 'velocidad sanguinea medida; presion relativa a recuperar')}</dd>
          <dt>{'ρ, μ'}</dt><dd>{pick(lang, 'blood density 1060 kg/m³; dynamic viscosity 0.0035 Pa·s', 'densidad de la sangre 1060 kg/m³; viscosidad dinamica 0.0035 Pa·s')}</dd>
          <dt>{'S(v)'}</dt><dd>{pick(lang, 'the pressure-Poisson source (velocity-gradient product)', 'la fuente de Poisson de presion (producto de gradientes de velocidad)')}</dd>
          <dt>{'∇²'}</dt><dd>{pick(lang, 'the Laplacian operator', 'el operador Laplaciano')}</dd>
        </dl>
        <Refs ids={['barr1977', 'rudy1988', 'raissi2020', 'krittian2012']} />
      </section>

      <section>
        <h2>{pick(lang, '4. The end-to-end pipeline', '4. El pipeline de extremo a extremo')}</h2>
        <ol>
          <li>{pick(lang, 'Load the REAL EDGAR torso-tank data: 192 body-surface + 256 heart-cage measured potentials over the beat, plus the real electrode geometries and triangulations.', 'Cargar los datos REALES del tanque de torso EDGAR: 192 potenciales medidos de superficie corporal + 256 de la jaula cardiaca durante el latido, mas las geometrias reales de electrodos y triangulaciones.')}</li>
          <li>{pick(lang, 'Build the forward operator A on the real geometry (single-layer kernel, calibrated gain).', 'Construir el operador directo A sobre la geometria real (nucleo de capa simple, ganancia calibrada).')}</li>
          <li>{pick(lang, 'Reconstruct: Tikhonov (oracle lambda) and a graph-Laplacian-regularized inverse.', 'Reconstruir: Tikhonov (lambda oraculo) y un inverso regularizado por Laplaciano de grafo.')}</li>
          <li>{pick(lang, 'Deep ensemble over measurement-noise draws, recalibrated, for a per-node uncertainty.', 'Ensemble profundo sobre realizaciones de ruido de medicion, recalibrado, para una incertidumbre por nodo.')}</li>
          <li>{pick(lang, 'Validate against the REAL measured heart-cage potentials (relative error, correlation).', 'Validar contra los potenciales REALES medidos de la jaula cardiaca (error relativo, correlacion).')}</li>
        </ol>
      </section>

      <section>
        <h2>{pick(lang, '5. Honesty and scope', '5. Honestidad y alcance')}</h2>
        <Callout>
          {pick(lang,
            'Case A (ECG imaging) runs on real torso-tank experiments, the one setting where a real heart-surface gold standard exists (clinical ECGi has none), so every number is the measured reconstruction quality against that real truth, never a synthetic field. Case B (4D-flow) has NO invasive pressure gold standard, which is exactly why the method exists; there the validated claims are the exact analytic gate (a known-answer flow), the physiological range, and the bracket of the clinical Bernoulli estimate, and the absolute magnitude carries the method uncertainty. Every engine is gated on an analytic problem before real data; raw datasets are used under their data-use agreements and not redistributed. Not clinically deployed.',
            'El caso A (imagen de ECG) corre sobre experimentos reales de tanque de torso, el unico entorno donde existe un patron de oro real de superficie cardiaca (el ECGi clinico no tiene ninguno), asi que cada numero es la calidad de reconstruccion medida contra esa verdad real, nunca un campo sintetico. El caso B (flujo 4D) NO tiene patron de oro de presion invasivo, que es justo por lo que existe el metodo; alli las afirmaciones validadas son la prueba analitica exacta (un flujo de respuesta conocida), el rango fisiologico, y el encuadre de la estimacion clinica de Bernoulli, y la magnitud absoluta lleva la incertidumbre del metodo. Cada motor pasa una prueba analitica antes de datos reales; los datos crudos se usan bajo sus acuerdos y no se redistribuyen. No desplegado clinicamente.')}
        </Callout>
        <Refs ids={['aras2015', 'cluitmans2018', 'raissi2020']} />
      </section>
    </div>
  );
}
