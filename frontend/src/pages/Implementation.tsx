import { useLang, pick } from '../store';

export function Implementation() {
  const lang = useLang();
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="panel">
        <h1 style={{ marginTop: 0 }}>{pick(lang, 'Implementation', 'Implementacion')}</h1>
        <p>{pick(lang,
          'Two worlds joined by one artifact contract. A heavy offline pipeline trains and exports on a local NVIDIA GPU; a static web app consumes only the committed artifacts.',
          'Dos mundos unidos por un contrato de artefactos. Un pipeline offline pesado entrena y exporta en una GPU NVIDIA local; una web estatica consume solo los artefactos comprometidos.')}</p>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="panel">
          <h2>{pick(lang, 'Offline pipeline', 'Pipeline offline')}</h2>
          <p className="small mono">cardiopinnlab (PyTorch, CUDA)</p>
          <ul className="small">
            <li>{pick(lang, 'ground truth: fast-marching Eikonal (scikit-fmm), simulators, public data', 'verdad de referencia: Eikonal por fast-marching (scikit-fmm), simuladores, datos publicos')}</li>
            <li>{pick(lang, 'PINN training loop: Adam then L-BFGS; Eikonal / monodomain / Navier-Stokes residuals', 'bucle de entrenamiento PINN: Adam luego L-BFGS; residuos Eikonal / monodominio / Navier-Stokes')}</li>
            <li>{pick(lang, 'baselines: linear and Gaussian-process interpolation', 'baselines: interpolacion lineal y por proceso gaussiano')}</li>
            <li>{pick(lang, 'export: torch to ONNX (opset 17) with a measured PyTorch-vs-onnxruntime parity check', 'exportacion: torch a ONNX (opset 17) con verificacion medida de paridad PyTorch-vs-onnxruntime')}</li>
          </ul>
        </div>
        <div className="panel">
          <h2>{pick(lang, 'Static web app', 'Web estatica')}</h2>
          <p className="small mono">Vite + React + three.js + onnxruntime-web</p>
          <ul className="small">
            <li>{pick(lang, 'loads the committed field trace + manifest + ONNX net', 'carga el trace de campo + manifest + red ONNX comprometidos')}</li>
            <li>{pick(lang, 'renders the field on the real mesh (CardiacMeshKit)', 'renderiza el campo sobre la malla real (CardiacMeshKit)')}</li>
            <li>{pick(lang, 'live: re-runs the exported PINN in the browser (onnxruntime-web)', 'en vivo: re-ejecuta la PINN exportada en el navegador (onnxruntime-web)')}</li>
            <li>{pick(lang, 'replay: animates the baked trace when a case is not live-drivable', 'replay: anima el trace horneado cuando un caso no es ejecutable en vivo')}</li>
          </ul>
        </div>
      </div>
      <div className="panel">
        <h2>{pick(lang, 'The two data contracts', 'Los dos contratos de datos')}</h2>
        <p className="small">{pick(lang,
          'CONTRACT 1 (ingestion): the schema (x, y, z, t) and outlier policy of an electroanatomical map, the bring-your-own-data gate. CONTRACT 2 (artifact): the mesh-field trace + ONNX net + manifest the web reads; a TypeScript type mirrors the schema so any drift fails the build. A measured lane gate (ONNX size, parity, browser-drivability, trace size) decides live vs replay; the gate verdict is committed in the manifest and enforced in CI.',
          'CONTRATO 1 (ingesta): el esquema (x, y, z, t) y la politica de outliers de un mapa electroanatomico, la puerta de trae-tus-datos. CONTRATO 2 (artefacto): el trace de malla-campo + red ONNX + manifest que lee la web; un tipo TypeScript refleja el esquema para que cualquier deriva rompa el build. Una compuerta medida (tamano ONNX, paridad, ejecutabilidad en navegador, tamano del trace) decide vivo vs replay; el veredicto se compromete en el manifest y se verifica en CI.')}</p>
      </div>
    </div>
  );
}
