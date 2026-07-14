import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Callout } from '../components/Callout';
import { Cite } from '../components/Cite';
import { Equation, InlineMath } from '../components/Equation';
import { Refs } from '../components/Refs';
import { Tabs } from '../components/Tabs';
import { seq, div, seqCss, divCss } from '../kits/colormap';

// robust range (2nd-98th percentile); relative pressure is signed (diverging), speed is magnitude (sequential)
function lumenStats(vals: number[]): { lo: number; hi: number } {
  const sorted = [...vals].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.02)];
  const hi = sorted[Math.floor(sorted.length * 0.98)] || lo + 1;
  return { lo, hi: hi === lo ? lo + 1 : hi };
}
import { useLang, pick } from '../store';

const BASE = import.meta.env.BASE_URL;

interface Flow4dTrace {
  points_mm: number[][];
  pressure_mmHg: number[];
  speed_ms_peak: number[];
  speed_ms_over_time: number[][];
  times_ms: number[];
  peak_frame: number;
  metrics: Record<string, number>;
}

type FlowField = 'pressure' | 'speed';

// A three.js point cloud of the aortic lumen coloured by the selected field (pressure or speed). Robust color
// range (2nd-98th percentile) so a few tail voxels do not wash out the map.
function LumenCloud({ tr, field, frame }: { tr: Flow4dTrace; field: FlowField; frame: number }) {
  const geom = useMemo(() => {
    const n = tr.points_mm.length;
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = tr.points_mm[i][0]; pos[i * 3 + 1] = tr.points_mm[i][1]; pos[i * 3 + 2] = tr.points_mm[i][2]; }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    return g;
  }, [tr]);

  useEffect(() => {
    const vals = field === 'pressure' ? tr.pressure_mmHg : tr.speed_ms_over_time[frame];
    const { lo, hi } = lumenStats(vals);
    const cmap = field === 'pressure' ? div : seq;   // relative pressure signed -> diverging; speed -> sequential
    const color = geom.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < vals.length; i++) { const [r, g2, b] = cmap((vals[i] - lo) / (hi - lo || 1)); color.setXYZ(i, r, g2, b); }
    color.needsUpdate = true;
  }, [geom, tr, field, frame]);

  return <points geometry={geom}><pointsMaterial size={1.4} vertexColors sizeAttenuation /></points>;
}

// Theme-aware SVG: incompressible Navier-Stokes -> take the divergence -> pressure-Poisson equation.
function PpeSvg({ lang }: { lang: 'en' | 'es' }) {
  return (
    <div className="fig-svg wide">
      <svg viewBox="0 0 720 130" role="img">
        <rect x="10" y="34" width="180" height="62" rx="8" fill="var(--panel-2)" stroke="var(--accent-2)" />
        <text x="100" y="58" textAnchor="middle" fill="var(--fg)" fontSize="11">{pick(lang, 'measured 4D-flow', '4D-flow medido')}</text>
        <text x="100" y="76" textAnchor="middle" fill="var(--muted)" fontSize="10">{pick(lang, 'velocity v(x,t)', 'velocidad v(x,t)')}</text>
        <path d="M190 65 H235" stroke="var(--accent-2)" strokeWidth="2" markerEnd="url(#fa)" />
        <rect x="237" y="34" width="200" height="62" rx="8" fill="var(--panel-2)" stroke="var(--border)" />
        <text x="337" y="55" textAnchor="middle" fill="var(--fg)" fontSize="11">{pick(lang, 'div-free PINN denoise', 'PINN denoise sin divergencia')}</text>
        <text x="337" y="72" textAnchor="middle" fill="var(--muted)" fontSize="10">{pick(lang, 'enforce div v = 0', 'imponer div v = 0')}</text>
        <path d="M437 65 H482" stroke="var(--accent-2)" strokeWidth="2" markerEnd="url(#fa)" />
        <rect x="484" y="24" width="226" height="82" rx="8" fill="color-mix(in srgb, var(--good) 12%, var(--panel))" stroke="var(--good)" />
        <text x="597" y="48" textAnchor="middle" fill="var(--fg)" fontSize="11">{pick(lang, 'pressure-Poisson solve', 'resolver Poisson de presion')}</text>
        <text x="597" y="66" textAnchor="middle" fill="var(--muted)" fontSize="10">lap(p) = S(v)</text>
        <text x="597" y="84" textAnchor="middle" fill="var(--good)" fontSize="10">{pick(lang, 'relative pressure p(x)', 'presion relativa p(x)')}</text>
        <defs><marker id="fa" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--accent-2)" /></marker></defs>
      </svg>
      <div className="fig-cap">{pick(lang, 'From the measured velocity: a physics-informed net denoises it under incompressibility, then the divergence of Navier-Stokes gives a Poisson problem whose solution is the relative pressure.', 'Desde la velocidad medida: una red informada por fisica la limpia bajo incompresibilidad, luego la divergencia de Navier-Stokes da un problema de Poisson cuya solucion es la presion relativa.')}</div>
    </div>
  );
}

export function Flow4d({ selector }: { selector?: ReactNode }) {
  const lang = useLang();
  const [tr, setTr] = useState<Flow4dTrace | null>(null);
  const [tab, setTab] = useState('result');
  const [field, setField] = useState<FlowField>('pressure');
  const [frame, setFrame] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => { fetch(`${BASE}data/real-flow4d-pressure/trace.json`).then((r) => r.json()).then(setTr).catch(() => setTr(null)); }, []);
  useEffect(() => { if (tr) setFrame(tr.peak_frame); }, [tr]);

  const playOnce = () => {
    if (raf.current || !tr) return;
    const n = tr.times_ms.length;
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
    { id: 'result', label: pick(lang, 'Pressure recovery', 'Recuperacion de presion') },
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
        {tr && (
          <>
            <div className="cp-side-block">
              <label className="cp-field">
                <span>{pick(lang, 'Field', 'Campo')}</span>
                <select className="cp-select" value={field} onChange={(e) => setField(e.target.value as FlowField)}>
                  <option value="pressure">{pick(lang, 'Relative pressure (mmHg)', 'Presion relativa (mmHg)')}</option>
                  <option value="speed">{pick(lang, 'Speed (m/s)', 'Rapidez (m/s)')}</option>
                </select>
              </label>
            </div>
            <div className="cp-side-block">
              <span className="cp-side-label">{pick(lang, 'Live readout (real scan)', 'Lectura en vivo (escaneo real)')}</span>
              <div className="cp-readout">
                <div className="ro"><span className="v">{tr.metrics.peak_velocity_ms}</span><span className="k">{pick(lang, 'peak velocity (m/s)', 'velocidad pico (m/s)')}</span></div>
                <div className="ro"><span className="v">{tr.metrics.ppe_pressure_drop_mmHg}</span><span className="k">{pick(lang, 'pressure range (mmHg)', 'rango presion (mmHg)')}</span></div>
                <div className="ro"><span className="v">{tr.metrics.bernoulli_mmHg}</span><span className="k">{pick(lang, 'Bernoulli 4Vmax² (mmHg)', 'Bernoulli 4Vmax² (mmHg)')}</span></div>
                <div className="ro"><span className="v">{tr.metrics.n_lumen_voxels}</span><span className="k">{pick(lang, 'lumen voxels', 'voxeles lumen')}</span></div>
              </div>
            </div>
          </>
        )}
      </aside>
      <div className="cp-main">
      <div className="page-head">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1>{pick(lang, 'Real 4D-flow: recovering the aortic pressure field', 'Flujo 4D real: recuperar el campo de presion aortica')}</h1>
          <span className="badge live">REAL DATA</span>
        </div>
        <p className="lede">
          {pick(lang,
            'From a real 4D-flow MRI scan (the measured 3D-plus-time blood velocity in the aorta), recover the relative pressure field, the quantity a clinician needs to grade a stenosis or coarctation but cannot measure without threading a catheter. Pressure never appears in the scan; it is forced out of the measured velocity by incompressible Navier-Stokes ',
            'A partir de una resonancia de flujo 4D real (la velocidad sanguinea 3D-mas-tiempo medida en la aorta), recuperar el campo de presion relativa, la cantidad que un clinico necesita para graduar una estenosis o coartacion pero no puede medir sin introducir un cateter. La presion nunca aparece en el escaneo; la fuerza la ecuacion de Navier-Stokes incompresible ')}
          <InlineMath tex={String.raw`\nabla^2 p = S(\mathbf{v})`} />.
        </p>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'problem' && (
        <section>
          <h2>{pick(lang, 'Grading a narrowing without a catheter', 'Graduar un estrechamiento sin cateter')}</h2>
          <p>{pick(lang,
            'A narrowing of the aorta (a valvular stenosis or a coarctation) forces blood through a smaller opening, and the clinically decisive quantity is the pressure drop across it: a large gradient means the heart is working against a high load and intervention may be needed. The reference way to measure that gradient is invasive cardiac catheterization, threading a pressure wire across the narrowing.',
            'Un estrechamiento de la aorta (una estenosis valvular o una coartacion) fuerza la sangre a traves de una abertura menor, y la cantidad clinicamente decisiva es la caida de presion a traves de el: un gradiente grande significa que el corazon trabaja contra una carga alta y puede requerirse intervencion. La forma de referencia de medir ese gradiente es el cateterismo cardiaco invasivo, pasando un cable de presion a traves del estrechamiento.')}</p>
          <p>{pick(lang,
            'Four-dimensional flow MRI (4D-flow) measures the full three-directional blood velocity throughout the aorta and across the cardiac cycle, non-invasively. It does not measure pressure, but pressure and velocity are tied together by the equations of fluid motion, so the pressure field can in principle be computed from the measured velocity. This case does exactly that on a real scan.',
            'La resonancia de flujo cuatridimensional (flujo 4D) mide la velocidad sanguinea completa en tres direcciones en toda la aorta y a lo largo del ciclo cardiaco, de forma no invasiva. No mide la presion, pero presion y velocidad estan ligadas por las ecuaciones del movimiento de fluidos, asi que el campo de presion puede en principio calcularse desde la velocidad medida. Este caso hace exactamente eso sobre un escaneo real.')}</p>
          <Callout>
            {pick(lang,
              'This is a genuinely different physics from the ECG-imaging case: there the governing equation is quasi-static volume conduction (a Laplace problem); here it is incompressible Navier-Stokes (fluid dynamics). Both are inverse problems, recovering an unmeasurable field from a measurable one on real data.',
              'Esta es una fisica genuinamente distinta al caso de imagen de ECG: alli la ecuacion gobernante es la conduccion de volumen cuasi-estatica (un problema de Laplace); aqui es Navier-Stokes incompresible (dinamica de fluidos). Ambos son problemas inversos, recuperando un campo no medible desde uno medible sobre datos reales.')}
          </Callout>
          <Refs ids={['raissi2020', 'krittian2012']} />
        </section>
      )}

      {tab === 'target' && (
        <section>
          <h2>{pick(lang, 'What we measure, and what we recover', 'Que medimos y que recuperamos')}</h2>
          <p>{pick(lang,
            'What the scanner records, per voxel and per cardiac frame, is the three-component blood velocity, encoded as a phase shift proportional to velocity up to the encoding limit (the venc). What we want is the relative pressure at every voxel, the field that never appears in the scan. In a patient the pressure map is inaccessible without a catheter; here we compute it from the velocity and check it against the clinical estimate.',
            'Lo que el escaner registra, por voxel y por cuadro cardiaco, es la velocidad sanguinea de tres componentes, codificada como un desfase proporcional a la velocidad hasta el limite de codificacion (el venc). Lo que queremos es la presion relativa en cada voxel, el campo que nunca aparece en el escaneo. En un paciente el mapa de presion es inaccesible sin cateter; aqui lo calculamos desde la velocidad y lo contrastamos con la estimacion clinica.')}</p>
          <Equation tex={String.raw`\mathbf{v}(\mathbf{x},t)\in\mathbb{R}^3 \;\;\text{measured} \quad\Longrightarrow\quad p(\mathbf{x},t)\;\;\text{recovered (relative)}`}
            caption={pick(lang, 'The measured three-directional velocity field maps to the unmeasured relative pressure field through the fluid equations.', 'El campo de velocidad medido en tres direcciones se mapea al campo de presion relativa no medido a traves de las ecuaciones de fluidos.')} />
          <dl className="def-grid">
            <dt>{'v(x,t)'}</dt><dd>{pick(lang, 'measured blood velocity (m/s), 3 components per voxel over the beat', 'velocidad sanguinea medida (m/s), 3 componentes por voxel durante el latido')}</dd>
            <dt>{'p(x,t)'}</dt><dd>{pick(lang, 'relative pressure to recover (mmHg); only differences are physical', 'presion relativa a recuperar (mmHg); solo las diferencias son fisicas')}</dd>
            <dt>venc</dt><dd>{pick(lang, 'velocity-encoding limit of the scan (120 cm/s here); speeds above it alias', 'limite de codificacion de velocidad del escaneo (120 cm/s aqui); las velocidades por encima se pliegan')}</dd>
          </dl>
          <Callout>
            {pick(lang,
              'There is no non-invasive pressure gold standard, that absence is exactly why the method exists. The honest validation is threefold: the pressure engine recovers a known analytic pressure exactly (next tabs), the real-scan map is physiological (single to low double-digit mmHg, not thousands), and it brackets the routine clinical Bernoulli estimate.',
              'No hay patron de oro de presion no invasivo, esa ausencia es justo por lo que existe el metodo. La validacion honesta es triple: el motor de presion recupera exactamente una presion analitica conocida (siguientes pestanas), el mapa del escaneo real es fisiologico (de un digito a doble digito bajo en mmHg, no miles), y encuadra la estimacion clinica de Bernoulli de rutina.')}
          </Callout>
          <Refs ids={['krittian2012']} />
        </section>
      )}

      {tab === 'forward' && (
        <section>
          <h2>{pick(lang, 'How the governing equation arises', 'Como surge la ecuacion gobernante')}</h2>
          <p>{pick(lang,
            'Blood in a large artery is well modelled as an incompressible Newtonian fluid, so its motion obeys the incompressible Navier-Stokes equations: conservation of momentum plus the incompressibility (zero-divergence) constraint. Momentum ties the pressure gradient to the fluid acceleration and viscous friction.',
            'La sangre en una arteria grande se modela bien como un fluido newtoniano incompresible, asi que su movimiento obedece las ecuaciones de Navier-Stokes incompresibles: conservacion del momento mas la restriccion de incompresibilidad (divergencia cero). El momento liga el gradiente de presion a la aceleracion del fluido y la friccion viscosa.')}</p>
          <Equation tex={String.raw`\rho\Big(\partial_t \mathbf{v} + (\mathbf{v}\cdot\nabla)\mathbf{v}\Big) = -\nabla p + \mu\nabla^2\mathbf{v}, \qquad \nabla\cdot\mathbf{v}=0`}
            caption={pick(lang, 'Incompressible Navier-Stokes: momentum balance plus zero divergence. Density rho and viscosity mu are blood constants.', 'Navier-Stokes incompresible: balance de momento mas divergencia cero. La densidad rho y la viscosidad mu son constantes de la sangre.')} />
          <p>{pick(lang,
            'Taking the divergence of the momentum equation and using incompressibility eliminates the acceleration term and turns the relation into a single Poisson equation for pressure, whose right-hand side is built entirely from the measured velocity and its spatial derivatives. This is the pressure-Poisson equation: a well-posed elliptic problem, unlike a naive inversion.',
            'Tomar la divergencia de la ecuacion de momento y usar la incompresibilidad elimina el termino de aceleracion y convierte la relacion en una sola ecuacion de Poisson para la presion, cuyo lado derecho se construye enteramente desde la velocidad medida y sus derivadas espaciales. Esta es la ecuacion de Poisson de presion: un problema eliptico bien planteado, a diferencia de una inversion ingenua.')}</p>
          <Equation tex={String.raw`\nabla^2 p = -\rho\,\nabla\cdot\big[(\mathbf{v}\cdot\nabla)\mathbf{v}\big] = -\rho\sum_{i,j}\frac{\partial v_i}{\partial x_j}\frac{\partial v_j}{\partial x_i} \equiv S(\mathbf{v})`}
            caption={pick(lang, 'The pressure-Poisson equation: the source S is a quadratic form of the velocity gradients, so noise in v is amplified, hence the divergence-free denoising.', 'La ecuacion de Poisson de presion: la fuente S es una forma cuadratica de los gradientes de velocidad, asi que el ruido en v se amplifica, de ahi el suavizado sin divergencia.')} />
          <PpeSvg lang={lang} />
          <dl className="def-grid">
            <dt>{'ρ, μ'}</dt><dd>{pick(lang, 'blood density 1060 kg/m^3, dynamic viscosity 0.0035 Pa s', 'densidad de la sangre 1060 kg/m^3, viscosidad dinamica 0.0035 Pa s')}</dd>
            <dt>{'S(v)'}</dt><dd>{pick(lang, 'the Poisson source, a product of velocity derivatives', 'la fuente de Poisson, un producto de derivadas de velocidad')}</dd>
            <dt>{'∂p/∂n'}</dt><dd>{pick(lang, 'the Neumann boundary flux, set by the momentum equation at the vessel wall', 'el flujo Neumann de frontera, fijado por la ecuacion de momento en la pared del vaso')}</dd>
          </dl>
          <Refs ids={['krittian2012', 'raissi2020']} />
        </section>
      )}

      {tab === 'traditional' && (
        <section>
          <h2>{pick(lang, 'The clinical standard: simplified Bernoulli', 'El estandar clinico: Bernoulli simplificado')}</h2>
          <p>{pick(lang,
            'In routine cardiology the pressure gradient across a narrowing is not computed from the full velocity field; it is estimated from a single number, the peak velocity, through the simplified Bernoulli equation. It keeps only the convective term of the flow energy and drops the viscous, unsteady and inflow-velocity contributions.',
            'En la cardiologia de rutina el gradiente de presion a traves de un estrechamiento no se calcula desde el campo de velocidad completo; se estima desde un solo numero, la velocidad pico, mediante la ecuacion de Bernoulli simplificada. Conserva solo el termino convectivo de la energia del flujo y descarta las contribuciones viscosa, no estacionaria y de velocidad de entrada.')}</p>
          <Equation tex={String.raw`\Delta p \;\approx\; 4\,V_{\max}^2 \quad (\text{mmHg},\; V_{\max}\text{ in m/s})`}
            caption={pick(lang, 'Simplified Bernoulli: the whole pressure gradient is read off a single peak velocity. Fast, ubiquitous, and blind to everything the peak velocity does not capture.', 'Bernoulli simplificado: todo el gradiente de presion se lee de una sola velocidad pico. Rapido, ubicuo, y ciego a todo lo que la velocidad pico no captura.')} />
          <p>{pick(lang,
            'It is fast and needs only a single Doppler or 4D-flow peak velocity, which is why it is universal. But because it ignores viscous losses, the unsteady (acceleration) term, and the pressure variation along and across the vessel, it is known to misestimate the true gradient, and it yields one number, not a pressure map.',
            'Es rapido y solo necesita una unica velocidad pico Doppler o de flujo 4D, por lo que es universal. Pero como ignora las perdidas viscosas, el termino no estacionario (de aceleracion), y la variacion de presion a lo largo y a traves del vaso, se sabe que estima mal el gradiente real, y da un numero, no un mapa de presion.')}</p>
          <Callout>
            {pick(lang,
              'On this real scan the peak velocity is 0.77 m/s, so simplified Bernoulli reads about 2.4 mmHg. We keep this as the reference the physics-based map is compared against, not as a straw man: for a clean unobstructed aorta a small gradient is exactly right.',
              'En este escaneo real la velocidad pico es 0.77 m/s, asi que Bernoulli simplificado da unos 2.4 mmHg. Lo mantenemos como la referencia contra la que se compara el mapa basado en fisica, no como un espantapajaros: para una aorta limpia sin obstruccion un gradiente pequeno es justo lo correcto.')}
          </Callout>
          <Refs ids={['krittian2012']} />
        </section>
      )}

      {tab === 'pinn' && (
        <section>
          <h2>{pick(lang, 'Where and how the physics-informed method helps', 'Donde y como ayuda el metodo informado por fisica')}</h2>
          <p>{pick(lang,
            'The pressure-Poisson source is a product of velocity derivatives, so raw measurement noise, which violates incompressibility, is amplified into a non-physiological pressure. The fix is a physics-informed velocity step: a network is trained to reproduce the measured velocity while satisfying zero divergence, producing a smooth, divergence-free field whose analytic derivatives are clean. Unlike pressure, velocity is strongly constrained by the data, so this denoising is well-posed and robust (a plain momentum-residual network cannot recover pressure at all: it is gauge-free and stays near its initialization).',
            'La fuente de la Poisson de presion es un producto de derivadas de velocidad, asi que el ruido de medicion crudo, que viola la incompresibilidad, se amplifica en una presion no fisiologica. La solucion es un paso de velocidad informado por fisica: se entrena una red para reproducir la velocidad medida mientras satisface divergencia cero, produciendo un campo suave y sin divergencia cuyas derivadas analiticas son limpias. A diferencia de la presion, la velocidad esta fuertemente restringida por los datos, asi que este suavizado esta bien planteado y es robusto (una red de residuo de momento simple no puede recuperar la presion en absoluto: no tiene calibre y se queda cerca de su inicializacion).')}</p>
          <Equation tex={String.raw`\min_{\theta}\; \underbrace{\big\lVert \mathbf{v}_\theta - \mathbf{v}^{\text{measured}}\big\rVert^2}_{\text{data}} \;+\; \lambda\,\underbrace{\big\lVert \nabla\cdot\mathbf{v}_\theta\big\rVert^2}_{\text{incompressibility}} \;\;\Rightarrow\;\; \nabla^2 p = S(\mathbf{v}_\theta),\;\; \partial_n p = \mathbf{b}(\mathbf{v}_\theta)\cdot\mathbf{n}`}
            caption={pick(lang, 'A divergence-free network denoises the measured velocity; its analytic derivatives build the Poisson source and the Neumann flux, then a sparse direct solve returns the pressure.', 'Una red sin divergencia limpia la velocidad medida; sus derivadas analiticas construyen la fuente de Poisson y el flujo Neumann, luego una resolucion directa dispersa devuelve la presion.')} />
          <p>{pick(lang,
            'This is the hidden-fluid-mechanics idea, learning the pressure a flow implies while the measured velocity drives the fit, made robust for real noisy 4D-flow by separating the well-posed velocity denoising from the elliptic pressure solve. Computing the Poisson source and the wall flux from the network’s analytic derivatives, rather than finite differences at the lumen edge, is what removes the boundary artifacts that otherwise wreck the map.',
            'Esta es la idea de la mecanica de fluidos oculta, aprender la presion que un flujo implica mientras la velocidad medida guia el ajuste, hecha robusta para el flujo 4D real ruidoso separando el suavizado de velocidad bien planteado de la resolucion eliptica de presion. Calcular la fuente de Poisson y el flujo de pared desde las derivadas analiticas de la red, en lugar de diferencias finitas en el borde del lumen, es lo que elimina los artefactos de frontera que si no arruinan el mapa.')}
            {' '}<Cite id="raissi2020" /> <Cite id="raissi2019" /></p>
          <Callout>
            {pick(lang,
              'The engine is gated before any real data is trusted: on an analytic converging-duct flow whose exact pressure drop is known, the pressure-Poisson solve recovers it to within 1 percent (correlation 1.00, 4.74 vs 4.73 mmHg). Only after passing that gate is it applied to the real scan.',
              'El motor se somete a una prueba antes de confiar en cualquier dato real: sobre un flujo analitico de ducto convergente cuya caida de presion exacta se conoce, la resolucion de Poisson de presion la recupera con menos de 1 por ciento de error (correlacion 1.00, 4.74 vs 4.73 mmHg). Solo tras pasar esa prueba se aplica al escaneo real.')}
          </Callout>
          <Refs ids={['raissi2020', 'raissi2019', 'krittian2012']} />
        </section>
      )}

      {tab === 'result' && tr && (
        <section>
          <h2>{pick(lang, 'The recovered pressure field, on the real aorta', 'El campo de presion recuperado, sobre la aorta real')}</h2>
          <p>{pick(lang, 'Use the LEFT COLUMN to switch the field (recovered relative pressure at peak systole, or the measured speed over the cardiac cycle) and to read the live hemodynamics of the real scan. Orbit the aortic lumen below.', 'Usa la COLUMNA IZQUIERDA para cambiar el campo (presion relativa recuperada en sistole pico, o la rapidez medida durante el ciclo cardiaco) y para leer la hemodinamica en vivo del escaneo real. Orbita el lumen aortico abajo.')}</p>
          {(() => {
            const rf = Math.min(frame, tr.times_ms.length - 1);
            const vals = field === 'pressure' ? tr.pressure_mmHg : tr.speed_ms_over_time[rf];
            const { lo, hi } = lumenStats(vals);
            const gradCss = field === 'pressure' ? divCss : seqCss;
            const unit = field === 'pressure' ? 'mmHg' : 'm/s';
            // detected feature: the argmax voxel of the current field
            let mi = 0; for (let i = 1; i < vals.length; i++) if (vals[i] > vals[mi]) mi = i;
            return (
              <>
                <div className="canvas-wrap">
                  <Canvas camera={{ position: [90, -70, 70], fov: 40, up: [0, 0, 1] }} aria-hidden="true">
                    <ambientLight intensity={0.7} />
                    <LumenCloud tr={tr} field={field} frame={rf} />
                    <OrbitControls target={[0, 0, 0]} />
                  </Canvas>
                  <div className="legend">
                    <div>{field === 'pressure' ? pick(lang, 'Relative pressure (mmHg)', 'Presion relativa (mmHg)') : pick(lang, 'Speed (m/s)', 'Rapidez (m/s)')}</div>
                    <div className="bar" style={{ background: `linear-gradient(90deg, ${gradCss(0)}, ${gradCss(0.5)}, ${gradCss(1)})` }} />
                    <div className="legend-ticks"><span>{lo.toFixed(2)}</span><span>{((lo + hi) / 2).toFixed(2)}</span><span>{hi.toFixed(2)}</span></div>
                  </div>
                  <div className="readout">{field === 'speed' ? `t = ${tr.times_ms[rf]} ms` : pick(lang, 'peak systole', 'sistole pico')} · {pick(lang, 'max', 'max')} {vals[mi].toFixed(2)} {unit}</div>
                </div>
                <p className="sr-summary">{pick(lang,
                  `3D view: ${field === 'pressure' ? 'recovered relative pressure at peak systole' : `measured speed at t = ${tr.times_ms[rf]} ms`} on the ${tr.metrics.n_lumen_voxels}-voxel aortic lumen; range ${lo.toFixed(2)} to ${hi.toFixed(2)} ${unit}; peak velocity ${tr.metrics.peak_velocity_ms} m/s; PPE pressure range ${tr.metrics.ppe_pressure_drop_mmHg} mmHg vs clinical Bernoulli ${tr.metrics.bernoulli_mmHg} mmHg.`,
                  `Vista 3D: ${field === 'pressure' ? 'presion relativa recuperada en sistole pico' : `rapidez medida en t = ${tr.times_ms[rf]} ms`} sobre el lumen aortico de ${tr.metrics.n_lumen_voxels} voxeles; rango ${lo.toFixed(2)} a ${hi.toFixed(2)} ${unit}; velocidad pico ${tr.metrics.peak_velocity_ms} m/s; rango de presion PPE ${tr.metrics.ppe_pressure_drop_mmHg} mmHg vs Bernoulli clinico ${tr.metrics.bernoulli_mmHg} mmHg.`)}</p>
              </>
            );
          })()}
          {field === 'speed' && (
            <div className="row" style={{ marginTop: 10 }}>
              <span className="muted small">{pick(lang, 'Cardiac phase', 'Fase cardiaca')}:</span>
              <input type="range" min={0} max={tr.times_ms.length - 1} value={Math.min(frame, tr.times_ms.length - 1)} onChange={(e) => setFrame(Number(e.target.value))} />
              <button className="iconbtn" onClick={playOnce}>{pick(lang, 'Play cycle', 'Reproducir ciclo')}</button>
            </div>
          )}
          <p style={{ marginTop: 12 }}>{pick(lang,
            'Orbit the aortic lumen; toggle the recovered relative pressure (at peak systole) and the measured speed (scrub or play the cardiac cycle). The recovered pressure field spans about one mmHg across the segment, small and physiological for this unobstructed aorta, and the same order as the clinical Bernoulli estimate from the same scan, while also revealing where the pressure varies, which the single Bernoulli number cannot. The unsteady acceleration is differentiated exactly in time by a space-time network trained over the whole cardiac cycle (not a three-frame finite difference), and phase-wrap aliasing is corrected before the reconstruction.',
            'Orbita el lumen aortico; alterna la presion relativa recuperada (en sistole pico) y la rapidez medida (desplaza o reproduce el ciclo cardiaco). El campo de presion recuperado abarca cerca de un mmHg en el segmento, pequeno y fisiologico para esta aorta sin obstruccion, y del mismo orden que la estimacion clinica de Bernoulli del mismo escaneo, revelando ademas donde varia la presion, que el unico numero de Bernoulli no puede. La aceleracion no estacionaria se deriva exactamente en el tiempo con una red espacio-temporal entrenada sobre todo el ciclo cardiaco (no una diferencia finita de tres cuadros), y el pliegue de fase se corrige antes de la reconstruccion.')}</p>
          <Callout>
            {pick(lang,
              'Robustness, and its limit. A deep ensemble that perturbs the measured velocity with realistic phase-contrast noise (5% of the venc) and re-runs the whole pipeline moves the recovered pressure by under 0.01 mmHg: the divergence-free denoiser makes the pressure essentially insensitive to velocity measurement noise. That is a strength, but it also means the dominant uncertainty is NOT measurement noise and cannot be captured by such an ensemble: it is the absent invasive gold standard, the lumen segmentation, and the unsteady-term approximation. So the absolute magnitude carries the method uncertainty honestly; the validated claims are the exact analytic gate, the physiological range, the noise-robustness, and the Bernoulli bracket. Data: a real thoracic-aorta 4D-flow MRI (Philips, venc 120 cm/s), used under its data agreement, raw DICOMs not redistributed. Not clinically deployed.',
              'Robustez, y su limite. Un ensemble profundo que perturba la velocidad medida con ruido de contraste de fase realista (5% del venc) y reejecuta todo el pipeline mueve la presion recuperada en menos de 0.01 mmHg: el suavizador sin divergencia hace la presion esencialmente insensible al ruido de medicion de velocidad. Eso es una fortaleza, pero tambien significa que la incertidumbre dominante NO es el ruido de medicion y no puede capturarse con tal ensemble: es el patron de oro invasivo ausente, la segmentacion del lumen y la aproximacion del termino no estacionario. Asi que la magnitud absoluta lleva la incertidumbre del metodo con honestidad; las afirmaciones validadas son la prueba analitica exacta, el rango fisiologico, la robustez al ruido y el encuadre de Bernoulli. Datos: una resonancia de flujo 4D real de aorta toracica (Philips, venc 120 cm/s), usada bajo su acuerdo, DICOM crudos no redistribuidos. No desplegado clinicamente.')}
          </Callout>
          <Refs ids={['raissi2020', 'krittian2012']} />
        </section>
      )}
      </div>
    </div>
  );
}
