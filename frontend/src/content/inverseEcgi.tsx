import { useLang, pick } from '../store';

export function InverseEcgiContext() {
  const lang = useLang();
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="panel">
        <h3>{pick(lang, 'The problem: inverse ECG imaging', 'El problema: imagen inversa de ECG')}</h3>
        <p>{pick(lang,
          'Electrocardiographic imaging reconstructs the heart-surface potentials from body-surface potentials measured by a torso vest, given the torso geometry (a forward transfer matrix). The problem is severely ill-posed: small measurement noise produces large oscillatory errors in the naive inverse. Tikhonov regularization stabilizes it but returns a single point estimate with no uncertainty.',
          'La imagen electrocardiografica reconstruye los potenciales de la superficie cardiaca desde los potenciales de superficie corporal medidos por un chaleco de torso, dada la geometria del torso (una matriz de transferencia directa). El problema es severamente mal planteado: un pequeno ruido de medicion produce grandes errores oscilatorios en el inverso ingenuo. La regularizacion de Tikhonov lo estabiliza pero devuelve una sola estimacion puntual sin incertidumbre.')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Physics-constrained + calibrated node UQ', 'Restringido por fisica + UQ por nodo calibrada')}</h3>
        <p className="small">{pick(lang,
          'A physics-constrained network forces its forward-projected potentials to match the measurements, with a smoothness prior on the heart surface; a deep ensemble over noise draws gives a recalibrated per-node uncertainty. Tikhonov is compared at its best (an oracle-chosen regularization strength), so the comparison is fair.',
          'Una red restringida por fisica obliga a que sus potenciales proyectados hacia adelante coincidan con las mediciones, con un prior de suavidad en la superficie cardiaca; un ensemble profundo sobre realizaciones de ruido da una incertidumbre por nodo recalibrada. Tikhonov se compara en su mejor version (una fuerza de regularizacion elegida por oraculo), asi que la comparacion es justa.')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Result and honesty', 'Resultado y honestidad')}</h3>
        <p className="small">{pick(lang,
          'The physics-constrained reconstruction slightly beats a well-tuned Tikhonov (relative error ~0.16 vs ~0.20, correlation ~0.99 vs ~0.98) and reports a calibrated per-node uncertainty (~0.91 within two standard deviations) that Tikhonov cannot. The honest message: a well-regularized Tikhonov is a strong baseline, the accuracy gain is modest, and the real added value is the calibrated node uncertainty. Synthetic concentric-sphere geometry with a simplified forward operator; real torso/heart meshes (EDGAR) are the next data step. The 2026 SOTA direction is a generative diffusion prior. Not clinically validated.',
          'La reconstruccion restringida por fisica supera ligeramente a un Tikhonov bien ajustado (error relativo ~0.16 vs ~0.20, correlacion ~0.99 vs ~0.98) y reporta una incertidumbre por nodo calibrada (~0.91 dentro de dos desviaciones estandar) que Tikhonov no puede. El mensaje honesto: un Tikhonov bien regularizado es un baseline fuerte, la ganancia de precision es modesta, y el valor agregado real es la incertidumbre por nodo calibrada. Geometria sintetica de esferas concentricas con un operador directo simplificado; mallas reales de torso/corazon (EDGAR) son el siguiente paso de datos. La direccion SOTA 2026 es un prior generativo por difusion. No validado clinicamente.')}</p>
      </div>
    </div>
  );
}
