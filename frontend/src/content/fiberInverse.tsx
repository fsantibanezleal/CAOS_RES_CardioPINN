import { Equation } from '../components/Equation';
import { useLang, pick } from '../store';

export function FiberInverseContext() {
  const lang = useLang();
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="panel">
        <h3>{pick(lang, 'The problem: anisotropic conduction', 'El problema: conduccion anisotropa')}</h3>
        <p>{pick(lang,
          'Myocardium conducts faster along the muscle fiber than across it, so activation obeys the anisotropic Eikonal equation with a fiber conductivity tensor. Recovering the fiber field and the anisotropy from measured activation is the FiberNet / PIEMAP problem.',
          'El miocardio conduce mas rapido a lo largo de la fibra muscular que a traves de ella, asi que la activacion obedece la ecuacion Eikonal anisotropa con un tensor de conductividad de fibra. Recuperar el campo de fibra y la anisotropia desde la activacion medida es el problema FiberNet / PIEMAP.')}</p>
        <Equation tex={String.raw`\sqrt{(\nabla T)^{\top} D\, \nabla T} = 1,\quad D = R(\alpha)\,\mathrm{diag}(c_l^2, c_t^2)\,R(\alpha)^{\top}`} />
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Several maps + a shared fiber field', 'Varios mapas + un campo de fibra compartido')}</h3>
        <p className="small">{pick(lang,
          'A single map under-determines the fibers (the wavefront only probes some directions). Several maps from different stimulus sites jointly constrain a shared fiber-angle network and the along/across conduction velocities. A deep ensemble of K independent fits gives the epistemic uncertainty of the recovered fiber field.',
          'Un solo mapa sub-determina las fibras (el frente solo prueba algunas direcciones). Varios mapas de distintos sitios de estimulo restringen conjuntamente una red de angulo de fibra compartida y las velocidades a lo largo y a traves. Un ensemble profundo de K ajustes independientes da la incertidumbre epistemica del campo de fibra recuperado.')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Result and honesty', 'Resultado y honestidad')}</h3>
        <p className="small">{pick(lang,
          'The fiber orientation is recovered to about 16 degrees RMSE. The along-fiber velocity is close to truth; the across-fiber velocity is harder to observe from sparse maps and is overestimated, so the anisotropy ratio is underestimated (~1.5 vs ~2.3 true). The ensemble spread is small, which means the members agree, not that the estimate is unbiased; epistemic UQ does not capture that systematic transverse-CV bias, stated openly rather than hidden. Synthetic tissue; not clinically validated. The recovered fiber network re-runs live in the browser.',
          'La orientacion de fibra se recupera a unos 16 grados RMSE. La velocidad a lo largo de la fibra es cercana a la real; la velocidad transversal es mas dificil de observar desde mapas dispersos y se sobreestima, asi que la razon de anisotropia se subestima (~1.5 vs ~2.3 real). La dispersion del ensemble es pequena, lo que significa que los miembros concuerdan, no que la estimacion sea insesgada; la UQ epistemica no captura ese sesgo sistematico de la CV transversal, declarado abiertamente en vez de oculto. Tejido sintetico; no validado clinicamente. La red de fibra recuperada se re-ejecuta en vivo en el navegador.')}</p>
      </div>
    </div>
  );
}
