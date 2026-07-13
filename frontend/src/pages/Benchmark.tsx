import { useEffect, useState } from 'react';
import { loadIndex, loadManifest } from '../api/artifacts';
import { useLang, pick } from '../store';
import type { CaseManifest } from '../lib/contract.types';

export function Benchmark() {
  const lang = useLang();
  const [manifests, setManifests] = useState<CaseManifest[]>([]);
  useEffect(() => {
    loadIndex().then((idx) => Promise.all(idx.cases.map((c) => loadManifest(c.case_id))).then(setManifests));
  }, []);

  const allKeys = Array.from(new Set(manifests.flatMap((m) => Object.keys(m.metrics))));

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="panel">
        <h1 style={{ marginTop: 0 }}>Benchmark</h1>
        <p>{pick(lang,
          'The measured metrics of every baked vertical, read from the committed manifests. Values are the exact numbers the offline GPU bake produced; the ONNX parity is the PyTorch-vs-onnxruntime max-abs error that licenses live in-browser re-inference.',
          'Las metricas medidas de cada vertical horneado, leidas de los manifests comprometidos. Los valores son los numeros exactos que produjo el horneado GPU offline; la paridad ONNX es el error max-abs PyTorch-vs-onnxruntime que autoriza la re-inferencia en vivo en el navegador.')}</p>
      </div>
      <div className="panel overflow-x">
        <table>
          <thead>
            <tr><th>Vertical</th>{allKeys.map((k) => <th key={k}>{k}</th>)}<th>ONNX bytes</th><th>parity</th></tr>
          </thead>
          <tbody>
            {manifests.map((m) => (
              <tr key={m.case_id}>
                <td><b>{m.title}</b></td>
                {allKeys.map((k) => <td key={k} className="mono">{k in m.metrics ? String(m.metrics[k]) : '-'}</td>)}
                <td className="mono">{m.onnx ? m.onnx.bytes : '-'}</td>
                <td className="mono">{m.onnx ? m.onnx.parity_max_abs.toExponential(1) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
