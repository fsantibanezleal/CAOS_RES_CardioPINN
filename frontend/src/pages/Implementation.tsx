import { Tabs, type TabDef, Callout, Equation, Refs } from '@fasl-work/caos-app-shell';
import { useLang, pick, type Lang } from '../store';

// The real architecture: two offline lanes (ECGi on CPU, 4D-flow on GPU) both gated, both baking a committed
// trace the static web reads. Theme-aware; all colours are CSS-variable tokens.
function ArchSvg({ lang }: { lang: Lang }) {
  return (
    <div className="fig-svg wide">
      <svg viewBox="0 0 760 250" role="img" style={{ width: '100%', height: 'auto' }}>
        <rect x="10" y="26" width="430" height="212" rx="10" fill="none" stroke="var(--border)" strokeDasharray="5 4" />
        <text x="22" y="46" fill="var(--muted)" fontSize="11.5">{pick(lang, 'OFFLINE: the physics (local machine, never in CI or the web)', 'OFFLINE: la fisica (maquina local, nunca en CI ni la web)')}</text>
        <rect x="24" y="56" width="200" height="80" rx="8" fill="var(--panel-2)" stroke="var(--accent-2)" strokeWidth="1.3" />
        <text x="36" y="76" fill="var(--fg)" fontSize="11.5" fontWeight="600">{pick(lang, 'ECGi · CPU (NumPy/SciPy)', 'ECGi · CPU (NumPy/SciPy)')}</text>
        <text x="36" y="93" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono,monospace)">ecgi_edgar · ecgi_catalogue · ecgi_bem</text>
        <text x="36" y="109" fill="var(--fg)" fontSize="9.5">{pick(lang, 'A → Tikhonov + graph + ensemble', 'A → Tikhonov + grafo + ensemble')}</text>
        <text x="36" y="124" fill="var(--muted)" fontSize="9">{pick(lang, 'linear solves, no GPU', 'sistemas lineales, sin GPU')}</text>
        <rect x="232" y="56" width="200" height="80" rx="8" fill="var(--panel-2)" stroke="var(--accent-2)" strokeWidth="1.3" />
        <text x="244" y="76" fill="var(--fg)" fontSize="11.5" fontWeight="600">{pick(lang, '4D-flow · GPU (PyTorch)', 'Flujo 4D · GPU (PyTorch)')}</text>
        <text x="244" y="93" fill="var(--muted)" fontSize="9.5" fontFamily="var(--mono,monospace)">flow4d_denoise · _spacetime · _ppe</text>
        <text x="244" y="109" fill="var(--fg)" fontSize="9.5">{pick(lang, 'div-free PINN → pressure-Poisson', 'PINN sin div → Poisson de presion')}</text>
        <text x="244" y="124" fill="var(--muted)" fontSize="9">{pick(lang, 'space-time analytic dv/dt', 'dv/dt analitico espacio-temporal')}</text>
        <rect x="24" y="148" width="408" height="34" rx="8" fill="var(--panel)" stroke="var(--warn)" strokeWidth="1.3" />
        <text x="36" y="169" fill="var(--fg)" fontSize="11" fontWeight="600">{pick(lang, 'Analytic gate', 'Prueba analitica')}</text>
        <text x="120" y="169" fill="var(--muted)" fontSize="9.5">{pick(lang, 'known-answer flow · must pass in pytest before any real data', 'flujo de respuesta conocida · debe pasar en pytest antes de datos reales')}</text>
        <rect x="24" y="192" width="408" height="34" rx="8" fill="var(--panel)" stroke="var(--border)" />
        <text x="36" y="213" fill="var(--fg)" fontSize="11" fontWeight="600">{pick(lang, 'Bake → committed JSON trace', 'Hornear → trace JSON comprometido')}</text>
        <text x="230" y="213" fill="var(--muted)" fontSize="9" fontFamily="var(--mono,monospace)">data/derived/*/trace.json</text>
        <path d="M440 130 H484" stroke="var(--good)" strokeWidth="1.8" markerEnd="url(#ia)" />
        <text x="462" y="122" textAnchor="middle" fill="var(--good)" fontSize="9.5">{pick(lang, 'reads', 'lee')}</text>
        <rect x="488" y="70" width="262" height="120" rx="10" fill="none" stroke="var(--border)" strokeDasharray="5 4" />
        <text x="500" y="90" fill="var(--muted)" fontSize="11.5">{pick(lang, 'WEB: static, no model', 'WEB: estatica, sin modelo')}</text>
        <rect x="502" y="100" width="234" height="34" rx="7" fill="var(--panel-2)" stroke="var(--good)" strokeWidth="1.2" />
        <text x="514" y="121" fill="var(--fg)" fontSize="10.5">{pick(lang, 'fetch trace → three.js render', 'fetch trace → render three.js')}</text>
        <rect x="502" y="142" width="234" height="34" rx="7" fill="var(--panel-2)" stroke="var(--good)" strokeWidth="1.2" />
        <text x="514" y="163" fill="var(--fg)" fontSize="10.5">{pick(lang, 'animate baked frames (paused)', 'animar cuadros horneados (pausado)')}</text>
        <defs><marker id="ia" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="var(--good)" /></marker></defs>
      </svg>
      <div className="fig-cap">{pick(lang, 'Two offline lanes, both analytic-gated, each baking a committed trace the static web only reads. The bake is deterministic given the seed; nothing recomputes at request time and no model runs in the browser.', 'Dos carriles offline, ambos con prueba analitica, cada uno horneando un trace comprometido que la web estatica solo lee. El horneado es determinista dado el seed; nada recomputa en tiempo de peticion y ningun modelo corre en el navegador.')}</div>
    </div>
  );
}

const Sym = ({ items }: { items: [string, string][] }) => (
  <ul className="sym-list">{items.map(([s, d], i) => <li key={i}><code>{s}</code> {d}</li>)}</ul>
);

export function Implementation() {
  const lang = useLang();
  const tabs: TabDef[] = [
    {
      id: 'arch', label: pick(lang, 'Architecture', 'Arquitectura'),
      content: (
        <section>
          <h2>{pick(lang, 'Two offline lanes, one artifact contract', 'Dos carriles offline, un contrato de artefacto')}</h2>
          <ArchSvg lang={lang} />
          <p>{pick(lang,
            'Every result is computed OFFLINE and committed as a compact JSON trace; the static web app only reads it (no server, no in-browser model). The ECGi lane is pure NumPy/SciPy on the CPU; the 4D-flow lane trains small PINNs on a local GPU. Both are deterministic given the seed and are validated in CI against a committed artifact.',
            'Cada resultado se computa OFFLINE y se compromete como un trace JSON compacto; la web estatica solo lo lee (sin servidor, sin modelo en el navegador). El carril ECGi es NumPy/SciPy puro en CPU; el carril de flujo 4D entrena PINNs pequenas en una GPU local. Ambos son deterministas dado el seed y se validan en CI contra un artefacto comprometido.')}</p>
          <Callout>{pick(lang, 'Reproducibility: a run is a pure function of (case, seed). NumPy and torch are seeded; the committed trace is the frozen output; CI never re-bakes, it validates the committed artifact.', 'Reproducibilidad: una corrida es funcion pura de (caso, seed). NumPy y torch se siembran; el trace comprometido es la salida congelada; CI nunca re-hornea, valida el artefacto comprometido.')}</Callout>
          <Refs ids={['aras2015', 'raissi2020']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'ecgi-load', label: pick(lang, 'ECGi: loader', 'ECGi: cargador'),
      content: (
        <section>
          <h2>{pick(lang, 'The config-driven EDGAR loader', 'El cargador EDGAR guiado por configuracion')}</h2>
          <p>{pick(lang,
            'The EDGAR datasets carry per-lab field names and mesh layouts, so a single config drives the loader. Utah stores potentials in a MATLAB ts struct field potvals with meshes as node/face structs; Maastricht stores raw arrays hartpots (heart) and lichaampots (body) with meshes hart/lichaam. The loader reads each case by its config, drops any frames containing NaNs, and returns a common shape: body potentials, heart potentials, the two node clouds, and the heart triangulation.',
            'Los datasets EDGAR tienen nombres de campo y disposiciones de malla por laboratorio, asi que una sola configuracion guia el cargador. Utah guarda potenciales en un struct ts de MATLAB con campo potvals y mallas como structs node/face; Maastricht guarda arreglos crudos hartpots (corazon) y lichaampots (cuerpo) con mallas hart/lichaam. El cargador lee cada caso por su configuracion, descarta cuadros con NaN, y devuelve una forma comun: potenciales corporales, potenciales cardiacos, las dos nubes de nodos, y la triangulacion cardiaca.')}</p>
          <p>{pick(lang,
            'Two datasets reconstruct cleanly with the identical downstream pipeline (no per-heart retuning): the Utah human torso tank (192 body → 256 cage; sinus + PVP + AVP) and the Maastricht in-situ dog (140 body → 1321-node epicardium; sinus). Bordeaux (open sock, rank-deficient forward), Valencia (a simulation, not a measurement) and the ischemia BEM matrices (an unreadable MAT variant) were inspected and honestly excluded.',
            'Dos datasets reconstruyen limpiamente con el mismo pipeline (sin reajuste por corazon): el tanque de torso humano de Utah (192 → 256; sinusal + PVP + AVP) y el perro in situ de Maastricht (140 → 1321; sinusal). Bordeaux (malla abierta, directo rango-deficiente), Valencia (una simulacion) y las matrices BEM de isquemia (variante MAT ilegible) se inspeccionaron y excluyeron con honestidad.')}</p>
          <Callout>{pick(lang, 'The completeness floor is enforced: the catalogue bake must contain >=2 datasets and >=4 beats, so a partial bake cannot silently shrink the catalogue.', 'El piso de completitud se impone: el horneado del catalogo debe contener >=2 datasets y >=4 latidos, asi que un horneado parcial no puede encoger el catalogo en silencio.')}</Callout>
          <Refs ids={['aras2015', 'cluitmans2018']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'ecgi-fwd', label: pick(lang, 'ECGi: forward operator', 'ECGi: operador directo'),
      content: (
        <section>
          <h2>{pick(lang, 'The forward operator: single-layer and BEM', 'El operador directo: capa simple y BEM')}</h2>
          <p>{pick(lang,
            'Two forward operators are implemented on the real geometry. The default is a single-layer (point-source) kernel evaluated on the real electrode positions and row-normalized, with a scalar gain calibrated once on the first half of the beat and then fixed. The second is a full boundary-element operator: exact triangle solid angles (Van Oosterom-Strackee) for the double layer, triangle 1/r integrals for the single layer, the c(p) jump folded into a deflated diagonal, and the heart-surface normal current eliminated to give the transfer matrix.',
            'Se implementan dos operadores directos sobre la geometria real. El default es un nucleo de capa simple (fuente puntual) evaluado en las posiciones reales de electrodos y normalizado por filas, con una ganancia escalar calibrada una vez en la primera mitad del latido y luego fijada. El segundo es un operador de elementos de contorno completo: angulos solidos exactos de triangulo (Van Oosterom-Strackee) para la doble capa, integrales de 1/r por triangulo para la capa simple, el salto c(p) en una diagonal deflactada, y la corriente normal cardiaca eliminada para dar la matriz de transferencia.')}</p>
          <Equation tex={String.raw`A_{ij}=\frac{g}{4\pi\lVert x^b_i-x^h_j\rVert}\Big/\textstyle\sum_j(\cdot) \quad\text{(single-layer)}, \qquad Z=[D_{BB}-G_{BH}G_{HH}^{-1}D_{HB}]^{-1}[G_{BH}G_{HH}^{-1}D_{HH}-D_{BH}] \quad\text{(BEM)}`}
            caption={pick(lang, 'The single-layer kernel and the BEM transfer matrix (double-layer D + single-layer G blocks, heart normal current eliminated).', 'El nucleo de capa simple y la matriz de transferencia BEM (bloques de doble capa D + capa simple G, corriente normal cardiaca eliminada).')} />
          <Sym items={[['g', pick(lang, 'calibrated scalar gain', 'ganancia escalar calibrada')], ['x^b, x^h', pick(lang, 'body / heart electrode positions', 'posiciones de electrodo cuerpo / corazon')], ['D, G', pick(lang, 'double-layer (solid angle) / single-layer (1/r) blocks', 'bloques doble capa (angulo solido) / capa simple (1/r)')], ['Z', pick(lang, 'the BEM transfer matrix', 'la matriz de transferencia BEM')]]} />
          <Callout>{pick(lang, 'The BEM is analytic-gated (concentric spheres: correlation 1.00, error halving per mesh refinement) but on the coarse real electrode geometry it does not beat the calibrated single-layer, so the single-layer stays the default. A null result, reported not hidden.', 'El BEM tiene prueba analitica (esferas concentricas: correlacion 1.00, error a la mitad por refinamiento) pero sobre la geometria gruesa real no supera a la capa simple calibrada, asi que la capa simple sigue de default. Un resultado nulo, reportado no oculto.')}</Callout>
          <Refs ids={['barr1977', 'vanoosterom1983', 'bear2018']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'ecgi-rec', label: pick(lang, 'ECGi: reconstruction', 'ECGi: reconstruccion'),
      content: (
        <section>
          <h2>{pick(lang, 'Reconstruction: Tikhonov + graph prior + ensemble UQ', 'Reconstruccion: Tikhonov + prior de grafo + UQ por ensemble')}</h2>
          <p>{pick(lang,
            'The reconstruction solves a regularized least-squares problem. Two penalties are compared at their oracle-best lambda (swept over 30 log-spaced values, the value minimizing the true error against the real cage, so each method is judged at its best): a zeroth-order Tikhonov penalty (identity) and a graph-Laplacian penalty built from the real heart-cage triangulation. A deep ensemble of K=6 reconstructions over measurement-noise draws (sigma = 2% of the data standard deviation) gives a per-node spread, recalibrated by a temperature so the 2-sigma band matches the real error.',
            'La reconstruccion resuelve un problema de minimos cuadrados regularizado. Dos penalizaciones se comparan en su mejor lambda por oraculo (barrido en 30 valores log-espaciados, el que minimiza el error real contra la jaula, para juzgar cada metodo en su mejor version): una penalizacion Tikhonov de orden cero (identidad) y una penalizacion de Laplaciano de grafo construida de la triangulacion real. Un ensemble profundo de K=6 reconstrucciones sobre realizaciones de ruido (sigma = 2% de la desviacion de los datos) da una dispersion por nodo, recalibrada por una temperatura para que la banda 2-sigma coincida con el error real.')}</p>
          <Equation tex={String.raw`\hat\phi=(A^\top A+\lambda^2 L^\top L)^{-1}A^\top\phi_{\text{body}}, \qquad \bar\phi=\tfrac1K\textstyle\sum_k\hat\phi^{(k)},\;\; s=\tau\cdot\mathrm{std}_k\,\hat\phi^{(k)}`}
            caption={pick(lang, 'The closed-form regularized solve; the ensemble mean is the reconstruction and the recalibrated spread s is the per-node uncertainty.', 'La solucion regularizada en forma cerrada; la media del ensemble es la reconstruccion y la dispersion recalibrada s es la incertidumbre por nodo.')} />
          <Sym items={[['λ', pick(lang, 'oracle-best regularization strength', 'mejor fuerza de regularizacion por oraculo')], ['L', pick(lang, 'identity (Tikhonov) or mesh graph-Laplacian', 'identidad (Tikhonov) o Laplaciano de grafo de malla')], ['K, τ', pick(lang, 'ensemble size (6) and recalibration temperature', 'tamano del ensemble (6) y temperatura de recalibracion')]]} />
          <Callout>{pick(lang, 'Results (vs the REAL heart cage): human sinus RE 0.65 / CC 0.72, PVP 0.58 / 0.80, AVP 0.54 / 0.85; dog sinus 0.54 / 0.78; node-UQ ~0.90. Same pipeline, no per-heart retuning, so the numbers measure a method.', 'Resultados (vs la jaula REAL): humano sinusal RE 0.65 / CC 0.72, PVP 0.58 / 0.80, AVP 0.54 / 0.85; perro sinusal 0.54 / 0.78; UQ nodo ~0.90. Mismo pipeline, sin reajuste, asi que los numeros miden un metodo.')}</Callout>
          <Refs ids={['tikhonov1977', 'ghosh2009', 'lakshminarayanan2017']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'flow-dec', label: pick(lang, '4D-flow: decode', 'Flujo 4D: decodificar'),
      content: (
        <section>
          <h2>{pick(lang, 'Decoding the real 4D-flow velocity', 'Decodificar la velocidad real de flujo 4D')}</h2>
          <p>{pick(lang,
            'The 4D-flow DICOM series (Philips) stores, per cardiac frame, a magnitude image and three phase-contrast velocity images along the patient RL, AP and FH axes. The 12-bit phase maps to velocity through the DICOM rescale: velocity = (slope*px + intercept)/4096 * venc, so the full rescaled range spans plus/minus the venc (120 cm/s). Voxel centres come from ImagePositionPatient / ImageOrientationPatient / PixelSpacing, so velocity samples and geometry share the patient frame. Speeds above the venc phase-wrap; wrapped voxels are detected against a robust local estimate and unwrapped by twice the venc before reconstruction.',
            'La serie DICOM de flujo 4D (Philips) guarda, por cuadro cardiaco, una imagen de magnitud y tres imagenes de velocidad por contraste de fase a lo largo de los ejes RL, AP y FH del paciente. La fase de 12 bits mapea a velocidad por el rescale DICOM: velocidad = (slope*px + intercept)/4096 * venc, asi que el rango reescalado abarca mas/menos el venc (120 cm/s). Los centros de voxel vienen de ImagePositionPatient / ImageOrientationPatient / PixelSpacing, asi que velocidad y geometria comparten el marco del paciente. Las velocidades sobre el venc pliegan la fase; los voxeles plegados se detectan contra un estimador local robusto y se desdoblan por dos veces el venc antes de reconstruir.')}</p>
          <Equation tex={String.raw`v_{\text{cm/s}}=\frac{\text{slope}\cdot px+\text{intercept}}{4096}\cdot v_{\text{enc}}, \qquad v_{\text{mm/ms}}=0.01\,v_{\text{cm/s}}`}
            caption={pick(lang, 'The phase-to-velocity rescale, and the conversion to the SI-ish units the solver uses. The lumen is segmented from the pulsatile flow (peak-speed threshold, largest connected component).', 'El rescale de fase a velocidad, y la conversion a las unidades que usa el solver. El lumen se segmenta del flujo pulsatil (umbral de velocidad pico, mayor componente conexa).')} />
          <Sym items={[['venc', pick(lang, 'velocity-encoding limit (120 cm/s); speeds above it alias', 'limite de codificacion (120 cm/s); las velocidades por encima pliegan')], ['slope, intercept', pick(lang, 'DICOM RescaleSlope / RescaleIntercept', 'RescaleSlope / RescaleIntercept del DICOM')]]} />
          <Callout>{pick(lang, 'The provided STL is a different subject (not co-registered), so the lumen is segmented from the scan itself. 27863 phase-wrapped samples were unwrapped on this scan.', 'El STL provisto es de otro sujeto (no co-registrado), asi que el lumen se segmenta del propio escaneo. Se desdoblaron 27863 muestras plegadas en este escaneo.')}</Callout>
          <Refs ids={['krittian2012']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'flow-ppe', label: pick(lang, '4D-flow: denoise + PPE', 'Flujo 4D: suavizar + PPE'),
      content: (
        <section>
          <h2>{pick(lang, 'Divergence-free denoiser + pressure-Poisson solve', 'Suavizador sin divergencia + resolucion de Poisson de presion')}</h2>
          <p>{pick(lang,
            'A network v(x,y,z) is trained to fit the measured lumen velocity while enforcing incompressibility (div v = 0 at collocation points). Because the pressure-Poisson source is a product of velocity derivatives, measurement noise (which violates continuity) would be amplified; the divergence-free fit projects it out. The pressure follows from the pressure-Poisson equation with the source and Neumann wall flux computed from the network ANALYTIC derivatives (not finite differences at the lumen edge, which is what removes the boundary artifact), solved by a sparse direct method on the largest connected lumen component with one Dirichlet pin.',
            'Una red v(x,y,z) se entrena para ajustar la velocidad medida del lumen imponiendo incompresibilidad (div v = 0 en puntos de colocacion). Como la fuente de la Poisson de presion es un producto de derivadas de velocidad, el ruido (que viola la continuidad) se amplificaria; el ajuste sin divergencia lo proyecta fuera. La presion sigue de la ecuacion de Poisson con la fuente y el flujo Neumann de pared calculados de las derivadas ANALITICAS de la red (no diferencias finitas en el borde, que es lo que elimina el artefacto de frontera), resuelta por un metodo directo disperso en la mayor componente conexa con un pin de Dirichlet.')}</p>
          <Equation tex={String.raw`\min_\theta \lVert v_\theta-v^{\text{meas}}\rVert^2+\lambda\lVert\nabla\cdot v_\theta\rVert^2 \;\Rightarrow\; \nabla^2 p=S(v_\theta),\;\; \partial_n p=b(v_\theta)\cdot n`}
            caption={pick(lang, 'The divergence-free velocity objective, then the elliptic pressure solve with an analytic source and Neumann flux. Constants: rho = 1060 kg/m3, mu = 0.0035 Pa s.', 'El objetivo de velocidad sin divergencia, luego la resolucion eliptica de presion con fuente y flujo Neumann analiticos. Constantes: rho = 1060 kg/m3, mu = 0.0035 Pa s.')} />
          <Callout>{pick(lang, 'The momentum-residual PINN (a single net (x,y,z,t)->(u,v,w,p)) was tried and FAILED to recover pressure at aortic Reynolds numbers (pressure is gauge-free and weakly coupled); it is kept in flow4d_pinn.py as the documented failed approach. Separating the well-posed velocity fit from the elliptic pressure solve is what works.', 'El PINN de residuo de momento (una sola red (x,y,z,t)->(u,v,w,p)) se probo y FALLO en recuperar la presion a Reynolds aortico (la presion no tiene calibre y se acopla debil); se conserva en flow4d_pinn.py como el enfoque fallido documentado. Separar el ajuste de velocidad bien planteado de la resolucion eliptica es lo que funciona.')}</Callout>
          <Refs ids={['raissi2020', 'krittian2012']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'flow-st', label: pick(lang, '4D-flow: space-time', 'Flujo 4D: espacio-tiempo'),
      content: (
        <section>
          <h2>{pick(lang, 'The space-time PINN: an analytic unsteady term', 'El PINN espacio-temporal: un termino no estacionario analitico')}</h2>
          <p>{pick(lang,
            'A space-time network v(x,y,z,t) is trained divergence-free over the whole cardiac cycle, so the pressure-Poisson source AND the unsteady acceleration dv/dt are both analytic (autograd in time), replacing an earlier three-frame finite difference. This is gated on an analytic time-varying Poiseuille flow whose exact dw/dt is known: the network recovers it at correlation 0.995. On the real scan the analytic unsteady term takes the recovered relative-pressure range from an inflated 14.87 mmHg (noisy finite difference) to a small, physiological 0.79 mmHg, the same order as the clinical Bernoulli estimate (2.51 mmHg) from the same scan.',
            'Una red espacio-temporal v(x,y,z,t) se entrena sin divergencia sobre todo el ciclo cardiaco, asi que la fuente de la Poisson de presion Y la aceleracion no estacionaria dv/dt son ambas analiticas (autograd en el tiempo), reemplazando una diferencia finita de tres cuadros. Se prueba en un flujo analitico de Poiseuille variable en el tiempo cuyo dw/dt exacto se conoce: la red lo recupera con correlacion 0.995. En el escaneo real el termino analitico lleva el rango de presion relativa de 14.87 mmHg inflado (diferencia finita ruidosa) a un pequeno y fisiologico 0.79 mmHg, del mismo orden que la estimacion clinica de Bernoulli (2.51 mmHg).')}</p>
          <Equation tex={String.raw`\partial_t v = \frac{U}{T}\,\partial_{\tilde t}\,v_\theta \quad\text{(analytic, autograd)}, \qquad b = -\rho\,\partial_t v + \text{(convective + viscous)}`}
            caption={pick(lang, 'The analytic temporal derivative (chain rule through the non-dimensional time), feeding the full Neumann flux with the exact unsteady contribution.', 'La derivada temporal analitica (regla de la cadena por el tiempo adimensional), alimentando el flujo Neumann completo con la contribucion no estacionaria exacta.')} />
          <Callout>{pick(lang, 'A velocity-noise ensemble (5% of the venc) moves the pressure by under 0.01 mmHg: the denoiser makes the pressure robust to velocity noise, so the dominant uncertainty is instead the absent gold standard + segmentation + unsteady approximation, which an ensemble cannot quantify. Reported as a scalar, not a misleading uniform ~0 UQ field.', 'Un ensemble de ruido de velocidad (5% del venc) mueve la presion en menos de 0.01 mmHg: el suavizador hace la presion robusta al ruido, asi que la incertidumbre dominante es el patron de oro ausente + segmentacion + aproximacion no estacionaria, que un ensemble no puede cuantificar. Reportado como escalar, no como un campo UQ uniforme ~0 enganoso.')}</Callout>
          <Refs ids={['raissi2020']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'contract', label: pick(lang, 'Artifact contract + guards', 'Contrato + guardas'),
      content: (
        <section>
          <h2>{pick(lang, 'The artifact contract and CI guards', 'El contrato de artefacto y las guardas de CI')}</h2>
          <p>{pick(lang,
            'The bake is the boundary between the offline physics and the web. Each case bakes a compact, schema-versioned JSON trace: for ECGi the cage triangulation plus the per-beat fields (recovered, measured, error, uncertainty) at decimated frames plus the validation metrics; for 4D-flow a decimated lumen point cloud plus the pressure at peak systole plus the pulsatile speed over the cycle plus the metrics. The web loads only these traces.',
            'El horneado es la frontera entre la fisica offline y la web. Cada caso hornea un trace JSON compacto con version de esquema: para ECGi la triangulacion de la jaula mas los campos por latido (recuperado, medido, error, incertidumbre) en cuadros decimados mas las metricas; para flujo 4D una nube de puntos decimada mas la presion en sistole pico mas la rapidez pulsatil mas las metricas. La web carga solo estos traces.')}</p>
          <p>{pick(lang,
            'A validator and pytest run in CI carry hard floors so a partial or non-physiological bake fails rather than shipping silently: the ECGi catalogue must have at least two datasets and four beats with all fields and metrics present; the 4D-flow pressure range must be physiological (under 60 mmHg) and the peak velocity in a physiological range. Every physics engine additionally has an analytic gate test that must pass before real data is trusted.',
            'Un validador y pytest corren en CI con pisos duros para que un horneado parcial o no fisiologico falle en vez de desplegarse en silencio: el catalogo ECGi debe tener al menos dos datasets y cuatro latidos con todos los campos y metricas; el rango de presion de flujo 4D debe ser fisiologico (bajo 60 mmHg) y la velocidad pico en rango fisiologico. Cada motor tiene ademas una prueba de gate analitico que debe pasar antes de confiar en datos reales.')}</p>
          <Callout variant="honest">{pick(lang, 'A test or CI run never writes a canonical artifact; the committed trace is re-verified before it is served. Raw datasets are read from a local path and gitignored, never committed or redistributed (data-use agreements).', 'Una corrida de test o CI nunca escribe un artefacto canonico; el trace comprometido se re-verifica antes de servirlo. Los datos crudos se leen de una ruta local y estan gitignored, nunca comprometidos ni redistribuidos (acuerdos de uso).')}</Callout>
          <Refs ids={['aras2015']} label="Refs" />
        </section>
      ),
    },
    {
      id: 'deploy', label: pick(lang, 'Deployment', 'Despliegue'),
      content: (
        <section>
          <h2>{pick(lang, 'Deployment', 'Despliegue')}</h2>
          <p>{pick(lang,
            'The static single-page app (Vite, React, React Router with a hash route, three.js / react-three-fiber) is built frontend-only over the committed traces (a build step copies data/derived into the bundle) and deployed by a GitHub Actions workflow to GitHub Pages, on the custom domain cardiopinn.fasl-work.com (the github.io URL 301-redirects to it). There is no server and nothing recomputes at request time; a deploy is a frozen build over a frozen artifact.',
            'La aplicacion estatica de una pagina (Vite, React, React Router con ruta hash, three.js / react-three-fiber) se construye solo-frontend sobre los traces comprometidos (un paso de build copia data/derived al bundle) y la despliega un workflow de GitHub Actions a GitHub Pages, en el dominio propio cardiopinn.fasl-work.com (la URL github.io redirige 301 a el). No hay servidor y nada recomputa en tiempo de peticion; un despliegue es un build congelado sobre un artefacto congelado.')}</p>
          <Callout>{pick(lang, 'The typecheck, the content-standards guard (no em-dash / no emoji), the artifact validator and pytest all run in CI before a merge; the deploy runs on merge to main. Both cases + every doc page are screenshot-verified light+dark before shipping.', 'El typecheck, la guarda de estandares de contenido (sin em-dash / sin emoji), el validador de artefactos y pytest corren en CI antes de un merge; el despliegue corre al mergear a main. Ambos casos + cada pagina se verifican por captura claro+oscuro antes de desplegar.')}</Callout>
          <Refs ids={['aras2015']} label="Refs" />
        </section>
      ),
    },
  ];

  return (
    <div className="page-body prose">
      <div className="page-head">
        <h1>{pick(lang, 'Implementation', 'Implementacion')}</h1>
        <p className="lede">{pick(lang,
          'Two real offline pipelines, module by module, with their exact algorithms and constants: the ECGi reconstruction (CPU, NumPy/SciPy) and the 4D-flow pressure recovery (GPU, PyTorch). Each is gated on an analytic problem, then bakes a committed trace the static web reads. Raw datasets carry data-use agreements and stay local.',
          'Dos pipelines reales offline, modulo a modulo, con sus algoritmos y constantes exactas: la reconstruccion ECGi (CPU, NumPy/SciPy) y la recuperacion de presion de flujo 4D (GPU, PyTorch). Cada uno pasa una prueba analitica y luego hornea un trace comprometido que la web estatica lee. Los datos crudos tienen acuerdos de uso y quedan locales.')}</p>
      </div>

      <Tabs tabs={tabs} ariaLabel={pick(lang, 'Implementation sections', 'Secciones de implementacion')} />
    </div>
  );
}
