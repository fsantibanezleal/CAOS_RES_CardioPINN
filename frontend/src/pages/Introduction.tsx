import { useLang, pick } from '../store';

export function Introduction() {
  const lang = useLang();
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="panel">
        <h1 style={{ marginTop: 0 }}>CardioPINN</h1>
        <p>{pick(lang,
          'CardioPINN is an applied framework for physics-informed reconstruction of cardiac quantities that cannot be measured directly, from data that CAN be measured. Every case fits a REAL measured signal and is validated against a REAL gold standard. There is no synthetic ground truth: a network that only re-solves an equation a classical solver already solves answers no clinical question, so it is not what this project does.',
          'CardioPINN es un marco aplicado para la reconstruccion informada por fisica de cantidades cardiacas que no se pueden medir directamente, a partir de datos que SI se pueden medir. Cada caso ajusta una senal real medida y se valida contra un patron de oro real. No hay verdad de referencia sintetica: una red que solo vuelve a resolver una ecuacion que un solucionador clasico ya resuelve no responde ninguna pregunta clinica.')}</p>
      </div>
      <div className="panel">
        <h2>{pick(lang, 'The flagship case: ECG imaging', 'El caso insignia: imagen de ECG')}</h2>
        <p>{pick(lang,
          'Electrocardiographic imaging (ECGi) reconstructs the electrical potentials on the heart surface from a body-surface recording, non-invasively, to localize an arrhythmia and guide ablation. It is a severely ill-posed inverse problem. We use a real torso-tank experiment (EDGAR, Consortium for ECG Imaging) that recorded, simultaneously, the body-surface potentials AND the true heart-surface potentials, so we can fit the real body-surface data, recover the heart-surface potentials, and check them against the real measured truth.',
          'La imagen electrocardiografica (ECGi) reconstruye los potenciales electricos en la superficie del corazon a partir de un registro de superficie corporal, de forma no invasiva, para localizar una arritmia y guiar la ablacion. Es un problema inverso severamente mal planteado. Usamos un experimento real de tanque de torso (EDGAR) que registro simultaneamente los potenciales de superficie corporal Y los potenciales verdaderos de superficie cardiaca.')}</p>
      </div>
      <div className="panel">
        <h2>{pick(lang, 'The four questions every case answers', 'Las cuatro preguntas que responde cada caso')}</h2>
        <ul>
          <li><b>{pick(lang, 'The case', 'El caso')}:</b> {pick(lang, 'a concrete clinical scenario on real data.', 'un escenario clinico concreto sobre datos reales.')}</li>
          <li><b>{pick(lang, 'The need', 'La necesidad')}:</b> {pick(lang, 'a quantity that matters and cannot be measured directly in a patient.', 'una cantidad que importa y no se puede medir directamente en un paciente.')}</li>
          <li><b>{pick(lang, 'How the physics helps', 'Como ayuda la fisica')}:</b> {pick(lang, 'fitting the real measured signal under the governing equations makes the ill-posed recovery possible.', 'ajustar la senal real medida bajo las ecuaciones gobernantes hace posible la recuperacion mal planteada.')}</li>
          <li><b>{pick(lang, 'What we compute', 'Que calculamos')}:</b> {pick(lang, 'the unmeasurable quantity, validated against a real gold standard.', 'la cantidad no medible, validada contra un patron de oro real.')}</li>
        </ul>
      </div>
      <div className="panel">
        <h2>{pick(lang, 'Honesty', 'Honestidad')}</h2>
        <ul>
          <li>{pick(lang, 'Real measured target, real gold-standard validation. No synthetic data.', 'Objetivo real medido, validacion con patron de oro real. Sin datos sinteticos.')}</li>
          <li>{pick(lang, 'Numbers are the measured reconstruction quality against real truth (relative error, correlation), not error against a field we invented.', 'Los numeros son la calidad de reconstruccion medida contra la verdad real (error relativo, correlacion), no el error contra un campo que inventamos.')}</li>
          <li>{pick(lang, 'Not clinically deployed: a validated methodological result on real experimental data. Raw datasets are used under their data-use agreements and are not redistributed.', 'No desplegado clinicamente: un resultado metodologico validado sobre datos experimentales reales. Los datos crudos se usan bajo sus acuerdos de uso y no se redistribuyen.')}</li>
        </ul>
      </div>
    </div>
  );
}
