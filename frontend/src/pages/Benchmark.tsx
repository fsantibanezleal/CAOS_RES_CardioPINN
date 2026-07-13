import { useEffect, useState } from 'react';
import { useLang, pick } from '../store';

const BASE = import.meta.env.BASE_URL;

export function Benchmark() {
  const lang = useLang();
  const [art, setArt] = useState<any>(null);
  useEffect(() => { fetch(`${BASE}data/real-ecgi-edgar/trace.json`).then((r) => r.json()).then(setArt).catch(() => setArt(null)); }, []);
  if (!art) return <div className="panel">Loading...</div>;
  const m = art.rhythms['avp'].metrics;
  const rows = [
    ['Tikhonov (classical, oracle lambda)', m.relative_error_tikhonov, m.correlation_tikhonov, pick(lang, 'none', 'ninguna')],
    ['Graph-regularized (heart-surface prior)', m.relative_error_graph_reg, m.correlation_graph_reg, pick(lang, 'none', 'ninguna')],
    ['Ensemble (graph + node UQ)', m.relative_error_ensemble, m.correlation_ensemble, `${m.uq_calibration_2sigma} (2 sigma)`],
  ];
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="panel">
        <h1 style={{ marginTop: 0 }}>{pick(lang, 'Method comparison', 'Comparacion de metodos')}</h1>
        <p>{pick(lang,
          'The reconstruction methods on the AV-paced beat, all validated against the REAL measured heart-surface potentials. The honest finding: a well-tuned classical Tikhonov is a strong baseline; the graph-regularized reconstruction matches it, and the real added value is the calibrated per-node uncertainty, which a single point estimate cannot provide. Improving the forward operator (boundary elements) would lift all methods.',
          'Los metodos de reconstruccion en el latido con marcapaso AV, todos validados contra los potenciales reales medidos de superficie cardiaca. El hallazgo honesto: un Tikhonov clasico bien ajustado es un baseline fuerte; la reconstruccion regularizada por grafo lo iguala, y el valor agregado real es la incertidumbre por nodo calibrada.')}</p>
      </div>
      <div className="panel overflow-x">
        <table>
          <thead><tr><th>{pick(lang, 'Method', 'Metodo')}</th><th>{pick(lang, 'Relative error', 'Error relativo')}</th><th>{pick(lang, 'Correlation', 'Correlacion')}</th><th>{pick(lang, 'Per-node uncertainty', 'Incertidumbre por nodo')}</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}><td>{r[0]}</td><td className="mono">{r[1]}</td><td className="mono">{r[2]}</td><td className="mono">{r[3]}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
