import { Equation } from '../components/Equation';
import { useLang, pick } from '../store';

export function Flow4dContext() {
  const lang = useLang();
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="panel">
        <h3>{pick(lang, 'The problem: pressure from flow', 'El problema: presion desde el flujo')}</h3>
        <p>{pick(lang,
          '4D-flow MRI measures the blood velocity field but not pressure. A Navier-Stokes PINN denoises the velocity and recovers the pressure field by enforcing incompressible mass and momentum conservation, with a hematocrit-dependent viscosity (blood is more viscous at higher hematocrit). Reproduces Sierpe et al. 2025.',
          'La RM de 4D-flow mide el campo de velocidad de la sangre pero no la presion. Una PINN de Navier-Stokes elimina el ruido de la velocidad y recupera el campo de presion imponiendo la conservacion de masa y momento incompresible, con una viscosidad dependiente del hematocrito (la sangre es mas viscosa a mayor hematocrito). Reproduce a Sierpe et al. 2025.')}</p>
        <Equation tex={String.raw`\nabla\cdot u = 0,\quad u\cdot\nabla u + \nabla p - \tfrac{1}{Re}\,\nabla^2 u = 0`} />
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Beyond SOTA: calibrated pressure uncertainty', 'Mas alla del SOTA: incertidumbre de presion calibrada')}</h3>
        <p className="small">{pick(lang,
          'Pressure is never given to the network; it is recovered from the physics. A deep ensemble over measurement-noise draws gives a per-voxel pressure uncertainty, and a variance recalibration keeps the band honest, which neither the rheology paper nor the super-resolution NS-PINNs provide.',
          'La presion nunca se le da a la red; se recupera desde la fisica. Un ensemble profundo sobre realizaciones de ruido de medicion da una incertidumbre de presion por voxel, y una recalibracion de varianza mantiene la banda honesta, lo que ni el paper de reologia ni las NS-PINN de super-resolucion proveen.')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Result and honesty', 'Resultado y honestidad')}</h3>
        <p className="small">{pick(lang,
          'On the Kovasznay analytic flow at hematocrit 0.45 (Reynolds ~40), the PINN denoises the velocity to ~0.4% and recovers the never-measured pressure to ~0.8%, with a well-calibrated per-voxel pressure band (~94% within two standard deviations). The hematocrit sets the Reynolds number via a relative-viscosity model. The ground truth is Newtonian Kovasznay; real 4D-flow MRI is the next data step. Not clinically validated. The pressure network re-runs live in the browser.',
          'En el flujo analitico de Kovasznay a hematocrito 0.45 (Reynolds ~40), la PINN elimina el ruido de la velocidad a ~0.4% y recupera la presion nunca medida a ~0.8%, con una banda de presion por voxel bien calibrada (~94% dentro de dos desviaciones estandar). El hematocrito fija el numero de Reynolds via un modelo de viscosidad relativa. La verdad de referencia es Kovasznay newtoniano; la RM de 4D-flow real es el siguiente paso de datos. No validado clinicamente. La red de presion se re-ejecuta en vivo en el navegador.')}</p>
      </div>
    </div>
  );
}
