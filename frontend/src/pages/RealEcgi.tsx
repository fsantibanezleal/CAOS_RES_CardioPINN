import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { turbo, turboCss } from '../kits/colormap';
import { useLang, pick } from '../store';

const BASE = import.meta.env.BASE_URL;

interface RhythmData {
  mesh: { vertices: number[][]; triangles: number[][]; n_vertices: number; n_triangles: number };
  times_ms: number[];
  fields_over_time: Record<string, number[][]>;
  metrics: Record<string, number>;
  source: string;
}
interface Artifact { schema: string; case_id: string; rhythms: Record<string, RhythmData>; }

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
    for (let i = 0; i < vals.length; i++) {
      const [r, g2, b] = turbo((vals[i] - lo) / (hi - lo));
      color.setXYZ(i, r, g2, b);
    }
    color.needsUpdate = true;
  }, [geom, rd, field, frame]);

  return (
    <mesh geometry={geom}><meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.7} metalness={0.0} /></mesh>
  );
}

export function RealEcgi() {
  const lang = useLang();
  const [art, setArt] = useState<Artifact | null>(null);
  const [rhythm, setRhythm] = useState('avp');
  const [field, setField] = useState('recovered_mV');
  const [frame, setFrame] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => { fetch(`${BASE}data/real-ecgi-edgar/trace.json`).then((r) => r.json()).then(setArt); }, []);

  const playOnce = () => {
    if (raf.current || !art) return;
    const n = art.rhythms[rhythm].times_ms.length;
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

  if (!art) return <div className="panel">Loading real ECGi reconstruction...</div>;
  const rd = art.rhythms[rhythm];
  const m = rd.metrics;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1 style={{ margin: 0 }}>{pick(lang, 'Real ECGi: heart potentials from a real body-surface recording', 'ECGi real: potenciales cardiacos desde un registro real de superficie corporal')}</h1>
          <span className="badge live">REAL DATA</span>
        </div>
        <p className="muted">{pick(lang,
          'A torso tank (EDGAR, Consortium for ECG Imaging) records the real body-surface potentials on 192 electrodes AND the true heart-surface potentials on a 256-electrode cage. We fit the real body-surface data through a forward operator on the real geometry and recover the heart-surface potentials, then check them against the real measured cage. In a patient you only have the body surface; here we have the real gold standard to prove it works.',
          'Un tanque de torso (EDGAR, Consortium for ECG Imaging) registra los potenciales reales de superficie corporal en 192 electrodos Y los potenciales verdaderos de superficie cardiaca en una jaula de 256 electrodos. Ajustamos los datos reales de superficie corporal a traves de un operador directo sobre la geometria real y recuperamos los potenciales de superficie cardiaca, luego los verificamos contra la jaula real medida.')}</p>
      </div>

      <div className="cardgrid">
        <div className="panel metric"><span className="v">{m.relative_error_tikhonov}</span><span className="k">relative error vs REAL heart potentials</span></div>
        <div className="panel metric"><span className="v">{m.correlation_tikhonov}</span><span className="k">correlation vs REAL heart potentials</span></div>
        <div className="panel metric"><span className="v">{m.uq_calibration_2sigma}</span><span className="k">node-UQ reliability (2 sigma)</span></div>
        <div className="panel metric"><span className="v">{m.n_heart_electrodes}</span><span className="k">heart electrodes recovered</span></div>
      </div>

      <div className="panel">
        <div className="row" style={{ marginBottom: 10 }}>
          <span className="muted small">{pick(lang, 'Rhythm', 'Ritmo')}:</span>
          {Object.keys(art.rhythms).map((r) => <span key={r} className={`chip ${rhythm === r ? 'on' : ''}`} onClick={() => { setRhythm(r); setFrame(0); }}>{r}</span>)}
          <span className="muted small" style={{ marginLeft: 12 }}>{pick(lang, 'Field', 'Campo')}:</span>
          {FIELDS.map((f) => <span key={f} className={`chip ${field === f ? 'on' : ''}`} onClick={() => setField(f)}>{pick(lang, FIELD_LABEL[f][0], FIELD_LABEL[f][1])}</span>)}
        </div>
        <div className="canvas-wrap">
          <Canvas camera={{ position: [90, -70, 60], fov: 40, up: [0, 0, 1] }}>
            <ambientLight intensity={0.55} />
            <directionalLight position={[80, -60, 90]} intensity={0.9} />
            <directionalLight position={[-70, 50, -40]} intensity={0.4} />
            <CageMesh rd={rd} field={field} frame={frame} />
            <OrbitControls target={[0, 0, 0]} />
          </Canvas>
          <div className="legend">
            <div>{pick(lang, FIELD_LABEL[field][0], FIELD_LABEL[field][1])} (mV)</div>
            <div className="bar" style={{ background: `linear-gradient(90deg, ${turboCss(0)}, ${turboCss(0.5)}, ${turboCss(1)})` }} />
          </div>
          <div className="readout">t = {rd.times_ms[frame]} ms</div>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <span className="muted small">{pick(lang, 'Beat time', 'Tiempo del latido')}:</span>
          <input type="range" min={0} max={rd.times_ms.length - 1} value={frame} onChange={(e) => setFrame(Number(e.target.value))} />
          <button className="iconbtn" onClick={playOnce}>{pick(lang, 'Play beat', 'Reproducir latido')}</button>
        </div>
      </div>

      <div className="panel small muted">
        {pick(lang,
          'Honesty: the target we fit is REAL measured body-surface data; the validation is the REAL measured heart-surface data. The forward operator is a single-layer approximation on the real geometry (a full boundary-element model would improve accuracy). Data: EDGAR (Consortium for ECG Imaging), Utah torso-tank 2018-08-09, used under the EDGAR data-use agreement with attribution; raw data not redistributed. Aras et al., J. Electrocardiol. 48:975 (2015), DOI 10.1016/j.jelectrocard.2015.08.008.',
          'Honestidad: el objetivo que ajustamos son datos reales medidos de superficie corporal; la validacion son los datos reales medidos de superficie cardiaca. El operador directo es una aproximacion de capa simple sobre la geometria real. Datos: EDGAR (Consortium for ECG Imaging), tanque de torso Utah 2018-08-09, usado bajo el acuerdo de uso de EDGAR con atribucion; datos crudos no redistribuidos.')}
      </div>
    </div>
  );
}
