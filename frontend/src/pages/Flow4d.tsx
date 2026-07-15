import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Tabs, type TabDef, Callout, InlineMath, Refs, Cite } from '@fasl-work/caos-app-shell';
import { FieldView3D } from '../kits/FieldView3D';
import { UPlotChart } from '../kits/UPlotChart';
import { StatStrip } from '../kits/StatStrip';
import { ClinicalStepper } from '../kits/ClinicalStepper';
import { DerivationStepper } from '../kits/DerivationStepper';
import { HoverMathEq } from '../kits/HoverMathEq';
import { Juxtapose } from '../kits/Juxtapose';
import { PipelineSvg } from '../kits/PipelineSvg';
import { useLang, pick } from '../store';
import { APP_VERSION } from '../lib/version';

// robust range (2nd-98th percentile); relative pressure is signed (diverging), speed is magnitude (sequential)
function lumenStats(vals: number[]): { lo: number; hi: number } {
  const sorted = [...vals].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.02)];
  const hi = sorted[Math.floor(sorted.length * 0.98)] || lo + 1;
  return { lo, hi: hi === lo ? lo + 1 : hi };
}
// signed fields are centred at 0 so the diverging map reads zero-pressure as neutral
function robustRange(vals: number[], signed: boolean): { lo: number; hi: number } {
  const { lo, hi } = lumenStats(vals);
  if (signed) { const m = Math.max(Math.abs(lo), Math.abs(hi)) || 1; return { lo: -m, hi: m }; }
  return { lo, hi };
}

const BASE = import.meta.env.BASE_URL;
// closed-form Bernoulli explorables (Tabs 2 and 5) sweep peak velocity over a clinical range; pure algebra, no solver
const VMAX_XS: number[] = Array.from({ length: 121 }, (_, i) => Number((i * 0.05).toFixed(2)));
const SEVERE_MEAN = 40; // mmHg, severe-AS mean-gradient threshold

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

// a compact horizontal magnitude bar for the Bernoulli-vs-physics bracket (Tab 5); value scaled against `max`
function BracketBar({ label, value, unit, max, color }: { label: ReactNode; value: number; unit: string; max: number; color: string }) {
  const w = Math.max(2, Math.min(100, (value / max) * 100));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)' }}>
        <span>{label}</span><span style={{ fontFamily: 'var(--mono, monospace)', color: 'var(--fg)' }}>{value.toFixed(2)} {unit}</span>
      </div>
      <div style={{ height: 12, borderRadius: 6, background: 'var(--panel-2)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ width: `${w}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

export function Flow4d({ selector }: { selector?: ReactNode }) {
  const lang = useLang();
  const [tr, setTr] = useState<Flow4dTrace | null>(null);
  const [field, setField] = useState<FlowField>('pressure');
  const [frame, setFrame] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);       // Tab 1 hero point-pick
  const [pickedT, setPickedT] = useState<number | null>(null);     // Tab 3 juxtapose linked point-pick
  const [playing, setPlaying] = useState(false);
  const [vmaxP, setVmaxP] = useState(4.0);                          // Tab 2 Bernoulli explorable
  const [vmaxT, setVmaxT] = useState(0.79);                         // Tab 5 Bernoulli explorable (anchored to this scan)
  const [v1T, setV1T] = useState(1.0);                             // Tab 5 inflow velocity
  const [pipeSel, setPipeSel] = useState<string | null>(null);     // Tab 6 pipeline node
  const [loadError, setLoadError] = useState<string | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`${BASE}data/real-flow4d-pressure/trace.json?v=${APP_VERSION}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status} loading the 4D-flow trace`); return r.json(); })
      .then((d) => { if (alive) setTr(d); })
      .catch((e) => { if (alive) setLoadError(String(e && e.message ? e.message : e)); });
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (tr) setFrame(tr.peak_frame); }, [tr]);

  const stopPlay = () => { if (raf.current) { cancelAnimationFrame(raf.current); raf.current = null; } setPlaying(false); };
  const togglePlay = () => {
    if (raf.current) { stopPlay(); return; }
    if (!tr) return;
    setPlaying(true);
    const n = tr.times_ms.length; let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / 3000);
      setFrame(Math.min(n - 1, Math.floor(p * (n - 1))));
      if (p < 1 && document.visibilityState === 'visible') raf.current = requestAnimationFrame(step);
      else { raf.current = null; setPlaying(false); }
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
          <p className="measure">{pick(lang, 'Orbit the aortic lumen; toggle the recovered relative pressure (at peak systole) against the measured speed; scrub or play the cardiac cycle. Click or arrow to a point to plot its speed pulse across the 16 phases.', 'Orbita el lumen aortico; alterna la presion relativa recuperada (en sistole pico) con la rapidez medida; desplaza o reproduce el ciclo cardiaco. Haz clic o usa las flechas en un punto para graficar su pulso de rapidez en las 16 fases.')}</p>
          {(() => {
            const rf = Math.min(frame, tr.times_ms.length - 1);
            const signed = field === 'pressure';
            const vals = signed ? tr.pressure_mmHg : tr.speed_ms_over_time[rf];
            const range = robustRange(vals, signed);
            const unit = signed ? 'mmHg' : 'm/s';
            let mi = 0; for (let i = 1; i < vals.length; i++) if (vals[i] > vals[mi]) mi = i;
            const node = picked ?? mi;
            const speedSeries = tr.speed_ms_over_time.map((f) => f[node]);
            const pAt = tr.pressure_mmHg[node];
            const vAt = tr.speed_ms_over_time[rf][node];
            return (
              <div className="hero-rail" style={{ marginTop: 8 }}>
                <FieldView3D
                  vertices={tr.points_mm} values={vals} signed={signed} range={range}
                  pickedNode={picked} argmaxNode={mi} onPick={setPicked} pointSize={4}
                  legendLabel={signed ? pick(lang, 'Relative pressure', 'Presion relativa') : pick(lang, 'Speed', 'Rapidez')} unit={unit}
                  readout={<>{signed ? pick(lang, 'peak systole', 'sistole pico') : `t = ${tr.times_ms[rf]} ms`} · {pick(lang, 'point', 'punto')} {node} · p {pAt.toFixed(2)} mmHg · v {vAt.toFixed(2)} m/s</>}
                  srSummary={pick(lang,
                    `3D aortic lumen: ${signed ? 'recovered relative pressure at peak systole' : `measured speed at t = ${tr.times_ms[rf]} ms`} on the ${tr.metrics.n_lumen_voxels}-voxel lumen; range ${range.lo.toFixed(2)} to ${range.hi.toFixed(2)} ${unit}; picked point ${node} has pressure ${pAt.toFixed(2)} mmHg and speed ${vAt.toFixed(2)} m/s; peak velocity ${tr.metrics.peak_velocity_ms} m/s, PPE pressure span ${tr.metrics.ppe_pressure_drop_mmHg} mmHg vs clinical Bernoulli ${tr.metrics.bernoulli_mmHg} mmHg. Click or arrow to a point to plot its speed over the cardiac cycle.`,
                    `Lumen aortico 3D: ${signed ? 'presion relativa recuperada en sistole pico' : `rapidez medida en t = ${tr.times_ms[rf]} ms`} sobre el lumen de ${tr.metrics.n_lumen_voxels} voxeles; rango ${range.lo.toFixed(2)} a ${range.hi.toFixed(2)} ${unit}; el punto elegido ${node} tiene presion ${pAt.toFixed(2)} mmHg y rapidez ${vAt.toFixed(2)} m/s; velocidad pico ${tr.metrics.peak_velocity_ms} m/s, rango de presion PPE ${tr.metrics.ppe_pressure_drop_mmHg} mmHg vs Bernoulli clinico ${tr.metrics.bernoulli_mmHg} mmHg. Haz clic o usa flechas en un punto para graficar su rapidez durante el ciclo cardiaco.`)}
                />
                <div className="hero-rail-side">
                  <div className="chip-wrap">
                    <button className={`chip ${field === 'pressure' ? 'on' : ''}`} onClick={() => setField('pressure')}>{pick(lang, 'Relative pressure', 'Presion relativa')}</button>
                    <button className={`chip ${field === 'speed' ? 'on' : ''}`} onClick={() => setField('speed')}>{pick(lang, 'Speed over cycle', 'Rapidez en el ciclo')}</button>
                  </div>
                  <div className="viz-controls">
                    <button className={`play-btn ${playing ? 'on' : ''}`} onClick={togglePlay} aria-label={pick(lang, 'Play cardiac cycle', 'Reproducir ciclo cardiaco')}>{playing ? '❚❚' : '▶'} {pick(lang, 'cycle', 'ciclo')}</button>
                    <input className="scrub" type="range" min={0} max={tr.times_ms.length - 1} value={rf} onChange={(e) => { stopPlay(); setFrame(Number(e.target.value)); }} aria-label={pick(lang, 'Cardiac phase', 'Fase cardiaca')} />
                    <span className="muted small">{tr.times_ms[rf]} ms</span>
                  </div>
                  <div className="pick-note">{picked != null
                    ? (lang === 'es' ? <>Punto <b>{picked}</b>: rapidez durante el ciclo cardiaco.</> : <>Point <b>{picked}</b>: speed over the cardiac cycle.</>)
                    : (lang === 'es' ? <>Haz clic en un punto del lumen. Mostrando el punto de max <b>{mi}</b>.</> : <>Click a point on the lumen. Showing the max point <b>{mi}</b>.</>)}</div>
                  <UPlotChart height={190}
                    data={[tr.times_ms, speedSeries]}
                    series={[{ label: 'speed', stroke: 'var(--accent)', width: 2 }]}
                    xLabel="ms" yLabel="m/s" cursorX={tr.times_ms[rf]}
                    markers={[{ x: tr.times_ms[tr.peak_frame], y: speedSeries[tr.peak_frame], color: 'var(--accent-2)', label: pick(lang, 'peak', 'pico') }]}
                    ariaLabel={pick(lang, `Speed at point ${node} over the cardiac cycle`, `Rapidez en el punto ${node} durante el ciclo cardiaco`)} />
                  <dl className="cp-readout">
                    <div className="ro"><span className="v">{tr.metrics.peak_velocity_ms}</span><span className="k">{pick(lang, 'peak velocity (m/s)', 'velocidad pico (m/s)')}</span></div>
                    <div className="ro"><span className="v">{tr.metrics.ppe_pressure_drop_mmHg}</span><span className="k">{pick(lang, 'pressure span (mmHg)', 'rango presion (mmHg)')}</span></div>
                  </dl>
                </div>
              </div>
            );
          })()}
          <p className="measure" style={{ marginTop: 12 }}>{pick(lang,
            'The recovered pressure spans about one mmHg across the segment, small and physiological for this unobstructed aorta, and the same order as the clinical Bernoulli estimate from the same scan, while also revealing where the pressure varies (which the single Bernoulli number cannot). The unsteady acceleration is differentiated exactly in time by a space-time network trained over the whole cardiac cycle, not a three-frame finite difference, and phase-wrap aliasing is corrected before the reconstruction.',
            'La presion recuperada abarca cerca de un mmHg en el segmento, pequena y fisiologica para esta aorta sin obstruccion, y del mismo orden que la estimacion clinica de Bernoulli del mismo escaneo, revelando ademas donde varia la presion (lo que el unico numero de Bernoulli no puede). La aceleracion no estacionaria se deriva exactamente en el tiempo con una red espacio-temporal entrenada sobre todo el ciclo cardiaco, no una diferencia finita de tres cuadros, y el pliegue de fase se corrige antes de la reconstruccion.')}</p>
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
          <p className="measure">{pick(lang,
            'When the aorta narrows (at the valve, aortic stenosis; or along the arch, coarctation), the pressure drop across it is the number the treatment decision turns on. The guideline thresholds are hard numbers, not soft signals.',
            'Cuando la aorta se estrecha (en la valvula, estenosis aortica; o a lo largo del arco, coartacion), la caida de presion a traves de ella es el numero del que depende la decision de tratamiento. Los umbrales de las guias son numeros duros, no senales blandas.')}</p>
          <StatStrip tiles={[
            { value: '4.0 m/s', label: pick(lang, 'severe aortic stenosis: peak jet velocity (with mean gradient >= 40 mmHg and valve area <= 1.0 cm2)', 'estenosis aortica grave: velocidad pico del chorro (con gradiente medio >= 40 mmHg y area valvular <= 1.0 cm2)'), source: 'otto2020vhd / vahanian2021esc' },
            { value: '20 mmHg', label: pick(lang, 'coarctation repair: Class I peak-to-peak catheter gradient', 'reparacion de coartacion: gradiente Clase I pico a pico por cateter'), source: 'stout2018achd' },
            { value: '12.4% / 3.4%', label: pick(lang, 'aortic stenosis prevalence past age 75 (any degree / severe)', 'prevalencia de estenosis aortica tras los 75 (cualquier grado / grave)'), source: 'osnabrugge2013' },
            { value: '~0.4 mmHg', label: pick(lang, 'physics-based pressure vs an FSI ground truth at peak systole', 'presion basada en fisica vs una verdad FSI en sistole pico'), source: 'saitta2019' },
          ]} />
          <div className="hero-rail" style={{ marginTop: 16 }}>
            <div>
              <div className="viz-controls">
                <label className="muted small" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  {pick(lang, 'Peak velocity Vmax', 'Velocidad pico Vmax')}
                  <input className="scrub" type="range" min={0} max={6} step={0.05} value={vmaxP} onChange={(e) => setVmaxP(Number(e.target.value))} aria-label={pick(lang, 'Peak velocity', 'Velocidad pico')} />
                </label>
                <span className="muted small" style={{ fontFamily: 'var(--mono, monospace)' }}>{vmaxP.toFixed(2)} m/s</span>
              </div>
              <div className="cp-readout" style={{ margin: '8px 0' }}>
                <div className="ro"><span className="v">{(4 * vmaxP * vmaxP).toFixed(1)}</span><span className="k">{pick(lang, '4 Vmax^2 (mmHg)', '4 Vmax^2 (mmHg)')}</span></div>
                <div className="ro"><span className="v">{4 * vmaxP * vmaxP >= SEVERE_MEAN ? pick(lang, 'severe', 'grave') : pick(lang, 'below', 'debajo')}</span><span className="k">{pick(lang, 'vs 40 mmHg threshold', 'vs umbral 40 mmHg')}</span></div>
              </div>
              <UPlotChart height={210}
                data={[VMAX_XS, VMAX_XS.map((x) => 4 * x * x), VMAX_XS.map(() => SEVERE_MEAN)]}
                series={[{ label: '4Vmax^2', stroke: 'var(--accent)', width: 2 }, { label: 'severe', stroke: 'var(--muted)', width: 1.4, dash: [5, 4] }]}
                xLabel="Vmax (m/s)" yLabel="mmHg"
                markers={[{ x: vmaxP, y: 4 * vmaxP * vmaxP, color: 'var(--accent-2)', label: pick(lang, 'now', 'ahora') }]}
                ariaLabel={pick(lang, `Simplified Bernoulli 4 Vmax squared curve; at Vmax ${vmaxP.toFixed(2)} m/s the gradient is ${(4 * vmaxP * vmaxP).toFixed(1)} mmHg, threshold 40 mmHg`, `Curva de Bernoulli simplificado 4 Vmax al cuadrado; en Vmax ${vmaxP.toFixed(2)} m/s el gradiente es ${(4 * vmaxP * vmaxP).toFixed(1)} mmHg, umbral 40 mmHg`)} />
              <p className="sr-summary">{pick(lang,
                'The whole gradient is read off a single peak velocity through 4 Vmax squared. One number can cross the severe threshold on its own, blind to inflow velocity, viscosity, unsteady acceleration and pressure recovery.',
                'Todo el gradiente se lee de una sola velocidad pico con 4 Vmax al cuadrado. Un numero puede cruzar el umbral grave por si solo, ciego a la velocidad de entrada, la viscosidad, la aceleracion no estacionaria y la recuperacion de presion.')}</p>
            </div>
            <div className="hero-rail-side">
              <ClinicalStepper
                prevLabel={pick(lang, 'Prev', 'Anterior')} nextLabel={pick(lang, 'Next', 'Siguiente')}
                steps={[
                  { title: pick(lang, 'The aorta narrows', 'La aorta se estrecha'), body: pick(lang, 'A throat forms at the valve (aortic stenosis) or along the arch (coarctation), and blood accelerates through it.', 'Se forma un estrechamiento en la valvula (estenosis aortica) o a lo largo del arco (coartacion), y la sangre se acelera a traves de el.') },
                  { title: pick(lang, 'The pressure drop decides treatment', 'La caida de presion decide el tratamiento'), body: pick(lang, 'The gradient across the narrowing is the quantity that sends a patient to valve replacement or a stent.', 'El gradiente a traves del estrechamiento es la cantidad que envia a un paciente a un recambio valvular o a un stent.') },
                  { title: pick(lang, 'The reference is invasive', 'La referencia es invasiva'), body: pick(lang, 'The truth is a pressure wire threaded across the narrowing at catheterization. The routine substitute reads the whole gradient off one Doppler peak velocity through 4 Vmax squared, which overestimated a validated case by 66 mmHg (about 80%) at moderate stenosis with a small aorta (Baumgartner 1999).', 'La verdad es un cable de presion pasado a traves del estrechamiento en el cateterismo. El sustituto de rutina lee todo el gradiente de una sola velocidad pico Doppler con 4 Vmax al cuadrado, que sobreestimo un caso validado en 66 mmHg (cerca del 80%) con estenosis moderada y aorta pequena (Baumgartner 1999).') },
                  { title: pick(lang, '4D-flow plus Navier-Stokes', '4D-flow mas Navier-Stokes'), body: pick(lang, '4D-flow measures the full 3D velocity non-invasively; Navier-Stokes ties that velocity to a spatially resolved pressure field this scan recovers, one that sees the proximal velocity and the spatial acceleration a single Doppler number cannot.', 'El 4D-flow mide la velocidad 3D completa de forma no invasiva; Navier-Stokes liga esa velocidad a un campo de presion espacialmente resuelto que este escaneo recupera, uno que ve la velocidad proximal y la aceleracion espacial que un solo numero Doppler no puede.') },
                ]} />
            </div>
          </div>
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
      content: tr && (
        <section>
          <h2>{pick(lang, 'What we measure, and what we recover', 'Que medimos y que recuperamos')}</h2>
          <p className="measure">{pick(lang,
            'The scanner records the three-component blood velocity, observable, per voxel and per frame. Pressure never appears in the scan; it is the hidden field we recover. Drag the divider: left is what the scanner sees (speed), right is what it cannot (relative pressure). Pick a point to mark the same location on both sides.',
            'El escaner registra la velocidad sanguinea de tres componentes, observable, por voxel y por cuadro. La presion nunca aparece en el escaneo; es el campo oculto que recuperamos. Arrastra el divisor: la izquierda es lo que ve el escaner (rapidez), la derecha lo que no puede ver (presion relativa). Elige un punto para marcar la misma ubicacion en ambos lados.')}</p>
          {(() => {
            const sVals = tr.speed_ms_peak;
            const pVals = tr.pressure_mmHg;
            const sRange = robustRange(sVals, false);
            const pRange = robustRange(pVals, true);
            return (
              <div className="hero-rail">
                <Juxtapose height={420}
                  leftLabel={pick(lang, 'Measured speed (m/s)', 'Rapidez medida (m/s)')}
                  rightLabel={pick(lang, 'Recovered pressure (mmHg)', 'Presion recuperada (mmHg)')}
                  left={<FieldView3D vertices={tr.points_mm} values={sVals} signed={false} range={sRange}
                    pickedNode={pickedT} onPick={setPickedT} pointSize={4}
                    legendLabel={pick(lang, 'Speed', 'Rapidez')} unit="m/s"
                    srSummary={pick(lang, `Measured speed at peak systole on the aortic lumen; range ${sRange.lo.toFixed(2)} to ${sRange.hi.toFixed(2)} m/s.`, `Rapidez medida en sistole pico sobre el lumen aortico; rango ${sRange.lo.toFixed(2)} a ${sRange.hi.toFixed(2)} m/s.`)} />}
                  right={<FieldView3D vertices={tr.points_mm} values={pVals} signed={true} range={pRange}
                    pickedNode={pickedT} onPick={setPickedT} pointSize={4}
                    legendLabel={pick(lang, 'Relative pressure', 'Presion relativa')} unit="mmHg"
                    srSummary={pick(lang, `Recovered relative pressure at peak systole on the aortic lumen; range ${pRange.lo.toFixed(2)} to ${pRange.hi.toFixed(2)} mmHg.`, `Presion relativa recuperada en sistole pico sobre el lumen aortico; rango ${pRange.lo.toFixed(2)} a ${pRange.hi.toFixed(2)} mmHg.`)} />}
                />
                <div className="hero-rail-side">
                  <HoverMathEq
                    tex={String.raw`\mathbf{v}(\mathbf{x},t)\in\mathbb{R}^3 \;\;\Longrightarrow\;\; p(\mathbf{x},t)`}
                    terms={[
                      { tex: String.raw`\mathbf{v}`, meaning: pick(lang, 'measured blood velocity, 3 components per voxel per frame (m/s)', 'velocidad sanguinea medida, 3 componentes por voxel por cuadro (m/s)') },
                      { tex: String.raw`\mathbb{R}^3`, meaning: pick(lang, 'three directional components, the full velocity vector the scanner encodes', 'tres componentes direccionales, el vector de velocidad completo que codifica el escaner') },
                      { tex: 'p', meaning: pick(lang, 'relative pressure to recover (mmHg); only differences are physical', 'presion relativa a recuperar (mmHg); solo las diferencias son fisicas') },
                    ]}
                    caption={pick(lang, 'The measured three-directional velocity maps to the unmeasured relative pressure through the fluid equations.', 'La velocidad medida en tres direcciones se mapea a la presion relativa no medida a traves de las ecuaciones de fluidos.')} />
                  <dl className="def-grid">
                    <dt>{'v(x,t)'}</dt><dd>{pick(lang, 'measured blood velocity (m/s), 3 components per voxel over the beat', 'velocidad sanguinea medida (m/s), 3 componentes por voxel durante el latido')}</dd>
                    <dt>{'p(x,t)'}</dt><dd>{pick(lang, 'relative pressure to recover (mmHg); only differences are physical', 'presion relativa a recuperar (mmHg); solo las diferencias son fisicas')}</dd>
                    <dt>venc</dt><dd>{pick(lang, 'velocity-encoding limit of the scan (120 cm/s here); speeds above it alias', 'limite de codificacion de velocidad del escaneo (120 cm/s aqui); las velocidades por encima se pliegan')}</dd>
                  </dl>
                </div>
              </div>
            );
          })()}
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
          <p className="measure">{pick(lang,
            'Blood in a large artery is an incompressible Newtonian fluid, so it obeys the incompressible Navier-Stokes equations. Step through the derivation: taking the divergence of the momentum balance turns it into a well-posed Poisson equation for pressure, built entirely from the measured velocity.',
            'La sangre en una arteria grande es un fluido newtoniano incompresible, asi que obedece las ecuaciones de Navier-Stokes incompresibles. Recorre la derivacion: tomar la divergencia del balance de momento la convierte en una ecuacion de Poisson bien planteada para la presion, construida enteramente desde la velocidad medida.')}</p>
          <div className="hero-rail">
            <DerivationStepper
              ariaLabel={pick(lang, 'Navier-Stokes to pressure-Poisson derivation', 'Derivacion Navier-Stokes a Poisson de presion')}
              prevLabel={pick(lang, 'Prev', 'Anterior')} nextLabel={pick(lang, 'Next', 'Siguiente')}
              stepLabel={(c, t) => pick(lang, `step ${c} of ${t}`, `paso ${c} de ${t}`)}
              steps={[
                { tex: String.raw`\rho,\ \mu = \text{const}, \qquad \nabla\cdot\mathbf{v}=0`, caption: pick(lang, 'Incompressible Newtonian fluid: constant density and viscosity, and a divergence-free velocity.', 'Fluido newtoniano incompresible: densidad y viscosidad constantes, y una velocidad de divergencia cero.') },
                { tex: String.raw`\rho\Big(\partial_t \mathbf{v} + (\mathbf{v}\cdot\nabla)\mathbf{v}\Big) = -\nabla p + \mu\nabla^2\mathbf{v}`, caption: pick(lang, 'Momentum balance ties the pressure gradient to the fluid acceleration and viscous friction.', 'El balance de momento liga el gradiente de presion a la aceleracion del fluido y la friccion viscosa.') },
                { tex: String.raw`\nabla\cdot(\partial_t\mathbf{v})=0, \qquad \nabla\cdot(\nabla^2\mathbf{v})=0`, caption: pick(lang, 'Take the divergence of the momentum equation; incompressibility kills the unsteady and viscous divergences. Predict what survives.', 'Toma la divergencia de la ecuacion de momento; la incompresibilidad anula las divergencias no estacionaria y viscosa. Predice que sobrevive.') },
                { tex: String.raw`\nabla^2 p = -\rho\,\nabla\cdot\big[(\mathbf{v}\cdot\nabla)\mathbf{v}\big] \equiv S(\mathbf{v})`, caption: pick(lang, 'What survives is a well-posed elliptic Poisson equation whose source is built from the measured velocity, unlike a naive inversion.', 'Lo que sobrevive es una ecuacion de Poisson eliptica bien planteada cuya fuente se construye desde la velocidad medida, a diferencia de una inversion ingenua.') },
                { tex: String.raw`S(\mathbf{v}) = -\rho\sum_{i,j}\frac{\partial v_i}{\partial x_j}\frac{\partial v_j}{\partial x_i}`, caption: pick(lang, 'The source is quadratic in the velocity gradients, so noise in v is amplified, which motivates the divergence-free denoising in the next tab.', 'La fuente es cuadratica en los gradientes de velocidad, asi que el ruido en v se amplifica, lo que motiva el suavizado sin divergencia de la siguiente pestana.') },
                { tex: String.raw`\partial_n p = \mathbf{b}(\mathbf{v})\cdot\mathbf{n} \quad \text{on the vessel wall}`, caption: pick(lang, 'The wall boundary flux is set by the momentum equation at the vessel wall (a Neumann condition).', 'El flujo de frontera en la pared lo fija la ecuacion de momento en la pared del vaso (una condicion Neumann).') },
              ]} />
            <div className="hero-rail-side">
              <HoverMathEq
                tex={String.raw`\nabla^2 p = S(\mathbf{v})`}
                terms={[
                  { tex: String.raw`\nabla^2`, meaning: pick(lang, 'the Laplacian, the elliptic spatial operator that makes the problem well-posed', 'el Laplaciano, el operador espacial eliptico que hace el problema bien planteado') },
                  { tex: 'p', meaning: pick(lang, 'relative pressure (mmHg), the unknown we solve for', 'presion relativa (mmHg), la incognita que resolvemos') },
                  { tex: String.raw`S(\mathbf{v})`, meaning: pick(lang, 'the Poisson source, a product of measured velocity derivatives (rho = 1060 kg/m^3)', 'la fuente de Poisson, un producto de derivadas de la velocidad medida (rho = 1060 kg/m^3)') },
                ]}
                caption={pick(lang, 'A single elliptic Poisson equation: solve it and out comes the relative pressure field.', 'Una sola ecuacion de Poisson eliptica: resuelvela y sale el campo de presion relativa.')} />
            </div>
          </div>
          <dl className="def-grid">
            <dt>{'ρ, μ'}</dt><dd>{pick(lang, 'blood density 1060 kg/m^3, dynamic viscosity 0.0035 Pa s', 'densidad de la sangre 1060 kg/m^3, viscosidad dinamica 0.0035 Pa s')}</dd>
            <dt>{'S(v)'}</dt><dd>{pick(lang, 'the Poisson source, a product of velocity derivatives', 'la fuente de Poisson, un producto de derivadas de velocidad')}</dd>
            <dt>{'∂p/∂n'}</dt><dd>{pick(lang, 'the Neumann boundary flux, set by the momentum equation at the vessel wall', 'el flujo Neumann de frontera, fijado por la ecuacion de momento en la pared del vaso')}</dd>
          </dl>
          <PpeSvg lang={lang} />
          <Refs ids={['krittian2012', 'raissi2020']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'traditional', label: pick(lang, 'Traditional approach', 'Enfoque tradicional'),
      content: tr && (
        <section>
          <h2>{pick(lang, 'The clinical standard: simplified Bernoulli', 'El estandar clinico: Bernoulli simplificado')}</h2>
          <p className="measure">{pick(lang,
            'Routine cardiology does not compute the gradient from the whole velocity field; it reads it off one peak velocity. Drag Vmax and the inflow velocity V1: the simplified form 4 Vmax^2 and the expanded form 4(Vmax^2 - V1^2) diverge once inflow is fast, and the result is one scalar, never a map.',
            'La cardiologia de rutina no calcula el gradiente desde el campo de velocidad completo; lo lee de una sola velocidad pico. Arrastra Vmax y la velocidad de entrada V1: la forma simplificada 4 Vmax^2 y la ampliada 4(Vmax^2 - V1^2) divergen cuando la entrada es rapida, y el resultado es un escalar, nunca un mapa.')}</p>
          <HoverMathEq
            tex={String.raw`\Delta p \;\approx\; 4\,V_{\max}^2 \qquad (\text{mmHg},\; V\text{ in m/s})`}
            terms={[
              { tex: String.raw`\Delta p`, meaning: pick(lang, 'the estimated pressure gradient across the narrowing (mmHg)', 'el gradiente de presion estimado a traves del estrechamiento (mmHg)') },
              { tex: String.raw`V_{\max}`, meaning: pick(lang, 'the single peak jet velocity (m/s); the only input this reads', 'la unica velocidad pico del chorro (m/s); la unica entrada que lee') },
              { tex: '4', meaning: pick(lang, 'the constant that folds in blood density and unit conversion to mmHg', 'la constante que incorpora la densidad de la sangre y la conversion a mmHg') },
            ]}
            caption={pick(lang, 'The whole gradient is read off one peak velocity: fast, ubiquitous, and blind to everything the peak velocity does not capture.', 'Todo el gradiente se lee de una sola velocidad pico: rapido, ubicuo, y ciego a todo lo que la velocidad pico no captura.')} />
          <div className="viz-stack">
              <div className="viz-controls">
                <label className="muted small" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  Vmax
                  <input className="scrub" type="range" min={0} max={6} step={0.05} value={vmaxT} onChange={(e) => setVmaxT(Number(e.target.value))} aria-label={pick(lang, 'Peak jet velocity', 'Velocidad pico del chorro')} />
                </label>
                <span className="muted small" style={{ fontFamily: 'var(--mono, monospace)' }}>{vmaxT.toFixed(2)}</span>
              </div>
              <div className="viz-controls">
                <label className="muted small" style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  V1
                  <input className="scrub" type="range" min={0} max={3} step={0.05} value={v1T} onChange={(e) => setV1T(Number(e.target.value))} aria-label={pick(lang, 'Inflow velocity', 'Velocidad de entrada')} />
                </label>
                <span className="muted small" style={{ fontFamily: 'var(--mono, monospace)' }}>{v1T.toFixed(2)}</span>
              </div>
              <UPlotChart height={230}
                data={[VMAX_XS, VMAX_XS.map((x) => 4 * x * x), VMAX_XS.map((x) => Math.max(0, 4 * (x * x - v1T * v1T))), VMAX_XS.map(() => SEVERE_MEAN)]}
                series={[
                  { label: 'simplified 4Vmax^2', stroke: 'var(--accent)', width: 2 },
                  { label: 'expanded 4(Vmax^2-V1^2)', stroke: 'var(--accent-2)', width: 2, dash: [6, 3] },
                  { label: 'severe', stroke: 'var(--muted)', width: 1.4, dash: [5, 4] },
                ]}
                xLabel="Vmax (m/s)" yLabel="mmHg"
                markers={[{ x: vmaxT, y: 4 * vmaxT * vmaxT, color: 'var(--accent-2)', label: pick(lang, 'now', 'ahora') }]}
                ariaLabel={pick(lang, `Simplified vs expanded Bernoulli; at Vmax ${vmaxT.toFixed(2)} m/s and inflow ${v1T.toFixed(2)} m/s the simplified estimate is ${(4 * vmaxT * vmaxT).toFixed(1)} mmHg and the expanded is ${Math.max(0, 4 * (vmaxT * vmaxT - v1T * v1T)).toFixed(1)} mmHg`, `Bernoulli simplificado vs ampliado; en Vmax ${vmaxT.toFixed(2)} m/s y entrada ${v1T.toFixed(2)} m/s el estimado simplificado es ${(4 * vmaxT * vmaxT).toFixed(1)} mmHg y el ampliado ${Math.max(0, 4 * (vmaxT * vmaxT - v1T * v1T)).toFixed(1)} mmHg`)} />
              <p className="sr-summary">{pick(lang,
                `At Vmax ${vmaxT.toFixed(2)} m/s and inflow ${v1T.toFixed(2)} m/s, the simplified form reads ${(4 * vmaxT * vmaxT).toFixed(1)} mmHg while the expanded form reads ${Math.max(0, 4 * (vmaxT * vmaxT - v1T * v1T)).toFixed(1)} mmHg. Dropping the inflow velocity overstates the gradient once V1 exceeds about 1.5 m/s.`,
                `En Vmax ${vmaxT.toFixed(2)} m/s y entrada ${v1T.toFixed(2)} m/s, la forma simplificada da ${(4 * vmaxT * vmaxT).toFixed(1)} mmHg mientras la ampliada da ${Math.max(0, 4 * (vmaxT * vmaxT - v1T * v1T)).toFixed(1)} mmHg. Descartar la velocidad de entrada sobreestima el gradiente cuando V1 supera cerca de 1.5 m/s.`)}</p>
          </div>
          <div className="two-col">
            <div>
              <span className="cp-side-label">{pick(lang, 'What 4 Vmax^2 discards', 'Lo que descarta 4 Vmax^2')}</span>
              <dl className="def-grid">
                <dt>{pick(lang, 'inflow velocity', 'velocidad de entrada')}</dt><dd>{pick(lang, 'overstates the gradient once outflow exceeds about 1.5 m/s', 'sobreestima el gradiente cuando la salida supera cerca de 1.5 m/s')}</dd>
                <dt>{pick(lang, 'viscous friction', 'friccion viscosa')}</dt><dd>{pick(lang, 'irreversible loss the convective term ignores', 'perdida irreversible que el termino convectivo ignora')}</dd>
                <dt>{pick(lang, 'unsteady acceleration', 'aceleracion no estacionaria')}</dt><dd>{pick(lang, 'the dv/dt term lost at coarse temporal resolution (Hardy 2025)', 'el termino dv/dt perdido a resolucion temporal gruesa (Hardy 2025)')}</dd>
                <dt>{pick(lang, 'pressure recovery', 'recuperacion de presion')}</dt><dd>{pick(lang, 'Doppler overestimates the net catheter gradient, worst in a small aorta', 'el Doppler sobreestima el gradiente neto por cateter, peor en una aorta pequena')}</dd>
              </dl>
            </div>
            <div>
              <span className="cp-side-label">{pick(lang, 'On this scan, Bernoulli vs the physics map', 'En este escaneo, Bernoulli vs el mapa fisico')}</span>
              <BracketBar label={pick(lang, 'Bernoulli 4Vmax^2', 'Bernoulli 4Vmax^2')} value={tr.metrics.bernoulli_mmHg} unit="mmHg" max={3} color="var(--accent-2)" />
              <BracketBar label={pick(lang, 'PPE pressure span', 'rango de presion PPE')} value={tr.metrics.ppe_pressure_drop_mmHg} unit="mmHg" max={3} color="var(--good)" />
              <p className="muted small" style={{ margin: 0 }}>{pick(lang, 'Same order of magnitude on this clean aorta (0.791 m/s -> 2.51 vs 0.79 mmHg); they bracket each other.', 'Mismo orden de magnitud en esta aorta limpia (0.791 m/s -> 2.51 vs 0.79 mmHg); se encuadran mutuamente.')}</p>
            </div>
          </div>
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
      content: tr && (
        <section>
          <h2>{pick(lang, 'Where and how the physics-informed method helps', 'Donde y como ayuda el metodo informado por fisica')}</h2>
          <p className="measure">{pick(lang,
            'The pressure-Poisson source is quadratic in velocity gradients, so raw noise (which violates incompressibility) is amplified into a non-physiological pressure. The pipeline separates a well-posed velocity denoising from the elliptic pressure solve. Hover or click a stage to inspect it.',
            'La fuente de la Poisson de presion es cuadratica en los gradientes de velocidad, asi que el ruido crudo (que viola la incompresibilidad) se amplifica en una presion no fisiologica. El pipeline separa un suavizado de velocidad bien planteado de la resolucion eliptica de presion. Pasa el cursor o haz clic en una etapa para inspeccionarla.')}</p>
          <PipelineSvg animate onSelect={(id) => setPipeSel((s) => (s === id ? null : id))} selected={pipeSel}
              playLabel={pick(lang, 'Play flow', 'Reproducir flujo')}
              captionEmpty={pick(lang, 'Hover or focus a stage to inspect it.', 'Pasa el cursor o enfoca una etapa para inspeccionarla.')}
              ariaLabel={pick(lang, 'Physics-informed pressure pipeline', 'Pipeline de presion informado por fisica')}
              stages={[
                { id: 'v', kind: 'in', label: pick(lang, 'measured v', 'v medida'), sub: pick(lang, 'noisy, div v != 0', 'ruidosa, div v != 0'), detail: pick(lang, 'the raw 4D-flow velocity violates incompressibility; feeding it straight into the quadratic source amplifies noise.', 'la velocidad 4D-flow cruda viola la incompresibilidad; alimentarla directo a la fuente cuadratica amplifica el ruido.') },
                { id: 'denoise', kind: 'proc', label: pick(lang, 'div-free denoise', 'denoise sin divergencia'), sub: 'min data + lambda||div v||^2', detail: pick(lang, 'velocity is strongly data-constrained so this step is well-posed; a plain momentum-residual net is gauge-free and cannot recover pressure at all.', 'la velocidad esta fuertemente restringida por los datos, asi que este paso esta bien planteado; una red de residuo de momento simple no tiene calibre y no puede recuperar la presion.') },
                { id: 'source', kind: 'proc', label: pick(lang, 'analytic source', 'fuente analitica'), sub: 'S(v) + Neumann flux', detail: pick(lang, 'analytic derivatives at the wall remove the boundary artifacts that finite differences at the lumen edge would create.', 'las derivadas analiticas en la pared eliminan los artefactos de frontera que las diferencias finitas en el borde del lumen crearian.') },
                { id: 'solve', kind: 'proc', label: pick(lang, 'Poisson solve', 'resolver Poisson'), sub: 'lap p = S(v)', detail: pick(lang, 'a sparse direct elliptic solve; well-posed, unlike a naive inversion of the transfer.', 'una resolucion eliptica directa dispersa; bien planteada, a diferencia de una inversion ingenua.') },
                { id: 'p', kind: 'out', label: pick(lang, 'relative pressure', 'presion relativa'), sub: 'p(x)', detail: pick(lang, 'the recovered field, physiological on the real scan and gated on an analytic case first.', 'el campo recuperado, fisiologico en el escaneo real y validado antes en un caso analitico.') },
              ]} />
          <div className="fig-row">
              <HoverMathEq
                tex={String.raw`\min_{\theta}\; \lVert \mathbf{v}_\theta - \mathbf{v}^{\text{meas}}\rVert^2 + \lambda\,\lVert \nabla\cdot\mathbf{v}_\theta\rVert^2 \;\Rightarrow\; \nabla^2 p = S(\mathbf{v}_\theta)`}
                terms={[
                  { tex: String.raw`\lVert \mathbf{v}_\theta - \mathbf{v}^{\text{meas}}\rVert^2`, meaning: pick(lang, 'data misfit: the network must reproduce the measured velocity', 'desajuste a datos: la red debe reproducir la velocidad medida') },
                  { tex: String.raw`\lambda\,\lVert \nabla\cdot\mathbf{v}_\theta\rVert^2`, meaning: pick(lang, 'incompressibility penalty: drives the denoised field divergence-free', 'penalizacion de incompresibilidad: lleva el campo suavizado a divergencia cero') },
                  { tex: String.raw`\nabla^2 p = S(\mathbf{v}_\theta)`, meaning: pick(lang, 'the elliptic Poisson solve on the clean analytic derivatives returns the pressure', 'la resolucion eliptica de Poisson sobre las derivadas analiticas limpias devuelve la presion') },
                ]}
                caption={pick(lang, 'A divergence-free network denoises the velocity; its analytic derivatives build the source, then a sparse solve returns the pressure.', 'Una red sin divergencia limpia la velocidad; sus derivadas analiticas construyen la fuente, luego una resolucion dispersa devuelve la presion.')} />
              <StatStrip tiles={[
                { value: `${tr.metrics.div_raw_per_s} /s`, label: pick(lang, 'raw incompressibility residual |div v|', 'residuo de incompresibilidad crudo |div v|') },
                { value: `${tr.metrics.div_denoised_per_s} /s`, label: pick(lang, 'after the divergence-free denoise', 'tras el suavizado sin divergencia') },
                { value: `${tr.metrics.div_reduction_x}x`, label: pick(lang, 'reduction; keeps the quadratic source from amplifying noise', 'reduccion; evita que la fuente cuadratica amplifique el ruido') },
              ]} />
          </div>
          <p className="measure">{pick(lang,
            'This is the hidden-fluid-mechanics idea, learning the pressure a flow implies while the measured velocity drives the fit, made robust for real noisy 4D-flow by separating the well-posed velocity denoising from the elliptic pressure solve.',
            'Esta es la idea de la mecanica de fluidos oculta, aprender la presion que un flujo implica mientras la velocidad medida guia el ajuste, hecha robusta para el flujo 4D real ruidoso separando el suavizado de velocidad bien planteado de la resolucion eliptica de presion.')}
            {' '}<Cite id="raissi2020" /> <Cite id="raissi2019" /></p>
          <div className="chip-wrap">
            <span className="chip" title={pick(lang, 'pressure-Poisson by finite elements over the segmented lumen', 'Poisson de presion por elementos finitos sobre el lumen segmentado')}>PPE (Ebbers 2001; Krittian 2012)</span>
            <span className="chip" title={pick(lang, 'work-energy relative pressure, sidesteps the noise-sensitive gradient product', 'presion relativa por trabajo-energia, evita el producto de gradientes sensible al ruido')}>WERP / vWERP (Donati 2015; Marlevi 2019)</span>
            <span className="chip" title={pick(lang, 'physics as a training regularizer, one inverse problem', 'fisica como regularizador de entrenamiento, un solo problema inverso')}>PINN (Kissas 2020; Fathi 2020)</span>
            <span className="chip" title={pick(lang, 'divergence-free interpolation, the solenoidal projection made analytic', 'interpolacion sin divergencia, la proyeccion solenoidal hecha analitica')}>solenoidal projection (Ong 2015)</span>
            <span className="chip" title={pick(lang, 'no single estimator wins; all underestimate the transient peak at coarse temporal resolution', 'ningun estimador gana; todos subestiman el pico transitorio a resolucion temporal gruesa')}>head-to-head (Hardy 2025)</span>
          </div>
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

  if (loadError || !tr) {
    return (
      <div className="cardiopinn-layout prose">
        <div className="cp-main" style={{ gridColumn: '1 / -1' }}>
          <div className="page-head"><h1>{pick(lang, 'Real 4D-flow: recovering the aortic pressure field', 'Flujo 4D real: recuperar el campo de presion aortica')}</h1></div>
          <div className="panel" role="status" style={{ marginTop: 16 }}>
            {loadError
              ? pick(lang, `The 4D-flow trace could not be loaded (${loadError}). If you just deployed, hard-refresh once; the web reads a committed JSON trace.`, `No se pudo cargar el trace de flujo 4D (${loadError}). Si acabas de desplegar, recarga forzado una vez; la web lee un trace JSON versionado.`)
              : pick(lang, 'Loading the 4D-flow trace...', 'Cargando el trace de flujo 4D...')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cardiopinn-layout prose">
      <aside className="cp-side">
        <div className="cp-side-inner">
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
            <div className="cp-side-foot">{pick(lang,
              'Real thoracic-aorta 4D-flow MRI: the aortic pressure field recovered from the measured velocity by incompressible Navier-Stokes. The field toggle, phase scrubber and point-pick live in the Pressure recovery tab.',
              'Resonancia real de aorta toracica 4D-flow: el campo de presion aortica recuperado de la velocidad medida por Navier-Stokes incompresible. El campo, la fase y la seleccion de punto estan en la pestana Recuperacion de presion.')}</div>
          </>
        )}
        </div>
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
