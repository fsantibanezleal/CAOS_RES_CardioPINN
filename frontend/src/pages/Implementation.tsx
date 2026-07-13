import { Callout } from '../components/Callout';
import { Refs } from '../components/Refs';
import { useLang, pick } from '../store';

function ArchSvg({ lang }: { lang: 'en' | 'es' }) {
  return (
    <div className="fig-svg wide">
      <svg viewBox="0 0 720 210" role="img">
        <rect x="10" y="10" width="330" height="190" rx="10" fill="none" stroke="var(--border)" strokeDasharray="5 4" />
        <text x="20" y="30" fill="var(--muted)" fontSize="12">{pick(lang, 'OFFLINE (once, NumPy/SciPy)', 'OFFLINE (una vez, NumPy/SciPy)')}</text>
        {[
          [pick(lang, 'load real EDGAR', 'cargar EDGAR real'), 45],
          [pick(lang, 'forward operator A', 'operador directo A'), 82],
          [pick(lang, 'reconstruct + ensemble UQ', 'reconstruir + UQ por ensemble'), 119],
          [pick(lang, 'validate vs real cage', 'validar vs jaula real'), 156],
        ].map((s, i) => (
          <g key={i}>
            <rect x="30" y={s[1] as number} width="290" height="28" rx="6" fill="var(--panel-2)" stroke="var(--border)" />
            <text x="175" y={(s[1] as number) + 18} textAnchor="middle" fill="var(--fg)" fontSize="12">{s[0] as string}</text>
          </g>
        ))}
        <path d="M340 105 H390" stroke="var(--good)" strokeWidth="2" markerEnd="url(#aa)" />
        <text x="365" y="96" textAnchor="middle" fill="var(--good)" fontSize="10">{pick(lang, 'commit', 'commit')}</text>
        <rect x="392" y="70" width="150" height="70" rx="8" fill="color-mix(in srgb, var(--good) 12%, var(--panel))" stroke="var(--good)" />
        <text x="467" y="98" textAnchor="middle" fill="var(--fg)" fontSize="12">trace.json</text>
        <text x="467" y="115" textAnchor="middle" fill="var(--muted)" fontSize="10">{pick(lang, 'mesh + fields + metrics', 'malla + campos + metricas')}</text>
        <path d="M542 105 H590" stroke="var(--accent-2)" strokeWidth="2" markerEnd="url(#aa)" />
        <rect x="592" y="60" width="118" height="90" rx="8" fill="var(--panel-2)" stroke="var(--border)" />
        <text x="651" y="92" textAnchor="middle" fill="var(--fg)" fontSize="12">{pick(lang, 'static web', 'web estatica')}</text>
        <text x="651" y="110" textAnchor="middle" fill="var(--muted)" fontSize="10">three.js</text>
        <text x="651" y="126" textAnchor="middle" fill="var(--muted)" fontSize="10">{pick(lang, 'render + animate', 'render + animar')}</text>
        <defs><marker id="aa" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="currentColor" /></marker></defs>
      </svg>
      <div className="fig-cap">{pick(lang, 'Two worlds, one artifact: the reconstruction is computed once offline from the real data and committed as a compact trace; the static app only renders it. The bake is deterministic given the seed.', 'Dos mundos, un artefacto: la reconstruccion se computa una vez offline desde los datos reales y se compromete como un trace compacto; la app estatica solo lo renderiza. El horneado es determinista dado el seed.')}</div>
    </div>
  );
}

export function Implementation() {
  const lang = useLang();
  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{pick(lang, 'Implementation', 'Implementacion')}</h1>
        <p className="lede">{pick(lang,
          'The real reconstruction is produced offline from the real data and committed as a compact artifact; the static web app renders it. The raw datasets carry data-use agreements, so they stay local and are not redistributed; only the derived result and the code are public.',
          'La reconstruccion real se produce offline desde los datos reales y se compromete como un artefacto compacto; la web estatica lo renderiza. Los conjuntos de datos crudos tienen acuerdos de uso, asi que quedan locales y no se redistribuyen; solo el resultado derivado y el codigo son publicos.')}</p>
      </div>

      <ArchSvg lang={lang} />

      <section>
        <h2>{pick(lang, 'The offline pipeline', 'El pipeline offline')}</h2>
        <p>{pick(lang,
          'A small NumPy/SciPy module reads the real EDGAR export (the measured potentials and the real electrode geometries), builds the forward operator on that geometry, runs the reconstructions (Tikhonov, graph-regularized, and the deep ensemble), evaluates them against the real measured heart-cage potentials, and writes a compact JSON trace: the cage triangulation, the per-beat potential fields (recovered, measured, error, uncertainty) at a decimated set of time frames, and the validation metrics. No GPU is needed for this case; the reconstruction is a set of linear solves.',
          'Un pequeno modulo NumPy/SciPy lee el export real de EDGAR (los potenciales medidos y las geometrias reales de electrodos), construye el operador directo sobre esa geometria, corre las reconstrucciones (Tikhonov, regularizado por grafo, y el ensemble profundo), las evalua contra los potenciales reales medidos de la jaula cardiaca, y escribe un trace JSON compacto: la triangulacion de la jaula, los campos de potencial por latido (recuperado, medido, error, incertidumbre) en un conjunto decimado de cuadros de tiempo, y las metricas de validacion. No se necesita GPU para este caso; la reconstruccion es un conjunto de sistemas lineales.')}</p>
      </section>

      <section>
        <h2>{pick(lang, 'The artifact contract', 'El contrato de artefacto')}</h2>
        <p>{pick(lang,
          'The web app loads only the committed trace and never recomputes the physics. A guard validates the artifact in continuous integration: it must contain the rhythms, each with a mesh, the time frames, the four fields over time, and the validation metrics, and the reconstruction node count must match the heart-electrode count. The mesh is centered and the fields are rounded so the whole three-rhythm artifact is under one megabyte.',
          'La web carga solo el trace comprometido y nunca recomputa la fisica. Un guardia valida el artefacto en integracion continua: debe contener los ritmos, cada uno con una malla, los cuadros de tiempo, los cuatro campos en el tiempo, y las metricas de validacion, y el conteo de nodos de la reconstruccion debe coincidir con el conteo de electrodos cardiacos. La malla se centra y los campos se redondean para que todo el artefacto de tres ritmos pese menos de un megabyte.')}</p>
      </section>

      <section>
        <h2>{pick(lang, 'Data governance', 'Gobernanza de datos')}</h2>
        <Callout variant="warn">
          {pick(lang,
            'EDGAR data (Consortium for ECG Imaging) is used under its data-use agreement with attribution. The raw .mat files are read from a local path and are gitignored, never committed or redistributed. The repository contains only the derived reconstruction result and the code; the app shows the measured field as a research visualization with attribution.',
            'Los datos EDGAR (Consortium for ECG Imaging) se usan bajo su acuerdo de uso con atribucion. Los archivos .mat crudos se leen desde una ruta local y estan en gitignore, nunca comprometidos ni redistribuidos. El repositorio contiene solo el resultado de reconstruccion derivado y el codigo; la app muestra el campo medido como una visualizacion de investigacion con atribucion.')}
        </Callout>
        <Refs ids={['aras2015']} />
      </section>

      <section>
        <h2>{pick(lang, 'The web app', 'La aplicacion web')}</h2>
        <p>{pick(lang,
          'The static single-page app (Vite, React, three.js) renders the recovered heart-surface potential on the real cage geometry, animates it over the beat, and toggles the recovered, measured, error and uncertainty fields, with the real validation metrics. It is deployed on a static host as a frozen build over the committed artifact, so there is no server and nothing recomputes at request time.',
          'La aplicacion estatica de una pagina (Vite, React, three.js) renderiza el potencial recuperado de superficie cardiaca sobre la geometria real de la jaula, lo anima durante el latido, y alterna los campos recuperado, medido, error e incertidumbre, con las metricas de validacion reales. Se despliega en un host estatico como un build congelado sobre el artefacto comprometido, asi que no hay servidor y nada recomputa en tiempo de peticion.')}</p>
      </section>
    </div>
  );
}
