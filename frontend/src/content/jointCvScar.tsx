import { useLang, pick } from '../store';

export function JointCvScarContext() {
  const lang = useLang();
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="panel">
        <h3>{pick(lang, 'The flagship: joint recovery + calibrated uncertainty', 'El buque insignia: recuperacion conjunta + incertidumbre calibrada')}</h3>
        <p>{pick(lang,
          'The state-of-the-art Eikonal PINN recovers the activation map and a conduction-velocity field. This vertical adds two things it lacks: localization of the low-conduction substrate (scar and fibrosis, the ablation target) and a calibrated per-node uncertainty that tells a clinician where to trust the map.',
          'La PINN Eikonal del estado del arte recupera el mapa de activacion y un campo de velocidad de conduccion. Este vertical agrega dos cosas que le faltan: la localizacion del sustrato de baja conduccion (cicatriz y fibrosis, el objetivo de ablacion) y una incertidumbre por nodo calibrada que le dice al clinico donde confiar en el mapa.')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Why the uncertainty must be recalibrated', 'Por que la incertidumbre debe recalibrarse')}</h3>
        <p className="small">{pick(lang,
          'A raw deep ensemble is systematically overconfident on this inverse problem: the members converge to similar smoothed solutions, so the reported band is far too narrow (only ~34% of nodes have their true CV inside two standard deviations). A single-scalar variance recalibration rescales the per-node spread to the right level, lifting the reliability to ~82% while preserving its spatial pattern. Here it is fit in-silico against the ground truth; clinically it would be fit on held-out data.',
          'Un ensemble profundo crudo es sistematicamente sobreconfiado en este problema inverso: los miembros convergen a soluciones suavizadas similares, asi que la banda reportada es demasiado estrecha (solo ~34% de los nodos tienen su CV real dentro de dos desviaciones estandar). Una recalibracion escalar de la varianza reescala la dispersion por nodo al nivel correcto, elevando la fiabilidad a ~82% preservando su patron espacial. Aqui se ajusta in-silico contra la verdad de referencia; clinicamente se ajustaria con datos retenidos.')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Result and honesty', 'Resultado y honestidad')}</h3>
        <p className="small">{pick(lang,
          'Activation rel-L2 ~0.053, conduction-velocity RMSE ~0.080 mm/ms, substrate IoU ~0.31, reliability within 2 sigma lifted from ~0.34 (raw) to ~0.82 (recalibrated). The substrate is localized as a relative conduction depression; the absolute CV inside a strong scar is underestimated by spectral bias, so the substrate region is broader than the true one (partial IoU), stated rather than hidden. The calibrated uncertainty is the strongest contribution. Synthetic tissue; not clinically validated. The recovered CV network re-runs live in the browser.',
          'Rel-L2 de activacion ~0.053, RMSE de velocidad de conduccion ~0.080 mm/ms, IoU de sustrato ~0.31, fiabilidad dentro de 2 sigma elevada de ~0.34 (crudo) a ~0.82 (recalibrado). El sustrato se localiza como una depresion relativa de conduccion; la CV absoluta dentro de una cicatriz fuerte se subestima por el sesgo espectral, asi que la region de sustrato es mas amplia que la real (IoU parcial), declarado en vez de oculto. La incertidumbre calibrada es la contribucion mas fuerte. Tejido sintetico; no validado clinicamente. La red de CV recuperada se re-ejecuta en vivo en el navegador.')}</p>
      </div>
    </div>
  );
}
