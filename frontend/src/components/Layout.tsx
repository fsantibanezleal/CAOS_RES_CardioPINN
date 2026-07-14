import { useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { t } from '../i18n';
import { useStore, pick } from '../store';
import { ArchitectureModal } from './ArchitectureModal';

const NAV = [
  { to: '/', key: 'nav.app', end: true },
  { to: '/introduction', key: 'nav.intro' },
  { to: '/methodology', key: 'nav.method' },
  { to: '/implementation', key: 'nav.impl' },
  { to: '/experiments', key: 'nav.exp' },
  { to: '/benchmark', key: 'nav.bench' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { lang, theme, setLang, toggleTheme } = useStore();
  const [arch, setArch] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="shell">
      <header className="header">
        <div className="brand"><span className="dot" /> CardioPINN</div>
        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {t(lang, n.key)}
            </NavLink>
          ))}
        </nav>
        <div className="spacer" />
        <button className="iconbtn" onClick={() => setArch(true)} title={t(lang, 'ui.arch')}>ⓘ {t(lang, 'ui.arch')}</button>
        <button className="iconbtn" onClick={() => setLang(lang === 'en' ? 'es' : 'en')}>{lang === 'en' ? 'ES' : 'EN'}</button>
        <button className="iconbtn" onClick={toggleTheme}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
        <a className="iconbtn" href="https://github.com/fsantibanezleal/CAOS_RES_CardioPINN" target="_blank" rel="noreferrer">GitHub</a>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        CardioPINN · {pick(lang, 'a CAOS research lab', 'un laboratorio de investigacion CAOS')} · v0.13.001 ·{' '}
        {pick(lang, 'Developed by Felipe Santibanez-Leal', 'Desarrollado por Felipe Santibanez-Leal')} ·{' '}
        {pick(lang, 'Data: EDGAR / Consortium for ECG Imaging (attribution; not redistributed)', 'Datos: EDGAR / Consortium for ECG Imaging (atribucion; no redistribuido)')} ·{' '}
        <a href="https://github.com/fsantibanezleal/CAOS_RES_CardioPINN" target="_blank" rel="noreferrer">GitHub</a> ·{' '}
        Apache-2.0 · {pick(lang, 'not clinically deployed', 'no desplegado clinicamente')}
      </footer>
      {arch && <ArchitectureModal onClose={() => setArch(false)} />}
    </div>
  );
}
