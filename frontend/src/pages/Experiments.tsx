import { useEffect, useState } from 'react';
import { Callout } from '../components/Callout';
import { Refs } from '../components/Refs';
import { useLang, pick } from '../store';

const BASE = import.meta.env.BASE_URL;

export function Experiments() {
  const lang = useLang();
  const [art, setArt] = useState<any>(null);
  useEffect(() => { fetch(`${BASE}data/real-ecgi-edgar/trace.json`).then((r) => r.json()).then(setArt).catch(() => setArt(null)); }, []);

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{pick(lang, 'Experiments', 'Experimentos')}</h1>
        <p className="lede">{pick(lang,
          'The validation design and the real results on the EDGAR torso-tank data. Every number is the measured reconstruction quality against the real measured heart-surface potentials, using the standard ECGi metrics; nothing is validated against a synthetic field.',
          'El diseno de validacion y los resultados reales sobre los datos del tanque de torso EDGAR. Cada numero es la calidad de reconstruccion medida contra los potenciales reales medidos de superficie cardiaca, usando las metricas estandar de ECGi; nada se valida contra un campo sintetico.')}</p>
      </div>

      <section>
        <h2>{pick(lang, 'Design and protocol', 'Diseno y protocolo')}</h2>
        <p>{pick(lang,
          'The torso tank recorded 192 body-surface and 256 heart-cage potentials simultaneously for three rhythms. The reconstruction sees ONLY the body-surface data; the heart-cage recording is held out and used solely to score the result. Time frames or leads flagged as bad (NaN) are dropped. The scalar forward gain is calibrated on the first half of the beat and the second half is not used to fit it, so the forward model is not tuned on the evaluation window. Two metrics are reported per time frame and averaged over the beat.',
          'El tanque de torso registro 192 potenciales de superficie corporal y 256 de la jaula cardiaca simultaneamente para tres ritmos. La reconstruccion ve SOLO los datos de superficie corporal; el registro de la jaula cardiaca se reserva y se usa unicamente para puntuar el resultado. Los cuadros de tiempo o derivaciones marcados como malos (NaN) se descartan. La ganancia escalar del operador directo se calibra en la primera mitad del latido y la segunda mitad no se usa para ajustarla. Se reportan dos metricas por cuadro de tiempo y se promedian sobre el latido.')}</p>
        <ul>
          <li><b>{pick(lang, 'Relative error (RE)', 'Error relativo (RE)')}</b>: {pick(lang, 'the norm of the reconstruction error over the norm of the truth (0 = perfect).', 'la norma del error de reconstruccion sobre la norma de la verdad (0 = perfecto).')}</li>
          <li><b>{pick(lang, 'Correlation (CC)', 'Correlacion (CC)')}</b>: {pick(lang, 'the spatial correlation of the recovered and true potential maps (1 = perfect).', 'la correlacion espacial de los mapas de potencial recuperado y verdadero (1 = perfecto).')}</li>
          <li><b>{pick(lang, 'Node-UQ reliability', 'Confiabilidad UQ por nodo')}</b>: {pick(lang, 'the fraction of heart nodes whose true error falls within two standard deviations of the reported uncertainty.', 'la fraccion de nodos cardiacos cuyo error real cae dentro de dos desviaciones estandar de la incertidumbre reportada.')}</li>
        </ul>
      </section>

      <section>
        <h2>{pick(lang, 'Coverage and real results', 'Cobertura y resultados reales')}</h2>
        {!art ? <div className="panel">Loading...</div> : (
          <div className="overflow-x">
            <table>
              <thead><tr><th>{pick(lang, 'Rhythm', 'Ritmo')}</th><th>{pick(lang, 'Activation', 'Activacion')}</th><th>RE</th><th>CC</th><th>Node-UQ (2 sigma)</th><th>{pick(lang, 'Frames', 'Cuadros')}</th></tr></thead>
              <tbody>
                {Object.keys(art.rhythms).map((r) => {
                  const m = art.rhythms[r].metrics;
                  const kind = r === 'sinus' ? pick(lang, 'diffuse (sinus)', 'difusa (sinusal)') : pick(lang, 'focal (paced)', 'focal (marcapaso)');
                  return (
                    <tr key={r}>
                      <td><b>{r}</b></td><td className="small">{kind}</td>
                      <td className="mono">{m.relative_error_tikhonov}</td>
                      <td className="mono">{m.correlation_tikhonov}</td>
                      <td className="mono">{m.uq_calibration_2sigma}</td>
                      <td className="mono">{m.n_time_frames}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Callout>
          {pick(lang,
            'The three rhythms span diffuse (sinus) and focal (paced) activation. Paced beats reconstruct with higher correlation than sinus, which is physically expected: a focal source is easier to localize than a diffuse wavefront. The absolute numbers are literature-consistent for a single-layer forward model on torso-tank data; a full boundary-element operator would raise them.',
            'Los tres ritmos abarcan activacion difusa (sinusal) y focal (marcapaso). Los latidos con marcapaso reconstruyen con mayor correlacion que el sinusal, lo cual es fisicamente esperado: una fuente focal es mas facil de localizar que un frente difuso. Los numeros absolutos son consistentes con la literatura para un modelo directo de capa simple sobre datos de tanque de torso.')}
        </Callout>
        <Refs ids={['aras2015', 'cluitmans2018']} />
      </section>
    </div>
  );
}
