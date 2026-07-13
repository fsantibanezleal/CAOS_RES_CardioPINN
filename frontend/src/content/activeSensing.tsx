import { useLang, pick } from '../store';

export function ActiveSensingContext() {
  const lang = useLang();
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="panel">
        <h3>{pick(lang, 'The problem: where to place the next electrode', 'El problema: donde colocar el siguiente electrodo')}</h3>
        <p>{pick(lang,
          'A mapping catheter acquires points one at a time and the procedure is long. If the reconstruction exposes an uncertainty, that uncertainty can drive acquisition: place the next electrode where the model is least certain, so accuracy rises fastest per point. The SOTA mapping PINN exposes an uncertainty but does not act on it; closing the loop is the contribution.',
          'Un cateter de mapeo adquiere puntos de a uno y el procedimiento es largo. Si la reconstruccion expone una incertidumbre, esa incertidumbre puede guiar la adquisicion: coloca el siguiente electrodo donde el modelo esta menos seguro, para que la precision suba mas rapido por punto. La PINN de mapeo del estado del arte expone una incertidumbre pero no actua sobre ella; cerrar el lazo es la contribucion.')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'The result', 'El resultado')}</h3>
        <p className="small">{pick(lang,
          'Adding electrodes one at a time under three strategies (active = maximum posterior uncertainty, random, uniform), active sensing reaches a target reconstruction accuracy (10% rel-L2) with about half the electrodes of random placement (15 vs 30) and fewer than uniform (44). The actively-chosen sites cluster where the field is hard to reconstruct (the slow region, the wavefront boundaries), and both the Gaussian-process and the physics-informed PINN reconstruct better on them.',
          'Agregando electrodos de a uno bajo tres estrategias (activa = maxima incertidumbre posterior, aleatoria, uniforme), la deteccion activa alcanza una precision objetivo (10% rel-L2) con aproximadamente la mitad de electrodos que la colocacion aleatoria (15 vs 30) y menos que la uniforme (44). Los sitios elegidos activamente se agrupan donde el campo es dificil de reconstruir (la region lenta, los bordes del frente), y tanto el proceso gaussiano como la PINN informada por fisica reconstruyen mejor sobre ellos.')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Honesty', 'Honestidad')}</h3>
        <p className="small">{pick(lang,
          'Synthetic tissue with a known ground truth (required to run the acquisition study). The uncertainty is the Gaussian-process posterior variance, a fast closed-form stand-in for the deep-ensemble PINN variance; the final reconstruction is the Eikonal PINN, which re-runs live in the browser. Not clinically validated.',
          'Tejido sintetico con verdad de referencia conocida (necesaria para correr el estudio de adquisicion). La incertidumbre es la varianza posterior del proceso gaussiano, un sustituto rapido de forma cerrada de la varianza del ensemble profundo de la PINN; la reconstruccion final es la PINN Eikonal, que se re-ejecuta en vivo en el navegador. No validado clinicamente.')}</p>
      </div>
    </div>
  );
}
