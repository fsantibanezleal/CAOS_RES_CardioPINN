import { useEffect, useState } from 'react';
import { Callout } from '../components/Callout';
import { Refs } from '../components/Refs';
import { useLang, pick } from '../store';

const BASE = import.meta.env.BASE_URL;

export function Benchmark() {
  const lang = useLang();
  const [art, setArt] = useState<any>(null);
  useEffect(() => { fetch(`${BASE}data/real-ecgi-edgar/trace.json`).then((r) => r.json()).then(setArt).catch(() => setArt(null)); }, []);

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>Benchmark</h1>
        <p className="lede">{pick(lang,
          'Classical Tikhonov against the graph-regularized reconstruction and the deep ensemble, all judged against the same REAL measured heart-surface potentials, on the AV-paced beat. The comparison is fair: Tikhonov is given its oracle-best regularization.',
          'Tikhonov clasico contra la reconstruccion regularizada por grafo y el ensemble profundo, todos juzgados contra los mismos potenciales REALES medidos de superficie cardiaca, en el latido con marcapaso AV. La comparacion es justa: a Tikhonov se le da su mejor regularizacion por oraculo.')}</p>
      </div>

      <section>
        <h2>{pick(lang, 'Method comparison (real ground truth)', 'Comparacion de metodos (verdad de referencia real)')}</h2>
        {!art ? <div className="panel">Loading...</div> : (() => {
          const m = art.rhythms['avp'].metrics;
          const rows: [string, number, number, string][] = [
            [pick(lang, 'Tikhonov (classical, oracle lambda)', 'Tikhonov (clasico, lambda oraculo)'), m.relative_error_tikhonov, m.correlation_tikhonov, pick(lang, 'none', 'ninguna')],
            [pick(lang, 'Graph-regularized (surface prior)', 'Regularizado por grafo (prior de superficie)'), m.relative_error_graph_reg, m.correlation_graph_reg, pick(lang, 'none', 'ninguna')],
            [pick(lang, 'Ensemble (graph + node UQ)', 'Ensemble (grafo + UQ por nodo)'), m.relative_error_ensemble, m.correlation_ensemble, `${m.uq_calibration_2sigma}`],
          ];
          return (
            <div className="overflow-x">
              <table>
                <thead><tr><th>{pick(lang, 'Method', 'Metodo')}</th><th>{pick(lang, 'Relative error', 'Error relativo')}</th><th>{pick(lang, 'Correlation', 'Correlacion')}</th><th>{pick(lang, 'Node-UQ (2 sigma)', 'UQ por nodo (2 sigma)')}</th></tr></thead>
                <tbody>{rows.map((r, i) => <tr key={i}><td>{r[0]}</td><td className="mono">{r[1]}</td><td className="mono">{r[2]}</td><td className="mono">{r[3]}</td></tr>)}</tbody>
              </table>
            </div>
          );
        })()}
      </section>

      <section>
        <h2>{pick(lang, 'What the comparison shows', 'Que muestra la comparacion')}</h2>
        <p>{pick(lang,
          'A well-tuned Tikhonov is a strong baseline: the graph-regularized reconstruction matches it on relative error and shifts the correlation only slightly, because both are limited by the same single-layer forward operator. The real, decisive difference is the calibrated per-node uncertainty the ensemble provides and the deterministic estimates cannot: it tells a clinician which parts of the recovered map to trust. Improving the forward operator (a full boundary-element model) and replacing the hand-chosen prior with a learned generative prior are the honest routes to a larger accuracy gain.',
          'Un Tikhonov bien ajustado es un baseline fuerte: la reconstruccion regularizada por grafo lo iguala en error relativo y cambia la correlacion solo ligeramente, porque ambos estan limitados por el mismo operador directo de capa simple. La diferencia real y decisiva es la incertidumbre por nodo calibrada que aporta el ensemble y que las estimaciones deterministas no pueden: le dice a un clinico que partes del mapa recuperado confiar. Mejorar el operador directo (un modelo de elementos de contorno completo) y reemplazar el prior elegido a mano por un prior generativo aprendido son las rutas honestas a una mayor ganancia de precision.')}</p>
        <Callout>
          {pick(lang,
            'We report the honest finding rather than an inflated one: the accuracy improvement over a strong classical baseline is modest, and the contribution is the calibrated uncertainty. Overstating a headline accuracy gain would be the kind of result this project exists to avoid.',
            'Reportamos el hallazgo honesto en lugar de uno inflado: la mejora de precision sobre un baseline clasico fuerte es modesta, y la contribucion es la incertidumbre calibrada. Exagerar una ganancia de precision de titular seria el tipo de resultado que este proyecto existe para evitar.')}
        </Callout>
        <Refs ids={['ghosh2009', 'cluitmans2018', 'diffusion2026']} />
      </section>
    </div>
  );
}
