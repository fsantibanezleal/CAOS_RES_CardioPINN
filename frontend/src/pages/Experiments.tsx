import { useEffect, useState } from 'react';
import { Callout } from '../components/Callout';
import { Refs } from '../components/Refs';
import { useLang, pick } from '../store';

const BASE = import.meta.env.BASE_URL;

const DS_NAME: Record<string, [string, string]> = {
  'human-tank': ['Human heart, torso tank (Utah)', 'Corazon humano, tanque de torso (Utah)'],
  'dog-insitu': ['Dog heart, in situ (Maastricht)', 'Corazon de perro, in situ (Maastricht)'],
};

export function Experiments() {
  const lang = useLang();
  const [cat, setCat] = useState<any>(null);
  useEffect(() => { fetch(`${BASE}data/real-ecgi-catalogue/catalogue.json`).then((r) => r.json()).then(setCat).catch(() => setCat(null)); }, []);

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{pick(lang, 'Experiments', 'Experimentos')}</h1>
        <p className="lede">{pick(lang,
          'The validation design and the real results across a catalogue of independent EDGAR experiments, a human explanted heart in a torso tank and an in-situ dog heart. Every number is the measured reconstruction quality against the real measured heart-surface potentials, using the standard ECGi metrics; nothing is validated against a synthetic field.',
          'El diseno de validacion y los resultados reales a traves de un catalogo de experimentos EDGAR independientes, un corazon humano explantado en un tanque de torso y un corazon de perro in situ. Cada numero es la calidad de reconstruccion medida contra los potenciales reales medidos de superficie cardiaca, usando las metricas estandar de ECGi; nada se valida contra un campo sintetico.')}</p>
      </div>

      <section>
        <h2>{pick(lang, 'Design and protocol', 'Diseno y protocolo')}</h2>
        <p>{pick(lang,
          'Each experiment recorded the body-surface and the heart-surface potentials simultaneously over the beat. The reconstruction sees ONLY the body-surface data; the heart-surface recording is held out and used solely to score the result. Time frames or leads flagged as bad (NaN) are dropped. The scalar forward gain is calibrated on the first half of the beat and the second half is not used to fit it, so the forward model is not tuned on the evaluation window. The identical pipeline is run on every dataset with no per-heart retuning, so the numbers measure a method, not a fit to one geometry. Two metrics are reported per time frame and averaged over the beat.',
          'Cada experimento registro los potenciales de superficie corporal y de superficie cardiaca simultaneamente durante el latido. La reconstruccion ve SOLO los datos de superficie corporal; el registro de superficie cardiaca se reserva y se usa unicamente para puntuar el resultado. Los cuadros de tiempo o derivaciones marcados como malos (NaN) se descartan. La ganancia escalar del operador directo se calibra en la primera mitad del latido y la segunda mitad no se usa para ajustarla. El mismo pipeline se corre en cada conjunto de datos sin reajuste por corazon, asi que los numeros miden un metodo, no un ajuste a una geometria. Se reportan dos metricas por cuadro de tiempo y se promedian sobre el latido.')}</p>
        <ul>
          <li><b>{pick(lang, 'Relative error (RE)', 'Error relativo (RE)')}</b>: {pick(lang, 'the norm of the reconstruction error over the norm of the truth (0 = perfect).', 'la norma del error de reconstruccion sobre la norma de la verdad (0 = perfecto).')}</li>
          <li><b>{pick(lang, 'Correlation (CC)', 'Correlacion (CC)')}</b>: {pick(lang, 'the spatial correlation of the recovered and true potential maps (1 = perfect).', 'la correlacion espacial de los mapas de potencial recuperado y verdadero (1 = perfecto).')}</li>
          <li><b>{pick(lang, 'Node-UQ reliability', 'Confiabilidad UQ por nodo')}</b>: {pick(lang, 'the fraction of heart nodes whose true error falls within two standard deviations of the reported uncertainty.', 'la fraccion de nodos cardiacos cuyo error real cae dentro de dos desviaciones estandar de la incertidumbre reportada.')}</li>
        </ul>
      </section>

      <section>
        <h2>{pick(lang, 'Coverage and real results', 'Cobertura y resultados reales')}</h2>
        {!cat ? <div className="panel">Loading...</div> : (
          <div className="overflow-x">
            <table>
              <thead><tr><th>{pick(lang, 'Dataset', 'Conjunto')}</th><th>{pick(lang, 'Beat', 'Latido')}</th><th>{pick(lang, 'Body -> heart', 'Cuerpo -> corazon')}</th><th>RE</th><th>CC</th><th>Node-UQ (2 sigma)</th><th>{pick(lang, 'Frames', 'Cuadros')}</th></tr></thead>
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
        <Callout>
          {pick(lang,
            'The catalogue spans two species, two labs, and both diffuse (sinus) and focal (paced) activation, from a 256-electrode human cage to a 1321-node dog epicardium, with no per-heart retuning. On the human tank, paced beats reconstruct with higher correlation than sinus, which is physically expected: a focal source is easier to localize than a diffuse wavefront. The absolute numbers are literature-consistent for a single-layer forward model on torso-tank data; a full boundary-element operator would raise them.',
            'El catalogo abarca dos especies, dos laboratorios, y activacion difusa (sinusal) y focal (marcapaso), desde una jaula humana de 256 electrodos hasta un epicardio de perro de 1321 nodos, sin reajuste por corazon. En el tanque humano, los latidos con marcapaso reconstruyen con mayor correlacion que el sinusal, lo cual es fisicamente esperado: una fuente focal es mas facil de localizar que un frente difuso. Los numeros absolutos son consistentes con la literatura para un modelo directo de capa simple sobre datos de tanque de torso.')}
        </Callout>
        <Refs ids={['aras2015', 'cluitmans2018']} />
      </section>
    </div>
  );
}
