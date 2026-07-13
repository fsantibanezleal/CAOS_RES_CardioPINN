import { useEffect, useState } from 'react';
import { loadIndex, loadManifest } from '../api/artifacts';
import { useLang, pick } from '../store';
import type { CaseManifest } from '../lib/contract.types';

export function Experiments() {
  const lang = useLang();
  const [manifests, setManifests] = useState<CaseManifest[]>([]);
  useEffect(() => {
    loadIndex().then((idx) => Promise.all(idx.cases.map((c) => loadManifest(c.case_id))).then(setManifests));
  }, []);
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="panel">
        <h1 style={{ marginTop: 0 }}>{pick(lang, 'Experiments', 'Experimentos')}</h1>
        <p>{pick(lang,
          'Each vertical is a research experiment: a governing equation, a ground-truth source, a PINN, and a comparison against the classical baselines. The table lists every vertical, its category, physics ladder, and lane (live in-browser inference vs baked replay).',
          'Cada vertical es un experimento de investigacion: una ecuacion gobernante, una fuente de verdad de referencia, una PINN, y una comparacion contra los baselines clasicos. La tabla lista cada vertical, su categoria, escalera de fisica, y lane (inferencia en vivo en el navegador vs replay horneado).')}</p>
      </div>
      <div className="panel overflow-x">
        <table>
          <thead><tr><th>Vertical</th><th>Category</th><th>Lane</th><th>SOTA method</th><th>Beyond SOTA</th></tr></thead>
          <tbody>
            {manifests.map((m) => (
              <tr key={m.case_id}>
                <td><b>{m.title}</b><div className="small muted">{m.real_or_synthetic}</div></td>
                <td className="small">{m.category}</td>
                <td><span className={`badge ${m.lane === 'live' ? 'live' : 'replay'}`}>{m.lane}</span></td>
                <td className="small">{m.ladder.sota}</td>
                <td className="small">{m.ladder.novel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
