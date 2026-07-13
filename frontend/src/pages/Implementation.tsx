import { useLang, pick } from '../store';

export function Implementation() {
  const lang = useLang();
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="panel">
        <h1 style={{ marginTop: 0 }}>{pick(lang, 'Implementation', 'Implementacion')}</h1>
        <p>{pick(lang,
          'The real data is processed offline; the static web app shows the committed result. The raw datasets carry data-use agreements, so they are read from a local path and are not redistributed; only the derived reconstruction is committed and displayed.',
          'Los datos reales se procesan offline; la web estatica muestra el resultado comprometido. Los datos crudos tienen acuerdos de uso, asi que se leen desde una ruta local y no se redistribuyen; solo la reconstruccion derivada se compromete y se muestra.')}</p>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="panel">
          <h2>{pick(lang, 'Offline pipeline', 'Pipeline offline')}</h2>
          <p className="small mono">cardiopinnlab/real/ecgi_edgar.py (NumPy/SciPy)</p>
          <ul className="small">
            <li>{pick(lang, 'load the REAL EDGAR torso + cage geometry and the measured potentials (3 rhythms)', 'cargar la geometria real EDGAR torso + jaula y los potenciales medidos (3 ritmos)')}</li>
            <li>{pick(lang, 'build the forward operator on the real geometry', 'construir el operador directo sobre la geometria real')}</li>
            <li>{pick(lang, 'reconstruct: Tikhonov, graph-regularized, and a deep ensemble', 'reconstruir: Tikhonov, regularizado por grafo, y un ensemble profundo')}</li>
            <li>{pick(lang, 'validate vs the REAL measured heart potentials; bake the compact result', 'validar contra los potenciales cardiacos reales medidos; hornear el resultado compacto')}</li>
          </ul>
        </div>
        <div className="panel">
          <h2>{pick(lang, 'Static web app', 'Web estatica')}</h2>
          <p className="small mono">Vite + React + three.js</p>
          <ul className="small">
            <li>{pick(lang, 'loads the committed reconstruction (mesh + fields over the beat + metrics)', 'carga la reconstruccion comprometida (malla + campos durante el latido + metricas)')}</li>
            <li>{pick(lang, 'renders the recovered heart-surface potential on the REAL cage geometry', 'renderiza el potencial de superficie cardiaca recuperado sobre la geometria real de la jaula')}</li>
            <li>{pick(lang, 'animates the beat; toggles recovered / measured / error / uncertainty', 'anima el latido; alterna recuperado / medido / error / incertidumbre')}</li>
            <li>{pick(lang, 'shows the real validation metrics per rhythm', 'muestra las metricas de validacion reales por ritmo')}</li>
          </ul>
        </div>
      </div>
      <div className="panel">
        <h2>{pick(lang, 'Data governance', 'Gobernanza de datos')}</h2>
        <p className="small">{pick(lang,
          'EDGAR data (Consortium for ECG Imaging) is used under its data-use agreement with attribution. The raw .mat files are gitignored and never committed; the repository contains only the derived reconstruction result and the code.',
          'Los datos EDGAR (Consortium for ECG Imaging) se usan bajo su acuerdo de uso con atribucion. Los archivos .mat crudos estan en gitignore y nunca se comprometen; el repositorio contiene solo el resultado de reconstruccion derivado y el codigo.')}</p>
      </div>
    </div>
  );
}
