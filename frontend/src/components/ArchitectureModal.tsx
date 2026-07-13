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
            'Two worlds joined by one artifact contract. The heavy physics runs offline on a local GPU; the static web app only replays or re-runs the exported networks.',
            'Dos mundos unidos por un contrato de artefactos. La fisica pesada corre offline en una GPU local; la web estatica solo reproduce o re-ejecuta las redes exportadas.')}
        </p>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 8 }}>
          <div className="panel">
            <h3>{pick(lang, 'Offline (GPU pipeline)', 'Offline (pipeline GPU)')}</h3>
            <ul className="small">
              <li>{pick(lang, 'Generate or ingest ground truth (fast-marching Eikonal, simulators, public data)', 'Genera o ingiere la verdad de referencia (Eikonal por fast-marching, simuladores, datos publicos)')}</li>
              <li>{pick(lang, 'Train the PINN (PyTorch, Adam then L-BFGS)', 'Entrena la PINN (PyTorch, Adam luego L-BFGS)')}</li>
              <li>{pick(lang, 'Evaluate against classical baselines', 'Evalua contra los baselines clasicos')}</li>
              <li>{pick(lang, 'Export to ONNX with a measured parity check', 'Exporta a ONNX con verificacion de paridad medida')}</li>
            </ul>
          </div>
          <div className="panel">
            <h3>{pick(lang, 'In the browser (static)', 'En el navegador (estatico)')}</h3>
            <ul className="small">
              <li>{pick(lang, 'Load the committed field trace + manifest', 'Carga el trace de campo + manifest comprometidos')}</li>
              <li>{pick(lang, 'Render the field on the real mesh (three.js)', 'Renderiza el campo sobre la malla real (three.js)')}</li>
              <li>{pick(lang, 'Live: re-run the exported PINN (onnxruntime-web)', 'En vivo: re-ejecuta la PINN exportada (onnxruntime-web)')}</li>
              <li>{pick(lang, 'Replay: animate the baked trace when not live-drivable', 'Replay: anima el trace horneado cuando no es ejecutable en vivo')}</li>
            </ul>
          </div>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          {pick(lang,
            'The two data contracts: an ingestion contract (schema + outlier policy for an electroanatomical map) and an artifact contract (the mesh-field trace + ONNX + manifest the web reads). A measured lane gate decides live vs replay.',
            'Los dos contratos de datos: un contrato de ingesta (esquema + politica de outliers para un mapa electroanatomico) y un contrato de artefactos (el trace de malla-campo + ONNX + manifest que lee la web). Una compuerta medida decide vivo vs replay.')}
        </p>
      </div>
    </div>
  );
}
