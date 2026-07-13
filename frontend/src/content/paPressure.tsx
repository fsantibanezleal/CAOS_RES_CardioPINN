import { useLang, pick } from '../store';

export function PaPressureContext() {
  const lang = useLang();
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="panel">
        <h3>{pick(lang, 'The problem: non-invasive PA pressure', 'El problema: presion de arteria pulmonar no invasiva')}</h3>
        <p>{pick(lang,
          'Pulmonary artery pressure is measured by right-heart catheterization, an invasive procedure. From a non-invasive velocity waveform plus the clinically measurable distal (wedge) pressure, a 1D reduced-order blood-flow model recovers the pressure along the vessel and the mean PAP. Reproduces the Universidad de Valparaiso approach (Jara et al. 2025).',
          'La presion de la arteria pulmonar se mide por cateterismo cardiaco derecho, un procedimiento invasivo. Desde una forma de onda de velocidad no invasiva mas la presion distal (de enclavamiento) medible clinicamente, un modelo de flujo sanguineo 1D de orden reducido recupera la presion a lo largo del vaso y la PAP media. Reproduce el enfoque de la Universidad de Valparaiso (Jara et al. 2025).')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Beyond SOTA: a cohort with uncertainty', 'Mas alla del SOTA: una cohorte con incertidumbre')}</h3>
        <p className="small">{pick(lang,
          'The published case is a single healthy subject. This vertical extends it to a cohort spanning normal to pulmonary hypertension, with an uncertainty on the estimated mean PAP. The 1D momentum balance dp/dx = -rho du/dt - R u gives the pressure from the velocity, anchored at the distal wedge pressure; higher resistance raises the mean PAP.',
          'El caso publicado es un unico sujeto sano. Este vertical lo extiende a una cohorte que abarca de normal a hipertension pulmonar, con una incertidumbre sobre la PAP media estimada. El balance de momento 1D dp/dx = -rho du/dt - R u da la presion desde la velocidad, anclada en la presion distal de enclavamiento; mayor resistencia eleva la PAP media.')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Result and honesty', 'Resultado y honestidad')}</h3>
        <p className="small">{pick(lang,
          'Across the cohort (normal ~10, elevated ~18, pulmonary hypertension ~28 mmHg true) the model recovers the mean PAP within ~2.6 mmHg on average and classifies normal vs pulmonary hypertension (the 20 mmHg threshold) correctly; the PH case is overestimated by a few mmHg, shown not hidden. Synthetic cohort with a linearized 1D model (the nonlinear convective term is dropped for robustness). The distal wedge pressure is treated as known (clinically measurable). Not clinically validated.',
          'A lo largo de la cohorte (normal ~10, elevada ~18, hipertension pulmonar ~28 mmHg real) el modelo recupera la PAP media dentro de ~2.6 mmHg en promedio y clasifica normal vs hipertension pulmonar (el umbral de 20 mmHg) correctamente; el caso de HP se sobreestima por unos mmHg, mostrado no oculto. Cohorte sintetica con un modelo 1D linealizado (el termino convectivo no lineal se omite por robustez). La presion distal de enclavamiento se trata como conocida (medible clinicamente). No validado clinicamente.')}</p>
      </div>
    </div>
  );
}
