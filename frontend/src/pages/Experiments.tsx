import { useEffect, useState } from 'react';
import { Tabs, type TabDef, Callout, Equation, Refs } from '@fasl-work/caos-app-shell';
import { useLang, pick, type Lang } from '../store';

const BASE = import.meta.env.BASE_URL;

const DS_NAME: Record<string, [string, string]> = {
  'human-tank': ['Human heart, torso tank (Utah)', 'Corazon humano, tanque de torso (Utah)'],
  'dog-insitu': ['Dog heart, in situ (Maastricht)', 'Corazon de perro, in situ (Maastricht)'],
};

// The leakage-safe protocol, drawn with the FORBIDDEN anti-pattern struck out (ADR-0017 §2 Experiments floor).
function ProtocolSvg({ lang }: { lang: Lang }) {
  return (
    <div className="fig-svg wide">
      <svg viewBox="0 0 720 220" role="img" style={{ width: '100%', height: 'auto' }}>
        <rect x="16" y="30" width="200" height="150" rx="10" fill="var(--panel-2)" stroke="var(--accent-2)" strokeWidth="1.3" />
        <text x="30" y="52" fill="var(--fg)" fontSize="12" fontWeight="600">{pick(lang, 'Body surface (input)', 'Superficie corporal (entrada)')}</text>
        <text x="30" y="70" fill="var(--muted)" fontSize="10">{pick(lang, 'measured potentials', 'potenciales medidos')}</text>
        <text x="30" y="100" fill="var(--fg)" fontSize="10.5">{pick(lang, 'gain calibrated on', 'ganancia calibrada en')}</text>
        <text x="30" y="115" fill="var(--fg)" fontSize="10.5">{pick(lang, 'the 1st half only', 'solo la 1ra mitad')}</text>
        <text x="30" y="160" fill="var(--muted)" fontSize="9.5">{pick(lang, 'the reconstruction sees', 'la reconstrucción ve')}</text>
        <text x="30" y="173" fill="var(--muted)" fontSize="9.5">{pick(lang, 'ONLY this', 'SOLO esto')}</text>
        <path d="M216 105 H270" stroke="var(--accent-2)" strokeWidth="1.6" markerEnd="url(#ea)" />
        <text x="243" y="97" textAnchor="middle" fill="var(--muted)" fontSize="9.5">A⁻¹</text>
        <rect x="272" y="70" width="150" height="70" rx="8" fill="var(--panel-2)" stroke="var(--accent)" strokeWidth="1.3" />
        <text x="347" y="98" textAnchor="middle" fill="var(--fg)" fontSize="12">{pick(lang, 'recover φ_heart', 'recuperar φ_heart')}</text>
        <text x="347" y="115" textAnchor="middle" fill="var(--muted)" fontSize="10">{pick(lang, 'regularized inverse', 'inverso regularizado')}</text>
        <path d="M422 105 H476" stroke="var(--good)" strokeWidth="1.6" markerEnd="url(#eag)" />
        <text x="449" y="97" textAnchor="middle" fill="var(--good)" fontSize="9.5">{pick(lang, 'score', 'puntuar')}</text>
        <rect x="478" y="60" width="226" height="90" rx="8" fill="color-mix(in srgb, var(--good) 10%, var(--panel))" stroke="var(--good)" strokeWidth="1.3" />
        <text x="492" y="82" fill="var(--fg)" fontSize="12" fontWeight="600">{pick(lang, 'Heart cage (HELD OUT)', 'Jaula cardiaca (RESERVADA)')}</text>
        <text x="492" y="100" fill="var(--muted)" fontSize="10">{pick(lang, 'true potentials: score RE / CC / UQ,', 'potenciales reales: puntuar RE / CC / UQ,')}</text>
        <text x="492" y="114" fill="var(--muted)" fontSize="10">{pick(lang, 'and calibrate 2 disclosed scalars', 'y calibrar 2 escalares declarados')}</text>
        <text x="492" y="136" fill="var(--good)" fontSize="10">{pick(lang, 'gain + oracle λ (not the pattern)', 'ganancia + λ oraculo (no el patron)')}</text>
        <line x1="272" y1="200" x2="704" y2="200" stroke="var(--bad)" strokeWidth="1.4" strokeDasharray="5 3" />
        <text x="278" y="196" fill="var(--bad)" fontSize="10" textDecoration="line-through">{pick(lang, 'FORBIDDEN: fit the recovered pattern on the held-out cage (leakage)', 'PROHIBIDO: ajustar el patron recuperado sobre la jaula reservada (fuga)')}</text>
        <defs>
          <marker id="ea" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--accent-2)" /></marker>
          <marker id="eag" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--good)" /></marker>
        </defs>
      </svg>
      <div className="fig-cap">{pick(lang, 'The recovered spatial pattern is inferred from the body surface only, and correlation is scale-free. The cage truth calibrates two disclosed scalars, a magnitude gain and the oracle-best lambda, which set overall scale and smoothness but not the pattern; fitting the pattern itself on the cage is the forbidden anti-pattern, struck out.', 'El patron espacial recuperado se infiere solo de la superficie corporal, y la correlación no depende de la escala. La verdad de la jaula calibra dos escalares declarados, una ganancia de magnitud y el mejor lambda por oraculo, que fijan la escala y la suavidad pero no el patron; ajustar el patron mismo sobre la jaula es el anti-patron prohibido, tachado.')}</div>
    </div>
  );
}

export function Experiments() {
  const lang = useLang();
  const [cat, setCat] = useState<any>(null);
  const [flow, setFlow] = useState<any>(null);
  useEffect(() => {
    fetch(`${BASE}data/real-ecgi-catalogue/catalogue.json`).then((r) => r.json()).then(setCat).catch(() => setCat(null));
    fetch(`${BASE}data/real-flow4d-pressure/trace.json`).then((r) => r.json()).then(setFlow).catch(() => setFlow(null));
  }, []);

  const tabs: TabDef[] = [
    {
      id: 'protocol', label: pick(lang, 'Protocol (leakage-safe)', 'Protocolo (sin fuga)'),
      content: (
        <section>
          <h2>{pick(lang, 'The leakage-safe protocol', 'El protocolo sin fuga')}</h2>
          <p>{pick(lang,
            'Each ECGi experiment recorded the body-surface and the heart-surface potentials simultaneously over the beat. The recovered spatial PATTERN of the reconstruction comes only from the body-surface data through the inverse; it is never fit on the cage. Time frames or leads flagged bad (NaN) are dropped. Two scalars are calibrated against the held-out cage and disclosed openly: a single magnitude gain (fit on the first-half cage potentials, it sets overall scale, so the scale-free correlation is unaffected and only the relative error depends on it), and the oracle-best lambda used in the tables (it minimizes the true error, an UPPER bound reported so every method is judged at its best). The identical pipeline runs on every dataset with no per-heart retuning, so the numbers measure a method, not a fit to one geometry.',
            'Cada experimento ECGi registro los potenciales de superficie corporal y cardiaca simultaneamente durante el latido. El PATRON espacial recuperado de la reconstrucción proviene solo de los datos de superficie corporal a traves del inverso; nunca se ajusta sobre la jaula. Los cuadros o derivaciones marcados malos (NaN) se descartan. Dos escalares se calibran contra la jaula reservada y se declaran abiertamente: una ganancia de magnitud unica (ajustada en los potenciales de la primera mitad de la jaula; fija la escala global, así que la correlación, que no depende de la escala, no se ve afectada y solo el error relativo depende de ella), y el mejor lambda por oraculo usado en las tablas (minimiza el error real, una cota SUPERIOR reportada para que cada método se juzgue en su mejor version). El mismo pipeline corre en cada dataset sin reajuste, así que los números miden un método, no un ajuste a una geometría.')}</p>
          <ProtocolSvg lang={lang} />
          <Callout>{pick(lang, 'The oracle-best lambda used in the tables is an UPPER bound reported to compare methods fairly (every method judged at its best); it is not claimed as a blind operating point. Reporting it is stated openly, not hidden.', 'El mejor lambda por oraculo usado en las tablas es una cota SUPERIOR reportada para comparar métodos con justicia (cada método en su mejor version); no se afirma como un punto de operacion ciego. Reportarlo se declara abiertamente, no se oculta.')}</Callout>
          <Refs ids={['aras2015', 'cluitmans2018']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'metrics', label: pick(lang, 'Metrics', 'Metricas'),
      content: (
        <section>
          <h2>{pick(lang, 'The exact metrics', 'Las metricas exactas')}</h2>
          <p>{pick(lang, 'Two spatial metrics are computed per time frame and averaged over the beat, plus a calibration metric for the uncertainty.', 'Se computan dos metricas espaciales por cuadro de tiempo y se promedian sobre el latido, mas una metrica de calibracion para la incertidumbre.')}</p>
          <Equation tex={String.raw`\mathrm{RE}=\frac{\lVert\hat\phi-\phi^{\text{true}}\rVert_2}{\lVert\phi^{\text{true}}\rVert_2}, \qquad \mathrm{CC}=\frac{\langle\hat\phi-\bar{\hat\phi},\,\phi^{\text{true}}-\bar\phi^{\text{true}}\rangle}{\lVert\hat\phi-\bar{\hat\phi}\rVert\,\lVert\phi^{\text{true}}-\bar\phi^{\text{true}}\rVert}`}
            caption={pick(lang, 'Relative error (0 = perfect) and the spatial correlation coefficient (1 = perfect), the standard ECGi pair.', 'Error relativo (0 = perfecto) y el coeficiente de correlación espacial (1 = perfecto), el par estandar de ECGi.')} />
          <Equation tex={String.raw`\text{node-UQ} = \frac{1}{N}\sum_i \mathbb{1}\!\left[\,|\hat\phi_i-\phi^{\text{true}}_i| \le 2\,s_i\,\right], \qquad s_i=\tau\cdot\mathrm{std}_k\,\hat\phi_i^{(k)}`}
            caption={pick(lang, 'The uncertainty reliability: the fraction of nodes whose true error is inside the recalibrated 2-sigma band; ~0.90 is well-calibrated.', 'La confiabilidad de la incertidumbre: la fraccion de nodos cuyo error real esta dentro de la banda 2-sigma recalibrada; ~0.90 esta bien calibrado.')} />
          <Callout>{pick(lang, 'For 4D-flow the analogous metric is the recovered pressure RANGE vs the clinical Bernoulli estimate 4·Vmax² and the analytic-gate error, since no per-voxel pressure truth exists.', 'Para el flujo 4D la metrica analoga es el RANGO de presion recuperado vs la estimación clinica de Bernoulli 4·Vmax² y el error del gate analitico, ya que no existe verdad de presion por voxel.')}</Callout>
          <Refs ids={['cluitmans2018', 'krittian2012']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'ecgi-cov', label: pick(lang, 'ECGi coverage', 'Cobertura ECGi'),
      content: (
        <section>
          <h2>{pick(lang, 'ECGi coverage and real results', 'Cobertura ECGi y resultados reales')}</h2>
          <p>{pick(lang, 'Read directly from the committed catalogue artifact (never typed in). Two species, two labs, diffuse (sinus) and focal (paced) activation, one pipeline.', 'Leido directamente del artefacto de catalogo comprometido (nunca escrito a mano). Dos especies, dos laboratorios, activacion difusa (sinusal) y focal (marcapaso), un pipeline.')}</p>
          {!cat ? <div className="panel">Loading...</div> : (
            <div className="overflow-x">
              <table>
                <thead><tr><th>{pick(lang, 'Dataset', 'Conjunto')}</th><th>{pick(lang, 'Beat', 'Latido')}</th><th>{pick(lang, 'Body -> heart', 'Cuerpo -> corazon')}</th><th>RE</th><th>CC</th><th>Node-UQ (2σ)</th><th>{pick(lang, 'Frames', 'Cuadros')}</th></tr></thead>
                <tbody>
                  {cat.cases.flatMap((c: any) => Object.keys(c.beats).map((r: string) => {
                    const m = c.beats[r].metrics;
                    return (
                      <tr key={c.id + r}>
                        <td className="small">{pick(lang, DS_NAME[c.id]?.[0] ?? c.name, DS_NAME[c.id]?.[1] ?? c.name)}</td>
                        <td><b>{r}</b></td>
                        <td className="mono small">{m.n_torso_electrodes} {'->'} {m.n_heart_electrodes}</td>
                        <td className="mono">{m.relative_error_tikhonov}</td>
                        <td className="mono">{m.correlation_tikhonov}</td>
                        <td className="mono">{m.uq_calibration_2sigma}</td>
                        <td className="mono">{m.n_time_frames}</td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          )}
          <Refs ids={['aras2015']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'ecgi-res', label: pick(lang, 'ECGi results', 'Resultados ECGi'),
      content: (
        <section>
          <h2>{pick(lang, 'Reading the ECGi results', 'Leyendo los resultados ECGi')}</h2>
          <p>{pick(lang,
            'On the human tank, paced beats reconstruct with higher correlation than sinus (PVP 0.80, AVP 0.85 vs sinus 0.72), which is physically expected: a focal paced source is easier to localize than a diffuse sinus wavefront. The method transfers to the in-situ dog (a different species, geometry and electrode count, 140 body to a 1321-node epicardium) with no retuning, giving RE 0.54 / CC 0.78, so the numbers reflect a method rather than a fit to one heart.',
            'En el tanque humano, los latidos con marcapaso reconstruyen con mayor correlación que el sinusal (PVP 0.80, AVP 0.85 vs sinusal 0.72), lo cual es fisicamente esperado: una fuente focal es mas facil de localizar que un frente sinusal difuso. El método se transfiere al perro in situ (otra especie, geometría y número de electrodos, 140 cuerpo a un epicardio de 1321 nodos) sin reajuste, dando RE 0.54 / CC 0.78, así que los números reflejan un método y no un ajuste a un corazon.')}</p>
          <Callout>{pick(lang, 'The absolute numbers are literature-consistent for a single-layer forward model on torso-tank data. The BEM was analytic-gated but did not beat the single-layer on the coarse real electrode geometry (a reported null result); a denser mesh would change that.', 'Los números absolutos son consistentes con la literatura para un modelo directo de capa simple sobre datos de tanque de torso. El BEM tiene prueba analitica pero no supero a la capa simple en la geometría gruesa real (un resultado nulo reportado); una malla mas densa lo cambiaria.')}</Callout>
          <Refs ids={['aras2015', 'cluitmans2018', 'ghosh2009']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'flow-proto', label: pick(lang, '4D-flow validation', 'Validacion flujo 4D'),
      content: (
        <section>
          <h2>{pick(lang, '4D-flow validation, without an invasive truth', 'Validacion de flujo 4D, sin verdad invasiva')}</h2>
          <p>{pick(lang,
            'A 4D-flow scan has no invasive pressure gold standard (the reason the method exists), so the pressure recovery is validated three ways. First, an analytic gate: on flows whose exact answer is known (a converging duct for the steady pressure, a time-varying Poiseuille flow for the unsteady term) the engine recovers them (steady correlation 1.00, unsteady dv/dt correlation 0.995) before any real data is trusted. Second, the physiological range on the real scan. Third, the clinical simplified-Bernoulli estimate from the same scan as a reference.',
            'Un escaneo de flujo 4D no tiene patron de oro de presion invasivo (la razon del método), así que la recuperacion de presion se valida de tres formas. Primero, una prueba analitica: en flujos de respuesta exacta conocida (un ducto convergente para la presion estacionaria, un Poiseuille variable en el tiempo para el termino no estacionario) el motor los recupera (correlación estacionaria 1.00, dv/dt no estacionario correlación 0.995) antes de confiar en datos reales. Segundo, el rango fisiologico en el escaneo real. Tercero, la estimación clinica de Bernoulli del mismo escaneo como referencia.')}</p>
          {flow && (
            <div className="overflow-x">
              <table>
                <thead><tr><th>{pick(lang, 'Quantity', 'Cantidad')}</th><th>{pick(lang, 'Value', 'Valor')}</th></tr></thead>
                <tbody>
                  <tr><td>{pick(lang, 'Peak velocity (real scan)', 'Velocidad pico (escaneo real)')}</td><td className="mono">{flow.metrics.peak_velocity_ms} m/s</td></tr>
                  <tr><td>{pick(lang, 'PPE relative-pressure range', 'Rango de presion relativa PPE')}</td><td className="mono">{flow.metrics.ppe_pressure_drop_mmHg} mmHg</td></tr>
                  <tr><td>{pick(lang, 'Clinical Bernoulli 4·Vmax²', 'Bernoulli clinico 4·Vmax²')}</td><td className="mono">{flow.metrics.bernoulli_mmHg} mmHg</td></tr>
                  <tr><td>{pick(lang, 'Velocity-noise sensitivity', 'Sensibilidad al ruido de velocidad')}</td><td className="mono">{flow.metrics.noise_sensitivity_mmHg} mmHg</td></tr>
                  <tr><td>{pick(lang, 'Phase-wrap samples corrected', 'Muestras plegadas corregidas')}</td><td className="mono">{flow.metrics.aliasing_corrected_samples}</td></tr>
                  <tr><td>{pick(lang, 'Lumen voxels resolved', 'Voxeles de lumen resueltos')}</td><td className="mono">{flow.metrics.n_lumen_voxels}</td></tr>
                </tbody>
              </table>
            </div>
          )}
          <Callout>{pick(lang, 'The recovered range (0.79 mmHg) is small and physiological for this unobstructed aorta and the same order as Bernoulli (2.51 mmHg). A velocity-noise ensemble moves it under 0.01 mmHg, so the dominant uncertainty is the absent gold standard, not measurement noise; the absolute magnitude carries the method uncertainty honestly.', 'El rango recuperado (0.79 mmHg) es pequeño y fisiologico para esta aorta sin obstruccion y del mismo orden que Bernoulli (2.51 mmHg). Un ensemble de ruido lo mueve menos de 0.01 mmHg, así que la incertidumbre dominante es el patron de oro ausente, no el ruido; la magnitud absoluta lleva la incertidumbre del método con honestidad.')}</Callout>
          <Refs ids={['raissi2020', 'krittian2012']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'datasets', label: pick(lang, 'Datasets', 'Conjuntos de datos'),
      content: (
        <section>
          <h2>{pick(lang, 'Datasets and provenance', 'Conjuntos de datos y procedencia')}</h2>
          <div className="overflow-x">
            <table>
              <thead><tr><th>{pick(lang, 'Dataset', 'Conjunto')}</th><th>{pick(lang, 'Case', 'Caso')}</th><th>{pick(lang, 'Source', 'Fuente')}</th><th>{pick(lang, 'Redistribution', 'Redistribucion')}</th><th>{pick(lang, 'Status', 'Estado')}</th></tr></thead>
              <tbody>
                <tr><td>{pick(lang, 'Human torso tank (Utah)', 'Tanque de torso humano (Utah)')}</td><td>ECGi</td><td className="small">EDGAR / CEI (Aras 2015)</td><td className="small">{pick(lang, 'link-only (gitignored)', 'solo enlace (gitignored)')}</td><td className="good">{pick(lang, 'integrated', 'integrado')}</td></tr>
                <tr><td>{pick(lang, 'In-situ dog (Maastricht)', 'Perro in situ (Maastricht)')}</td><td>ECGi</td><td className="small">EDGAR / CEI</td><td className="small">{pick(lang, 'link-only (gitignored)', 'solo enlace (gitignored)')}</td><td className="good">{pick(lang, 'integrated', 'integrado')}</td></tr>
                <tr><td>{pick(lang, 'Thoracic-aorta 4D-flow', 'Flujo 4D de aorta toracica')}</td><td>4D-flow</td><td className="small">{pick(lang, 'real Philips MRI (venc 120)', 'MRI Philips real (venc 120)')}</td><td className="small">{pick(lang, 'link-only (gitignored)', 'solo enlace (gitignored)')}</td><td className="good">{pick(lang, 'integrated', 'integrado')}</td></tr>
                <tr><td>Bordeaux</td><td>ECGi</td><td className="small">EDGAR / CEI</td><td className="small">-</td><td className="muted small">{pick(lang, 'excluded (open sock)', 'excluido (malla abierta)')}</td></tr>
                <tr><td>Valencia</td><td>ECGi</td><td className="small">EDGAR / CEI</td><td className="small">-</td><td className="muted small">{pick(lang, 'excluded (simulation)', 'excluido (simulacion)')}</td></tr>
                <tr><td>{pick(lang, 'Ischemia (BEM matrices)', 'Isquemia (matrices BEM)')}</td><td>ECGi</td><td className="small">EDGAR / CEI</td><td className="small">-</td><td className="muted small">{pick(lang, 'excluded (unreadable MAT v7.3 matrix)', 'excluido (matriz MAT v7.3 ilegible)')}</td></tr>
              </tbody>
            </table>
          </div>
          <Callout variant="honest">{pick(lang, 'All raw datasets are used under their data-use agreements, read from a local path and gitignored; only the derived traces are committed. Excluded datasets are named with the honest reason, not silently dropped.', 'Todos los datos crudos se usan bajo sus acuerdos de uso, leidos de una ruta local y gitignored; solo los traces derivados se comprometen. Los datasets excluidos se nombran con la razon honesta, no se descartan en silencio.')}</Callout>
          <Refs ids={['aras2015', 'cluitmans2018']} label="Refs" />
        </section>
      ),
    },
  ];

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{pick(lang, 'Experiments', 'Experimentos')}</h1>
        <p className="lede">{pick(lang,
          'The validation design and the real results for both cases. For ECG imaging every number is the measured reconstruction quality against the REAL heart-surface potentials across a catalogue of independent EDGAR experiments; for 4D-flow, where no invasive pressure truth exists, validation is the analytic gate, the physiological range, and the clinical Bernoulli bracket. Nothing is validated against a synthetic field.',
          'El diseño de validación y los resultados reales para ambos casos. Para la imagen de ECG cada número es la calidad de reconstrucción medida contra los potenciales REALES de superficie cardiaca en un catalogo de experimentos EDGAR independientes; para el flujo 4D, donde no existe verdad de presion invasiva, la validación es la prueba analitica, el rango fisiologico, y el encuadre clinico de Bernoulli. Nada se valida contra un campo sintético.')}</p>
      </div>

      <Tabs tabs={tabs} ariaLabel={pick(lang, 'Experiments sections', 'Secciones de experimentos')} />
    </div>
  );
}
