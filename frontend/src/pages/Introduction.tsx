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
            'An applied framework for physics-informed reconstruction of cardiac quantities that cannot be measured directly, from data that can. Every case fits a real measured signal and is validated against a real gold standard; the flagship recovers heart-surface potentials from a body-surface recording, ',
            'Un marco aplicado para la reconstruccion informada por fisica de cantidades cardiacas que no se pueden medir directamente, a partir de datos que si. Cada caso ajusta una senal real medida y se valida contra un patron de oro real; el caso insignia recupera potenciales de superficie cardiaca desde un registro de superficie corporal, ')}
          <InlineMath tex={String.raw`\phi_{\text{body}}=A\,\phi_{\text{heart}}`} />.
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
        <h2>{pick(lang, '3. The governing mathematics', '3. La matematica gobernante')}</h2>
        <Equation tex={String.raw`\nabla\cdot(\sigma\nabla\phi)=0 \text{ in } \Omega,\quad \phi=\phi_{\text{heart}} \text{ on } \Gamma_H,\quad \sigma\partial_n\phi=0 \text{ on } \Gamma_B \;\;\Rightarrow\;\; \phi_{\text{body}}=A\,\phi_{\text{heart}}`}
          caption={pick(lang, 'Quasi-static volume conduction reduces to a linear forward operator A between the two surfaces.', 'La conduccion de volumen cuasi-estatica se reduce a un operador directo lineal A entre las dos superficies.')} />
        <dl className="def-grid">
          <dt>{'φ'}</dt><dd>{pick(lang, 'extracellular potential', 'potencial extracelular')}</dd>
          <dt>{'σ'}</dt><dd>{pick(lang, 'tissue conductivity', 'conductividad del tejido')}</dd>
          <dt>{'Ω'}</dt><dd>{pick(lang, 'torso volume', 'volumen del torso')}</dd>
          <dt>{'Γ_H'}</dt><dd>{pick(lang, 'heart surface (256 cage electrodes)', 'superficie cardiaca (256 electrodos de jaula)')}</dd>
          <dt>{'Γ_B'}</dt><dd>{pick(lang, 'body surface (192 tank electrodes)', 'superficie corporal (192 electrodos del tanque)')}</dd>
          <dt>{'∂_n'}</dt><dd>{pick(lang, 'outward normal derivative', 'derivada normal saliente')}</dd>
          <dt>A</dt><dd>{pick(lang, 'forward transfer matrix (192 x 256)', 'matriz de transferencia directa (192 x 256)')}</dd>
          <dt>{'φ_body'}</dt><dd>{pick(lang, 'measured body-surface potentials', 'potenciales medidos de superficie corporal')}</dd>
          <dt>{'φ_heart'}</dt><dd>{pick(lang, 'heart-surface potentials to recover', 'potenciales de superficie cardiaca a recuperar')}</dd>
          <dt>{'λ, L, σ_k'}</dt><dd>{pick(lang, 'regularization strength, penalty operator, singular values of A', 'fuerza de regularizacion, operador de penalizacion, valores singulares de A')}</dd>
        </dl>
        <Refs ids={['barr1977', 'rudy1988']} />
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
            'This is a real torso-tank experiment (a real explanted heart in a tank), the one setting where a real heart-surface gold standard exists; clinical ECGi has none. Every number is the measured reconstruction quality against that real truth, never against a synthetic field. The forward operator is a single-layer approximation on the real geometry (a full boundary-element model is the next improvement). Raw EDGAR data is used under its data-use agreement with attribution and not redistributed. Not clinically deployed.',
            'Este es un experimento real de tanque de torso (un corazon explantado real en un tanque), el unico entorno donde existe un patron de oro real de superficie cardiaca; el ECGi clinico no tiene ninguno. Cada numero es la calidad de reconstruccion medida contra esa verdad real, nunca contra un campo sintetico. El operador directo es una aproximacion de capa simple sobre la geometria real. Los datos crudos EDGAR se usan bajo su acuerdo de uso con atribucion y no se redistribuyen. No desplegado clinicamente.')}
        </Callout>
        <Refs ids={['aras2015', 'cluitmans2018']} />
      </section>
    </div>
  );
}
