// ADR-0058: the in-app "Architecture / How it works" modal, fed to the shared shell's <AppShell>
// via config.architecture. Each of the five tabs pairs ONE hand-authored, themed SVG (every colour a
// CSS-variable token, so it follows light/dark) with a compact bilingual explanation. The shell inlines
// the SVG string as-is, so each SVG carries its own scoped <style>; colours resolve against the app tokens
// aliased in styles.css. The five minimum tabs: the app / lanes (web-offline-compute) / web-app flow /
// the science / the data contracts.
import type { ArchitectureConfig } from '@fasl-work/caos-app-shell';

const STYLE = `<style>
  .arch-svg { width: 100%; height: auto; font-family: var(--sans, system-ui); }
  .arch-svg .bx { fill: var(--panel-2); stroke: var(--border); stroke-width: 1.2; }
  .arch-svg .bx-hi { stroke: var(--accent); stroke-width: 1.6; }
  .arch-svg .bx-web { stroke: var(--good); }
  .arch-svg .bx-compute { stroke: var(--accent-2); }
  .arch-svg .bx-gate { stroke: var(--warn); }
  .arch-svg .lane { fill: color-mix(in srgb, var(--panel) 60%, transparent); stroke: var(--border); stroke-dasharray: 4 3; }
  .arch-svg .ttl { fill: var(--fg); font-size: 13px; font-weight: 600; }
  .arch-svg .sub { fill: var(--muted); font-size: 10.5px; }
  .arch-svg .it { fill: var(--fg); font-size: 11px; }
  .arch-svg .mono { fill: var(--accent-2); font-size: 10px; font-family: var(--mono, ui-monospace, monospace); }
  .arch-svg .mu { fill: var(--muted); font-size: 9.5px; }
  .arch-svg .lane-lbl { fill: var(--muted); font-size: 10.5px; font-weight: 600; letter-spacing: 0.05em; }
  .arch-svg .flow { fill: none; stroke: var(--accent-2); stroke-width: 1.5; }
  .arch-svg .flow-good { fill: none; stroke: var(--good); stroke-width: 1.5; }
  .arch-svg .lbl { fill: var(--muted); font-size: 9.5px; }
</style>`;

const DEFS = `<defs>
  <marker id="ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 z" fill="var(--accent-2)"/></marker>
  <marker id="ahg" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 z" fill="var(--good)"/></marker>
</defs>`;

function svg(vb: string, body: string): string {
  return `<svg class="arch-svg" viewBox="${vb}" role="img" xmlns="http://www.w3.org/2000/svg">${STYLE}${DEFS}${body}</svg>`;
}

// (1) The app + design-build lifecycle
const LIFECYCLE: [string, string][] = [
  ['research', 'primary sources + DOIs'],
  ['implement', 'the physics engine'],
  ['gate', 'analytic known-answer'],
  ['bake', 'derived JSON trace'],
  ['SPA', 'read + render'],
  ['deploy', 'GitHub Pages'],
];
const SVG_APP = svg('0 0 880 300', `
  <text x="16" y="24" class="lane-lbl">CARDIOPINN: TWO REAL PHYSICS DOMAINS, ONE CATALOGUE</text>
  <rect class="bx bx-hi" x="16" y="38" width="410" height="96" rx="8"/>
  <text x="30" y="60" class="ttl">Case A · ECG imaging</text>
  <text x="30" y="76" class="sub">quasi-static volume conduction (Laplace)</text>
  <text x="30" y="95" class="it">recover heart-surface potentials from a body recording</text>
  <text x="30" y="111" class="mono">real/ecgi_edgar.py · ecgi_catalogue.py · ecgi_bem.py</text>
  <text x="30" y="126" class="mu">EDGAR human tank + in-situ dog · vs real gold standard</text>
  <rect class="bx bx-hi" x="454" y="38" width="410" height="96" rx="8"/>
  <text x="468" y="60" class="ttl">Case B · 4D-flow pressure</text>
  <text x="468" y="76" class="sub">incompressible Navier-Stokes (pressure-Poisson)</text>
  <text x="468" y="95" class="it">recover the aortic pressure field from a velocity scan</text>
  <text x="468" y="111" class="mono">flow4d_denoise.py · flow4d_ppe.py · flow4d_spacetime.py</text>
  <text x="468" y="126" class="mu">real 4D-flow MRI · vs analytic gate + Bernoulli</text>
  <text x="16" y="168" class="lane-lbl">DESIGN-BUILD LIFECYCLE</text>
  ${LIFECYCLE.map(([a, b], i) => `
    <rect class="bx ${i === 2 ? 'bx-gate' : i === 4 ? 'bx-web' : ''}" x="${16 + i * 142}" y="182" width="128" height="52" rx="8"/>
    <text x="${80 + i * 142}" y="205" text-anchor="middle" class="it">${a}</text>
    <text x="${80 + i * 142}" y="221" text-anchor="middle" class="mu">${b}</text>
    ${i < 5 ? `<path class="flow" d="M${144 + i * 142} 208 H${158 + i * 142}" marker-end="url(#ah)"/>` : ''}`).join('')}
  <text x="16" y="266" class="mu">Every engine passes an analytic gate (known closed-form answer) before any real data is trusted; the derived result is committed and the static web only reads it.</text>`);

// (2) Lanes: web vs offline vs compute
const SVG_LANES = svg('0 0 880 320', `
  <rect class="lane" x="12" y="30" width="560" height="270" rx="10"/>
  <text x="28" y="52" class="lane-lbl">OFFLINE: the physics (runs on your machine, never in CI or the web)</text>
  <rect class="bx bx-compute" x="30" y="64" width="255" height="104" rx="8"/>
  <text x="44" y="86" class="ttl">ECGi reconstruction · CPU</text>
  <text x="44" y="103" class="mono">NumPy / SciPy · no torch</text>
  <text x="44" y="120" class="it">forward operator on real geometry</text>
  <text x="44" y="135" class="it">Tikhonov + graph-Laplacian + ensemble</text>
  <text x="44" y="152" class="mu">single-layer default · analytic-gated BEM</text>
  <rect class="bx bx-compute" x="300" y="64" width="255" height="104" rx="8"/>
  <text x="314" y="86" class="ttl">4D-flow pressure · GPU</text>
  <text x="314" y="103" class="mono">PyTorch · RTX-class</text>
  <text x="314" y="120" class="it">divergence-free velocity PINN denoiser</text>
  <text x="314" y="135" class="it">space-time net, analytic dv/dt</text>
  <text x="314" y="152" class="mu">pressure-Poisson sparse direct solve</text>
  <rect class="bx bx-gate" x="30" y="182" width="525" height="46" rx="8"/>
  <text x="44" y="203" class="ttl">Analytic gate</text>
  <text x="150" y="203" class="it">spheres (ECGi corr 1.00) · duct + Poiseuille (4D-flow)</text>
  <text x="44" y="219" class="mu">test_ecgi_bem · test_flow4d_ppe · test_flow4d_spacetime: must pass before real data</text>
  <rect class="bx" x="30" y="242" width="525" height="44" rx="8"/>
  <text x="44" y="263" class="ttl">Bake, committed JSON trace</text>
  <text x="230" y="263" class="mono">data/derived/*/trace.json · catalogue.json</text>
  <text x="44" y="279" class="mu">the only thing that crosses into the web; raw datasets stay gitignored (data-use agreements)</text>
  <path class="flow-good" d="M572 160 H610" marker-end="url(#ahg)"/>
  <text x="576" y="152" class="lbl">reads only</text>
  <rect class="lane" x="620" y="30" width="248" height="270" rx="10"/>
  <text x="636" y="52" class="lane-lbl">WEB: static</text>
  <rect class="bx bx-web" x="636" y="64" width="216" height="70" rx="8"/>
  <text x="650" y="86" class="ttl">Load the trace</text>
  <text x="650" y="103" class="mono">fetch(BASE + data/*.json)</text>
  <text x="650" y="120" class="mu">no model runs in the browser</text>
  <rect class="bx bx-web" x="636" y="146" width="216" height="70" rx="8"/>
  <text x="650" y="168" class="ttl">Render on real geometry</text>
  <text x="650" y="185" class="mono">three.js / react-three-fiber</text>
  <text x="650" y="202" class="mu">heart cage · aortic lumen cloud</text>
  <rect class="bx bx-web" x="636" y="228" width="216" height="58" rx="8"/>
  <text x="650" y="250" class="ttl">Animate baked frames</text>
  <text x="650" y="267" class="mu">paused by default · halt on hidden tab</text>`);

// (3) Web-app flow
const SVG_WEB = svg('0 0 880 250', `
  <text x="16" y="24" class="lane-lbl">THE SPA (Vite · React · React Router · three.js)</text>
  <rect class="bx bx-hi" x="16" y="36" width="250" height="120" rx="8"/>
  <text x="30" y="58" class="ttl">App page · /</text>
  <text x="30" y="75" class="mono">Workbench.tsx</text>
  <text x="30" y="93" class="it">left column: case selector +</text>
  <text x="30" y="108" class="it">dataset/beat/field + live readout</text>
  <text x="30" y="126" class="it">main: result-first tabs + 3D viz</text>
  <text x="30" y="145" class="mu">RealEcgi.tsx · Flow4d.tsx</text>
  <rect class="bx" x="292" y="36" width="250" height="120" rx="8"/>
  <text x="306" y="58" class="ttl">Doc pages</text>
  <text x="306" y="75" class="mono">Introduction · Methodology</text>
  <text x="306" y="90" class="mono">Implementation · Experiments · Benchmark</text>
  <text x="306" y="110" class="it">prose + KaTeX + themed SVGs +</text>
  <text x="306" y="125" class="it">per-section &lt;Refs&gt; with real DOIs</text>
  <text x="306" y="145" class="mu">bilingual EN/ES · light+dark</text>
  <rect class="bx bx-web" x="568" y="36" width="296" height="120" rx="8"/>
  <text x="582" y="58" class="ttl">Shared shell (caos-app-shell)</text>
  <text x="582" y="75" class="mono">AppShell · routes · links · citations</text>
  <text x="582" y="93" class="it">sticky header: brand + nav + external</text>
  <text x="582" y="108" class="it">links + &#8505; Architecture + lang + theme</text>
  <text x="582" y="126" class="it">CitationsProvider · data/citations.ts</text>
  <text x="582" y="145" class="mu">footer: provenance + honest disclaimer</text>
  <rect class="bx bx-gate" x="16" y="176" width="410" height="56" rx="8"/>
  <text x="30" y="198" class="ttl">Build-time overlay + guards</text>
  <text x="30" y="216" class="mono">copy-data.mjs, public/data · tsc · content-standards</text>
  <rect class="bx bx-web" x="454" y="176" width="410" height="56" rx="8"/>
  <text x="468" y="198" class="ttl">Deploy · GitHub Pages (Actions)</text>
  <text x="468" y="216" class="mono">frontend-only build over committed traces · CNAME cardiopinn.fasl-work.com</text>
  <path class="flow" d="M221 156 V176" marker-end="url(#ah)"/>
  <text x="228" y="170" class="lbl">copy-data, public/data</text>
  <path class="flow" d="M659 156 V176" marker-end="url(#ah)"/>
  <text x="666" y="170" class="lbl">Actions, Pages</text>`);

// (4) The science: the two governing chains
const SCI_A: [string, string][] = [
  ['body surface potential', 'measured (192-256 electrodes)'],
  ['forward operator A', 'div(sigma grad phi)=0 · single-layer / BEM'],
  ['regularized inverse', 'Tikhonov + graph-Laplacian'],
  ['deep-ensemble UQ', 'per-node reliability ~0.90'],
  ['validate vs cage', 'RE 0.54-0.65 · CC 0.72-0.85'],
];
const SCI_B: [string, string][] = [
  ['velocity v(x,t)', 'measured 4D-flow MRI'],
  ['div-free PINN', 'fit v + enforce div v=0'],
  ['space-time net', 'analytic dv/dt over the cycle'],
  ['pressure-Poisson', 'lap p = S(v), analytic source'],
  ['pressure map', '0.79 mmHg vs Bernoulli 2.51'],
];
const SVG_SCIENCE = svg('0 0 880 300', `
  <text x="16" y="22" class="lane-lbl">A · ECG IMAGING: recover an unmeasurable field by an ill-posed inverse</text>
  ${SCI_A.map(([a, b], i) => `
    <rect class="bx ${i === 0 ? 'bx-hi' : i === 4 ? 'bx-web' : ''}" x="${16 + i * 172}" y="34" width="156" height="60" rx="8"/>
    <text x="${94 + i * 172}" y="58" text-anchor="middle" class="it">${a}</text>
    <text x="${94 + i * 172}" y="76" text-anchor="middle" class="mu">${b}</text>
    ${i < 4 ? `<path class="flow" d="M${172 + i * 172} 64 H${188 + i * 172}" marker-end="url(#ah)"/>` : ''}`).join('')}
  <text x="16" y="150" class="lane-lbl">B · 4D-FLOW PRESSURE: force pressure out of a measured velocity via Navier-Stokes</text>
  ${SCI_B.map(([a, b], i) => `
    <rect class="bx ${i === 0 ? 'bx-hi' : i === 4 ? 'bx-web' : i === 1 ? 'bx-compute' : ''}" x="${16 + i * 172}" y="162" width="156" height="60" rx="8"/>
    <text x="${94 + i * 172}" y="186" text-anchor="middle" class="it">${a}</text>
    <text x="${94 + i * 172}" y="204" text-anchor="middle" class="mu">${b}</text>
    ${i < 4 ? `<path class="flow" d="M${172 + i * 172} 192 H${188 + i * 172}" marker-end="url(#ah)"/>` : ''}`).join('')}
  <rect class="bx bx-gate" x="16" y="244" width="848" height="42" rx="8"/>
  <text x="30" y="262" class="ttl">Honesty</text>
  <text x="30" y="278" class="mu">ECGi is validated vs a real heart-cage gold standard; 4D-flow has none (the reason the method exists), so validation = analytic gate + physiological range + Bernoulli bracket. Not clinically deployed.</text>`);

// (5) The data contracts / design
const SVG_CONTRACTS = svg('0 0 880 230', `
  <rect class="bx bx-gate" x="16" y="30" width="250" height="150" rx="8"/>
  <text x="30" y="52" class="ttl">Raw data (gitignored)</text>
  <text x="30" y="70" class="it">EDGAR torso-tank + dog .mat</text>
  <text x="30" y="86" class="it">real 4D-flow DICOM series</text>
  <text x="30" y="104" class="mono">EDGAR_ROOT · AORTA4D_DIR</text>
  <text x="30" y="124" class="mu">data-use agreements ·</text>
  <text x="30" y="138" class="mu">never redistributed</text>
  <text x="30" y="162" class="mu">read at bake time only</text>
  <path class="flow" d="M266 105 H300" marker-end="url(#ah)"/>
  <text x="270" y="97" class="lbl">bake</text>
  <rect class="bx bx-compute" x="304" y="30" width="266" height="150" rx="8"/>
  <text x="318" y="52" class="ttl">Derived artifact (committed)</text>
  <text x="318" y="72" class="mono">real-ecgi-catalogue/catalogue.json</text>
  <text x="318" y="90" class="mono">real-flow4d-pressure/trace.json</text>
  <text x="318" y="110" class="it">mesh / point cloud + field over time</text>
  <text x="318" y="126" class="it">+ validation metrics</text>
  <text x="318" y="148" class="mu">compact · the only thing the web sees</text>
  <text x="318" y="164" class="mu">schema-versioned (v1 to v3)</text>
  <path class="flow-good" d="M570 105 H604" marker-end="url(#ahg)"/>
  <text x="574" y="97" class="lbl">reads</text>
  <rect class="bx bx-web" x="608" y="30" width="256" height="150" rx="8"/>
  <text x="622" y="50" class="ttl">Web reads + guards</text>
  <text x="622" y="66" class="mono">check_artifacts.py · pytest</text>
  <rect class="bx bx-gate" x="620" y="76" width="230" height="40" rx="6"/>
  <text x="630" y="92" class="it">completeness floor</text>
  <text x="630" y="107" class="mu">2+ cases, 4+ beats · all fields present</text>
  <rect class="bx bx-gate" x="620" y="122" width="230" height="40" rx="6"/>
  <text x="630" y="138" class="it">physiological floor</text>
  <text x="630" y="153" class="mu">pressure &lt; 60 mmHg · velocity &lt; 6 m/s</text>
  <text x="622" y="176" class="mu">a partial/garbage bake fails CI</text>
  <text x="16" y="206" class="mu">The artifact contract: the bake is the boundary. A test/CI run never writes a canonical artifact; the committed trace is re-verified before it is served.</text>`);

export const architecture: ArchitectureConfig = {
  title_en: 'How CardioPINN works',
  title_es: 'Cómo funciona CardioPINN',
  tabs: [
    {
      id: 'app', en: 'The app', es: 'La app', svg: SVG_APP,
      body_en: 'CardioPINN is a catalogue of real applied cases across two different physics domains: recovering heart-surface potentials (volume conduction) and recovering aortic pressure (Navier-Stokes). Each fits a real measured signal and is validated against a real reference. Every engine is gated on an analytic problem with a known answer before any real data is trusted, then baked to a committed trace.',
      body_es: 'CardioPINN es un catálogo de casos aplicados reales en dos dominios físicos distintos: recuperar potenciales de superficie cardíaca (conducción de volumen) y recuperar la presión aórtica (Navier-Stokes). Cada uno ajusta una señal real medida y se valida contra una referencia real. Cada motor pasa una prueba analítica de respuesta conocida antes de confiar en datos reales, y luego se precalcula a un trace comprometido.',
    },
    {
      id: 'lanes', en: 'Lanes: web / offline / compute', es: 'Carriles: web / offline / cómputo', svg: SVG_LANES,
      body_en: 'The heavy physics runs offline: the ECGi reconstruction on CPU (NumPy/SciPy), the 4D-flow pressure on a local GPU (PyTorch). Each passes an analytic gate, then bakes a compact JSON trace. The static web only reads that trace and renders it on the real geometry with three.js. No model runs in the browser.',
      body_es: 'La física pesada se ejecuta offline: la reconstrucción ECGi en CPU (NumPy/SciPy), la presión de flujo 4D en una GPU local (PyTorch). Cada una pasa una prueba analítica y luego precalcula un trace JSON compacto. La web estática solo lee ese trace y lo renderiza sobre la geometría real con three.js. Ningún modelo se ejecuta en el navegador.',
    },
    {
      id: 'web', en: 'Web-app flow', es: 'Flujo de la web', svg: SVG_WEB,
      body_en: 'The SPA is the App page (a workbench: left-column controls + a wide 3D result, result-first tabs) plus five deep doc pages, all bilingual, light+dark, with per-section references carrying real DOIs. Header, footer, tabs, callouts, equations and references all come from the shared caos-app-shell, so every CAOS product looks and behaves identically. A build-time overlay copies the committed traces into the bundle; type-check and content-standards guards run; GitHub Actions deploys to Pages over the committed artifacts.',
      body_es: 'La SPA es la página App (un entorno de trabajo: controles en la columna izquierda + un resultado 3D amplio, pestañas con el resultado primero) más cinco páginas de documentación profundas, todas bilingües, claro+oscuro, con referencias por sección con DOIs reales. El encabezado, pie, pestañas, notas, ecuaciones y referencias vienen del shell compartido caos-app-shell, así que cada producto CAOS se ve y se comporta igual. Un overlay de build copia los traces comprometidos al bundle; se ejecutan los chequeos de tipos y de estándares de contenido; GitHub Actions despliega a Pages sobre los artefactos comprometidos.',
    },
    {
      id: 'science', en: 'The science', es: 'La ciencia', svg: SVG_SCIENCE,
      body_en: 'ECG imaging solves an ill-posed inverse: the body-surface potentials map to the heart surface by a forward operator from quasi-static volume conduction; a regularized inverse plus a deep ensemble recovers the heart map with a per-node uncertainty, validated against the real cage. 4D-flow forces pressure out of a measured velocity: a divergence-free PINN denoises the velocity, a space-time net gives the analytic unsteady term, and the pressure-Poisson equation yields the relative pressure.',
      body_es: 'La imagen de ECG resuelve un inverso mal planteado: los potenciales de superficie corporal se mapean a la superficie cardíaca por un operador directo de conducción de volumen cuasiestática; un inverso regularizado más un ensemble profundo recupera el mapa cardíaco con incertidumbre por nodo, validado contra la jaula real. El flujo 4D fuerza la presión desde una velocidad medida: un PINN sin divergencia limpia la velocidad, una red espacio-temporal da el término no estacionario analítico, y la ecuación de Poisson de presión da la presión relativa.',
    },
    {
      id: 'contracts', en: 'Data contracts / design', es: 'Contratos de datos / diseño', svg: SVG_CONTRACTS,
      body_en: 'The bake is the boundary. Raw datasets stay gitignored under their data-use agreements; only the compact derived trace (schema-versioned) is committed and read by the web. Guards enforce completeness and physiological floors, so a partial or non-physiological bake fails CI and never silently ships.',
      body_es: 'El precalculado es la frontera. Los conjuntos crudos quedan gitignored bajo sus acuerdos de uso; solo el trace derivado compacto (con versión de esquema) se compromete y lo lee la web. Las guardas imponen pisos de completitud y fisiológicos, así que un precálculo parcial o no fisiológico falla el CI y nunca se despliega en silencio.',
    },
  ],
};
