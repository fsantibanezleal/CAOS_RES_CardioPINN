import { useLang, pick } from '../store';

// The ADR-0058 in-app "how it works" modal: what runs offline (GPU) vs in the browser, and the two contracts.
export function ArchitectureModal({ onClose }: { onClose: () => void }) {
  const lang = useLang();
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>{pick(lang, 'How CardioPINN works', 'Como funciona CardioPINN')}</h2>
          <button className="iconbtn" onClick={onClose}>{pick(lang, 'Close', 'Cerrar')}</button>
        </div>
        <p className="muted">
          {pick(lang,
            'Two worlds joined by committed artifacts. Every physics engine runs OFFLINE (the ECGi reconstruction on CPU, the 4D-flow PINN on a local GPU) and its result is baked to a JSON trace; the static web app READS those traces and renders them. No model runs in the browser.',
            'Dos mundos unidos por artefactos comprometidos. Cada motor de fisica corre OFFLINE (la reconstruccion ECGi en CPU, la PINN de flujo 4D en una GPU local) y su resultado se hornea a un trace JSON; la web estatica LEE esos traces y los renderiza. Ningun modelo corre en el navegador.')}
        </p>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 8 }}>
          <div className="panel">
            <h3>{pick(lang, 'Offline (the physics)', 'Offline (la fisica)')}</h3>
            <ul className="small">
              <li>{pick(lang, 'ECGi: load real EDGAR data, build the forward operator on the real geometry', 'ECGi: carga datos reales EDGAR, construye el operador directo sobre la geometria real')}</li>
              <li>{pick(lang, 'ECGi: Tikhonov + graph-Laplacian reconstruction + deep-ensemble node UQ (NumPy/SciPy)', 'ECGi: reconstruccion Tikhonov + Laplaciano de grafo + UQ por nodo con ensemble (NumPy/SciPy)')}</li>
              <li>{pick(lang, '4D-flow: divergence-free velocity PINN denoiser, then pressure-Poisson from analytic derivatives (PyTorch)', 'Flujo 4D: PINN de velocidad sin divergencia, luego Poisson de presion desde derivadas analiticas (PyTorch)')}</li>
              <li>{pick(lang, 'Gate every engine on an analytic problem with a known answer, then bake the trace', 'Prueba cada motor en un problema analitico de respuesta conocida, luego hornea el trace')}</li>
            </ul>
          </div>
          <div className="panel">
            <h3>{pick(lang, 'In the browser (static)', 'En el navegador (estatico)')}</h3>
            <ul className="small">
              <li>{pick(lang, 'Load the committed field trace (JSON) for the selected case', 'Carga el trace de campo comprometido (JSON) del caso seleccionado')}</li>
              <li>{pick(lang, 'Render the field on the real geometry (three.js): heart cage or aortic lumen', 'Renderiza el campo sobre la geometria real (three.js): jaula cardiaca o lumen aortico')}</li>
              <li>{pick(lang, 'Animate the beat / cardiac cycle from the baked frames (paused by default)', 'Anima el latido / ciclo cardiaco desde los cuadros horneados (pausado por defecto)')}</li>
              <li>{pick(lang, 'No inference: the browser never runs a network, it only reads traces', 'Sin inferencia: el navegador nunca ejecuta una red, solo lee traces')}</li>
            </ul>
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          {pick(lang,
            'The artifact contract: each case bakes a compact JSON trace (the mesh or point cloud + the recovered field over time + validation metrics) that the web reads directly. Raw datasets are gitignored under their data-use agreements and never redistributed.',
            'El contrato de artefactos: cada caso hornea un trace JSON compacto (la malla o nube de puntos + el campo recuperado en el tiempo + metricas de validacion) que la web lee directamente. Los datos crudos estan gitignored bajo sus acuerdos de uso y nunca se redistribuyen.')}
        </p>
      </div>
    </div>
  );
}
