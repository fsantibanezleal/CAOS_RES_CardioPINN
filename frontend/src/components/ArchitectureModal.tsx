import { useState } from 'react';
import { useLang, pick } from '../store';

// ADR-0058: the in-app "How it works" modal. A tab strip; each tab pairs ONE hand-authored, themed SVG
// (every colour a CSS-variable token, so it follows light/dark) with a compact bilingual explanation. The
// five minimum tabs: the app / lanes (web-offline-compute) / web-app flow / the science / the data contracts.

const SVG_STYLE = `
  .arch-svg { width: 100%; height: auto; font-family: var(--sans, system-ui); }
  .arch-svg .bx { fill: var(--panel-2); stroke: var(--border); stroke-width: 1.2; rx: 8; }
  .arch-svg .bx-hi { stroke: var(--accent); stroke-width: 1.6; }
  .arch-svg .bx-web { stroke: var(--good); }
  .arch-svg .bx-compute { stroke: var(--accent-2); }
  .arch-svg .bx-gate { stroke: var(--warn); }
  .arch-svg .lane { fill: color-mix(in srgb, var(--panel) 60%, transparent); stroke: var(--border); stroke-dasharray: 4 3; rx: 10; }
  .arch-svg .ttl { fill: var(--fg); font-size: 12.5px; font-weight: 600; }
  .arch-svg .sub { fill: var(--muted); font-size: 10px; }
  .arch-svg .it { fill: var(--fg); font-size: 10.5px; }
  .arch-svg .mono { fill: var(--accent-2); font-size: 10px; font-family: var(--mono, ui-monospace, monospace); }
  .arch-svg .mu { fill: var(--muted); font-size: 9.5px; }
  .arch-svg .lane-lbl { fill: var(--muted); font-size: 10.5px; font-weight: 600; letter-spacing: 0.05em; }
  .arch-svg .flow { fill: none; stroke: var(--accent-2); stroke-width: 1.5; }
  .arch-svg .flow-good { fill: none; stroke: var(--good); stroke-width: 1.5; }
  .arch-svg .lbl { fill: var(--muted); font-size: 9.5px; }
`;

function Defs() {
  return (
    <defs>
      <marker id="ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse">
        <path d="M0 0 L8 4 L0 8 z" fill="var(--accent-2)" />
      </marker>
      <marker id="ahg" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse">
        <path d="M0 0 L8 4 L0 8 z" fill="var(--good)" />
      </marker>
    </defs>
  );
}

// (1) The app + design-build lifecycle
function SvgApp() {
  return (
    <svg className="arch-svg" viewBox="0 0 880 300" role="img">
      <Defs />
      <text x="16" y="24" className="lane-lbl">CARDIOPINN: TWO REAL PHYSICS DOMAINS, ONE CATALOGUE</text>
      <rect className="bx bx-hi" x="16" y="38" width="410" height="96" rx="8" />
      <text x="30" y="60" className="ttl">Case A · ECG imaging</text>
      <text x="30" y="76" className="sub">quasi-static volume conduction (Laplace)</text>
      <text x="30" y="95" className="it">recover heart-surface potentials from a body recording</text>
      <text x="30" y="111" className="mono">real/ecgi_edgar.py · ecgi_catalogue.py · ecgi_bem.py</text>
      <text x="30" y="126" className="mu">EDGAR human tank + in-situ dog · vs real gold standard</text>
      <rect className="bx bx-hi" x="454" y="38" width="410" height="96" rx="8" />
      <text x="468" y="60" className="ttl">Case B · 4D-flow pressure</text>
      <text x="468" y="76" className="sub">incompressible Navier-Stokes (pressure-Poisson)</text>
      <text x="468" y="95" className="it">recover the aortic pressure field from a velocity scan</text>
      <text x="468" y="111" className="mono">flow4d_denoise.py · flow4d_ppe.py · flow4d_spacetime.py</text>
      <text x="468" y="126" className="mu">real 4D-flow MRI · vs analytic gate + Bernoulli</text>
      <text x="16" y="168" className="lane-lbl">DESIGN-BUILD LIFECYCLE</text>
      {[
        ['research', 'primary sources + DOIs'],
        ['implement', 'the physics engine'],
        ['gate', 'analytic known-answer'],
        ['bake', 'derived JSON trace'],
        ['SPA', 'read + render'],
        ['deploy', 'GitHub Pages'],
      ].map(([a, b], i) => (
        <g key={i}>
          <rect className={`bx ${i === 2 ? 'bx-gate' : i === 4 ? 'bx-web' : ''}`} x={16 + i * 142} y="182" width="128" height="52" rx="8" />
          <text x={80 + i * 142} y="205" textAnchor="middle" className="it">{a}</text>
          <text x={80 + i * 142} y="221" textAnchor="middle" className="mu">{b}</text>
          {i < 5 && <path className="flow" d={`M${144 + i * 142} 208 H${158 + i * 142}`} markerEnd="url(#ah)" />}
        </g>
      ))}
      <text x="16" y="266" className="mu">Every engine passes an analytic gate (known closed-form answer) BEFORE any real data is trusted; the derived result is committed and the static web only reads it.</text>
    </svg>
  );
}

// (2) Lanes: web vs offline vs compute
function SvgLanes() {
  return (
    <svg className="arch-svg" viewBox="0 0 880 320" role="img">
      <Defs />
      <rect className="lane" x="12" y="30" width="560" height="270" rx="10" />
      <text x="28" y="52" className="lane-lbl">OFFLINE: the physics (runs on your machine, never in CI or the web)</text>
      <rect className="bx bx-compute" x="30" y="64" width="255" height="104" rx="8" />
      <text x="44" y="86" className="ttl">ECGi reconstruction · CPU</text>
      <text x="44" y="103" className="mono">NumPy / SciPy · no torch</text>
      <text x="44" y="120" className="it">forward operator on real geometry</text>
      <text x="44" y="135" className="it">Tikhonov + graph-Laplacian + ensemble</text>
      <text x="44" y="152" className="mu">single-layer default · analytic-gated BEM</text>
      <rect className="bx bx-compute" x="300" y="64" width="255" height="104" rx="8" />
      <text x="314" y="86" className="ttl">4D-flow pressure · GPU</text>
      <text x="314" y="103" className="mono">PyTorch · RTX-class</text>
      <text x="314" y="120" className="it">divergence-free velocity PINN denoiser</text>
      <text x="314" y="135" className="it">space-time net → analytic dv/dt</text>
      <text x="314" y="152" className="mu">pressure-Poisson sparse direct solve</text>
      <rect className="bx bx-gate" x="30" y="182" width="525" height="46" rx="8" />
      <text x="44" y="203" className="ttl">Analytic gate</text>
      <text x="150" y="203" className="it">spheres (ECGi corr 1.00) · duct + Poiseuille (4D-flow)</text>
      <text x="44" y="219" className="mu">test_ecgi_bem · test_flow4d_ppe · test_flow4d_spacetime: must pass before real data</text>
      <rect className="bx" x="30" y="242" width="525" height="44" rx="8" />
      <text x="44" y="263" className="ttl">Bake → committed JSON trace</text>
      <text x="230" y="263" className="mono">data/derived/*/trace.json · catalogue.json</text>
      <text x="44" y="279" className="mu">the only thing that crosses into the web; raw datasets stay gitignored (data-use agreements)</text>
      <path className="flow-good" d="M572 160 H610" markerEnd="url(#ahg)" />
      <text x="576" y="152" className="lbl">reads only</text>
      <rect className="lane" x="620" y="30" width="248" height="270" rx="10" />
      <text x="636" y="52" className="lane-lbl">WEB: static</text>
      <rect className="bx bx-web" x="636" y="64" width="216" height="70" rx="8" />
      <text x="650" y="86" className="ttl">Load the trace</text>
      <text x="650" y="103" className="mono">fetch(BASE + data/*.json)</text>
      <text x="650" y="120" className="mu">no model runs in the browser</text>
      <rect className="bx bx-web" x="636" y="146" width="216" height="70" rx="8" />
      <text x="650" y="168" className="ttl">Render on real geometry</text>
      <text x="650" y="185" className="mono">three.js / react-three-fiber</text>
      <text x="650" y="202" className="mu">heart cage · aortic lumen cloud</text>
      <rect className="bx bx-web" x="636" y="228" width="216" height="58" rx="8" />
      <text x="650" y="250" className="ttl">Animate baked frames</text>
      <text x="650" y="267" className="mu">paused by default · halt on hidden tab</text>
    </svg>
  );
}

// (3) Web-app flow
function SvgWeb() {
  return (
    <svg className="arch-svg" viewBox="0 0 880 250" role="img">
      <Defs />
      <text x="16" y="24" className="lane-lbl">THE SPA (Vite · React · React Router · three.js)</text>
      <rect className="bx bx-hi" x="16" y="36" width="250" height="120" rx="8" />
      <text x="30" y="58" className="ttl">App page · /</text>
      <text x="30" y="75" className="mono">Workbench.tsx</text>
      <text x="30" y="93" className="it">left column: case selector +</text>
      <text x="30" y="108" className="it">dataset/beat/field + live readout</text>
      <text x="30" y="126" className="it">main: result-first tabs + 3D viz</text>
      <text x="30" y="145" className="mu">RealEcgi.tsx · Flow4d.tsx</text>
      <rect className="bx" x="292" y="36" width="250" height="120" rx="8" />
      <text x="306" y="58" className="ttl">Doc pages</text>
      <text x="306" y="75" className="mono">Introduction · Methodology</text>
      <text x="306" y="90" className="mono">Implementation · Experiments · Benchmark</text>
      <text x="306" y="110" className="it">prose + KaTeX + themed SVGs +</text>
      <text x="306" y="125" className="it">per-section &lt;Refs&gt; with real DOIs</text>
      <text x="306" y="145" className="mu">bilingual EN/ES · light+dark</text>
      <rect className="bx bx-web" x="568" y="36" width="296" height="120" rx="8" />
      <text x="582" y="58" className="ttl">Shell + shared chrome</text>
      <text x="582" y="75" className="mono">Layout.tsx · lib/routes.ts · lib/links.ts</text>
      <text x="582" y="93" className="it">sticky header: brand + nav + external</text>
      <text x="582" y="108" className="it">links + ⓘ Architecture + lang + theme</text>
      <text x="582" y="126" className="it">CitationsProvider · data/citations.ts</text>
      <text x="582" y="145" className="mu">footer: provenance + honest disclaimer</text>
      <rect className="bx bx-gate" x="16" y="176" width="410" height="56" rx="8" />
      <text x="30" y="198" className="ttl">Build-time overlay + guards</text>
      <text x="30" y="216" className="mono">copy-data.mjs → public/data · tsc · content-standards</text>
      <rect className="bx bx-web" x="454" y="176" width="410" height="56" rx="8" />
      <text x="468" y="198" className="ttl">Deploy · GitHub Pages (Actions)</text>
      <text x="468" y="216" className="mono">frontend-only build over committed traces · CNAME cardiopinn.fasl-work.com</text>
      <path className="flow" d="M221 156 V176" markerEnd="url(#ah)" />
      <path className="flow" d="M659 156 V176" markerEnd="url(#ah)" />
    </svg>
  );
}

// (4) The science: the two governing chains
function SvgScience() {
  return (
    <svg className="arch-svg" viewBox="0 0 880 300" role="img">
      <Defs />
      <text x="16" y="22" className="lane-lbl">A · ECG IMAGING: recover an unmeasurable field by an ill-posed inverse</text>
      {[
        ['body surface φ_body', 'measured (192-256 electrodes)'],
        ['forward operator A', '∇·(σ∇φ)=0 · single-layer / BEM'],
        ['regularized inverse', 'Tikhonov + graph-Laplacian'],
        ['deep-ensemble UQ', 'per-node reliability ~0.90'],
        ['validate vs cage', 'RE 0.54-0.65 · CC 0.72-0.85'],
      ].map(([a, b], i) => (
        <g key={i}>
          <rect className={`bx ${i === 0 ? 'bx-hi' : i === 4 ? 'bx-web' : ''}`} x={16 + i * 172} y="34" width="156" height="60" rx="8" />
          <text x={94 + i * 172} y="58" textAnchor="middle" className="it">{a}</text>
          <text x={94 + i * 172} y="76" textAnchor="middle" className="mu">{b}</text>
          {i < 4 && <path className="flow" d={`M${172 + i * 172} 64 H${188 + i * 172}`} markerEnd="url(#ah)" />}
        </g>
      ))}
      <text x="16" y="150" className="lane-lbl">B · 4D-FLOW PRESSURE: force pressure out of a measured velocity via Navier-Stokes</text>
      {[
        ['velocity v(x,t)', 'measured 4D-flow MRI'],
        ['div-free PINN', 'fit v + enforce ∇·v=0'],
        ['space-time net', 'analytic dv/dt over the cycle'],
        ['pressure-Poisson', '∇²p = S(v), analytic source'],
        ['pressure map', '0.79 mmHg ≈ Bernoulli 2.51'],
      ].map(([a, b], i) => (
        <g key={i}>
          <rect className={`bx ${i === 0 ? 'bx-hi' : i === 4 ? 'bx-web' : i === 1 ? 'bx-compute' : ''}`} x={16 + i * 172} y="162" width="156" height="60" rx="8" />
          <text x={94 + i * 172} y="186" textAnchor="middle" className="it">{a}</text>
          <text x={94 + i * 172} y="204" textAnchor="middle" className="mu">{b}</text>
          {i < 4 && <path className="flow" d={`M${172 + i * 172} 192 H${188 + i * 172}`} markerEnd="url(#ah)" />}
        </g>
      ))}
      <rect className="bx bx-gate" x="16" y="244" width="848" height="42" rx="8" />
      <text x="30" y="262" className="ttl">Honesty</text>
      <text x="30" y="278" className="mu">ECGi is validated vs a REAL heart-cage gold standard; 4D-flow has none (the reason the method exists), so validation = analytic gate + physiological range + Bernoulli bracket. Not clinically deployed.</text>
    </svg>
  );
}

// (5) The data contracts / design
function SvgContracts() {
  return (
    <svg className="arch-svg" viewBox="0 0 880 230" role="img">
      <Defs />
      <rect className="bx bx-gate" x="16" y="30" width="250" height="150" rx="8" />
      <text x="30" y="52" className="ttl">Raw data (gitignored)</text>
      <text x="30" y="70" className="it">EDGAR torso-tank + dog .mat</text>
      <text x="30" y="86" className="it">real 4D-flow DICOM series</text>
      <text x="30" y="104" className="mono">EDGAR_ROOT · AORTA4D_DIR</text>
      <text x="30" y="124" className="mu">data-use agreements ·</text>
      <text x="30" y="138" className="mu">never redistributed</text>
      <text x="30" y="162" className="mu">read at bake time only</text>
      <path className="flow" d="M266 105 H300" markerEnd="url(#ah)" />
      <text x="270" y="97" className="lbl">bake</text>
      <rect className="bx bx-compute" x="304" y="30" width="266" height="150" rx="8" />
      <text x="318" y="52" className="ttl">Derived artifact (committed)</text>
      <text x="318" y="72" className="mono">real-ecgi-catalogue/catalogue.json</text>
      <text x="318" y="90" className="mono">real-flow4d-pressure/trace.json</text>
      <text x="318" y="110" className="it">mesh / point cloud + field over time</text>
      <text x="318" y="126" className="it">+ validation metrics</text>
      <text x="318" y="148" className="mu">compact · the ONLY thing the web sees</text>
      <text x="318" y="164" className="mu">schema-versioned (v1 → v3)</text>
      <path className="flow-good" d="M570 105 H604" markerEnd="url(#ahg)" />
      <text x="574" y="97" className="lbl">reads</text>
      <rect className="bx bx-web" x="608" y="30" width="256" height="150" rx="8" />
      <text x="622" y="52" className="ttl">Web reads + guards</text>
      <text x="622" y="72" className="mono">check_artifacts.py</text>
      <text x="622" y="90" className="it">completeness floor (≥2 cases, ≥4 beats)</text>
      <text x="622" y="108" className="it">physiological floor (pressure &lt; 60 mmHg)</text>
      <text x="622" y="126" className="mono">pytest · tests/test_*_trace.py</text>
      <text x="622" y="148" className="mu">a partial/garbage bake fails CI,</text>
      <text x="622" y="164" className="mu">never silently ships</text>
      <text x="16" y="206" className="mu">The artifact contract: the bake is the boundary. A test/CI run never writes a canonical artifact; the committed trace is re-verified before it is served.</text>
    </svg>
  );
}

const TABS = [
  { id: 'app', en: 'The app', es: 'La app', Svg: SvgApp,
    body_en: 'CardioPINN is a catalogue of real applied cases across two different physics domains: recovering heart-surface potentials (volume conduction) and recovering aortic pressure (Navier-Stokes). Each fits a real measured signal and is validated against a real reference. Every engine is gated on an analytic problem with a known answer before any real data is trusted, then baked to a committed trace.',
    body_es: 'CardioPINN es un catalogo de casos aplicados reales en dos dominios fisicos distintos: recuperar potenciales de superficie cardiaca (conduccion de volumen) y recuperar la presion aortica (Navier-Stokes). Cada uno ajusta una senal real medida y se valida contra una referencia real. Cada motor pasa una prueba analitica de respuesta conocida antes de confiar en datos reales, y luego se hornea a un trace comprometido.' },
  { id: 'lanes', en: 'Lanes: web / offline / compute', es: 'Carriles: web / offline / computo', Svg: SvgLanes,
    body_en: 'The heavy physics runs OFFLINE: the ECGi reconstruction on CPU (NumPy/SciPy), the 4D-flow pressure on a local GPU (PyTorch). Each passes an analytic gate, then bakes a compact JSON trace. The static WEB only reads that trace and renders it on the real geometry with three.js. No model runs in the browser.',
    body_es: 'La fisica pesada corre OFFLINE: la reconstruccion ECGi en CPU (NumPy/SciPy), la presion de flujo 4D en una GPU local (PyTorch). Cada una pasa una prueba analitica y luego hornea un trace JSON compacto. La WEB estatica solo lee ese trace y lo renderiza sobre la geometria real con three.js. Ningun modelo corre en el navegador.' },
  { id: 'web', en: 'Web-app flow', es: 'Flujo de la web', Svg: SvgWeb,
    body_en: 'The SPA is the App page (a workbench: left-column controls + a wide 3D result, result-first tabs) plus five deep doc pages, all bilingual, light+dark, with per-section references carrying real DOIs. A build-time overlay copies the committed traces into the bundle; type-check and content-standards guards run; GitHub Actions deploys to Pages over the committed artifacts.',
    body_es: 'La SPA es la pagina App (un banco de trabajo: controles en la columna izquierda + un resultado 3D amplio, pestanas con el resultado primero) mas cinco paginas de documentacion profundas, todas bilingues, claro+oscuro, con referencias por seccion con DOIs reales. Un overlay de build copia los traces comprometidos al bundle; corren las guardas de tipos y de estandares de contenido; GitHub Actions despliega a Pages sobre los artefactos comprometidos.' },
  { id: 'science', en: 'The science', es: 'La ciencia', Svg: SvgScience,
    body_en: 'ECG imaging solves an ill-posed inverse: the body-surface potentials map to the heart surface by a forward operator from quasi-static volume conduction; a regularized inverse plus a deep ensemble recovers the heart map with a per-node uncertainty, validated against the real cage. 4D-flow forces pressure out of a measured velocity: a divergence-free PINN denoises the velocity, a space-time net gives the analytic unsteady term, and the pressure-Poisson equation yields the relative pressure.',
    body_es: 'La imagen de ECG resuelve un inverso mal planteado: los potenciales de superficie corporal se mapean a la superficie cardiaca por un operador directo de conduccion de volumen cuasi-estatica; un inverso regularizado mas un ensemble profundo recupera el mapa cardiaco con incertidumbre por nodo, validado contra la jaula real. El flujo 4D fuerza la presion desde una velocidad medida: un PINN sin divergencia limpia la velocidad, una red espacio-temporal da el termino no estacionario analitico, y la ecuacion de Poisson de presion da la presion relativa.' },
  { id: 'contracts', en: 'Data contracts / design', es: 'Contratos de datos / diseno', Svg: SvgContracts,
    body_en: 'The bake is the boundary. Raw datasets stay gitignored under their data-use agreements; only the compact derived trace (schema-versioned) is committed and read by the web. Guards enforce completeness and physiological floors, so a partial or non-physiological bake fails CI and never silently ships.',
    body_es: 'El horneado es la frontera. Los conjuntos crudos quedan gitignored bajo sus acuerdos de uso; solo el trace derivado compacto (con version de esquema) se compromete y lo lee la web. Las guardas imponen pisos de completitud y fisiologicos, asi que un horneado parcial o no fisiologico falla el CI y nunca se despliega en silencio.' },
];

export function ArchitectureModal({ onClose }: { onClose: () => void }) {
  const lang = useLang();
  const [tab, setTab] = useState('app');
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const Svg = active.Svg;
  return (
    <div className="modal-back" onClick={onClose}>
      <style>{SVG_STYLE}</style>
      <div className="modal arch-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{pick(lang, 'How CardioPINN works', 'Como funciona CardioPINN')}</h2>
          <button className="iconbtn" onClick={onClose}>{pick(lang, 'Close', 'Cerrar')}</button>
        </div>
        <div className="arch-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`chip ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>{pick(lang, t.en, t.es)}</button>
          ))}
        </div>
        <div className="arch-figure"><Svg /></div>
        <p className="arch-body">{pick(lang, active.body_en, active.body_es)}</p>
      </div>
    </div>
  );
}
