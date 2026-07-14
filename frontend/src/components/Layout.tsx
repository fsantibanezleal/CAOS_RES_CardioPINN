import { useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Code2, Globe, Briefcase, Info, Languages, Sun, Moon } from 'lucide-react';
import { t } from '../i18n';
import { useStore, pick } from '../store';
import { ArchitectureModal } from './ArchitectureModal';
import { ROUTES } from '../lib/routes';
import { EXTERNAL_LINKS } from '../lib/links';

const APP_VERSION = 'v0.15.000';

export function Layout({ children }: { children: ReactNode }) {
  const { lang, theme, setLang, toggleTheme } = useStore();
  const [arch, setArch] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="shell">
      <header className="header">
        <NavLink to="/" className="brand"><Activity size={18} className="brand-mark" /> CardioPINN</NavLink>
        <nav className="nav">
          {ROUTES.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {t(lang, n.key)}
            </NavLink>
          ))}
        </nav>
        <div className="spacer" />
        <div className="header-actions">
          <a className="iconbtn icon-only" href={EXTERNAL_LINKS.github} target="_blank" rel="noreferrer" title="GitHub" aria-label="GitHub"><Code2 size={17} /></a>
          <a className="iconbtn icon-only" href={EXTERNAL_LINKS.personal} target="_blank" rel="noreferrer" title={pick(lang, 'Personal site', 'Sitio personal')} aria-label="Personal site"><Globe size={17} /></a>
          <a className="iconbtn icon-only" href={EXTERNAL_LINKS.portfolio} target="_blank" rel="noreferrer" title={pick(lang, 'Portfolio', 'Portafolio')} aria-label="Portfolio"><Briefcase size={17} /></a>
          <span className="hdr-sep" />
          <button className="iconbtn" onClick={() => setArch(true)} title={t(lang, 'ui.arch')} aria-label={t(lang, 'ui.arch')}><Info size={16} /> {t(lang, 'ui.arch')}</button>
          <button className="iconbtn icon-only" onClick={() => setLang(lang === 'en' ? 'es' : 'en')} title={lang === 'en' ? 'Espanol' : 'English'} aria-label="Language"><Languages size={16} /><span className="lang-tag">{lang === 'en' ? 'ES' : 'EN'}</span></button>
          <button className="iconbtn icon-only" onClick={toggleTheme} title={theme === 'dark' ? 'Light' : 'Dark'} aria-label="Theme">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
        </div>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <span className="ft-strong">CardioPINN</span> · {pick(lang, 'a CAOS research lab', 'un laboratorio de investigacion CAOS')} · {APP_VERSION} ·{' '}
        {pick(lang, 'Developed by Felipe Santibanez-Leal', 'Desarrollado por Felipe Santibanez-Leal')} ·{' '}
        {pick(lang,
          'Data: EDGAR / Consortium for ECG Imaging (Aras 2015, CC-attribution) + a real thoracic-aorta 4D-flow MRI; engines: graph-Tikhonov ECGi + Navier-Stokes pressure-Poisson PINN',
          'Datos: EDGAR / Consortium for ECG Imaging (Aras 2015, CC-atribucion) + una resonancia real de flujo 4D de aorta toracica; motores: ECGi Tikhonov-grafo + PINN de Poisson de presion Navier-Stokes')} ·{' '}
        <a href={EXTERNAL_LINKS.github} target="_blank" rel="noreferrer">GitHub</a> · Apache-2.0 ·{' '}
        {pick(lang, 'runs offline, the web reads baked traces; not clinically deployed', 'corre offline, la web lee traces horneados; no desplegado clinicamente')}
      </footer>
      {arch && <ArchitectureModal onClose={() => setArch(false)} />}
    </div>
  );
}
