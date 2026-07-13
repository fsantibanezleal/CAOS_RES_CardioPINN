// onnxruntime-web live inference of an exported PINN. Set numThreads = 1 (threaded WASM needs
// SharedArrayBuffer + COOP/COEP, absent on GitHub Pages, and would stall silently otherwise). The exported
// activation net maps physical (x, y) mm coordinates to activation time; we feed the mesh vertices and get a
// live field the browser re-renders, proving "the browser re-runs the trained PINN".
import * as ort from 'onnxruntime-web';

ort.env.wasm.numThreads = 1;

let sessionCache: Record<string, Promise<ort.InferenceSession>> = {};

function sessionFor(url: string): Promise<ort.InferenceSession> {
  if (!sessionCache[url]) {
    sessionCache[url] = ort.InferenceSession.create(url, { executionProviders: ['wasm'] });
  }
  return sessionCache[url];
}

// coordsXY: flattened [x0, y0, x1, y1, ...] in mm (2 columns). Returns the scalar output per row.
export async function runField(modelUrl: string, coordsXY: Float32Array, inputName = 'coords'): Promise<Float32Array> {
  const sess = await sessionFor(modelUrl);
  const n = coordsXY.length / 2;
  const tensor = new ort.Tensor('float32', coordsXY, [n, 2]);
  const feeds: Record<string, ort.Tensor> = {};
  feeds[sess.inputNames?.[0] ?? inputName] = tensor;
  const out = await sess.run(feeds);
  const first = out[sess.outputNames[0]];
  return first.data as Float32Array;
}
