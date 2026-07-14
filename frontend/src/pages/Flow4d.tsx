import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Tabs, type TabDef, Callout, Equation, InlineMath, Refs, Cite } from '@fasl-work/caos-app-shell';
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

  const tabs: TabDef[] = [
    {
      id: 'result', label: pick(lang, 'Pressure recovery', 'Recuperacion de presion'),
      content: tr && (
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
          <Refs ids={['raissi2020', 'krittian2012']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'problem', label: pick(lang, 'The problem', 'El problema'),
      content: (
        <section>
          <h2>{pick(lang, 'Grading a narrowing without a catheter', 'Graduar un estrechamiento sin cateter')}</h2>
          <p>{pick(lang,
            'When the aorta narrows, at the valve (aortic stenosis) or along the arch (coarctation), the pressure drop across the narrowing is the number the treatment decision turns on. It is not a soft signal: the 2020 ACC/AHA and 2021 ESC/EACTS valve guidelines define SEVERE aortic stenosis by three concordant quantities, a peak jet velocity of at least 4.0 m/s, a mean transvalvular gradient of at least 40 mmHg, and a valve area at or below 1.0 cm2; the 2018 AHA/ACC and 2020 ESC congenital-heart guidelines make repair of a coarctation a Class I indication once a peak-to-peak catheter gradient reaches 20 mmHg. Aortic stenosis is also common and getting more so with an aging population: pooled prevalence past age 75 is about 12.4% for any degree and 3.4% for severe disease. The gradient decides who gets a new valve or a stent.',
            'Cuando la aorta se estrecha, en la valvula (estenosis aortica) o a lo largo del arco (coartacion), la caida de presion a traves del estrechamiento es el numero del que depende la decision de tratamiento. No es una senal blanda: las guias valvulares 2020 ACC/AHA y 2021 ESC/EACTS definen la estenosis aortica GRAVE por tres cantidades concordantes, una velocidad pico del chorro de al menos 4.0 m/s, un gradiente medio transvalvular de al menos 40 mmHg, y un area valvular igual o menor a 1.0 cm2; las guias de cardiopatia congenita 2018 AHA/ACC y 2020 ESC hacen de la reparacion de una coartacion una indicacion Clase I una vez que el gradiente pico a pico por cateter alcanza 20 mmHg. La estenosis aortica ademas es frecuente y va en aumento con el envejecimiento: la prevalencia agrupada tras los 75 anos es cerca del 12.4% en cualquier grado y del 3.4% en enfermedad grave. El gradiente decide quien recibe una valvula nueva o un stent.')}</p>
          <p>{pick(lang,
            'The reference measurement is invasive: a pressure wire threaded across the narrowing at catheterization. The routine non-invasive substitute reads the whole gradient off a single peak velocity through the simplified Bernoulli equation, dp = 4 Vmax^2, which silently discards the upstream velocity, viscous friction, the unsteady acceleration term, and pressure recovery. Each omission has a documented failure mode, and the most instructive one runs against intuition: downstream of the throat part of the jet kinetic energy is reconverted to pressure ("pressure recovery"), so Doppler OVERestimates the net gradient a catheter would feel. In a validated model that overestimation reached 66 mmHg, an 80% error, when the stenosis was only moderate and the ascending aorta was small (Baumgartner et al., JACC 1999). A single peak-velocity number can move a patient across a treatment threshold in the wrong direction.',
            'La medicion de referencia es invasiva: un cable de presion pasado a traves del estrechamiento en el cateterismo. El sustituto no invasivo de rutina lee todo el gradiente desde una sola velocidad pico con la ecuacion de Bernoulli simplificada, dp = 4 Vmax^2, que descarta en silencio la velocidad de entrada, la friccion viscosa, el termino de aceleracion no estacionario y la recuperacion de presion. Cada omision tiene un modo de fallo documentado, y el mas instructivo va contra la intuicion: aguas abajo del estrechamiento parte de la energia cinetica del chorro se reconvierte en presion (la "recuperacion de presion"), asi que el Doppler SOBREestima el gradiente neto que sentiria un cateter. En un modelo validado esa sobreestimacion llego a 66 mmHg, un error del 80%, cuando la estenosis era solo moderada y la aorta ascendente era pequena (Baumgartner et al., JACC 1999). Un solo numero de velocidad pico puede cruzar a un paciente un umbral de tratamiento en la direccion equivocada.')}</p>
          <p>{pick(lang,
            'Four-dimensional flow MRI (4D-flow) measures the full three-directional blood velocity at every voxel of the thoracic aorta across the cardiac cycle, non-invasively. It does not measure pressure, but pressure and velocity are tied together by the Navier-Stokes equations, so a spatially resolved pressure field can be reconstructed from the measured velocity, one that sees the proximal velocity and the spatial acceleration a single Doppler number cannot, and recovers the net drop after pressure recovery. This case does exactly that on a real scan. Against controlled references the physics-based pressure agrees closely (peak-systole bias about 0.4 mmHg versus a fluid-structure-interaction ground truth; Saitta et al., J Biomech 2019); direct in-vivo comparison against simultaneous catheter gradients is still thin, so the honest claim is a physically grounded non-invasive estimate, not a proven catheter replacement.',
            'La resonancia de flujo cuatridimensional (flujo 4D) mide la velocidad sanguinea completa en tres direcciones en cada voxel de la aorta toracica a lo largo del ciclo cardiaco, de forma no invasiva. No mide la presion, pero presion y velocidad estan ligadas por las ecuaciones de Navier-Stokes, asi que puede reconstruirse un campo de presion espacialmente resuelto desde la velocidad medida, uno que ve la velocidad de entrada y la aceleracion espacial que un solo numero Doppler no puede, y recupera la caida neta tras la recuperacion de presion. Este caso hace exactamente eso sobre un escaneo real. Frente a referencias controladas la presion basada en fisica concuerda de cerca (sesgo en sistole pico de unos 0.4 mmHg contra una verdad de interaccion fluido-estructura; Saitta et al., J Biomech 2019); la comparacion directa in vivo contra gradientes de cateter simultaneos aun es escasa, asi que la afirmacion honesta es una estimacion no invasiva fisicamente fundada, no un reemplazo probado del cateter.')}</p>
          <Callout>
            {pick(lang,
              'This is a genuinely different physics from the ECG-imaging case: there the governing equation is quasi-static volume conduction (a Laplace problem); here it is incompressible Navier-Stokes (fluid dynamics). Both are inverse problems, recovering an unmeasurable field from a measurable one on real data. The aorta in this real scan is unobstructed, so the recovered gradient is correctly small; the point demonstrated here is the physics engine that would resolve where and how much pressure is lost in a stenosed or coarcted aorta.',
              'Esta es una fisica genuinamente distinta al caso de imagen de ECG: alli la ecuacion gobernante es la conduccion de volumen cuasi-estatica (un problema de Laplace); aqui es Navier-Stokes incompresible (dinamica de fluidos). Ambos son problemas inversos, recuperando un campo no medible desde uno medible sobre datos reales. La aorta en este escaneo real esta sin obstruccion, asi que el gradiente recuperado es correctamente pequeno; lo que se demuestra aqui es el motor fisico que resolveria donde y cuanta presion se pierde en una aorta con estenosis o coartacion.')}
          </Callout>
          <Refs ids={['otto2020vhd', 'stout2018achd', 'baumgartner1999', 'osnabrugge2013', 'saitta2019']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'target', label: pick(lang, 'The target', 'El objetivo'),
      content: (
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
          <Refs ids={['krittian2012']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'forward', label: pick(lang, 'How the PDE arises', 'Como surge la PDE'),
      content: (
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
          <Refs ids={['krittian2012', 'raissi2020']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'traditional', label: pick(lang, 'Traditional approach', 'Enfoque tradicional'),
      content: (
        <section>
          <h2>{pick(lang, 'The clinical standard: simplified Bernoulli', 'El estandar clinico: Bernoulli simplificado')}</h2>
          <p>{pick(lang,
            'In routine cardiology the pressure gradient across a narrowing is not computed from the full velocity field; it is estimated from a single number, the peak velocity, through the simplified Bernoulli equation. It keeps only the convective term of the flow energy and drops the viscous, unsteady and inflow-velocity contributions.',
            'En la cardiologia de rutina el gradiente de presion a traves de un estrechamiento no se calcula desde el campo de velocidad completo; se estima desde un solo numero, la velocidad pico, mediante la ecuacion de Bernoulli simplificada. Conserva solo el termino convectivo de la energia del flujo y descarta las contribuciones viscosa, no estacionaria y de velocidad de entrada.')}</p>
          <Equation tex={String.raw`\Delta p \;\approx\; 4\,V_{\max}^2 \quad (\text{mmHg},\; V_{\max}\text{ in m/s})`}
            caption={pick(lang, 'Simplified Bernoulli: the whole pressure gradient is read off a single peak velocity. Fast, ubiquitous, and blind to everything the peak velocity does not capture.', 'Bernoulli simplificado: todo el gradiente de presion se lee de una sola velocidad pico. Rapido, ubicuo, y ciego a todo lo que la velocidad pico no captura.')} />
          <p>{pick(lang,
            'It is fast and needs only a single Doppler or 4D-flow peak velocity, which is why it is universal. But dropping the inflow velocity overstates the gradient once the outflow-tract velocity exceeds about 1.5 m/s (the expanded form dp = 4(V2^2 - V1^2) is then required), and dropping pressure recovery makes Doppler overestimate the net catheter gradient, worst in a small aorta. The correlation with the invasive peak-to-peak gradient is restored only when the proximal velocity is put back in, precisely the term a single-window reading tends to omit. And the result is one scalar, not a pressure map: it cannot localize the vena contracta or separate reversible convective acceleration from irreversible viscous and turbulent energy loss.',
            'Es rapido y solo necesita una unica velocidad pico Doppler o de flujo 4D, por lo que es universal. Pero descartar la velocidad de entrada sobreestima el gradiente cuando la velocidad del tracto de salida supera cerca de 1.5 m/s (entonces se requiere la forma ampliada dp = 4(V2^2 - V1^2)), y descartar la recuperacion de presion hace que el Doppler sobreestime el gradiente neto por cateter, peor en una aorta pequena. La correlacion con el gradiente invasivo pico a pico se restaura solo cuando se reincorpora la velocidad proximal, justo el termino que una lectura de una sola ventana tiende a omitir. Y el resultado es un escalar, no un mapa de presion: no puede localizar la vena contracta ni separar la aceleracion convectiva reversible de la perdida viscosa y turbulenta irreversible.')}</p>
          <Callout>
            {pick(lang,
              'On this real scan the peak velocity is about 0.79 m/s, so simplified Bernoulli reads about 2.5 mmHg. We keep this as the reference the physics-based map is bracketed against, not as a straw man: for a clean unobstructed aorta a small gradient is exactly right. Its value as a comparison grows in the stenosed regime, where the discarded terms are exactly what separates the Doppler estimate from the invasive truth.',
              'En este escaneo real la velocidad pico es de unos 0.79 m/s, asi que Bernoulli simplificado da unos 2.5 mmHg. Lo mantenemos como la referencia contra la que se encuadra el mapa basado en fisica, no como un espantapajaros: para una aorta limpia sin obstruccion un gradiente pequeno es justo lo correcto. Su valor como comparacion crece en el regimen con estenosis, donde los terminos descartados son justo lo que separa la estimacion Doppler de la verdad invasiva.')}
          </Callout>
          <Refs ids={['baumgartner1999', 'otto2020vhd', 'krittian2012']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'pinn', label: pick(lang, 'Physics-informed proposal', 'Propuesta informada por fisica'),
      content: (
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
          <p>{pick(lang,
            'This sits inside a well-studied method family. The classical route is the pressure-Poisson equation (PPE), solved by finite elements over the segmented lumen (Ebbers 2001; Krittian 2012). The work-energy family, WERP and its virtual extension vWERP, instead integrates the Navier-Stokes energy balance to sidestep the noise-sensitive gradient product (Donati 2015; Marlevi 2019). The most recent head-to-head finds no single estimator wins everywhere, and all of them systematically underestimate the transient peak pressure when the temporal resolution is too coarse to resolve the unsteady dv/dt term (Hardy 2025), the same term this build makes analytic with a space-time network. The physics-informed line (Kissas 2020; Fathi 2020) reframes the pipeline as one inverse problem, enforcing the physics as a training regularizer rather than a discretized operator, and the divergence-free denoising is the classical solenoidal-projection idea (Ong 2015) made analytic.',
            'Esto se ubica dentro de una familia de metodos bien estudiada. La ruta clasica es la ecuacion de Poisson de presion (PPE), resuelta por elementos finitos sobre el lumen segmentado (Ebbers 2001; Krittian 2012). La familia de trabajo-energia, WERP y su extension virtual vWERP, integra en cambio el balance de energia de Navier-Stokes para evitar el producto de gradientes sensible al ruido (Donati 2015; Marlevi 2019). El comparativo mas reciente halla que ningun estimador gana en todo, y todos subestiman sistematicamente la presion pico transitoria cuando la resolucion temporal es demasiado gruesa para resolver el termino no estacionario dv/dt (Hardy 2025), el mismo termino que esta implementacion vuelve analitico con una red espacio-temporal. La linea informada por fisica (Kissas 2020; Fathi 2020) replantea el pipeline como un solo problema inverso, imponiendo la fisica como regularizador de entrenamiento en lugar de un operador discretizado, y el suavizado sin divergencia es la idea clasica de proyeccion solenoidal (Ong 2015) hecha analitica.')}</p>
          <Callout>
            {pick(lang,
              'The engine is gated before any real data is trusted: on an analytic converging-duct flow whose exact pressure drop is known, the pressure-Poisson solve recovers it to within 1 percent (correlation 1.00, 4.74 vs 4.73 mmHg). Only after passing that gate is it applied to the real scan.',
              'El motor se somete a una prueba antes de confiar en cualquier dato real: sobre un flujo analitico de ducto convergente cuya caida de presion exacta se conoce, la resolucion de Poisson de presion la recupera con menos de 1 por ciento de error (correlacion 1.00, 4.74 vs 4.73 mmHg). Solo tras pasar esa prueba se aplica al escaneo real.')}
          </Callout>
          <Refs ids={['ebbers2001', 'krittian2012', 'donati2015', 'marlevi2019', 'hardy2025', 'kissas2020', 'fathi2020', 'ong2015', 'raissi2020']} label="Refs" />
        </section>
      ),
    },
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

      <Tabs tabs={tabs} ariaLabel={pick(lang, 'Flow4d sections', 'Secciones de Flow4d')} />
      </div>
    </div>
  );
}
