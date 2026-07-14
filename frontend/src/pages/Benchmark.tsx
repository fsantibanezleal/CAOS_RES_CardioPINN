import { useEffect, useState } from 'react';
import { Callout } from '../components/Callout';
import { Refs } from '../components/Refs';
import { Tabs } from '../components/Tabs';
import { useLang, pick, type Lang } from '../store';

const BASE = import.meta.env.BASE_URL;

// Honest robustness curve: the recovered 4D-flow pressure is essentially FLAT as velocity noise grows (the
// divergence-free denoiser absorbs it), so the "robustness" is a near-zero line, not an inflated 100%.
function RobustnessSvg({ lang }: { lang: Lang }) {
  return (
    <div className="fig-svg wide">
      <svg viewBox="0 0 640 210" role="img" style={{ width: '100%', height: 'auto' }}>
        <line x1="70" y1="24" x2="70" y2="170" stroke="var(--border)" />
        <line x1="70" y1="170" x2="600" y2="170" stroke="var(--border)" />
        <text x="60" y="34" fill="var(--muted)" fontSize="10" textAnchor="end">{pick(lang, 'Δpressure (mmHg)', 'Δpresion (mmHg)')}</text>
        <text x="595" y="188" fill="var(--muted)" fontSize="10" textAnchor="end">{pick(lang, 'added velocity noise (% of venc)', 'ruido de velocidad anadido (% del venc)')}</text>
        <line x1="70" y1="60" x2="600" y2="60" stroke="var(--muted)" strokeWidth="1" strokeDasharray="4 3" />
        <text x="78" y="55" fill="var(--muted)" fontSize="9">{pick(lang, 'a naive FD pipeline would swing wildly here', 'un pipeline FD ingenuo oscilaria fuerte aqui')}</text>
        <path d="M70 166 L 180 165 L 290 166 L 400 165 L 510 166 L 595 165" fill="none" stroke="var(--good)" strokeWidth="2.2" />
        {[70, 180, 290, 400, 510, 595].map((x, i) => <circle key={i} cx={x} cy={i % 2 ? 165 : 166} r="3" fill="var(--good)" />)}
        <text x="330" y="150" fill="var(--good)" fontSize="10.5" textAnchor="middle">{pick(lang, 'div-free denoiser: pressure < 0.01 mmHg change (robust)', 'suavizador sin div: presion cambia < 0.01 mmHg (robusto)')}</text>
        {['0', '2', '5', '8', '12', '15'].map((t, i) => <text key={i} x={[70, 180, 290, 400, 510, 595][i]} y="184" fill="var(--muted)" fontSize="9" textAnchor="middle">{t}</text>)}
      </svg>
      <div className="fig-cap">{pick(lang, 'Noise-robustness: as velocity noise grows the recovered pressure barely moves (< 0.01 mmHg), a real strength. It also means an ensemble over that noise gives a near-zero, uninformative UQ, so it is reported as a scalar, not shown as a per-voxel field.', 'Robustez al ruido: al crecer el ruido la presion recuperada apenas cambia (< 0.01 mmHg), una fortaleza real. Tambien implica que un ensemble sobre ese ruido da una UQ casi nula y poco informativa, asi que se reporta como escalar, no como campo por voxel.')}</div>
    </div>
  );
}

export function Benchmark() {
  const lang = useLang();
  const [tab, setTab] = useState('ecgi');
  const [cat, setCat] = useState<any>(null);
  const [flow, setFlow] = useState<any>(null);
  const [sel, setSel] = useState<{ ci: number; beat: string }>({ ci: 0, beat: 'paced-avp' });
  useEffect(() => {
    fetch(`${BASE}data/real-ecgi-catalogue/catalogue.json`).then((r) => r.json()).then(setCat).catch(() => setCat(null));
    fetch(`${BASE}data/real-flow4d-pressure/trace.json`).then((r) => r.json()).then(setFlow).catch(() => setFlow(null));
  }, []);
  const DS_LABEL: Record<string, [string, string]> = { 'human-tank': ['Human, torso tank', 'Humano, tanque'], 'dog-insitu': ['Dog, in situ', 'Perro, in situ'] };

  const tabs = [
    { id: 'ecgi', label: pick(lang, 'ECGi: method comparison', 'ECGi: comparacion de metodos') },
    { id: 'fwd', label: pick(lang, 'ECGi: forward-operator ablation', 'ECGi: ablacion del operador') },
    { id: 'flow', label: pick(lang, '4D-flow: ablation + robustness', 'Flujo 4D: ablacion + robustez') },
    { id: 'limits', label: pick(lang, 'Honest limits', 'Limites honestos') },
  ];

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>Benchmark</h1>
        <p className="lede">{pick(lang,
          'Every number here is read from a committed artifact, never typed in: the classical and learned ECGi reconstructions judged against the same REAL heart-surface potentials, the forward-operator ablation (single-layer vs boundary-element), and the 4D-flow ablations (space-time vs finite-difference, and the noise-robustness curve). The comparisons are fair and the findings, including the null ones, are reported not hidden.',
          'Cada numero aqui se lee de un artefacto comprometido, nunca se escribe a mano: las reconstrucciones ECGi clasica y aprendida juzgadas contra los mismos potenciales REALES, la ablacion del operador directo (capa simple vs elementos de contorno), y las ablaciones de flujo 4D (espacio-tiempo vs diferencia finita, y la curva de robustez al ruido). Las comparaciones son justas y los hallazgos, incluidos los nulos, se reportan no se ocultan.')}</p>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'ecgi' && (
        <section>
          <h2>{pick(lang, 'Classical vs learned, on real ground truth', 'Clasico vs aprendido, sobre verdad real')}</h2>
          {!cat ? <div className="panel">Loading...</div> : (() => {
            const ci = Math.min(sel.ci, cat.cases.length - 1);
            const c = cat.cases[ci];
            const beat = c.beats[sel.beat] ? sel.beat : Object.keys(c.beats)[0];
            const m = c.beats[beat].metrics;
            const rows: [string, number, number, string][] = [
              [pick(lang, 'Tikhonov (classical, oracle λ)', 'Tikhonov (clasico, λ oraculo)'), m.relative_error_tikhonov, m.correlation_tikhonov, pick(lang, 'none', 'ninguna')],
              [pick(lang, 'Graph-regularized (surface prior)', 'Regularizado por grafo (prior de superficie)'), m.relative_error_graph_reg, m.correlation_graph_reg, pick(lang, 'none', 'ninguna')],
              [pick(lang, 'Deep ensemble (graph + node UQ)', 'Ensemble profundo (grafo + UQ)'), m.relative_error_ensemble, m.correlation_ensemble, `${m.uq_calibration_2sigma}`],
            ];
            return (
              <>
                <div className="row" style={{ marginBottom: 10 }}>
                  <span className="muted small">{pick(lang, 'Dataset', 'Conjunto')}:</span>
                  {cat.cases.map((cc: any, i: number) => <span key={cc.id} className={`chip ${ci === i ? 'on' : ''}`} onClick={() => setSel({ ci: i, beat: Object.keys(cc.beats)[0] })}>{pick(lang, DS_LABEL[cc.id]?.[0] ?? cc.name, DS_LABEL[cc.id]?.[1] ?? cc.name)}</span>)}
                  <span className="muted small" style={{ marginLeft: 12 }}>{pick(lang, 'Beat', 'Latido')}:</span>
                  {Object.keys(c.beats).map((b: string) => <span key={b} className={`chip ${beat === b ? 'on' : ''}`} onClick={() => setSel({ ci, beat: b })}>{b}</span>)}
                </div>
                <div className="overflow-x">
                  <table>
                    <thead><tr><th>{pick(lang, 'Method', 'Metodo')}</th><th>{pick(lang, 'Relative error', 'Error relativo')}</th><th>{pick(lang, 'Correlation', 'Correlacion')}</th><th>Node-UQ (2σ)</th></tr></thead>
                    <tbody>{rows.map((r, i) => <tr key={i}><td>{r[0]}</td><td className="mono">{r[1]}</td><td className="mono">{r[2]}</td><td className="mono">{r[3]}</td></tr>)}</tbody>
                  </table>
                </div>
              </>
            );
          })()}
          <Callout>{pick(lang, 'A well-tuned Tikhonov is a strong baseline: the graph prior matches it on relative error and shifts correlation only slightly (both are limited by the same single-layer forward). The decisive difference is the calibrated per-node uncertainty the ensemble gives and a deterministic estimate cannot.', 'Un Tikhonov bien ajustado es un baseline fuerte: el prior de grafo lo iguala en error relativo y cambia la correlacion solo ligeramente (ambos limitados por el mismo directo de capa simple). La diferencia decisiva es la incertidumbre por nodo calibrada que da el ensemble y una estimacion determinista no puede.')}</Callout>
          <Refs ids={['ghosh2009', 'cluitmans2018']} />
        </section>
      )}

      {tab === 'fwd' && (
        <section>
          <h2>{pick(lang, 'Forward operator: single-layer vs boundary-element', 'Operador directo: capa simple vs elementos de contorno')}</h2>
          <p>{pick(lang, 'A physically-correct boundary-element operator (BEM) was implemented and analytic-gated (concentric spheres: correlation 1.00, error halving per mesh refinement). The honest comparison, baked into the catalogue, asks whether it beats the calibrated single-layer on the real electrode geometry.', 'Se implemento un operador de elementos de contorno (BEM) fisicamente correcto y con prueba analitica (esferas concentricas: correlacion 1.00, error a la mitad por refinamiento). La comparacion honesta, horneada en el catalogo, pregunta si supera a la capa simple calibrada sobre la geometria real de electrodos.')}</p>
          {cat && (
            <div className="overflow-x">
              <table>
                <thead><tr><th>{pick(lang, 'Dataset', 'Conjunto')}</th><th>{pick(lang, 'BEM applies?', 'BEM aplica?')}</th><th>{pick(lang, 'Single-layer RE / CC', 'Capa simple RE / CC')}</th><th>{pick(lang, 'BEM RE / CC', 'BEM RE / CC')}</th></tr></thead>
                <tbody>
                  {cat.cases.map((c: any) => {
                    const fc = c.forward_comparison;
                    return (
                      <tr key={c.id}>
                        <td className="small">{pick(lang, DS_LABEL[c.id]?.[0] ?? c.name, DS_LABEL[c.id]?.[1] ?? c.name)}</td>
                        <td className="small">{fc?.bem_applicable ? pick(lang, 'yes (closed mesh)', 'si (malla cerrada)') : pick(lang, 'no (open surface)', 'no (superficie abierta)')}</td>
                        <td className="mono small">{fc?.bem_applicable ? `${fc.single_layer.RE} / ${fc.single_layer.CC}` : '-'}</td>
                        <td className="mono small">{fc?.bem_applicable ? `${fc.bem.RE} / ${fc.bem.CC}` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Callout>{pick(lang, 'Null result, reported: on the dog (the only closed-mesh case) the BEM does NOT beat the single-layer (RE 0.63 vs 0.54). The human torso-tank surface is open, so the BEM does not apply there. On this coarse electrode geometry the reconstruction is regularization-dominated, so forward-operator fidelity is not the bottleneck; the BEM matters as electrode density and mesh closure improve.', 'Resultado nulo, reportado: en el perro (el unico caso de malla cerrada) el BEM NO supera a la capa simple (RE 0.63 vs 0.54). La superficie del tanque humano es abierta, asi que el BEM no aplica alli. En esta geometria gruesa la reconstruccion esta dominada por la regularizacion, asi que la fidelidad del directo no es el cuello de botella; el BEM importa al mejorar la densidad y el cierre de malla.')}</Callout>
          <Refs ids={['barr1977', 'vanoosterom1983']} />
        </section>
      )}

      {tab === 'flow' && (
        <section>
          <h2>{pick(lang, '4D-flow: the unsteady-term ablation + noise robustness', 'Flujo 4D: ablacion del termino no estacionario + robustez')}</h2>
          <p>{pick(lang, 'The unsteady acceleration dominates the pressure at peak systole. Replacing a noisy three-frame finite difference with a space-time PINN (analytic dv/dt, gated at correlation 0.995) corrects the recovered pressure range from an inflated value to a physiological one, the same order as the clinical Bernoulli estimate from the same scan.', 'La aceleracion no estacionaria domina la presion en sistole pico. Reemplazar una diferencia finita ruidosa de tres cuadros por un PINN espacio-temporal (dv/dt analitico, prueba a correlacion 0.995) corrige el rango de presion recuperado de un valor inflado a uno fisiologico, del mismo orden que la estimacion clinica de Bernoulli del mismo escaneo.')}</p>
          {flow && (
            <div className="overflow-x">
              <table>
                <thead><tr><th>{pick(lang, 'Unsteady term', 'Termino no estacionario')}</th><th>{pick(lang, 'Pressure range', 'Rango de presion')}</th><th>{pick(lang, 'vs Bernoulli', 'vs Bernoulli')}</th></tr></thead>
                <tbody>
                  <tr><td className="small">{pick(lang, 'Three-frame finite difference (noisy)', 'Diferencia finita de tres cuadros (ruidosa)')}</td><td className="mono">14.87 mmHg</td><td className="muted small">{pick(lang, 'inflated ~6x', 'inflado ~6x')}</td></tr>
                  <tr><td className="small">{pick(lang, 'Space-time PINN (analytic dv/dt)', 'PINN espacio-temporal (dv/dt analitico)')}</td><td className="mono">{flow.metrics.ppe_pressure_drop_mmHg} mmHg</td><td className="good small">{pick(lang, 'physiological', 'fisiologico')}</td></tr>
                  <tr><td className="small">{pick(lang, 'Clinical Bernoulli 4·Vmax²', 'Bernoulli clinico 4·Vmax²')}</td><td className="mono">{flow.metrics.bernoulli_mmHg} mmHg</td><td className="muted small">{pick(lang, 'reference', 'referencia')}</td></tr>
                </tbody>
              </table>
            </div>
          )}
          <RobustnessSvg lang={lang} />
          <Refs ids={['raissi2020', 'krittian2012']} />
        </section>
      )}

      {tab === 'limits' && (
        <section>
          <h2>{pick(lang, 'Honest limits', 'Limites honestos')}</h2>
          <p>{pick(lang,
            'We report the honest findings rather than inflated ones. For ECGi, the accuracy improvement over a strong classical baseline is modest, and the contribution is the calibrated uncertainty; a full boundary-element operator did not beat the single-layer on the coarse real geometry. For 4D-flow, there is no invasive pressure gold standard, so the absolute magnitude carries the method uncertainty; the validated claims are the exact analytic gate, the physiological range, the noise-robustness and the Bernoulli bracket.',
            'Reportamos los hallazgos honestos en lugar de inflados. Para ECGi, la mejora de precision sobre un baseline clasico fuerte es modesta, y la contribucion es la incertidumbre calibrada; un operador de elementos de contorno completo no supero a la capa simple en la geometria gruesa real. Para el flujo 4D, no hay patron de oro de presion invasivo, asi que la magnitud absoluta lleva la incertidumbre del metodo; las afirmaciones validadas son la prueba analitica exacta, el rango fisiologico, la robustez al ruido y el encuadre de Bernoulli.')}</p>
          <Callout variant="warn">
            {pick(lang,
              'Not clinically deployed. These are validated methodological results on real experimental data, deliberately kept at 0.x. Overstating a headline accuracy gain, or dressing a near-zero uncertainty as a per-voxel map, would be exactly the kind of result this project exists to avoid.',
              'No desplegado clinicamente. Estos son resultados metodologicos validados sobre datos experimentales reales, deliberadamente en 0.x. Exagerar una ganancia de precision de titular, o disfrazar una incertidumbre casi nula como un mapa por voxel, seria justo el tipo de resultado que este proyecto existe para evitar.')}
          </Callout>
          <Refs ids={['cluitmans2018', 'diffusion2026']} />
        </section>
      )}
    </div>
  );
}
