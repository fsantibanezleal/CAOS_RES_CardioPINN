import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { AppShell, applyTheme, readTheme, CitationsProvider, type ShellConfig } from '@fasl-work/caos-app-shell';
import '@fasl-work/caos-app-shell/styles.css';
import 'katex/dist/katex.min.css';
import './styles.css';
import { CITATIONS } from './data/citations';
import { EXTERNAL_LINKS } from './lib/links';
import { architecture } from './architecture';
import { Workbench } from './pages/Workbench';
import { Introduction } from './pages/Introduction';
import { Methodology } from './pages/Methodology';
import { Implementation } from './pages/Implementation';
import { Experiments } from './pages/Experiments';
import { Benchmark } from './pages/Benchmark';

// The shell owns theme (data-theme on <html>) + language; apply the persisted theme before first paint.
applyTheme(readTheme());

const config: ShellConfig = {
  product: { name: 'CardioPINN', mark: <Activity size={18} aria-hidden="true" /> },
  routes: [
    { path: '/', en: 'App', es: 'App' },
    { path: '/introduction', en: 'Introduction', es: 'Introduccion' },
    { path: '/methodology', en: 'Methodology', es: 'Metodologia' },
    { path: '/implementation', en: 'Implementation', es: 'Implementacion' },
    { path: '/experiments', en: 'Experiments', es: 'Experimentos' },
    { path: '/benchmark', en: 'Benchmark', es: 'Benchmark' },
  ],
  links: { github: EXTERNAL_LINKS.github, personal: EXTERNAL_LINKS.personal, portfolio: EXTERNAL_LINKS.portfolio },
  version: '0.21.003',
  architecture,
  footer: {
    provenance: {
      en: 'Data: EDGAR (open-access) + a real 4D-flow aorta MRI',
      es: 'Datos: EDGAR (acceso abierto) + una resonancia real de aorta 4D-flow',
    },
    disclaimer: {
      en: 'runs offline, the web reads baked traces; not clinically deployed',
      es: 'corre offline, la web lee traces horneados; no desplegado clinicamente',
    },
  },
};

const el = document.getElementById('root');
if (el) createRoot(el).render(
  <StrictMode>
    <HashRouter>
      <CitationsProvider items={Object.values(CITATIONS)}>
        <AppShell config={config}>
          <Routes>
            <Route path="/" element={<Workbench />} />
            <Route path="/introduction" element={<Introduction />} />
            <Route path="/methodology" element={<Methodology />} />
            <Route path="/implementation" element={<Implementation />} />
            <Route path="/experiments" element={<Experiments />} />
            <Route path="/benchmark" element={<Benchmark />} />
            <Route path="*" element={<Workbench />} />
          </Routes>
        </AppShell>
      </CitationsProvider>
    </HashRouter>
  </StrictMode>,
);
