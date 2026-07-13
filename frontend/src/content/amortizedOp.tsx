import { useLang, pick } from '../store';

export function AmortizedOpContext() {
  const lang = useLang();
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="panel">
        <h3>{pick(lang, 'The problem: instant personalization', 'El problema: personalizacion instantanea')}</h3>
        <p>{pick(lang,
          'The per-patient inverse verticals each fit a fresh PINN, which takes minutes. For a clinic that maps many patients, an amortized operator is trained once on a simulated patient population so that a new patient’s sparse activation times map in a single forward pass to a posterior over the tissue parameters, with an uncertainty. No per-patient refit.',
          'Los verticales inversos por paciente ajustan cada uno una PINN nueva, lo que toma minutos. Para una clinica que mapea muchos pacientes, un operador amortizado se entrena una vez sobre una poblacion de pacientes simulada para que los tiempos de activacion dispersos de un nuevo paciente se mapeen en una sola pasada hacia adelante a una posterior sobre los parametros del tejido, con incertidumbre. Sin reajuste por paciente.')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Beyond SOTA: amortized calibrated posterior', 'Mas alla del SOTA: posterior calibrada amortizada')}</h3>
        <p className="small">{pick(lang,
          'A heteroscedastic encoder learns the map from the sparse activation-time vector to a parameter posterior (mean and variance), trained on a simulated Eikonal population and recalibrated. This is the neural-operator direction for cardiac digital twins; the geometry-independent SOTA is DeepONet with a ViT branch and kernel operator learning.',
          'Un codificador heterocedastico aprende el mapa desde el vector de tiempos de activacion dispersos a una posterior de parametros (media y varianza), entrenado sobre una poblacion Eikonal simulada y recalibrado. Es la direccion de operadores neuronales para gemelos digitales cardiacos; el SOTA independiente de la geometria es DeepONet con una rama ViT y aprendizaje de operadores por nucleo.')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Result and honesty', 'Resultado y honestidad')}</h3>
        <p className="small">{pick(lang,
          'Trained once on 700 patients, the operator recovers the parameters and the substrate location (to ~0.12 mm) with a calibrated posterior (~0.93 within two standard deviations), in one ~1 ms forward pass, about 60000x faster than a per-patient fit. The parameterization is low-dimensional (four parameters) which the 32 sensors fully constrain, so the recovery is near-exact (a well-posed synthetic case); a real population with a higher-dimensional parameterization would be harder and the posterior wider. The operator is a compact amortized encoder, not a full DeepONet. Not clinically validated.',
          'Entrenado una vez sobre 700 pacientes, el operador recupera los parametros y la ubicacion del sustrato (a ~0.12 mm) con una posterior calibrada (~0.93 dentro de dos desviaciones estandar), en una pasada hacia adelante de ~1 ms, unas 60000x mas rapido que un ajuste por paciente. La parametrizacion es de baja dimension (cuatro parametros) que los 32 sensores restringen por completo, asi que la recuperacion es casi exacta (un caso sintetico bien planteado); una poblacion real con una parametrizacion de mayor dimension seria mas dificil y la posterior mas amplia. El operador es un codificador amortizado compacto, no un DeepONet completo. No validado clinicamente.')}</p>
      </div>
    </div>
  );
}
