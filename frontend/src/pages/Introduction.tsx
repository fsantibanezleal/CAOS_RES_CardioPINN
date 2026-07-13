import { useLang, pick } from '../store';

export function Introduction() {
  const lang = useLang();
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="panel">
        <h1 style={{ marginTop: 0 }}>CardioPINN</h1>
        <p>{pick(lang,
          'Physics-informed neural networks (PINNs) embed a governing equation into the training loss, so a network learns a field that both fits sparse measurements and obeys physics. CardioPINN applies this to cardiac electrophysiology and cardiovascular medicine, where measurements are sparse, noisy and expensive, and the physics (wave propagation, reaction-diffusion, blood flow) is well characterized.',
          'Las redes neuronales informadas por fisica (PINNs) incrustan una ecuacion gobernante en la perdida de entrenamiento, de modo que una red aprende un campo que ajusta mediciones dispersas y obedece la fisica. CardioPINN aplica esto a la electrofisiologia cardiaca y la medicina cardiovascular, donde las mediciones son dispersas, ruidosas y costosas, y la fisica (propagacion de ondas, reaccion-difusion, flujo sanguineo) esta bien caracterizada.')}</p>
      </div>
      <div className="panel">
        <h2>{pick(lang, 'Each case is a research topic', 'Cada caso es un tema de investigacion')}</h2>
        <p>{pick(lang,
          'Unlike a didactic PINN catalogue, every vertical here is a real research problem carrying its own theory, governing equations, real or realistic data, and a model ladder: the classical baseline, the current state of the art, and a concrete beyond-SOTA proposal. The catalogue spans cardiac electrophysiology (activation mapping, conduction-velocity and fiber inference, geometry-aware PINNs, atrial-fibrillation phase mapping) and cardiovascular hemodynamics (4D-flow pressure estimation, pulmonary-artery pressure).',
          'A diferencia de un catalogo didactico de PINNs, cada vertical aqui es un problema de investigacion real con su propia teoria, ecuaciones gobernantes, datos reales o realistas, y una escalera de modelos: el baseline clasico, el estado del arte actual, y una propuesta concreta mas alla del estado del arte. El catalogo abarca la electrofisiologia cardiaca (mapeo de activacion, inferencia de velocidad de conduccion y fibra, PINNs conscientes de la geometria, mapeo de fase de fibrilacion auricular) y la hemodinamica cardiovascular (estimacion de presion por 4D-flow, presion de arteria pulmonar).')}</p>
      </div>
      <div className="panel">
        <h2>{pick(lang, 'Honesty model', 'Modelo de honestidad')}</h2>
        <ul>
          <li>{pick(lang, 'Numbers come from the committed bake (measured), never from a claim.', 'Los numeros provienen del horneado comprometido (medido), nunca de una afirmacion.')}</li>
          <li>{pick(lang, 'Every case carries a real-or-synthetic flag; the current cases are validated in-silico against exact ground truth. No case is clinically validated.', 'Cada caso lleva una bandera real-o-sintetico; los casos actuales se validan in-silico contra la verdad de referencia exacta. Ningun caso esta validado clinicamente.')}</li>
          <li>{pick(lang, 'A PINN does not replace a good forward solver on a well-posed forward problem; its value is the inverse, assimilating sparse data and recovering hidden fields (conduction velocity, fiber, pressure) with uncertainty.', 'Una PINN no reemplaza a un buen solucionador directo en un problema directo bien planteado; su valor es el inverso, asimilar datos dispersos y recuperar campos ocultos (velocidad de conduccion, fibra, presion) con incertidumbre.')}</li>
        </ul>
      </div>
    </div>
  );
}
