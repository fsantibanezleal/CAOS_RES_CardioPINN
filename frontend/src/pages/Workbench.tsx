import { useEffect, useRef, useState } from 'react';
import { loadIndex, loadManifest, loadTrace } from '../api/artifacts';
import { Tabs } from '../components/Tabs';
import { Refs } from '../components/Refs';
import { CardiacMeshKit } from '../kits/CardiacMeshKit';
import { CONTEXT_REGISTRY } from '../content/registry';
import { runField } from '../lib/onnx';
import { t } from '../i18n';
import { useLang, useStore, pick } from '../store';
import type { CaseIndex, CaseManifest, Trace } from '../lib/contract.types';

const BASE = import.meta.env.BASE_URL;

export function Workbench() {
  const lang = useLang();
  const { caseId, setCase, field, setField, timeCursor, setTimeCursor, showSensors, setShowSensors } = useStore();
  const [index, setIndex] = useState<CaseIndex | null>(null);
  const [manifest, setManifest] = useState<CaseManifest | null>(null);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [sub, setSub] = useState('field');
  const [live, setLive] = useState<Float32Array | null>(null);
  const [liveMsg, setLiveMsg] = useState('');
  const rafRef = useRef<number | null>(null);

  useEffect(() => { loadIndex().then((idx) => { setIndex(idx); if (!caseId && idx.cases[0]) setCase(idx.cases[0].case_id); }); }, []);

  useEffect(() => {
    if (!caseId) return;
    setManifest(null); setTrace(null); setLive(null);
    loadManifest(caseId).then((m) => { setManifest(m); loadTrace(m.artifact.path).then(setTrace); });
  }, [caseId]);

  // wavefront animation: run ONCE from 0 to 1 over ~3.2 s, halt on hidden tab (no autoplay, no compute bomb)
  const playOnce = () => {
    if (rafRef.current) return;
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / 3200);
      setTimeCursor(p);
      if (p < 1 && document.visibilityState === 'visible') { rafRef.current = requestAnimationFrame(step); }
      else { rafRef.current = null; }
    };
    rafRef.current = requestAnimationFrame(step);
  };
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const runLive = async () => {
    if (!trace || !manifest?.onnx) return;
    setLiveMsg(pick(lang, 'running...', 'ejecutando...'));
    const n = trace.mesh.vertices.length;
    const xy = new Float32Array(n * 2);
    trace.mesh.vertices.forEach((v, i) => { xy[i * 2] = v[0]; xy[i * 2 + 1] = v[1]; });
    try {
      const out = await runField(`${BASE}models/${manifest.onnx.path}`, xy);
      setLive(out);
      setLiveMsg(pick(lang, `re-ran the PINN on ${n} vertices in the browser (ONNX parity ${manifest.onnx.parity_max_abs.toExponential(1)})`,
        `re-ejecuto la PINN en ${n} vertices en el navegador (paridad ONNX ${manifest.onnx.parity_max_abs.toExponential(1)})`));
    } catch (e) {
      setLiveMsg(pick(lang, 'ONNX run failed: ', 'fallo la ejecucion ONNX: ') + String(e));
    }
  };

  if (!index) return <div className="panel">Loading catalogue...</div>;

  const ContextBlock = caseId ? CONTEXT_REGISTRY[caseId] : undefined;
  const fieldKeys = trace ? Object.keys(trace.fields) : [];
  const subtabs = [
    { id: 'field', label: t(lang, 'tab.field') },
    { id: 'compare', label: t(lang, 'tab.compare') },
    { id: 'live', label: t(lang, 'tab.live') },
    { id: 'context', label: t(lang, 'tab.context') },
  ];

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row">
          <span className="muted small">{t(lang, 'ui.select_case')}:</span>
          <select value={caseId ?? ''} onChange={(e) => setCase(e.target.value)}>
            {index.cases.map((c) => <option key={c.case_id} value={c.case_id}>{c.title}</option>)}
          </select>
        </div>
        {manifest && <span className={`badge ${manifest.lane === 'live' ? 'live' : 'replay'}`}>{manifest.lane}</span>}
      </div>

      {manifest && (
        <div className="cardgrid">
          {Object.entries(manifest.metrics).slice(0, 6).map(([k, v]) => (
            <div key={k} className="panel metric"><span className="v">{typeof v === 'number' ? (Math.abs(v) < 1 ? v.toFixed(3) : v.toFixed(2)) : String(v)}</span><span className="k">{k}</span></div>
          ))}
        </div>
      )}

      <Tabs tabs={subtabs} active={sub} onChange={setSub} />

      {!trace && <div className="panel">Loading artifact...</div>}

      {trace && sub === 'field' && (
        <div className="grid" style={{ gap: 12 }}>
          <div className="row">
            <span className="muted small">{t(lang, 'ui.method')}:</span>
            {fieldKeys.map((f) => <span key={f} className={`chip ${field === f ? 'on' : ''}`} onClick={() => setField(f)}>{f}</span>)}
          </div>
          <CardiacMeshKit trace={trace} field={field} timeCursor={timeCursor} showSensors={showSensors} />
          <div className="row">
            <span className="muted small">{t(lang, 'ui.wavefront')}:</span>
            <input type="range" min={0} max={1} step={0.01} value={timeCursor} onChange={(e) => setTimeCursor(Number(e.target.value))} />
            <button className="iconbtn" onClick={playOnce}>{t(lang, 'ui.play')}</button>
            <span className={`chip ${showSensors ? 'on' : ''}`} onClick={() => setShowSensors(!showSensors)}>{t(lang, 'ui.sensors')}</span>
          </div>
        </div>
      )}

      {trace && sub === 'compare' && (
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {fieldKeys.slice(0, 4).map((f) => (
            <div key={f} className="grid" style={{ gap: 6 }}>
              <div className="small muted">{f}</div>
              <CardiacMeshKit trace={trace} field={f} timeCursor={1} showSensors={false} />
            </div>
          ))}
        </div>
      )}

      {trace && sub === 'live' && manifest && (
        <div className="grid" style={{ gap: 12 }}>
          <div className="row">
            <button className="iconbtn" onClick={runLive} disabled={!manifest.onnx}>{t(lang, 'ui.live_run')}</button>
            <span className="small muted">{manifest.onnx ? liveMsg : pick(lang, 'this vertical is replay-only (no ONNX)', 'este vertical es solo replay (sin ONNX)')}</span>
          </div>
          <CardiacMeshKit trace={trace} field={field} timeCursor={1} showSensors={showSensors} liveValues={live} />
          <p className="small muted">{pick(lang,
            'The exported PINN runs in the browser via onnxruntime-web. The live field is the network re-inferred on your machine, not a precomputed image.',
            'La PINN exportada corre en el navegador via onnxruntime-web. El campo en vivo es la red re-inferida en tu maquina, no una imagen precomputada.')}</p>
        </div>
      )}

      {sub === 'context' && manifest && (
        <div className="grid" style={{ gap: 14 }}>
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>{manifest.title}</h3>
            <p className="muted small">{manifest.expected_band}</p>
            <div className="ladder">
              <div className="rung"><b>Classical</b>: {manifest.ladder.classical}</div>
              <div className="rung sota"><b>SOTA</b>: {manifest.ladder.sota}</div>
              <div className="rung novel"><b>Beyond SOTA</b>: {manifest.ladder.novel}</div>
            </div>
          </div>
          {ContextBlock && <ContextBlock />}
          <Refs items={manifest.references} />
        </div>
      )}
    </div>
  );
}
