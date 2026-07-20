import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Tabs, type TabDef, Callout, InlineMath, Refs, Cite } from '@fasl-work/caos-app-shell';
import { FieldView3D } from '../kits/FieldView3D';
import { UPlotChart } from '../kits/UPlotChart';
import { StatStrip } from '../kits/StatStrip';
import { ClinicalStepper } from '../kits/ClinicalStepper';
import { DerivationStepper } from '../kits/DerivationStepper';
import { HoverMathEq } from '../kits/HoverMathEq';
import { PipelineSvg } from '../kits/PipelineSvg';

// range for the current field/frame; signed potential fields are centred at 0 and use the diverging map
function fieldStats(vals: number[], signed: boolean): { lo: number; hi: number } {
  let lo = Infinity, hi = -Infinity;
  for (const v of vals) { if (v < lo) lo = v; if (v > hi) hi = v; }
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  if (signed) { const m = Math.max(Math.abs(lo), Math.abs(hi)) || 1; lo = -m; hi = m; }
  if (hi === lo) hi = lo + 1;
  return { lo, hi };
}
const isSigned = (field: string) => field === 'recovered_mV' || field === 'measured_mV';
import { useLang, pick } from '../store';
import { APP_VERSION } from '../lib/version';

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
  'human-tank': ['Human heart, torso tank', 'Corazón humano, tanque de torso'],
  'dog-insitu': ['Dog heart, in situ', 'Corazón de perro, in situ'],
};
const BEAT_LABEL: Record<string, [string, string]> = {
  sinus: ['sinus rhythm', 'ritmo sinusal'],
  'paced-pvp': ['paced (PVP)', 'marcapaso (PVP)'],
  'paced-avp': ['paced (AVP)', 'marcapaso (AVP)'],
};

const FIELDS = ['recovered_mV', 'measured_mV', 'abs_error_mV', 'uncertainty_mV'];
const FIELD_LABEL: Record<string, [string, string]> = {
  recovered_mV: ['Recovered (our result)', 'Recuperado (nuestro resultado)'],
  measured_mV: ['Measured (real gold standard)', 'Medido (patrón de oro real)'],
  abs_error_mV: ['Absolute error', 'Error absoluto'],
  uncertainty_mV: ['Uncertainty (per node)', 'Incertidumbre (por nodo)'],
};


// A theme-aware SVG of the ECGi forward + inverse chain (colors via CSS variables so it repaints with the theme).
function ForwardSvg({ lang, nBody = 192, nHeart = 256 }: { lang: 'en' | 'es'; nBody?: number; nHeart?: number }) {
  return (
    <div className="fig-svg">
      <svg viewBox="0 0 620 200" role="img">
        <ellipse cx="150" cy="100" rx="120" ry="80" fill="none" stroke="var(--border)" strokeWidth="2" />
        <text x="150" y="30" textAnchor="middle" fill="var(--muted)" fontSize="12">{pick(lang, 'torso (volume conductor)', 'torso (conductor de volumen)')}</text>
        <ellipse cx="150" cy="105" rx="42" ry="34" fill="color-mix(in srgb, var(--accent) 22%, transparent)" stroke="var(--accent)" strokeWidth="2" />
        <text x="150" y="108" textAnchor="middle" fill="var(--fg)" fontSize="11">heart</text>
        <text x="150" y="122" textAnchor="middle" fill="var(--accent)" fontSize="10">phi_heart ({nHeart})</text>
        {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={150 + 120 * Math.cos((i / 6) * 6.28)} cy={100 + 80 * Math.sin((i / 6) * 6.28)} r="4" fill="var(--accent-2)" />)}
        <text x="150" y="185" textAnchor="middle" fill="var(--accent-2)" fontSize="10">phi_body ({nBody})</text>
        <path d="M280 100 H360" stroke="var(--good)" strokeWidth="2" markerEnd="url(#a)" />
        <text x="320" y="90" textAnchor="middle" fill="var(--good)" fontSize="11">A (forward)</text>
        <path d="M360 130 H280" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#a)" />
        <text x="320" y="152" textAnchor="middle" fill="var(--accent)" fontSize="11">{pick(lang, 'inverse (ill-posed)', 'inverso (mal planteado)')}</text>
        <rect x="380" y="70" width="220" height="70" rx="8" fill="var(--panel-2)" stroke="var(--border)" />
        <text x="490" y="95" textAnchor="middle" fill="var(--fg)" fontSize="11">{pick(lang, 'regularize + physics prior', 'regularizar + prior físico')}</text>
        <text x="490" y="115" textAnchor="middle" fill="var(--fg)" fontSize="11">{pick(lang, '+ ensemble uncertainty', '+ incertidumbre por ensemble')}</text>
        <text x="490" y="132" textAnchor="middle" fill="var(--muted)" fontSize="10">{pick(lang, 'recover phi_heart', 'recuperar phi_heart')}</text>
        <defs><marker id="a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor" /></marker></defs>
      </svg>
      <div className="fig-cap">{pick(lang, 'The torso as a volume conductor: the heart-surface potentials map forward to the body surface by a linear operator A; recovering them is the ill-posed inverse.', 'El torso como conductor de volumen: los potenciales de superficie cardíaca se mapean hacia adelante a la superficie corporal por un operador lineal A; recuperarlos es el inverso mal planteado.')}</div>
    </div>
  );
}

// A compact annotated schematic (step-coupled): a low-dimensional skin projection cannot pin a 3D focus, so
// several heart-surface foci (A, B, C) map to near-identical lead traces (the many-to-one, ill-posed idea).
function TwelveLeadSvg({ lang, step }: { lang: 'en' | 'es'; step: number }) {
  const em = (s: number) => (step === s ? 1 : 0.32);
  const foci: [number, number][] = [[150, 92], [176, 112], [128, 118]];
  return (
    <div className="fig-svg wide">
      <svg viewBox="0 0 620 250" role="img">
        <ellipse cx="150" cy="120" rx="120" ry="96" fill="none" stroke="var(--border)" strokeWidth="2" />
        <text x="150" y="24" textAnchor="middle" fill="var(--muted)" fontSize="12">{pick(lang, 'torso', 'torso')}</text>
        <g opacity={Math.max(em(0), em(1))}>
          <ellipse cx="150" cy="112" rx="46" ry="38" fill="color-mix(in srgb, var(--accent) 18%, transparent)" stroke="var(--accent)" strokeWidth="2" />
          <text x="150" y="66" textAnchor="middle" fill="var(--accent)" fontSize="11">{pick(lang, 'heart (3D source)', 'corazón (fuente 3D)')}</text>
        </g>
        {foci.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="6" fill="var(--accent-2)" opacity={step === 1 && i === 0 ? 1 : 0.7} />
            <text x={x} y={y - 9} textAnchor="middle" fill="var(--fg)" fontSize="10">{['A', 'B', 'C'][i]}</text>
          </g>
        ))}
        {step === 1 && <circle cx={foci[0][0]} cy={foci[0][1]} r="12" fill="none" stroke="var(--warn)" strokeWidth="2" />}
        {step === 1 && <text x={foci[0][0]} y={foci[0][1] + 28} textAnchor="middle" fill="var(--warn)" fontSize="10">{pick(lang, 'ablation target', 'objetivo de ablación')}</text>}
        <g opacity={em(2)}>
          {foci.map(([x, y], i) => <path key={i} d={`M ${x} ${y} L 300 200`} stroke="var(--muted)" strokeWidth="1" strokeDasharray="3 3" />)}
          <line x1="300" y1="200" x2="470" y2="200" stroke="var(--border)" strokeWidth="2" />
          {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={310 + i * 38} cy="200" r="4" fill="var(--accent-2)" />)}
          <text x="385" y="222" textAnchor="middle" fill="var(--muted)" fontSize="10">{pick(lang, '8 independent leads', '8 derivaciones independientes')}</text>
        </g>
        <g opacity={em(2)} transform="translate(300,44)">
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(0, ${i * 34})`}>
              <path d="M0 16 q 15 -14 30 0 q 15 22 30 0 q 15 -8 30 0 q 40 0 80 0" fill="none" stroke="var(--accent)" strokeWidth="1.6" />
              <text x="185" y="18" fill="var(--fg)" fontSize="10">{['A', 'B', 'C'][i]}</text>
            </g>
          ))}
          <text x="0" y="-8" fill="var(--muted)" fontSize="10">{pick(lang, 'A, B, C: near-identical traces', 'A, B, C: trazas casi idénticas')}</text>
        </g>
        <g opacity={em(3)}>
          <path d="M470 190 C 360 150, 250 150, 202 122" stroke="var(--good)" strokeWidth="2" fill="none" markerEnd="url(#tl-a)" />
          <text x="330" y="140" textAnchor="middle" fill="var(--good)" fontSize="11">{pick(lang, 'ECGi: reconstruct the whole surface', 'ECGi: reconstruir toda la superficie')}</text>
        </g>
        <defs><marker id="tl-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor" /></marker></defs>
      </svg>
      <div className="fig-cap">{pick(lang,
        'Twelve leads are only eight independent signals: a low-dimensional projection of a 3D field onto a few skin points. Different heart-surface foci (A, B, C) produce near-identical lead traces, so the 12-lead cannot resolve a precise 3D site; ECGi instead reconstructs the whole surface.',
        'Doce derivaciones son solo ocho señales independientes: una proyección de baja dimensión de un campo 3D sobre unos pocos puntos de piel. Distintos focos de superficie cardíaca (A, B, C) producen trazas casi idénticas, así que el ECG de 12 derivaciones no resuelve un sitio 3D preciso; el ECGi en cambio reconstruye toda la superficie.')}</div>
    </div>
  );
}

// Coupled control-volume schematic for the volume-conduction derivation; the highlighted region tracks the
// derivation step (Ohmic flux -> divergence-free volume -> boundaries -> transfer matrix -> singular-value decay).
function ControlVolumeSvg({ lang, step }: { lang: 'en' | 'es'; step: number }) {
  const on = (lo: number, hi: number) => (step >= lo && step <= hi ? 1 : 0.3);
  return (
    <div className="fig-svg wide">
      <svg viewBox="0 0 620 240" role="img">
        <ellipse cx="230" cy="120" rx="200" ry="104" fill="none" stroke="var(--border)" strokeWidth="2" opacity={on(3, 5)} />
        <text x="230" y="28" textAnchor="middle" fill="var(--muted)" fontSize="12">{'Ω'} {pick(lang, '(torso)', '(torso)')}</text>
        <ellipse cx="180" cy="120" rx="52" ry="42" fill="color-mix(in srgb, var(--accent) 16%, transparent)" stroke="var(--accent)" strokeWidth={step === 3 ? 3 : 2} />
        <text x="180" y="118" textAnchor="middle" fill="var(--accent)" fontSize="11">{'Γ_H'}</text>
        <text x="180" y="134" textAnchor="middle" fill="var(--muted)" fontSize="9">{pick(lang, 'source', 'fuente')}</text>
        <text x="418" y="118" textAnchor="middle" fill={step === 3 ? 'var(--warn)' : 'var(--muted)'} fontSize="11">{'Γ_B'}</text>
        <text x="418" y="134" textAnchor="middle" fill="var(--muted)" fontSize="9">{pick(lang, 'no flux', 'sin flujo')}</text>
        <g opacity={on(0, 2)}>
          <rect x="250" y="96" width="60" height="48" rx="6" fill="none" stroke="var(--accent-2)" strokeWidth="1.6" />
          {[0, 1, 2].map((i) => <path key={i} d={`M 234 ${104 + i * 16} H 326`} stroke="var(--accent-2)" strokeWidth="1.4" markerEnd="url(#cv-a)" />)}
          <text x="280" y="166" textAnchor="middle" fill="var(--accent-2)" fontSize="10">J = -sigma grad phi</text>
        </g>
        <g opacity={step === 4 ? 1 : 0.25}>
          <path d="M232 88 C 320 58, 380 58, 418 90" stroke="var(--good)" strokeWidth="2" fill="none" markerEnd="url(#cv-a)" />
          <text x="325" y="56" textAnchor="middle" fill="var(--good)" fontSize="11">{pick(lang, 'A (heart -> body)', 'A (corazón -> cuerpo)')}</text>
        </g>
        <g opacity={step === 5 ? 1 : 0.25} transform="translate(470,152)">
          {[0, 1, 2, 3, 4, 5].map((i) => { const h = Math.round(46 * Math.exp(-i * 0.6)); return <rect key={i} x={i * 16} y={-h} width="10" height={h} fill="var(--accent)" />; })}
          <text x="48" y="24" textAnchor="middle" fill="var(--muted)" fontSize="10">sigma_k -&gt; 0</text>
        </g>
        <defs><marker id="cv-a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor" /></marker></defs>
      </svg>
    </div>
  );
}

// Schematic L-curve (shape only, not baked reconstruction values): the classical Tikhonov trade-off between the
// data residual and the solution norm, with a reader-movable marker and the corner / oracle lambda annotated.
function LCurveSvg({ lang, t }: { lang: 'en' | 'es'; t: number }) {
  const N = 41;
  const px0 = 74, px1 = 440, py0 = 34, py1 = 250;
  const pts = Array.from({ length: N }, (_, i) => {
    const a = i / (N - 1);
    const x = 0.06 + 0.92 * a * a * a;
    const y = 0.06 + 0.92 * (1 - a) * (1 - a) * (1 - a);
    return [px0 + x * (px1 - px0), py1 - y * (py1 - py0)] as [number, number];
  });
  const poly = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const mi = Math.max(0, Math.min(N - 1, Math.round(t * (N - 1))));
  const oi = Math.round(0.5 * (N - 1));
  return (
    <div className="fig-svg wide">
      <svg viewBox="0 0 480 300" role="img">
        <line className="dg-axis" x1={px0} y1={py0} x2={px0} y2={py1} />
        <line className="dg-axis" x1={px0} y1={py1} x2={px1} y2={py1} />
        <text x={(px0 + px1) / 2} y={286} textAnchor="middle" fill="var(--muted)" fontSize="11">{pick(lang, 'residual norm (log)', 'norma del residuo (log)')}</text>
        <text x="20" y={(py0 + py1) / 2} textAnchor="middle" fill="var(--muted)" fontSize="11" transform={`rotate(-90 20 ${(py0 + py1) / 2})`}>{pick(lang, 'solution norm (log)', 'norma de la solución (log)')}</text>
        <polyline points={poly} fill="none" stroke="var(--accent)" strokeWidth="2.2" />
        <circle cx={pts[oi][0]} cy={pts[oi][1]} r="6" fill="none" stroke="var(--good)" strokeWidth="2" />
        <text x={pts[oi][0] + 12} y={pts[oi][1] - 8} fill="var(--good)" fontSize="10">{pick(lang, 'corner / oracle lambda', 'esquina / lambda oráculo')}</text>
        <text x={pts[3][0] + 8} y={pts[3][1]} fill="var(--warn)" fontSize="10">{pick(lang, 'low lambda: noise amplified', 'lambda bajo: ruido amplificado')}</text>
        <text x={pts[N - 6][0] - 4} y={pts[N - 6][1] + 16} textAnchor="end" fill="var(--muted)" fontSize="10">{pick(lang, 'high lambda: over-smoothed', 'lambda alto: sobre-suavizado')}</text>
        <circle cx={pts[mi][0]} cy={pts[mi][1]} r="7" fill="var(--accent)" stroke="var(--bg, #000)" strokeWidth="1.5" />
        <text x="240" y="20" textAnchor="middle" fill="var(--muted)" fontSize="10">{pick(lang, 'schematic shape only, not baked values', 'solo forma esquemática, no valores precalculados')}</text>
      </svg>
    </div>
  );
}

export function RealEcgi({ selector }: { selector?: ReactNode }) {
  const lang = useLang();
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [caseIdx, setCaseIdx] = useState(0);
  const [beat, setBeat] = useState('sinus');
  const [field, setField] = useState('recovered_mV');
  const [frame, setFrame] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  // per-tab interactive state (recomposed prose tabs)
  const [problemStep, setProblemStep] = useState(0);
  const [tgtFrame, setTgtFrame] = useState(0);
  const [tgtPicked, setTgtPicked] = useState<number | null>(null);
  const [derivStep, setDerivStep] = useState(0);
  const [lambdaPos, setLambdaPos] = useState(0.5);
  const [priorMesh, setPriorMesh] = useState(true);
  const [uqOn, setUqOn] = useState(true);
  const [pipeSel, setPipeSel] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`${BASE}data/real-ecgi-catalogue/catalogue.json?v=${APP_VERSION}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status} loading the ECGi catalogue`); return r.json(); })
      .then((d) => { if (alive) setCat(d); })
      .catch((e) => { if (alive) setLoadError(String(e && e.message ? e.message : e)); });
    return () => { alive = false; };
  }, []);

  const ds = cat ? cat.cases[caseIdx] : null;
  const rd = ds && ds.beats[beat] ? ds.beats[beat] : ds ? ds.beats[Object.keys(ds.beats)[0]] : null;

  const togglePlay = () => {
    if (raf.current) { cancelAnimationFrame(raf.current); raf.current = null; setPlaying(false); return; }
    if (!rd) return;
    setPlaying(true);
    const n = rd.times_ms.length; let start = 0;
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
      id: 'recon', label: pick(lang, 'Reconstruction', 'Reconstrucción'),
      content: cat && ds && rd && (
        <section>
          <h2>{pick(lang, 'The reconstruction, on the real heart geometry', 'La reconstrucción, sobre la geometría cardíaca real')}</h2>
          <p>{pick(lang,
            'The same physics-informed reconstruction is applied across a catalogue of independent real experiments, so the method is not tuned to one heart. The left column picks the dataset (an explanted human heart in a torso tank, 192 body electrodes recovering a 256-electrode cage; or an in-situ dog heart, 140 body electrodes recovering a 1321-node epicardial map), the beat, and the field, and reads the live reconstruction quality against the real gold standard. Each dataset recorded the true heart-surface potentials simultaneously.',
            'La misma reconstrucción informada por física se aplica a un catálogo de experimentos reales independientes, así que el método no está ajustado a un solo corazón. La columna izquierda permite elegir el conjunto de datos (un corazón humano explantado en un tanque de torso, 192 electrodos corporales recuperando una jaula de 256; o un corazón de perro in situ, 140 electrodos recuperando un mapa epicárdico de 1321 nodos), el latido y el campo, y leer la calidad de reconstrucción en vivo contra el patrón de oro real. Cada conjunto registró los potenciales verdaderos de superficie cardíaca simultáneamente.')}</p>
          {(() => {
            const rf = Math.min(frame, rd.times_ms.length - 1);
            const vals = rd.fields_over_time[field][rf];
            const signed = isSigned(field);
            const { lo, hi } = fieldStats(vals, signed);
            const err = rd.fields_over_time.abs_error_mV?.[rf] ?? vals.map(() => 0);
            let mi = 0; for (let i = 1; i < err.length; i++) if (err[i] > err[mi]) mi = i;
            const node = picked ?? mi;
            const rec = rd.fields_over_time.recovered_mV.map((f) => f[node]);
            const meas = rd.fields_over_time.measured_mV.map((f) => f[node]);
            return (
              <div className="hero-rail" style={{ marginTop: 8 }}>
                <FieldView3D
                  key={ds.id + beat}
                  vertices={rd.mesh.vertices} triangles={rd.mesh.triangles}
                  values={vals} signed={signed} range={{ lo, hi }}
                  pickedNode={picked} argmaxNode={mi} onPick={setPicked}
                  legendLabel={pick(lang, FIELD_LABEL[field][0], FIELD_LABEL[field][1])} unit="mV"
                  readout={<>t = {rd.times_ms[rf]} ms · {pick(lang, 'node', 'nodo')} {node} · max|err| {pick(lang, 'node', 'nodo')} {mi}</>}
                  srSummary={pick(lang,
                    `3D heart, ${rd.mesh.n_vertices} nodes, ${FIELD_LABEL[field][0]} at ${rd.times_ms[rf]} ms; range ${lo.toFixed(2)} to ${hi.toFixed(2)} mV; ensemble relative error ${rd.metrics.relative_error_ensemble ?? rd.metrics.relative_error_tikhonov}, correlation ${rd.metrics.correlation_ensemble ?? rd.metrics.correlation_tikhonov}; largest absolute error ${err[mi].toFixed(2)} mV at node ${mi}. Click a node to plot its recovered vs measured potential over the beat.`,
                    `Corazón 3D de ${rd.mesh.n_vertices} nodos, ${FIELD_LABEL[field][1]} en ${rd.times_ms[rf]} ms; rango ${lo.toFixed(2)} a ${hi.toFixed(2)} mV; error relativo ${rd.metrics.relative_error_ensemble ?? rd.metrics.relative_error_tikhonov}, correlación ${rd.metrics.correlation_ensemble ?? rd.metrics.correlation_tikhonov}; mayor error ${err[mi].toFixed(2)} mV en el nodo ${mi}. Al hacer clic en un nodo se grafica su potencial recuperado vs medido durante el latido.`)}
                />
                <div className="hero-rail-side">
                  <div className="chip-wrap">
                    {FIELDS.map((f) => <button key={f} className={`chip ${field === f ? 'on' : ''}`} onClick={() => setField(f)}>{pick(lang, FIELD_LABEL[f][0], FIELD_LABEL[f][1])}</button>)}
                  </div>
                  <div className="viz-controls">
                    <button className={`play-btn ${playing ? 'on' : ''}`} onClick={togglePlay} aria-label={pick(lang, 'Play beat', 'Reproducir latido')}>{playing ? '❚❚' : '▶'} {pick(lang, 'beat', 'latido')}</button>
                    <input className="scrub" type="range" min={0} max={rd.times_ms.length - 1} value={rf} onChange={(e) => { if (raf.current) { cancelAnimationFrame(raf.current); raf.current = null; setPlaying(false); } setFrame(Number(e.target.value)); }} aria-label={pick(lang, 'Beat time', 'Tiempo del latido')} />
                    <span className="muted small">{rd.times_ms[rf]} ms</span>
                  </div>
                  <div className="pick-note">{picked != null
                    ? (lang === 'es' ? <>Nodo <b>{picked}</b>: recuperado vs medido durante el latido.</> : <>Node <b>{picked}</b>: recovered vs measured over the beat.</>)
                    : (lang === 'es' ? <>Hacer clic en un nodo del corazón. Se muestra el nodo de max error <b>{mi}</b>.</> : <>Click a node on the heart. Showing the max-error node <b>{mi}</b>.</>)}</div>
                  <UPlotChart height={190}
                    data={[rd.times_ms, rec, meas]}
                    series={[{ label: 'recovered', stroke: 'var(--accent)', width: 2 }, { label: 'measured', stroke: 'var(--muted)', width: 1.6, dash: [4, 3] }]}
                    xLabel="ms" yLabel="mV" cursorX={rd.times_ms[rf]}
                    ariaLabel={pick(lang, `Recovered vs measured potential at node ${node} over the beat`, `Potencial recuperado vs medido en el nodo ${node} durante el latido`)} />
                  <dl className="cp-readout">
                    <div className="ro"><span className="v">{rd.metrics.relative_error_ensemble ?? rd.metrics.relative_error_tikhonov}</span><span className="k">{pick(lang, 'relative error', 'error relativo')}</span></div>
                    <div className="ro"><span className="v">{rd.metrics.correlation_ensemble ?? rd.metrics.correlation_tikhonov}</span><span className="k">{pick(lang, 'correlation', 'correlación')}</span></div>
                  </dl>
                </div>
              </div>
            );
          })()}
          <p style={{ marginTop: 12 }}>{pick(lang,
            'Orbit the heart; scrub or play the beat; toggle the recovered potential, the real measured potential, their absolute error, and the per-node uncertainty. On the human tank the AVP paced rhythm reconstructs with higher correlation than sinus (displayed ensemble: sinus 0.72, PVP 0.71, AVP 0.80), physically expected for a focal paced source that is easier to localize than the diffuse sinus wavefront; PVP is comparable to sinus here. The method transfers to the dog heart (a different species, geometry, and electrode count) with no retuning.',
            'Orbitar el corazón; desplazar o reproducir el latido; alternar el potencial recuperado, el real medido, su error absoluto, y la incertidumbre por nodo. En el tanque humano el ritmo con marcapaso AVP reconstruye con mayor correlación que el sinusal (ensemble mostrado: sinusal 0.72, PVP 0.71, AVP 0.80), físicamente esperado para una fuente focal más fácil de localizar que el frente sinusal difuso; el PVP es comparable al sinusal aquí. El método se transfiere al corazón de perro (otra especie, geometría y número de electrodos) sin reajuste.')}</p>
          <Callout>
            {pick(lang,
              'Data: EDGAR (Consortium for ECG Imaging). Human torso tank (Utah, 2018) and in-situ dog (Maastricht), used under the EDGAR data-use agreement with attribution; the raw datasets are not redistributed. The measured field is shown as a research visualization. Not clinically deployed.',
              'Datos: EDGAR (Consortium for ECG Imaging). Tanque de torso humano (Utah, 2018) y perro in situ (Maastricht), usados bajo el acuerdo de uso de EDGAR con atribución; los conjuntos de datos crudos no se redistribuyen. El campo medido se muestra como visualización de investigación. No desplegado clínicamente.')}
          </Callout>
          <Refs ids={['aras2015', 'cluitmans2018']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'problem', label: pick(lang, 'The problem', 'El problema'),
      content: (
        <section>
          <h2>{pick(lang, 'Localizing an arrhythmia without opening the chest', 'Localizar una arritmia sin abrir el tórax')}</h2>
          <p className="measure">{pick(lang,
            'Atrial fibrillation and ventricular tachycardia are common and dangerous. When drugs fail, the definitive treatment is catheter ablation: burning or freezing the small piece of tissue that starts or sustains the arrhythmia. Ablation is fundamentally a localization problem; a source that cannot be found cannot be destroyed.',
            'La fibrilación auricular y la taquicardia ventricular son frecuentes y peligrosas. Cuando fallan los fármacos, el tratamiento definitivo es la ablación con catéter: quemar o congelar el pequeño trozo de tejido que inicia o sostiene la arritmia. La ablación es en esencia un problema de localización; no se puede destruir una fuente que no se puede encontrar.')}</p>
          <StatStrip tiles={[
            { value: '~52M', label: pick(lang, 'people with atrial fibrillation worldwide', 'personas con fibrilación auricular en el mundo'), source: pick(lang, 'global burden', 'carga global') },
            { value: '~5x', label: pick(lang, 'excess stroke risk, independent of other factors (Framingham)', 'riesgo de ictus casi quintuplicado, independiente de otros factores (Framingham)'), source: 'Wolf 1991' },
            { value: '1.5% -> 23.5%', label: pick(lang, 'attributable stroke risk, age 50-59 to 80-89', 'riesgo de ictus atribuible, edad 50-59 a 80-89'), source: 'Wolf 1991' },
            { value: '~10 mm', label: pick(lang, 'ECGi focus localization in early human work', 'localización del foco por ECGi en trabajo humano temprano'), source: 'Ramanathan 2004' },
            { value: '~20 ms', label: pick(lang, 'mean activation-time error vs invasive contact maps', 'error medio de tiempo de activación vs mapas de contacto invasivos'), source: 'Duchateau 2019' },
            { value: '-0.68..0.82', label: pick(lang, 'per-patient correlation vs invasive maps (near zero overall)', 'correlación por paciente vs mapas invasivos (cercana a cero en conjunto)'), source: 'Duchateau 2019' },
          ]} />
          <div className="hero-rail" style={{ marginTop: 14 }}>
            <TwelveLeadSvg lang={lang} step={problemStep} />
            <div className="hero-rail-side">
              <ClinicalStepper
                activeStep={problemStep} onStep={setProblemStep}
                prevLabel={pick(lang, 'Prev', 'Anterior')} nextLabel={pick(lang, 'Next', 'Siguiente')}
                steps={[
                  {
                    title: pick(lang, '1. An arrhythmia to treat', '1. Una arritmia a tratar'),
                    body: pick(lang, 'Atrial fibrillation now affects on the order of 52 million people and confers a near fivefold, age-climbing stroke risk (Framingham); ventricular tachycardia sits upstream of a large share of sudden cardiac deaths.', 'La fibrilación auricular afecta hoy del orden de 52 millones de personas y confiere un riesgo de ictus casi quintuplicado que sube con la edad (Framingham); la taquicardia ventricular está aguas arriba de una gran parte de las muertes cardíacas súbitas.'),
                  },
                  {
                    title: pick(lang, '2. Ablation must find the source', '2. La ablación debe hallar la fuente'),
                    body: pick(lang, 'Catheter ablation destroys the tissue that starts or sustains the arrhythmia, so success depends on localizing a precise 3D site on the heart surface.', 'La ablación con catéter destruye el tejido que inicia o sostiene la arritmia, así que el éxito depende de localizar un sitio 3D preciso en la superficie del corazón.'),
                  },
                  {
                    title: pick(lang, '3. The 12-lead cannot resolve it', '3. El ECG de 12 derivaciones no lo resuelve'),
                    body: pick(lang, 'Twelve leads are only eight independent signals, a very low-dimensional projection. It diagnoses that an arrhythmia exists and guesses a broad region of origin, but cannot resolve a precise 3D site, so the origin is found invasively by point-by-point catheter mapping, one chamber at a time.', 'Doce derivaciones son solo ocho señales independientes, una proyección de muy baja dimensión. Diagnostica que existe una arritmia y adivina una región amplia de origen, pero no resuelve un sitio 3D preciso, así que el origen se halla de forma invasiva por mapeo con catéter punto por punto, una cámara a la vez.'),
                  },
                  {
                    title: pick(lang, '4. ECGi reconstructs it, but is ill-posed', '4. El ECGi lo reconstruye, pero es mal planteado'),
                    body: pick(lang, 'ECGi records a dense body-surface map from a multi-electrode vest (Medtronic CardioInsight, FDA-cleared), fuses it with the CT heart-torso geometry, and solves the inverse problem to reconstruct the whole heart surface from one beat, non-invasively (roughly 10 mm in early human work, Ramanathan 2004). But many sources give almost the same body signal: against invasive maps, activation-time errors near 20 ms and correlation near zero, worst over scar (Duchateau 2019), so validation needs a torso-tank gold standard.', 'El ECGi registra un mapa denso de superficie corporal desde un chaleco multielectrodo (CardioInsight de Medtronic, autorizado por la FDA), lo fusiona con la geometría corazón-torso de una tomografía, y resuelve el problema inverso para reconstruir toda la superficie del corazón desde un latido, de forma no invasiva (unos 10 mm en trabajo humano temprano, Ramanathan 2004). Pero muchas fuentes dan casi la misma señal corporal: contra mapas invasivos, errores de tiempo de activación cercanos a 20 ms y correlación cercana a cero, peor sobre cicatriz (Duchateau 2019), así que la validación necesita un patrón de oro de tanque de torso.'),
                  },
                ]}
              />
            </div>
          </div>
          <Callout>
            {pick(lang,
              'A living patient has no dense heart-surface gold standard to score a reconstruction against, so this case runs on a torso-tank experiment instead: a real explanted heart perfused inside a tank, where a 256-electrode cage recorded the true heart-surface potentials at the same instant as 192 tank-surface electrodes. That simultaneous cage recording is the measured ground truth every number here is scored against, the reason the EDGAR repository (Aras et al., 2015) exists and the right benchmark for a physics-informed reconstruction. Not clinically deployed.',
              'Un paciente vivo no tiene un patrón de oro denso de superficie cardíaca contra el que puntuar una reconstrucción, así que este caso se ejecuta en cambio sobre un experimento de tanque de torso: un corazón explantado real perfundido dentro de un tanque, donde una jaula de 256 electrodos registró los potenciales verdaderos de superficie cardíaca en el mismo instante que 192 electrodos de la superficie del tanque. Ese registro simultáneo de la jaula es la verdad de referencia medida contra la que se puntúa cada número aquí, la razón por la que existe el repositorio EDGAR (Aras et al., 2015) y el punto de referencia correcto para una reconstrucción informada por física. No desplegado clínicamente.')}
          </Callout>
          <Refs ids={['wolf1991', 'ramanathan2004', 'duchateau2019', 'aras2015', 'gharib2024digitaltwin']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'target', label: pick(lang, 'The target', 'El objetivo'),
      content: (
        <section>
          <h2>{pick(lang, 'What we measure, and what we recover', 'Qué medimos y qué recuperamos')}</h2>
          <p className="measure">{pick(lang,
            'What we can measure is the body-surface potential vector, one value per tank electrode, sampled through the heartbeat. What we want is the heart-surface potential vector, one value per cage electrode. In a patient the heart surface is inaccessible; in this experiment the cage recorded it simultaneously, giving the validation truth. The two heart fields below share one symmetric colour scale, so the gap between them is the reconstruction error.',
            'Lo que podemos medir es el vector de potencial de superficie corporal, un valor por electrodo del tanque, muestreado a lo largo del latido. Lo que queremos es el vector de potencial de superficie cardíaca, un valor por electrodo de la jaula. En un paciente la superficie cardíaca es inaccesible; en este experimento la jaula lo registró simultáneamente, dando la verdad de validación. Los dos campos cardíacos de abajo comparten una escala de color simétrica, así que la diferencia entre ellos es el error de reconstrucción.')}</p>
          {rd && (() => {
            const nf = rd.times_ms.length;
            const tf = Math.min(tgtFrame, nf - 1);
            const meas = rd.fields_over_time.measured_mV[tf];
            const rec = rd.fields_over_time.recovered_mV[tf];
            const { lo, hi } = fieldStats(meas.concat(rec), true);
            const node = tgtPicked != null && tgtPicked < meas.length ? tgtPicked : null;
            return (
              <>
                <div className="two-col">
                  <FieldView3D key={'tgt-m' + (ds?.id ?? '') + beat}
                    vertices={rd.mesh.vertices} triangles={rd.mesh.triangles}
                    values={meas} signed range={{ lo, hi }} pickedNode={node} onPick={setTgtPicked}
                    legendLabel={pick(lang, 'Measured (real gold standard)', 'Medido (patrón de oro real)')} unit="mV"
                    readout={<>{pick(lang, 'measured', 'medido')} · t = {rd.times_ms[tf]} ms{node != null ? <> · {pick(lang, 'node', 'nodo')} {node} = {meas[node].toFixed(2)} mV</> : null}</>}
                    srSummary={pick(lang, `Measured heart-surface potential at ${rd.times_ms[tf]} ms across ${rd.mesh.n_vertices} nodes; range ${lo.toFixed(2)} to ${hi.toFixed(2)} mV.`, `Potencial medido de superficie cardíaca en ${rd.times_ms[tf]} ms sobre ${rd.mesh.n_vertices} nodos; rango ${lo.toFixed(2)} a ${hi.toFixed(2)} mV.`)} />
                  <FieldView3D key={'tgt-r' + (ds?.id ?? '') + beat}
                    vertices={rd.mesh.vertices} triangles={rd.mesh.triangles}
                    values={rec} signed range={{ lo, hi }} pickedNode={node} onPick={setTgtPicked}
                    legendLabel={pick(lang, 'Recovered (our result)', 'Recuperado (nuestro resultado)')} unit="mV"
                    readout={<>{pick(lang, 'recovered', 'recuperado')} · t = {rd.times_ms[tf]} ms{node != null ? <> · {pick(lang, 'node', 'nodo')} {node} = {rec[node].toFixed(2)} mV</> : null}</>}
                    srSummary={pick(lang, `Recovered heart-surface potential at ${rd.times_ms[tf]} ms across ${rd.mesh.n_vertices} nodes; range ${lo.toFixed(2)} to ${hi.toFixed(2)} mV.`, `Potencial recuperado de superficie cardíaca en ${rd.times_ms[tf]} ms sobre ${rd.mesh.n_vertices} nodos; rango ${lo.toFixed(2)} a ${hi.toFixed(2)} mV.`)} />
                </div>
                <div className="viz-controls">
                  <span className="muted small">{pick(lang, 'beat time', 'tiempo del latido')}</span>
                  <input className="scrub" type="range" min={0} max={nf - 1} value={tf} onChange={(e) => setTgtFrame(Number(e.target.value))} aria-label={pick(lang, 'Beat time', 'Tiempo del latido')} />
                  <span className="muted small">{rd.times_ms[tf]} ms</span>
                </div>
                <div className="pick-note">{node != null
                  ? (lang === 'es'
                    ? <>Nodo <b>{node}</b>: medido {meas[node].toFixed(2)} mV vs recuperado {rec[node].toFixed(2)} mV; la diferencia es el error de reconstrucción.</>
                    : <>Node <b>{node}</b>: measured {meas[node].toFixed(2)} mV vs recovered {rec[node].toFixed(2)} mV; the gap is the reconstruction error.</>)
                  : pick(lang, 'Click a node on either heart to mark the same node on both panels and read measured vs recovered at that site.', 'Hacer clic en un nodo de cualquiera de los dos corazones para marcar el mismo nodo en ambos paneles y leer medido vs recuperado en ese sitio.')}</div>
              </>
            );
          })()}
          {(() => {
            const nBody = rd?.metrics?.n_torso_electrodes ?? 192;
            const nHeart = rd?.metrics?.n_heart_electrodes ?? rd?.mesh.n_vertices ?? 256;
            const nBeats = ds ? Object.keys(ds.beats).length : 3;
            const nFrames = rd ? rd.times_ms.length : 0;
            const beatsEn = nBeats === 1 ? 'A single sinus beat is available for this dataset' : `${nBeats} beats are available (sinus and paced rhythms)`;
            const beatsEs = nBeats === 1 ? 'Hay un único latido sinusal disponible para este conjunto' : `Hay ${nBeats} latidos disponibles (sinusal y ritmos con marcapaso)`;
            return (
              <>
                <div className="fig-row">
                  <HoverMathEq
                    tex={String.raw`\phi_{\text{body}}(t) = A\,\phi_{\text{heart}}(t), \qquad \phi_{\text{body}} \in \mathbb{R}^{${nBody}},\; \phi_{\text{heart}} \in \mathbb{R}^{${nHeart}}`}
                    terms={[
                      { tex: String.raw`\phi_{\text{body}}`, meaning: pick(lang, `measured body-surface potentials (${nBody} electrodes${nFrames ? `, ${nFrames} frames through the beat` : ''})`, `potenciales medidos de superficie corporal (${nBody} electrodos${nFrames ? `, ${nFrames} cuadros durante el latido` : ''})`) },
                      { tex: String.raw`\phi_{\text{heart}}`, meaning: pick(lang, `heart-surface potentials to recover (${nHeart} cage nodes); the cage measurement is the gold standard`, `potenciales de superficie cardíaca a recuperar (${nHeart} nodos de jaula); la medición de la jaula es el patrón de oro`) },
                      { tex: `A`, meaning: pick(lang, 'the forward transfer matrix set by the torso geometry (next tab)', 'la matriz de transferencia directa fijada por la geometría del torso (siguiente pestaña)') },
                      { tex: `t`, meaning: pick(lang, 'time through the beat; the linear map holds at every instant', 'tiempo a lo largo del latido; el mapa lineal se cumple en cada instante') },
                    ]}
                    caption={pick(lang, 'The body-surface potentials are a fixed linear map A of the heart-surface potentials at every instant t of the beat.', 'Los potenciales de superficie corporal son un mapa lineal fijo A de los potenciales de superficie cardíaca en cada instante t del latido.')} />
                  <ForwardSvg lang={lang} nBody={nBody} nHeart={nHeart} />
                </div>
                <dl className="def-grid">
                  <dt>{'φ_body'}</dt><dd>{pick(lang, `measured body-surface potentials (${nBody} electrodes)`, `potenciales medidos de superficie corporal (${nBody} electrodos)`)}</dd>
                  <dt>{'φ_heart'}</dt><dd>{pick(lang, `heart-surface potentials to recover (${nHeart} cage nodes); measured by the cage = the gold standard`, `potenciales de superficie cardíaca a recuperar (${nHeart} nodos de jaula); medidos por la jaula = el patrón de oro`)}</dd>
                  <dt>A</dt><dd>{pick(lang, 'the forward transfer matrix set by the torso geometry (next tab)', 'la matriz de transferencia directa fijada por la geometría del torso (siguiente pestaña)')}</dd>
                </dl>
                <Callout>
                  {pick(lang,
                    `${beatsEn}. Reconstruction quality is measured against the cage recording; a patient would never have that cage, which is exactly why the reconstruction is needed and why a torso tank is the right validation setting.`,
                    `${beatsEs}. La calidad de reconstrucción se mide contra el registro de la jaula; un paciente nunca tendría esa jaula, que es justo por lo que se necesita la reconstrucción y por lo que un tanque de torso es el entorno de validación correcto.`)}
                </Callout>
              </>
            );
          })()}
          <Refs ids={['aras2015', 'barr1977']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'forward', label: pick(lang, 'How the PDE arises', 'Cómo surge la PDE'),
      content: (
        <section>
          <h2>{pick(lang, 'How the governing equation arises', 'Cómo surge la ecuación gobernante')}</h2>
          <p className="measure">{pick(lang,
            'The body is a passive volume conductor: the heart is the electrical source, and the surrounding tissue conducts the resulting currents to the skin. At heartbeat frequencies (below a kilohertz) the electromagnetic wavelength is far larger than the body, so Maxwell equations reduce to their quasi-static form, and the extracellular potential obeys the generalized Laplace equation. Step through the derivation on the right; the schematic on the left highlights what each step is about.',
            'El cuerpo es un conductor de volumen pasivo: el corazón es la fuente eléctrica, y el tejido circundante conduce las corrientes resultantes hasta la piel. A las frecuencias del latido (por debajo de un kilohertz) la longitud de onda electromagnética es mucho mayor que el cuerpo, así que las ecuaciones de Maxwell se reducen a su forma cuasiestática, y el potencial extracelular obedece la ecuación de Laplace generalizada. La derivación se recorre a la derecha; el esquema de la izquierda resalta de qué trata cada paso.')}</p>
          <div className="hero-rail">
            <ControlVolumeSvg lang={lang} step={derivStep} />
            <div className="hero-rail-side">
              <DerivationStepper
                activeStep={derivStep} onStep={setDerivStep}
                ariaLabel={pick(lang, 'Forward-operator derivation', 'Derivación del operador directo')}
                prevLabel={pick(lang, 'Prev', 'Anterior')} nextLabel={pick(lang, 'Next', 'Siguiente')}
                stepLabel={(c, t) => pick(lang, `step ${c} of ${t}`, `paso ${c} de ${t}`)}
                steps={[
                  { tex: String.raw`\nabla\times \mathbf{E}\approx 0 \;\Rightarrow\; \mathbf{E} = -\nabla\phi`, caption: pick(lang, 'At heartbeat frequencies the wavelength is much larger than the body: quasi-static, no wave term, so the field is the gradient of a potential.', 'A las frecuencias del latido la longitud de onda es mucho mayor que el cuerpo: cuasiestático, sin término de onda, así que el campo es el gradiente de un potencial.') },
                  { tex: String.raw`\nabla\cdot \mathbf{J} = 0, \qquad \mathbf{J} = -\sigma(x)\,\nabla\phi`, caption: pick(lang, 'Charge conservation in a passive conductor: no current is created inside, and the current density is Ohmic.', 'Conservación de carga en un conductor pasivo: no se crea corriente adentro, y la densidad de corriente es óhmica.') },
                  { tex: String.raw`\nabla\cdot\big(\sigma(x)\,\nabla\phi\big) = 0 \quad \text{in } \Omega`, caption: pick(lang, 'Combine the two: the potential is harmonic (generalized Laplace) throughout the torso volume.', 'Combinar ambas: el potencial es armónico (Laplace generalizado) en todo el volumen del torso.') },
                  { tex: String.raw`\phi = \phi_{\text{heart}} \text{ on } \Gamma_H, \qquad \sigma\,\partial_n\phi = 0 \text{ on } \Gamma_B`, caption: pick(lang, 'Boundary conditions: the potential equals the source on the heart surface, and no current leaves the body surface (air insulates).', 'Condiciones de contorno: el potencial iguala la fuente en la superficie cardíaca, y no sale corriente por la superficie corporal (el aire aísla).') },
                  { tex: String.raw`\phi_{\text{body}} = A\,\phi_{\text{heart}}`, caption: pick(lang, 'The problem is linear and has a unique solution, so the heart-to-body map is a single matrix A.', 'El problema es lineal y tiene solución única, así que el mapa corazón-cuerpo es una sola matriz A.') },
                  { tex: String.raw`A_{ij} \propto \frac{1}{4\pi\,\lVert x^{\text{body}}_i - x^{\text{heart}}_j\rVert}, \qquad A = U\Sigma V^{\top}, \;\; \sigma_k \searrow 0`, caption: pick(lang, 'Discretize (single-layer 1/r kernel, or a full BEM): the singular values decay to zero, so inverting A amplifies noise. This is the ill-posedness.', 'Discretizar (núcleo de capa simple 1/r, o un BEM completo): los valores singulares decaen a cero, así que invertir A amplifica el ruido. Esto es el mal planteamiento.') },
                ]}
              />
            </div>
          </div>
          <div className="fig-cap" style={{ textAlign: 'left' }}>{pick(lang,
            'The torso as a passive volume conductor: currents J = -sigma grad phi flow from the heart source on Gamma_H to the body surface Gamma_B, where no current leaves (air insulates). The heart-to-body map is a single matrix A whose singular values decay to zero, which is the ill-posedness.',
            'El torso como conductor de volumen pasivo: las corrientes J = -sigma grad phi fluyen desde la fuente cardíaca en Gamma_H hacia la superficie corporal Gamma_B, donde no sale corriente (el aire aísla). El mapa corazón-cuerpo es una sola matriz A cuyos valores singulares decaen a cero, que es el mal planteamiento.')}</div>
          <HoverMathEq
            tex={String.raw`\nabla\cdot\big(\sigma(x)\,\nabla \phi(x)\big) = 0 \quad \text{in } \Omega, \qquad \phi = \phi_{\text{heart}} \text{ on } \Gamma_H, \qquad \sigma\,\partial_n\phi = 0 \text{ on } \Gamma_B`}
            terms={[
              { tex: String.raw`\phi(x)`, meaning: pick(lang, 'extracellular potential at a point x in the torso (mV)', 'potencial extracelular en un punto x del torso (mV)') },
              { tex: String.raw`\sigma(x)`, meaning: pick(lang, 'tissue conductivity (piecewise for lung, muscle, blood)', 'conductividad del tejido (por partes para pulmón, músculo, sangre)') },
              { tex: String.raw`\Omega`, meaning: pick(lang, 'the torso volume', 'el volumen del torso') },
              { tex: String.raw`\Gamma_H,\ \Gamma_B`, meaning: pick(lang, 'the heart surface and the body surface', 'la superficie cardíaca y la superficie corporal') },
              { tex: String.raw`\partial_n`, meaning: pick(lang, 'the outward normal derivative (current flux)', 'la derivada normal saliente (flujo de corriente)') },
            ]}
            caption={pick(lang, 'Quasi-static volume conduction: harmonic in the torso, equals the source on the heart surface, no current flux through the body surface (air is an insulator).', 'Conducción de volumen cuasiestática: armónico en el torso, iguala la fuente en la superficie cardíaca, sin flujo de corriente por la superficie corporal (el aire es aislante).')} />
          <p className="measure">{pick(lang,
            'We implement both forward operators: the single-layer (point-source) kernel above, and a full boundary-element operator (BEM) with exact triangle solid angles for the double layer (Van Oosterom-Strackee) and triangle 1/r integrals for the single layer, eliminating the heart-surface normal current to get the transfer matrix. The BEM is validated on the analytic concentric-sphere problem, where the heart-to-body transfer of each harmonic is known in closed form: it recovers it with correlation 1.00 and an error that halves with each mesh refinement (first-order convergence).',
            'Implementamos ambos operadores directos: el núcleo de capa simple (fuente puntual) de arriba, y un operador de elementos de contorno completo (BEM) con ángulos sólidos exactos de triángulo para la doble capa (Van Oosterom-Strackee) e integrales de 1/r por triángulo para la capa simple, eliminando la corriente normal de superficie cardíaca para obtener la matriz de transferencia. El BEM se valida en el problema analítico de esferas concéntricas, donde la transferencia corazón-cuerpo de cada armónico se conoce en forma cerrada: la recupera con correlación 1.00 y un error que se reduce a la mitad con cada refinamiento de malla (convergencia de primer orden).')}</p>
          <Callout>
            {pick(lang,
              'Honest finding: on the real electrode geometry the BEM does not beat the calibrated single-layer. It requires closed 2-manifold surfaces (the human torso-tank surface is open, so the BEM applies only to the dog case); and where it does apply, the coarse 140-node torso makes the reconstruction regularization-dominated, so forward-operator fidelity is not the bottleneck (dog: single-layer RE 0.54 vs BEM RE 0.63). The single-layer stays the default; the BEM matters as electrode density and mesh closure improve. Both are analytic-gated in the test suite.',
              'Hallazgo honesto: sobre la geometría real de electrodos el BEM no supera a la capa simple calibrada. Requiere superficies cerradas de 2-variedad (la superficie del tanque de torso humano es abierta, así que el BEM solo aplica al caso del perro); y donde aplica, el torso grueso de 140 nodos hace la reconstrucción dominada por la regularización, así que la fidelidad del operador directo no es el cuello de botella (perro: capa simple RE 0.54 vs BEM RE 0.63). La capa simple sigue siendo el default; el BEM importa cuando mejoran la densidad de electrodos y el cierre de malla. Ambos con prueba analítica en el test suite.')}
          </Callout>
          <Refs ids={['barr1977', 'vanoosterom1983', 'rudy1988', 'bear2018']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'traditional', label: pick(lang, 'Traditional approach', 'Enfoque tradicional'),
      content: (
        <section>
          <h2>{pick(lang, 'The classical solution: Tikhonov regularization', 'La solución clásica: regularización de Tikhonov')}</h2>
          <p className="measure">{pick(lang,
            'Because inverting A directly amplifies noise, the standard approach does not invert it. It looks for the heart-surface potentials that best explain the measured body-surface data while keeping the solution well-behaved, by adding a penalty term. This is Tikhonov regularization: minimize the data misfit plus a weighted penalty on the size (or the surface roughness) of the solution. Move the lambda slider to feel the trade-off on the schematic L-curve.',
            'Como invertir A directamente amplifica el ruido, el enfoque estándar no lo invierte. Busca los potenciales de superficie cardíaca que mejor explican los datos medidos de superficie corporal manteniendo la solución bien comportada, agregando un término de penalización. Esto es la regularización de Tikhonov: minimizar el desajuste a datos más una penalización ponderada sobre el tamaño (o la rugosidad superficial) de la solución. El control de lambda ajusta el compromiso en la curva L esquemática.')}</p>
          <div className="hero-rail">
            <LCurveSvg lang={lang} t={lambdaPos} />
            <div className="hero-rail-side">
              <div className="viz-controls">
                <span className="muted small">{'λ'}</span>
                <input className="scrub" type="range" min={0} max={100} value={Math.round(lambdaPos * 100)} onChange={(e) => setLambdaPos(Number(e.target.value) / 100)} aria-label={pick(lang, 'Regularization strength lambda', 'Fuerza de regularización lambda')} />
                <span className="muted small">{lambdaPos < 0.34 ? pick(lang, 'low', 'bajo') : lambdaPos > 0.66 ? pick(lang, 'high', 'alto') : pick(lang, 'corner', 'esquina')}</span>
              </div>
              <div className="pick-note">{lambdaPos < 0.34
                ? pick(lang, 'Low lambda: the solution norm explodes and noise is amplified into speckled, unphysical potentials.', 'Lambda bajo: la norma de la solución explota y el ruido se amplifica en potenciales moteados y no físicos.')
                : lambdaPos > 0.66
                  ? pick(lang, 'High lambda: the reconstruction is over-smoothed, blurring sharp activation fronts (a plausible but wrong map).', 'Lambda alto: la reconstrucción se sobre-suaviza, difuminando frentes de activación agudos (un mapa plausible pero incorrecto).')
                  : pick(lang, 'Near the corner: the L-curve trade-off between data misfit and solution norm; the classical sweet spot, close to the oracle lambda.', 'Cerca de la esquina: el compromiso de la curva L entre desajuste a datos y norma de la solución; el punto dulce clásico, cercano al lambda oráculo.')}</div>
              <p className="measure" style={{ marginBottom: 0 }}>{pick(lang,
                'The one free knob is lambda, classically chosen by the L-curve corner (the trade-off between misfit and solution norm) or by CRESO. The cost of stability is a smoothness bias that blurs sharp activation fronts, and the result is a single point estimate with no measure of where it can be trusted. L1 / total-variation variants sharpen the fronts but remain deterministic.',
                'La única perilla libre es lambda, elegida clásicamente por la esquina de la curva L (el compromiso entre desajuste y norma de la solución) o por CRESO. El costo de la estabilidad es un sesgo de suavidad que difumina los frentes de activación agudos, y el resultado es una sola estimación puntual sin medida de dónde se puede confiar. Las variantes L1 / de variación total agudizan los frentes pero siguen siendo deterministas.')}</p>
            </div>
          </div>
          <HoverMathEq
            tex={String.raw`\hat{\phi} = \arg\min_{\phi}\; \lVert A\phi - \phi_{\text{body}}\rVert_2^2 + \lambda^2\lVert L\phi\rVert_2^2 = (A^{\top}A + \lambda^2 L^{\top}L)^{-1} A^{\top}\phi_{\text{body}}`}
            terms={[
              { tex: String.raw`\lambda`, meaning: pick(lang, 'regularization strength: too small is unstable, too large over-smooths', 'fuerza de regularización: muy pequeña es inestable, muy grande sobre-suaviza') },
              { tex: `L`, meaning: pick(lang, 'the penalty operator: identity (magnitude) or a surface derivative (roughness)', 'el operador de penalización: identidad (magnitud) o una derivada de superficie (rugosidad)') },
              { tex: String.raw`A^{\top}A`, meaning: pick(lang, 'the normal operator; adding lambda-squared L-transpose-L makes the solve well-conditioned', 'el operador normal; sumar lambda-cuadrado L-transpuesta-L hace el sistema bien condicionado') },
            ]}
            caption={pick(lang, 'Tikhonov reconstruction: the closed form is a single linear solve. L = I penalizes magnitude; a surface Laplacian penalizes roughness.', 'Reconstrucción de Tikhonov: la forma cerrada es un solo sistema lineal. L = I penaliza magnitud; un Laplaciano de superficie penaliza rugosidad.')} />
          <Callout>
            {pick(lang,
              'In the comparison we give Tikhonov its oracle-best lambda, the value that minimizes the true reconstruction error, so the classical baseline is judged at its best, not strawmanned. A well-tuned Tikhonov is a strong baseline.',
              'En la comparación le damos a Tikhonov su mejor lambda por oráculo, el valor que minimiza el error real de reconstrucción, para que el baseline clásico se juzgue en su mejor versión, no como un espantapájaros. Un Tikhonov bien ajustado es un baseline fuerte.')}
          </Callout>
          <Refs ids={['tikhonov1977', 'hansen1992', 'ghosh2009']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'pinn', label: pick(lang, 'Physics-informed proposal', 'Propuesta informada por física'),
      content: (
        <section>
          <h2>{pick(lang, 'Where and how the physics-informed reconstruction helps', 'Dónde y cómo ayuda la reconstrucción informada por física')}</h2>
          <p className="measure">{pick(lang,
            'A physics-informed reconstruction keeps the same physical constraint (the recovered potentials must reproduce the real measured body-surface data through the forward operator A) but improves the two weaknesses of plain Tikhonov: a prior that respects the tissue, and a per-node uncertainty. Hover the pipeline to inspect each stage; toggle the what-if controls to read the baked reconstruction each choice produces.',
            'Una reconstrucción informada por física mantiene la misma restricción física (los potenciales recuperados deben reproducir los datos reales medidos de superficie corporal a través del operador directo A) pero mejora las dos debilidades del Tikhonov simple: un prior que respeta el tejido, y una incertidumbre por nodo. Al pasar el cursor por el pipeline se inspecciona cada etapa; los controles de hipótesis muestran la reconstrucción precalculada que produce cada elección.')}</p>
          <PipelineSvg
            animate
            selected={pipeSel} onSelect={(id) => setPipeSel((p) => (p === id ? null : id))}
            playLabel={pick(lang, 'Play flow', 'Reproducir flujo')}
            captionEmpty={pick(lang, 'Hover, focus, or select a stage to inspect it.', 'Pasar el cursor, enfocar o seleccionar una etapa para inspeccionarla.')}
            ariaLabel={pick(lang, 'Physics-informed reconstruction pipeline', 'Pipeline de reconstrucción informada por física')}
            stages={[
              { id: 'body', kind: 'in', label: 'phi_body', sub: pick(lang, '192 measured', '192 medido'), detail: pick(lang, 'The real body-surface recording, one value per tank electrode through the beat.', 'El registro real de superficie corporal, un valor por electrodo del tanque durante el latido.') },
              { id: 'A', kind: 'proc', label: 'A', sub: pick(lang, 'forward operator', 'operador directo'), detail: pick(lang, 'The fixed transfer matrix from the torso geometry; the reconstruction must reproduce the data through A.', 'La matriz de transferencia fija de la geometría del torso; la reconstrucción debe reproducir los datos a través de A.') },
              { id: 'inv', kind: 'proc', label: pick(lang, 'reg. inverse', 'inverso reg.'), sub: pick(lang, '+ mesh-graph prior', '+ prior de grafo'), detail: pick(lang, 'L_mesh is the graph Laplacian of the real heart-cage triangulation, so the solution is smooth along the tissue, not in an abstract vector space.', 'L_mesh es el Laplaciano de grafo de la triangulación real de la jaula cardíaca, así que la solución es suave a lo largo del tejido, no en un espacio vectorial abstracto.') },
              { id: 'ens', kind: 'proc', label: pick(lang, 'K ensemble', 'ensemble K'), sub: pick(lang, 'over noise', 'sobre ruido'), detail: pick(lang, 'K members are fit over measurement-noise realizations; their spread encodes reconstruction uncertainty.', 'K miembros se ajustan sobre realizaciones del ruido de medición; su dispersión codifica la incertidumbre de la reconstrucción.') },
              { id: 'out', kind: 'out', label: pick(lang, 'mean + spread', 'media + dispersión'), sub: pick(lang, 'recon + per-node UQ', 'recon + UQ por nodo'), detail: pick(lang, 'The ensemble mean is the reconstruction; the recalibrated spread s is the per-node uncertainty, the map of where the result can be trusted.', 'La media del ensemble es la reconstrucción; la dispersión recalibrada s es la incertidumbre por nodo, el mapa de dónde se puede confiar en el resultado.') },
            ]} />
          <div className="two-col">
            <div>
              <div className="chip-wrap" role="group" aria-label={pick(lang, 'What-if controls', 'Controles de hipótesis')}>
                <button className={`chip ${!priorMesh ? 'on' : ''}`} onClick={() => setPriorMesh(false)}>{pick(lang, 'prior: identity', 'prior: identidad')}</button>
                <button className={`chip ${priorMesh ? 'on' : ''}`} onClick={() => setPriorMesh(true)}>{pick(lang, 'prior: mesh-graph', 'prior: grafo de malla')}</button>
                <button className={`chip ${uqOn ? 'on' : ''}`} onClick={() => setUqOn((v) => !v)}>{pick(lang, `uncertainty: ${uqOn ? 'on' : 'off'}`, `incertidumbre: ${uqOn ? 'sí' : 'no'}`)}</button>
              </div>
              {rd && (() => {
                const method = uqOn ? 'ensemble' : (priorMesh ? 'graph_reg' : 'tikhonov');
                const re = rd.metrics[`relative_error_${method}`];
                const corr = rd.metrics[`correlation_${method}`];
                return (
                  <>
                    <dl className="cp-readout" style={{ marginTop: 10, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                      <div className="ro"><span className="v">{re}</span><span className="k">{pick(lang, 'relative error', 'error relativo')}</span></div>
                      <div className="ro"><span className="v">{corr}</span><span className="k">{pick(lang, 'correlation', 'correlación')}</span></div>
                      <div className="ro"><span className="v">{uqOn ? rd.metrics.uq_calibration_2sigma : '-'}</span><span className="k">{pick(lang, 'node-UQ (2 sigma)', 'UQ nodo (2 sigma)')}</span></div>
                    </dl>
                    <div className="pick-note">{uqOn && !priorMesh
                      ? pick(lang, 'The recalibrated ensemble is defined on the mesh-graph prior, so turning uncertainty on uses that prior. The accuracy delta over Tikhonov is small; the real payload is the calibrated per-node uncertainty.', 'El ensemble recalibrado se define sobre el prior de grafo de malla, así que activar la incertidumbre usa ese prior. La diferencia de precisión sobre Tikhonov es pequeña; el valor real es la incertidumbre por nodo calibrada.')
                      : pick(lang, 'Toggle the prior and the uncertainty to read the baked reconstruction each choice produces. The accuracy gain is modest; switching uncertainty on unlocks the per-node calibration (see the Reconstruction tab).', 'Alternar el prior y la incertidumbre para leer la reconstrucción precalculada que produce cada elección. La ganancia de precisión es modesta; activar la incertidumbre desbloquea la calibración por nodo (ver la pestaña Reconstrucción).')}</div>
                  </>
                );
              })()}
            </div>
            <HoverMathEq
              tex={String.raw`\mathcal{L}(\phi) = \lVert A\phi - \phi_{\text{body}}^{\text{meas}}\rVert_2^2 + \lambda^2\lVert L_{\text{mesh}}\phi\rVert_2^2, \quad \bar\phi = \tfrac1K\textstyle\sum_k \hat\phi^{(k)}, \;\; s = \tau\,\mathrm{std}_k\,\hat\phi^{(k)}`}
              terms={[
                { tex: String.raw`\lVert A\phi - \phi_{\text{body}}^{\text{meas}}\rVert_2^2`, meaning: pick(lang, 'data misfit: the recovery must reproduce the real measured body data through A', 'desajuste a datos: la recuperación debe reproducir los datos corporales reales medidos a través de A') },
                { tex: String.raw`L_{\text{mesh}}`, meaning: pick(lang, 'graph Laplacian of the real heart-cage triangulation: a piecewise-smooth prior on the surface', 'Laplaciano de grafo de la triangulación real de la jaula cardíaca: un prior suave por partes en la superficie') },
                { tex: String.raw`\bar\phi`, meaning: pick(lang, 'the ensemble mean, which is the reconstruction', 'la media del ensemble, que es la reconstrucción') },
                { tex: String.raw`s = \tau\,\mathrm{std}_k`, meaning: pick(lang, 'the recalibrated spread: tau matches the 2-sigma band to the real error, giving per-node uncertainty', 'la dispersión recalibrada: tau ajusta la banda de 2-sigma al error real, dando incertidumbre por nodo') },
              ]}
              caption={pick(lang, 'The data-plus-physics objective with the mesh graph-Laplacian prior; the ensemble mean is the reconstruction and the recalibrated spread s is the per-node uncertainty.', 'El objetivo datos-más-física con el prior de Laplaciano de grafo de la malla; la media del ensemble es la reconstrucción y la dispersión recalibrada s es la incertidumbre por nodo.')} />
          </div>
          <p className="measure">{pick(lang,
            'This is the physics-informed-learning idea, enforce the governing operator as a constraint while the measured data drives the fit, applied to the inverse problem (Raissi 2019; Sahli Costabal 2020 for cardiac). The current state of the art is moving toward generative (diffusion) priors that supply a learned prior with native uncertainty; we implement the physics-plus-graph prior with a recalibrated ensemble, which is self-contained and honest on real data.',
            'Esta es la idea del aprendizaje informado por física, imponer el operador gobernante como restricción mientras los datos medidos guían el ajuste, aplicada al problema inverso (Raissi 2019; Sahli Costabal 2020 para lo cardíaco). El estado del arte actual se mueve hacia priors generativos (de difusión) que aportan un prior aprendido con incertidumbre nativa; nosotros implementamos el prior de física-más-grafo con un ensemble recalibrado, autocontenido y honesto sobre datos reales.')}
            {' '}<Cite id="raissi2019" /> <Cite id="sahli2020" /></p>
          <Callout>
            {pick(lang,
              'The accuracy gain over a well-tuned Tikhonov is modest (see Benchmark); the real added value is the calibrated per-node uncertainty. A full boundary-element forward operator and a learned generative prior are the honest next steps to push the accuracy further.',
              'La ganancia de precisión sobre un Tikhonov bien ajustado es modesta (ver Benchmark); el valor agregado real es la incertidumbre por nodo calibrada. Un operador directo de elementos de contorno completo y un prior generativo aprendido son los siguientes pasos honestos para empujar la precisión.')}
          </Callout>
          <Refs ids={['raissi2019', 'sahli2020', 'lakshminarayanan2017', 'diffusion2026']} label="Refs" />
        </section>
      ),
    },
  ];

  if (loadError || !cat) {
    return (
      <div className="cardiopinn-layout prose">
        <div className="cp-main" style={{ gridColumn: '1 / -1' }}>
          <div className="page-head"><h1>{pick(lang, 'Real ECG imaging: recovering heart-surface potentials', 'Imagen de ECG real: recuperar potenciales de superficie cardíaca')}</h1></div>
          <div className="panel" role="status" style={{ marginTop: 16 }}>
            {loadError
              ? pick(lang, `The ECGi data could not be loaded (${loadError}). If you just deployed, hard-refresh once; the web reads a committed JSON trace.`, `No se pudieron cargar los datos de ECGi (${loadError}). Tras un despliegue reciente, recargar forzado una vez; la web lee un trace JSON versionado.`)
              : pick(lang, 'Loading the ECGi catalogue...', 'Cargando el catálogo de ECGi...')}
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
        {cat && ds && (
          <>
            <div className="cp-side-block">
              <label className="cp-field">
                <span>{pick(lang, 'Dataset', 'Conjunto de datos')}</span>
                <select className="cp-select" value={caseIdx} onChange={(e) => { const i = Number(e.target.value); setCaseIdx(i); setBeat(Object.keys(cat.cases[i].beats)[0]); setFrame(0); setPicked(null); }}>
                  {cat.cases.map((c, i) => <option key={c.id} value={i}>{pick(lang, DATASET_LABEL[c.id]?.[0] ?? c.name, DATASET_LABEL[c.id]?.[1] ?? c.name)}</option>)}
                </select>
              </label>
              <label className="cp-field">
                <span>{pick(lang, 'Beat', 'Latido')}</span>
                <select className="cp-select" value={beat} onChange={(e) => { setBeat(e.target.value); setFrame(0); setPicked(null); }}>
                  {Object.keys(ds.beats).map((r) => <option key={r} value={r}>{pick(lang, BEAT_LABEL[r]?.[0] ?? r, BEAT_LABEL[r]?.[1] ?? r)}</option>)}
                </select>
              </label>
            </div>
            {rd && (
              <div className="cp-side-block">
                <span className="cp-side-label">{pick(lang, 'Displayed reconstruction vs real gold standard', 'Reconstrucción mostrada vs patrón de oro real')}</span>
                <div className="cp-readout">
                  <div className="ro"><span className="v">{rd.metrics.relative_error_ensemble ?? rd.metrics.relative_error_tikhonov}</span><span className="k">{pick(lang, 'relative error', 'error relativo')}</span></div>
                  <div className="ro"><span className="v">{rd.metrics.correlation_ensemble ?? rd.metrics.correlation_tikhonov}</span><span className="k">{pick(lang, 'correlation', 'correlación')}</span></div>
                  <div className="ro"><span className="v">{rd.metrics.uq_calibration_2sigma}</span><span className="k">{pick(lang, 'node-UQ (2σ)', 'UQ nodo (2σ)')}</span></div>
                  <div className="ro"><span className="v">{rd.metrics.n_heart_electrodes}</span><span className="k">{pick(lang, 'heart nodes', 'nodos cardíacos')}</span></div>
                </div>
                <p className="muted small" style={{ margin: '8px 0 0' }}>{pick(lang,
                  'These are the ensemble (physics-informed) reconstruction the app shows. The oracle-Tikhonov baseline is modestly more accurate; the Benchmark page compares all methods. The scale-dependent relative error uses a single magnitude gain calibrated on the first-half cage; correlation is scale-free.',
                  'Estas son de la reconstrucción por ensemble (informada por física) que muestra la app. El baseline Tikhonov por oráculo es algo más preciso; la página Benchmark compara todos los métodos. El error relativo (dependiente de escala) usa una ganancia de magnitud calibrada en la primera mitad de la jaula; la correlación no depende de la escala.')}</p>
              </div>
            )}
            <div className="cp-side-foot">{pick(lang,
              'Real EDGAR experiment: heart-surface potentials recovered from a body-surface recording, scored against the simultaneously measured cage. The field toggle, beat scrubber and node-pick live in the Reconstruction tab.',
              'Experimento real EDGAR: potenciales de superficie cardíaca recuperados de un registro de superficie corporal, puntuados contra la jaula medida simultáneamente. El campo, el latido y la selección de nodo están en la pestaña Reconstrucción.')}</div>
          </>
        )}
        </div>
      </aside>
      <div className="cp-main">
      <div className="page-head">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1>{pick(lang, 'Real ECG imaging: recovering heart-surface potentials', 'Imagen de ECG real: recuperar potenciales de superficie cardíaca')}</h1>
          <span className="badge live">REAL DATA · {cat ? cat.cases.reduce((s, c) => s + Object.keys(c.beats).length, 0) : 0} {pick(lang, 'beats', 'latidos')}</span>
        </div>
        <p className="lede">
          {pick(lang,
            'From a real body-surface recording, reconstruct the electrical potentials on the heart surface (the map a clinician needs to localize an arrhythmia but cannot measure without opening the chest). The two are linked by a fixed operator ',
            'A partir de un registro real de superficie corporal, reconstruir los potenciales eléctricos en la superficie del corazón (el mapa que un clínico necesita para localizar una arritmia pero no puede medir sin abrir el tórax). Ambos se enlazan por un operador fijo ')}
          <InlineMath tex={String.raw`\phi_{\text{body}}=A\,\phi_{\text{heart}}`} />
          {pick(lang,
            '; recovering the heart term is a severely ill-posed inverse. We solve it on a real torso-tank experiment (EDGAR) where the true heart-surface potentials were recorded simultaneously, so the reconstruction is validated against a real gold standard.',
            '; recuperar el término cardíaco es un inverso severamente mal planteado. Lo resolvemos sobre un experimento real de tanque de torso (EDGAR) donde los potenciales verdaderos de superficie cardíaca se registraron simultáneamente, así que la reconstrucción se valida contra un patrón de oro real.')}
        </p>
      </div>

      <Tabs tabs={tabs} ariaLabel={pick(lang, 'Real ECGi sections', 'Secciones de ECGi real')} />
      </div>
    </div>
  );
}
