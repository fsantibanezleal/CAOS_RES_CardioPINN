import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Callout } from '../components/Callout';
import { Cite } from '../components/Cite';
import { Equation, InlineMath } from '../components/Equation';
import { Refs } from '../components/Refs';
import { Tabs } from '../components/Tabs';
import { turbo, turboCss } from '../kits/colormap';
import { useLang, pick } from '../store';

const BASE = import.meta.env.BASE_URL;

interface RhythmData {
  mesh: { vertices: number[][]; triangles: number[][]; n_vertices: number; n_triangles: number };
  times_ms: number[];
  fields_over_time: Record<string, number[][]>;
  metrics: Record<string, number>;
}
interface DatasetCase {
  id: string;
  name: string;
  context_en: string;
  context_es: string;
  beats: Record<string, RhythmData>;
}
interface Catalogue { schema: string; cases: DatasetCase[]; }

// Human-readable dataset labels (which real EDGAR experiment each case comes from).
const DATASET_LABEL: Record<string, [string, string]> = {
  'human-tank': ['Human heart, torso tank', 'Corazon humano, tanque de torso'],
  'dog-insitu': ['Dog heart, in situ', 'Corazon de perro, in situ'],
};
const BEAT_LABEL: Record<string, [string, string]> = {
  sinus: ['sinus rhythm', 'ritmo sinusal'],
  'paced-pvp': ['paced (PVP)', 'marcapaso (PVP)'],
  'paced-avp': ['paced (AVP)', 'marcapaso (AVP)'],
};

const FIELDS = ['recovered_mV', 'measured_mV', 'abs_error_mV', 'uncertainty_mV'];
const FIELD_LABEL: Record<string, [string, string]> = {
  recovered_mV: ['Recovered (our result)', 'Recuperado (nuestro resultado)'],
  measured_mV: ['Measured (real gold standard)', 'Medido (patron de oro real)'],
  abs_error_mV: ['Absolute error', 'Error absoluto'],
  uncertainty_mV: ['Uncertainty (per node)', 'Incertidumbre (por nodo)'],
};

function CageMesh({ rd, field, frame }: { rd: RhythmData; field: string; frame: number }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const cen = [0, 0, 0];
    rd.mesh.vertices.forEach((v) => { cen[0] += v[0]; cen[1] += v[1]; cen[2] += v[2]; });
    const n = rd.mesh.vertices.length; cen.forEach((_, i) => (cen[i] /= n));
    const pos = new Float32Array(n * 3);
    rd.mesh.vertices.forEach((v, i) => { pos[i * 3] = v[0] - cen[0]; pos[i * 3 + 1] = v[1] - cen[1]; pos[i * 3 + 2] = v[2] - cen[2]; });
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const idx = new Uint32Array(rd.mesh.triangles.length * 3);
    rd.mesh.triangles.forEach((t, i) => { idx[i * 3] = t[0]; idx[i * 3 + 1] = t[1]; idx[i * 3 + 2] = t[2]; });
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.computeVertexNormals();
    return g;
  }, [rd]);

  useEffect(() => {
    const vals = rd.fields_over_time[field][frame];
    const signed = field === 'recovered_mV' || field === 'measured_mV';
    let lo = Infinity, hi = -Infinity;
    for (const v of vals) { if (v < lo) lo = v; if (v > hi) hi = v; }
    if (signed) { const m = Math.max(Math.abs(lo), Math.abs(hi)) || 1; lo = -m; hi = m; }
    if (hi === lo) hi = lo + 1;
    const color = geom.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < vals.length; i++) { const [r, g2, b] = turbo((vals[i] - lo) / (hi - lo)); color.setXYZ(i, r, g2, b); }
    color.needsUpdate = true;
  }, [geom, rd, field, frame]);

  return <mesh geometry={geom}><meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.7} metalness={0.0} /></mesh>;
}

// A theme-aware SVG of the ECGi forward + inverse chain (colors via CSS variables so it repaints with the theme).
function ForwardSvg({ lang }: { lang: 'en' | 'es' }) {
  return (
    <div className="fig-svg">
      <svg viewBox="0 0 620 200" role="img">
        <ellipse cx="150" cy="100" rx="120" ry="80" fill="none" stroke="var(--border)" strokeWidth="2" />
        <text x="150" y="30" textAnchor="middle" fill="var(--muted)" fontSize="12">{pick(lang, 'torso (volume conductor)', 'torso (conductor de volumen)')}</text>
        <ellipse cx="150" cy="105" rx="42" ry="34" fill="color-mix(in srgb, var(--accent) 22%, transparent)" stroke="var(--accent)" strokeWidth="2" />
        <text x="150" y="108" textAnchor="middle" fill="var(--fg)" fontSize="11">heart</text>
        <text x="150" y="122" textAnchor="middle" fill="var(--accent)" fontSize="10">phi_heart (256)</text>
        {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={150 + 120 * Math.cos((i / 6) * 6.28)} cy={100 + 80 * Math.sin((i / 6) * 6.28)} r="4" fill="var(--accent-2)" />)}
        <text x="150" y="185" textAnchor="middle" fill="var(--accent-2)" fontSize="10">phi_body (192)</text>
        <path d="M280 100 H360" stroke="var(--good)" strokeWidth="2" markerEnd="url(#a)" />
        <text x="320" y="90" textAnchor="middle" fill="var(--good)" fontSize="11">A (forward)</text>
        <path d="M360 130 H280" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#a)" />
        <text x="320" y="152" textAnchor="middle" fill="var(--accent)" fontSize="11">{pick(lang, 'inverse (ill-posed)', 'inverso (mal planteado)')}</text>
        <rect x="380" y="70" width="220" height="70" rx="8" fill="var(--panel-2)" stroke="var(--border)" />
        <text x="490" y="95" textAnchor="middle" fill="var(--fg)" fontSize="11">{pick(lang, 'regularize + physics prior', 'regularizar + prior fisico')}</text>
        <text x="490" y="115" textAnchor="middle" fill="var(--fg)" fontSize="11">{pick(lang, '+ ensemble uncertainty', '+ incertidumbre por ensemble')}</text>
        <text x="490" y="132" textAnchor="middle" fill="var(--muted)" fontSize="10">{pick(lang, 'recover phi_heart', 'recuperar phi_heart')}</text>
        <defs><marker id="a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor" /></marker></defs>
      </svg>
      <div className="fig-cap">{pick(lang, 'The torso as a volume conductor: the heart-surface potentials map forward to the body surface by a linear operator A; recovering them is the ill-posed inverse.', 'El torso como conductor de volumen: los potenciales de superficie cardiaca se mapean hacia adelante a la superficie corporal por un operador lineal A; recuperarlos es el inverso mal planteado.')}</div>
    </div>
  );
}

export function RealEcgi({ selector }: { selector?: ReactNode }) {
  const lang = useLang();
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [tab, setTab] = useState('recon');
  const [caseIdx, setCaseIdx] = useState(0);
  const [beat, setBeat] = useState('sinus');
  const [field, setField] = useState('recovered_mV');
  const [frame, setFrame] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => { fetch(`${BASE}data/real-ecgi-catalogue/catalogue.json`).then((r) => r.json()).then(setCat); }, []);

  const ds = cat ? cat.cases[caseIdx] : null;
  const rd = ds && ds.beats[beat] ? ds.beats[beat] : ds ? ds.beats[Object.keys(ds.beats)[0]] : null;

  const playOnce = () => {
    if (raf.current || !rd) return;
    const n = rd.times_ms.length;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / 3000);
      setFrame(Math.min(n - 1, Math.floor(p * (n - 1))));
      if (p < 1 && document.visibilityState === 'visible') raf.current = requestAnimationFrame(step);
      else raf.current = null;
    };
    raf.current = requestAnimationFrame(step);
  };
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const tabs = [
    { id: 'recon', label: pick(lang, 'Reconstruction', 'Reconstruccion') },
    { id: 'problem', label: pick(lang, 'The problem', 'El problema') },
    { id: 'target', label: pick(lang, 'The target', 'El objetivo') },
    { id: 'forward', label: pick(lang, 'How the PDE arises', 'Como surge la PDE') },
    { id: 'traditional', label: pick(lang, 'Traditional approach', 'Enfoque tradicional') },
    { id: 'pinn', label: pick(lang, 'Physics-informed proposal', 'Propuesta informada por fisica') },
  ];

  return (
    <div className="cardiopinn-layout prose">
      <aside className="cp-side">
        {selector}
        {cat && ds && (
          <>
            <div className="cp-side-block">
              <span className="cp-side-label">{pick(lang, 'Dataset', 'Conjunto de datos')}</span>
              {cat.cases.map((c, i) => (
                <button key={c.id} className={`chip block ${caseIdx === i ? 'on' : ''}`}
                  onClick={() => { setCaseIdx(i); setBeat(Object.keys(c.beats)[0]); setFrame(0); }}>
                  {pick(lang, DATASET_LABEL[c.id]?.[0] ?? c.name, DATASET_LABEL[c.id]?.[1] ?? c.name)}
                </button>
              ))}
            </div>
            <div className="cp-side-block">
              <span className="cp-side-label">{pick(lang, 'Beat', 'Latido')}</span>
              <div className="chip-wrap">{Object.keys(ds.beats).map((r) => <span key={r} className={`chip ${beat === r ? 'on' : ''}`} onClick={() => { setBeat(r); setFrame(0); }}>{pick(lang, BEAT_LABEL[r]?.[0] ?? r, BEAT_LABEL[r]?.[1] ?? r)}</span>)}</div>
              <span className="cp-side-label" style={{ marginTop: 12 }}>{pick(lang, 'Field', 'Campo')}</span>
              <div className="chip-wrap">{FIELDS.map((f) => <span key={f} className={`chip ${field === f ? 'on' : ''}`} onClick={() => setField(f)}>{pick(lang, FIELD_LABEL[f][0], FIELD_LABEL[f][1])}</span>)}</div>
            </div>
            {rd && (
              <div className="cp-side-block">
                <span className="cp-side-label">{pick(lang, 'Live diagnosis vs real gold standard', 'Diagnostico en vivo vs patron de oro real')}</span>
                <div className="cp-readout">
                  <div className="ro"><span className="v">{rd.metrics.relative_error_tikhonov}</span><span className="k">{pick(lang, 'relative error', 'error relativo')}</span></div>
                  <div className="ro"><span className="v">{rd.metrics.correlation_tikhonov}</span><span className="k">{pick(lang, 'correlation', 'correlacion')}</span></div>
                  <div className="ro"><span className="v">{rd.metrics.uq_calibration_2sigma}</span><span className="k">{pick(lang, 'node-UQ (2σ)', 'UQ nodo (2σ)')}</span></div>
                  <div className="ro"><span className="v">{rd.metrics.n_heart_electrodes}</span><span className="k">{pick(lang, 'heart nodes', 'nodos cardiacos')}</span></div>
                </div>
              </div>
            )}
          </>
        )}
      </aside>
      <div className="cp-main">
      <div className="page-head">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1>{pick(lang, 'Real ECG imaging: recovering heart-surface potentials', 'Imagen de ECG real: recuperar potenciales de superficie cardiaca')}</h1>
          <span className="badge live">REAL DATA · {cat ? cat.cases.reduce((s, c) => s + Object.keys(c.beats).length, 0) : 0} {pick(lang, 'beats', 'latidos')}</span>
        </div>
        <p className="lede">
          {pick(lang,
            'From a real body-surface recording, reconstruct the electrical potentials on the heart surface (the map a clinician needs to localize an arrhythmia but cannot measure without opening the chest). The two are linked by a fixed operator ',
            'A partir de un registro real de superficie corporal, reconstruir los potenciales electricos en la superficie del corazon (el mapa que un clinico necesita para localizar una arritmia pero no puede medir sin abrir el torax). Ambos se enlazan por un operador fijo ')}
          <InlineMath tex={String.raw`\phi_{\text{body}}=A\,\phi_{\text{heart}}`} />
          {pick(lang,
            '; recovering the heart term is a severely ill-posed inverse. We solve it on a real torso-tank experiment (EDGAR) where the true heart-surface potentials were recorded simultaneously, so the reconstruction is validated against a real gold standard.',
            '; recuperar el termino cardiaco es un inverso severamente mal planteado. Lo resolvemos sobre un experimento real de tanque de torso (EDGAR) donde los potenciales verdaderos de superficie cardiaca se registraron simultaneamente, asi que la reconstruccion se valida contra un patron de oro real.')}
        </p>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'problem' && (
        <section>
          <h2>{pick(lang, 'Localizing an arrhythmia without opening the chest', 'Localizar una arritmia sin abrir el torax')}</h2>
          <p>{pick(lang,
            'Cardiac arrhythmias such as atrial fibrillation and ventricular tachycardia arise from abnormal electrical activation of the heart muscle. Curing them by catheter ablation requires knowing WHERE the abnormal activity starts. The standard 12-lead electrocardiogram is far too coarse to localize it: it is a projection of the whole heart onto a handful of leads.',
            'Las arritmias cardiacas como la fibrilacion auricular y la taquicardia ventricular surgen de una activacion electrica anormal del musculo cardiaco. Curarlas por ablacion con cateter requiere saber DONDE comienza la actividad anormal. El electrocardiograma estandar de 12 derivaciones es demasiado grueso para localizarla: es una proyeccion de todo el corazon sobre unas pocas derivaciones.')}</p>
          <p>{pick(lang,
            'Electrocardiographic imaging (ECGi) reconstructs the full electrical map on the surface of the heart, non-invasively, from a vest of a few hundred body-surface electrodes plus the patient-specific torso geometry obtained from a CT or MRI scan. Reconstructing that heart-surface map lets the electrophysiologist pinpoint the arrhythmia origin before, or instead of, an invasive catheter study.',
            'La imagen electrocardiografica (ECGi) reconstruye el mapa electrico completo en la superficie del corazon, de forma no invasiva, a partir de un chaleco de unos cientos de electrodos de superficie corporal mas la geometria del torso especifica del paciente obtenida de una tomografia o resonancia. Reconstruir ese mapa de superficie cardiaca permite al electrofisiologo ubicar el origen de la arritmia antes de, o en lugar de, un estudio invasivo con cateter.')}</p>
          <p>{pick(lang,
            'The difficulty is mathematical: recovering the heart-surface potentials from the body surface is a severely ill-posed inverse problem, small measurement noise is amplified into large reconstruction error, so a naive inversion is useless and the problem must be regularized. This tab set walks the whole chain: what we measure, the physics that links heart to body (the governing equation), the classical solution, and where a physics-informed reconstruction with calibrated uncertainty helps.',
            'La dificultad es matematica: recuperar los potenciales de superficie cardiaca desde la superficie corporal es un problema inverso severamente mal planteado, un pequeno ruido de medicion se amplifica en un gran error de reconstruccion, asi que una inversion ingenua es inutil y el problema debe regularizarse. Este conjunto de pestanas recorre toda la cadena: que medimos, la fisica que enlaza corazon y cuerpo (la ecuacion gobernante), la solucion clasica, y donde ayuda una reconstruccion informada por fisica con incertidumbre calibrada.')}</p>
          <Callout>
            {pick(lang,
              'This case runs on a torso-tank experiment: a real explanted heart perfused inside a tank, where a 256-electrode cage recorded the true heart-surface potentials at the same time as 192 tank-surface electrodes. This controlled setting is the only place a real ground truth exists; clinical ECGi has no gold standard. Not clinically deployed.',
              'Este caso corre sobre un experimento de tanque de torso: un corazon explantado real perfundido dentro de un tanque, donde una jaula de 256 electrodos registro los potenciales verdaderos de superficie cardiaca al mismo tiempo que 192 electrodos de la superficie del tanque. Este entorno controlado es el unico lugar donde existe una verdad de referencia real; el ECGi clinico no tiene patron de oro. No desplegado clinicamente.')}
          </Callout>
          <Refs ids={['ramanathan2004', 'rudy1988', 'aras2015']} />
        </section>
      )}

      {tab === 'target' && (
        <section>
          <h2>{pick(lang, 'What we measure, and what we recover', 'Que medimos y que recuperamos')}</h2>
          <p>{pick(lang,
            'What we can measure is the body-surface potential vector, one value per tank electrode, sampled through the heartbeat. What we want is the heart-surface potential vector, one value per cage electrode. In a patient the heart surface is inaccessible; in this experiment the cage recorded it simultaneously, giving the validation truth.',
            'Lo que podemos medir es el vector de potencial de superficie corporal, un valor por electrodo del tanque, muestreado a lo largo del latido. Lo que queremos es el vector de potencial de superficie cardiaca, un valor por electrodo de la jaula. En un paciente la superficie cardiaca es inaccesible; en este experimento la jaula lo registro simultaneamente, dando la verdad de validacion.')}</p>
          <div className="fig-row">
            <div>
              <Equation tex={String.raw`\phi_{\text{body}}(t) = A\,\phi_{\text{heart}}(t), \qquad \phi_{\text{body}} \in \mathbb{R}^{192},\; \phi_{\text{heart}} \in \mathbb{R}^{256}`}
                caption={pick(lang, 'The body-surface potentials are a fixed linear map A of the heart-surface potentials at every instant t of the beat.', 'Los potenciales de superficie corporal son un mapa lineal fijo A de los potenciales de superficie cardiaca en cada instante t del latido.')} />
              <dl className="def-grid">
                <dt>{'φ_body'}</dt><dd>{pick(lang, 'measured body-surface potentials (192 electrodes, 244 ms at 1 kHz)', 'potenciales medidos de superficie corporal (192 electrodos, 244 ms a 1 kHz)')}</dd>
                <dt>{'φ_heart'}</dt><dd>{pick(lang, 'heart-surface potentials to recover (256 electrodes); measured by the cage = the gold standard', 'potenciales de superficie cardiaca a recuperar (256 electrodos); medidos por la jaula = el patron de oro')}</dd>
                <dt>A</dt><dd>{pick(lang, 'the forward transfer matrix set by the torso geometry (next tab)', 'la matriz de transferencia directa fijada por la geometria del torso (siguiente pestana)')}</dd>
              </dl>
            </div>
            <ForwardSvg lang={lang} />
          </div>
          <Callout>
            {pick(lang,
              'Three beats are available (sinus and two paced rhythms). Reconstruction quality is measured against the cage recording; a patient would never have that cage, which is exactly why the reconstruction is needed and why a torso tank is the right validation setting.',
              'Hay tres latidos disponibles (sinusal y dos ritmos con marcapaso). La calidad de reconstruccion se mide contra el registro de la jaula; un paciente nunca tendria esa jaula, que es justo por lo que se necesita la reconstruccion y por lo que un tanque de torso es el entorno de validacion correcto.')}
          </Callout>
          <Refs ids={['aras2015', 'barr1977']} />
        </section>
      )}

      {tab === 'forward' && (
        <section>
          <h2>{pick(lang, 'How the governing equation arises', 'Como surge la ecuacion gobernante')}</h2>
          <p>{pick(lang,
            'The body is a passive volume conductor: the heart is the electrical source, and the surrounding tissue conducts the resulting currents to the skin. At the frequencies of the heartbeat (below a kilohertz) the electromagnetic wavelength is far larger than the body, so Maxwell’s equations reduce to their quasi-static form: there is no wave propagation, only instantaneous conduction. In that limit the extracellular potential obeys the generalized Laplace equation.',
            'El cuerpo es un conductor de volumen pasivo: el corazon es la fuente electrica, y el tejido circundante conduce las corrientes resultantes hasta la piel. A las frecuencias del latido (por debajo de un kilohertz) la longitud de onda electromagnetica es mucho mayor que el cuerpo, asi que las ecuaciones de Maxwell se reducen a su forma cuasi-estatica: no hay propagacion de ondas, solo conduccion instantanea. En ese limite el potencial extracelular obedece la ecuacion de Laplace generalizada.')}</p>
          <Equation tex={String.raw`\nabla\cdot\big(\sigma(x)\,\nabla \phi(x)\big) = 0 \quad \text{in } \Omega \text{ (torso)}, \qquad \phi = \phi_{\text{heart}} \text{ on } \Gamma_H, \qquad \sigma\,\partial_n\phi = 0 \text{ on } \Gamma_B`}
            caption={pick(lang, 'Quasi-static volume conduction: the potential is harmonic in the torso, equals the source on the heart surface, and has no current flux through the body surface (air is an insulator).', 'Conduccion de volumen cuasi-estatica: el potencial es armonico en el torso, iguala la fuente en la superficie cardiaca, y no tiene flujo de corriente a traves de la superficie corporal (el aire es aislante).')} />
          <dl className="def-grid">
            <dt>{'φ(x)'}</dt><dd>{pick(lang, 'extracellular potential at a point x in the torso', 'potencial extracelular en un punto x del torso')}</dd>
            <dt>{'σ(x)'}</dt><dd>{pick(lang, 'tissue conductivity (piecewise for lung, muscle, blood)', 'conductividad del tejido (por partes para pulmon, musculo, sangre)')}</dd>
            <dt>{'Ω, Γ_H, Γ_B'}</dt><dd>{pick(lang, 'the torso volume, the heart surface, the body surface', 'el volumen del torso, la superficie cardiaca, la superficie corporal')}</dd>
            <dt>{'∂_n'}</dt><dd>{pick(lang, 'the outward normal derivative', 'la derivada normal saliente')}</dd>
          </dl>
          <p>{pick(lang,
            'This boundary-value problem has a unique solution, and because it is linear in the boundary data, the map from the heart-surface potentials to the body-surface potentials is a single matrix A, obtained by discretizing the equation on the real torso and cage geometry with the boundary element method. Here we use its simplest physical form, a single-layer (point-source) kernel on the real electrode positions.',
            'Este problema de valores de contorno tiene solucion unica, y como es lineal en los datos de contorno, el mapa desde los potenciales de superficie cardiaca a los de superficie corporal es una sola matriz A, obtenida al discretizar la ecuacion sobre la geometria real del torso y la jaula con el metodo de elementos de contorno. Aqui usamos su forma fisica mas simple, un nucleo de capa simple (fuente puntual) sobre las posiciones reales de los electrodos.')}</p>
          <Equation tex={String.raw`A_{ij} \;\propto\; \frac{1}{4\pi\,\lVert x^{\text{body}}_i - x^{\text{heart}}_j\rVert}, \qquad A = U\,\Sigma\,V^{\top},\;\; \sigma_k \searrow 0 \text{ exponentially}`}
            caption={pick(lang, 'The transfer matrix and its singular value decomposition: the singular values decay to zero, so inverting A amplifies noise, this is the ill-posedness.', 'La matriz de transferencia y su descomposicion en valores singulares: los valores singulares decaen a cero, asi que invertir A amplifica el ruido, esto es el mal planteamiento.')} />
          <p>{pick(lang,
            'We implement BOTH forward operators: the single-layer (point-source) kernel above, and a full boundary-element operator (BEM) that discretizes the boundary-integral equation with exact triangle solid angles for the double layer (Van Oosterom-Strackee) and triangle 1/r integrals for the single layer, then eliminates the heart-surface normal current to get the transfer matrix. The BEM is validated on the analytic concentric-sphere problem, where the heart-to-body transfer of each harmonic is known in closed form: it recovers it with correlation 1.00 and an error that halves with each mesh refinement (first-order convergence).',
            'Implementamos AMBOS operadores directos: el nucleo de capa simple (fuente puntual) de arriba, y un operador de elementos de contorno completo (BEM) que discretiza la ecuacion integral de contorno con angulos solidos exactos de triangulo para la doble capa (Van Oosterom-Strackee) e integrales de 1/r por triangulo para la capa simple, y luego elimina la corriente normal de superficie cardiaca para obtener la matriz de transferencia. El BEM se valida en el problema analitico de esferas concentricas, donde la transferencia corazon-cuerpo de cada armonico se conoce en forma cerrada: la recupera con correlacion 1.00 y un error que se reduce a la mitad con cada refinamiento de malla (convergencia de primer orden).')}
          </p>
          <Callout>
            {pick(lang,
              'Honest finding: on the real electrode geometry the BEM does NOT beat the calibrated single-layer. It requires closed 2-manifold surfaces (the human torso-tank surface is open, so the BEM applies only to the dog case); and where it does apply, the coarse 140-node torso makes the reconstruction regularization-dominated, so forward-operator fidelity is not the bottleneck (dog: single-layer RE 0.54 vs BEM RE 0.63). The single-layer stays the default; the BEM matters as electrode density and mesh closure improve. Both are analytic-gated in the test suite.',
              'Hallazgo honesto: sobre la geometria real de electrodos el BEM NO supera a la capa simple calibrada. Requiere superficies cerradas de 2-variedad (la superficie del tanque de torso humano es abierta, asi que el BEM solo aplica al caso del perro); y donde aplica, el torso grueso de 140 nodos hace la reconstruccion dominada por la regularizacion, asi que la fidelidad del operador directo no es el cuello de botella (perro: capa simple RE 0.54 vs BEM RE 0.63). La capa simple sigue siendo el default; el BEM importa cuando mejoran la densidad de electrodos y el cierre de malla. Ambos con prueba analitica en el test suite.')}
          </Callout>
          <Refs ids={['barr1977', 'vanoosterom1983', 'rudy1988', 'bear2018']} />
        </section>
      )}

      {tab === 'traditional' && (
        <section>
          <h2>{pick(lang, 'The classical solution: Tikhonov regularization', 'La solucion clasica: regularizacion de Tikhonov')}</h2>
          <p>{pick(lang,
            'Because inverting A directly amplifies noise, the standard approach does not invert it. Instead it looks for the heart-surface potentials that best explain the measured body-surface data while keeping the solution well-behaved, by adding a penalty term. This is Tikhonov regularization: minimize the data misfit plus a weighted penalty on the size (or the surface roughness) of the solution.',
            'Como invertir A directamente amplifica el ruido, el enfoque estandar no lo invierte. En su lugar busca los potenciales de superficie cardiaca que mejor explican los datos medidos de superficie corporal manteniendo la solucion bien comportada, agregando un termino de penalizacion. Esto es la regularizacion de Tikhonov: minimizar el desajuste a datos mas una penalizacion ponderada sobre el tamano (o la rugosidad superficial) de la solucion.')}</p>
          <Equation tex={String.raw`\hat{\phi}_{\text{heart}} = \arg\min_{\phi}\; \lVert A\phi - \phi_{\text{body}}\rVert_2^2 + \lambda^2\,\lVert L\phi\rVert_2^2 \;\;\Longrightarrow\;\; \hat{\phi} = (A^{\top}A + \lambda^2 L^{\top}L)^{-1} A^{\top}\phi_{\text{body}}`}
            caption={pick(lang, 'Tikhonov reconstruction: L = I is zeroth order (penalize magnitude); L a surface Laplacian penalizes roughness. The closed form is a single linear solve.', 'Reconstruccion de Tikhonov: L = I es orden cero (penaliza magnitud); L un Laplaciano de superficie penaliza rugosidad. La forma cerrada es un solo sistema lineal.')} />
          <dl className="def-grid">
            <dt>{'λ'}</dt><dd>{pick(lang, 'the regularization strength: too small is unstable, too large over-smooths', 'la fuerza de regularizacion: muy pequena es inestable, muy grande sobre-suaviza')}</dd>
            <dt>L</dt><dd>{pick(lang, 'the penalty operator (identity, or a surface derivative)', 'el operador de penalizacion (identidad, o una derivada de superficie)')}</dd>
          </dl>
          <p>{pick(lang,
            'The one free knob is lambda, classically chosen by the L-curve (the corner of the trade-off between misfit and solution norm) or by CRESO. The cost of stability is a smoothness bias that blurs sharp activation fronts, and the result is a single point estimate with no measure of where it can be trusted. L1 / total-variation variants sharpen the fronts but remain deterministic.',
            'La unica perilla libre es lambda, elegida clasicamente por la curva L (la esquina del compromiso entre desajuste y norma de la solucion) o por CRESO. El costo de la estabilidad es un sesgo de suavidad que difumina los frentes de activacion agudos, y el resultado es una sola estimacion puntual sin medida de donde se puede confiar. Las variantes L1 / de variacion total agudizan los frentes pero siguen siendo deterministas.')}</p>
          <Callout>
            {pick(lang,
              'In the comparison we give Tikhonov its ORACLE-best lambda, the value that minimizes the true reconstruction error, so the classical baseline is judged at its best, not strawmanned. A well-tuned Tikhonov is a strong baseline.',
              'En la comparacion le damos a Tikhonov su mejor lambda por ORACULO, el valor que minimiza el error real de reconstruccion, para que el baseline clasico se juzgue en su mejor version, no como un espantapajaros. Un Tikhonov bien ajustado es un baseline fuerte.')}
          </Callout>
          <Refs ids={['tikhonov1977', 'hansen1992', 'ghosh2009']} />
        </section>
      )}

      {tab === 'pinn' && (
        <section>
          <h2>{pick(lang, 'Where and how the physics-informed reconstruction helps', 'Donde y como ayuda la reconstruccion informada por fisica')}</h2>
          <p>{pick(lang,
            'A physics-informed reconstruction keeps the same physical constraint, the recovered potentials must reproduce the REAL measured body-surface data through the forward operator A, but improves the two weaknesses of plain Tikhonov. First, the prior: instead of a generic magnitude penalty, we penalize roughness on the ACTUAL heart-cage surface using its mesh graph Laplacian, so the solution is smooth along the tissue, not in an abstract vector space. Second, and most important, uncertainty: we train a deep ensemble over measurement-noise realizations and recalibrate its spread, producing a per-node uncertainty, the map of where the reconstruction can be trusted, which a single Tikhonov estimate cannot give.',
            'Una reconstruccion informada por fisica mantiene la misma restriccion fisica, los potenciales recuperados deben reproducir los datos REALES medidos de superficie corporal a traves del operador directo A, pero mejora las dos debilidades del Tikhonov simple. Primero, el prior: en lugar de una penalizacion generica de magnitud, penalizamos la rugosidad sobre la superficie REAL de la jaula cardiaca usando el Laplaciano de grafo de su malla, para que la solucion sea suave a lo largo del tejido, no en un espacio vectorial abstracto. Segundo, y mas importante, la incertidumbre: entrenamos un ensemble profundo sobre realizaciones del ruido de medicion y recalibramos su dispersion, produciendo una incertidumbre por nodo, el mapa de donde la reconstruccion es confiable, que una sola estimacion de Tikhonov no puede dar.')}</p>
          <Equation tex={String.raw`\mathcal{L}(\phi) = \lVert A\phi - \phi_{\text{body}}^{\text{measured}}\rVert_2^2 + \lambda^2\,\lVert L_{\text{mesh}}\,\phi\rVert_2^2, \qquad \bar\phi = \tfrac1K\textstyle\sum_k \hat\phi^{(k)},\;\; s = \tau\cdot \mathrm{std}_k\,\hat\phi^{(k)}`}
            caption={pick(lang, 'The data-plus-physics objective with the mesh graph-Laplacian prior; the ensemble mean is the reconstruction and the recalibrated spread s is the per-node uncertainty.', 'El objetivo datos-mas-fisica con el prior de Laplaciano de grafo de la malla; la media del ensemble es la reconstruccion y la dispersion recalibrada s es la incertidumbre por nodo.')} />
          <dl className="def-grid">
            <dt>L_mesh</dt><dd>{pick(lang, 'the graph Laplacian of the real heart-cage triangulation (piecewise-smooth prior on the surface)', 'el Laplaciano de grafo de la triangulacion real de la jaula cardiaca (prior suave por partes en la superficie)')}</dd>
            <dt>K, {'τ'}</dt><dd>{pick(lang, 'the ensemble size and the recalibration temperature (matches the 2-sigma band to the real error)', 'el tamano del ensemble y la temperatura de recalibracion (ajusta la banda de 2-sigma al error real)')}</dd>
          </dl>
          <p>{pick(lang,
            'This is the physics-informed-learning idea, enforce the governing operator as a constraint while the measured data drives the fit, applied to the inverse problem (Raissi 2019; Sahli Costabal 2020 for cardiac). The current state of the art is moving toward generative (diffusion) priors that supply a learned prior with native uncertainty; we implement the physics-plus-graph prior with a recalibrated ensemble, which is self-contained and honest on real data.',
            'Esta es la idea del aprendizaje informado por fisica, imponer el operador gobernante como restriccion mientras los datos medidos guian el ajuste, aplicada al problema inverso (Raissi 2019; Sahli Costabal 2020 para lo cardiaco). El estado del arte actual se mueve hacia priors generativos (de difusion) que aportan un prior aprendido con incertidumbre nativa; nosotros implementamos el prior de fisica-mas-grafo con un ensemble recalibrado, autocontenido y honesto sobre datos reales.')}
            {' '}<Cite id="raissi2019" /> <Cite id="sahli2020" /></p>
          <Callout>
            {pick(lang,
              'The accuracy gain over a well-tuned Tikhonov is modest (see Benchmark); the real added value is the CALIBRATED per-node uncertainty. A full boundary-element forward operator and a learned generative prior are the honest next steps to push the accuracy further.',
              'La ganancia de precision sobre un Tikhonov bien ajustado es modesta (ver Benchmark); el valor agregado real es la incertidumbre por nodo CALIBRADA. Un operador directo de elementos de contorno completo y un prior generativo aprendido son los siguientes pasos honestos para empujar la precision.')}
          </Callout>
          <Refs ids={['raissi2019', 'sahli2020', 'lakshminarayanan2017', 'diffusion2026']} />
        </section>
      )}

      {tab === 'recon' && cat && ds && rd && (
        <section>
          <h2>{pick(lang, 'The reconstruction, on the real heart geometry', 'La reconstruccion, sobre la geometria cardiaca real')}</h2>
          <p>{pick(lang,
            'The same physics-informed reconstruction is applied across a catalogue of independent real experiments, so the method is not tuned to one heart. Use the LEFT COLUMN to pick the dataset (an explanted human heart in a torso tank, 192 body electrodes recovering a 256-electrode cage; or an in-situ dog heart, 140 body electrodes recovering a 1321-node epicardial map), the beat, and the field, and to read the live reconstruction quality against the real gold standard. Each dataset recorded the true heart-surface potentials simultaneously.',
            'La misma reconstruccion informada por fisica se aplica a un catalogo de experimentos reales independientes, asi que el metodo no esta ajustado a un solo corazon. Usa la COLUMNA IZQUIERDA para elegir el conjunto de datos (un corazon humano explantado en un tanque de torso, 192 electrodos corporales recuperando una jaula de 256; o un corazon de perro in situ, 140 electrodos recuperando un mapa epicardico de 1321 nodos), el latido y el campo, y para leer la calidad de reconstruccion en vivo contra el patron de oro real. Cada conjunto registro los potenciales verdaderos de superficie cardiaca simultaneamente.')}</p>
          <div className="canvas-wrap">
            <Canvas camera={{ position: [90, -70, 60], fov: 40, up: [0, 0, 1] }}>
              <ambientLight intensity={0.55} />
              <directionalLight position={[80, -60, 90]} intensity={0.9} />
              <directionalLight position={[-70, 50, -40]} intensity={0.4} />
              <CageMesh key={ds.id + beat} rd={rd} field={field} frame={Math.min(frame, rd.times_ms.length - 1)} />
              <OrbitControls target={[0, 0, 0]} />
            </Canvas>
            <div className="legend">
              <div>{pick(lang, FIELD_LABEL[field][0], FIELD_LABEL[field][1])} (mV)</div>
              <div className="bar" style={{ background: `linear-gradient(90deg, ${turboCss(0)}, ${turboCss(0.5)}, ${turboCss(1)})` }} />
            </div>
            <div className="readout">t = {rd.times_ms[Math.min(frame, rd.times_ms.length - 1)]} ms</div>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="muted small">{pick(lang, 'Beat time', 'Tiempo del latido')}:</span>
            <input type="range" min={0} max={rd.times_ms.length - 1} value={Math.min(frame, rd.times_ms.length - 1)} onChange={(e) => setFrame(Number(e.target.value))} />
            <button className="iconbtn" onClick={playOnce}>{pick(lang, 'Play beat', 'Reproducir latido')}</button>
          </div>
          <p style={{ marginTop: 12 }}>{pick(lang,
            'Orbit the heart; scrub or play the beat; toggle the recovered potential, the real measured potential, their absolute error, and the per-node uncertainty. On the human tank the paced rhythms (PVP, AVP) reconstruct with higher correlation than sinus, which is physically expected: a focal paced activation is easier to localize than the diffuse sinus wavefront. The method transfers to the dog heart (a different species, geometry, and electrode count) with no retuning.',
            'Orbita el corazon; desplaza o reproduce el latido; alterna el potencial recuperado, el real medido, su error absoluto, y la incertidumbre por nodo. En el tanque humano los ritmos con marcapaso (PVP, AVP) reconstruyen con mayor correlacion que el sinusal, lo cual es fisicamente esperado. El metodo se transfiere al corazon de perro (otra especie, geometria y numero de electrodos) sin reajuste.')}</p>
          <Callout>
            {pick(lang,
              'Data: EDGAR (Consortium for ECG Imaging). Human torso tank (Utah, 2018) and in-situ dog (Maastricht), used under the EDGAR data-use agreement with attribution; the raw datasets are not redistributed. The measured field is shown as a research visualization. Not clinically deployed.',
              'Datos: EDGAR (Consortium for ECG Imaging). Tanque de torso humano (Utah, 2018) y perro in situ (Maastricht), usados bajo el acuerdo de uso de EDGAR con atribucion; los conjuntos de datos crudos no se redistribuyen. El campo medido se muestra como visualizacion de investigacion. No desplegado clinicamente.')}
          </Callout>
          <Refs ids={['aras2015', 'cluitmans2018']} />
        </section>
      )}
      </div>
    </div>
  );
}
