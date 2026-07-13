import { useEffect, useState } from 'react';
import { useLang, pick } from '../store';

const BASE = import.meta.env.BASE_URL;

export function Experiments() {
  const lang = useLang();
  const [art, setArt] = useState<any>(null);
  useEffect(() => { fetch(`${BASE}data/real-ecgi-edgar/trace.json`).then((r) => r.json()).then(setArt).catch(() => setArt(null)); }, []);
  if (!art) return <div className="panel">Loading real results...</div>;
  const rhythms = Object.keys(art.rhythms);
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="panel">
        <h1 style={{ marginTop: 0 }}>{pick(lang, 'Real results', 'Resultados reales')}</h1>
        <p>{pick(lang,
          'Every number below is the measured reconstruction quality on the REAL EDGAR torso-tank data, validated against the REAL measured heart-surface potentials. Nothing is validated against a synthetic field. The relative error (RE) and the spatial correlation (CC) are the standard ECGi metrics; the node-UQ reliability is the fraction of heart nodes whose true error falls within two standard deviations of the reported uncertainty.',
          'Cada numero de abajo es la calidad de reconstruccion medida sobre los datos reales del tanque de torso EDGAR, validada contra los potenciales reales medidos de superficie cardiaca. Nada se valida contra un campo sintetico. El error relativo (RE) y la correlacion espacial (CC) son las metricas estandar de ECGi.')}</p>
      </div>
      <div className="panel overflow-x">
        <table>
          <thead><tr><th>{pick(lang, 'Rhythm', 'Ritmo')}</th><th>RE (Tikhonov)</th><th>CC (Tikhonov)</th><th>RE (graph)</th><th>CC (graph)</th><th>Node-UQ 2 sigma</th><th>{pick(lang, 'Frames', 'Cuadros')}</th></tr></thead>
          <tbody>
            {rhythms.map((r) => {
              const m = art.rhythms[r].metrics;
              return (
                <tr key={r}>
                  <td><b>{r}</b></td>
                  <td className="mono">{m.relative_error_tikhonov}</td>
                  <td className="mono">{m.correlation_tikhonov}</td>
                  <td className="mono">{m.relative_error_graph_reg}</td>
                  <td className="mono">{m.correlation_graph_reg}</td>
                  <td className="mono">{m.uq_calibration_2sigma}</td>
                  <td className="mono">{m.n_time_frames}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="panel small muted">
        {pick(lang,
          'Paced beats (PVP, AVP) reconstruct with higher correlation than sinus, which is physically expected: a focal paced activation is easier to localize than the diffuse sinus wavefront. The absolute numbers are capped by the single-layer forward model; a boundary-element operator would improve them. Data: EDGAR (Consortium for ECG Imaging), Utah torso-tank 2018-08-09, used with attribution under the EDGAR data-use agreement.',
          'Los latidos con marcapaso (PVP, AVP) reconstruyen con mayor correlacion que el sinusal, lo cual es fisicamente esperado. Los numeros absolutos estan limitados por el modelo directo de capa simple; un operador de elementos de contorno los mejoraria. Datos: EDGAR, tanque de torso Utah 2018-08-09.')}
      </div>
    </div>
  );
}
