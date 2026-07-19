import { useState, type ReactNode } from 'react';
import { pick, useLang } from '../store';
import { RealEcgi } from './RealEcgi';
import { Flow4d } from './Flow4d';

// The App is a catalogue of real applied cases across different physics domains. The case selector is the top
// block of the workbench left column (ADR-0017 §1.2: control aside + 1fr main); each case renders the full
// sidebar layout and places this selector at the top of its aside.
const CASES = [
  {
    id: 'ecgi',
    title: ['ECG imaging', 'Imagen de ECG'] as [string, string],
    physics: ['volume conduction (Laplace)', 'conducción de volumen (Laplace)'] as [string, string],
    recover: ['heart-surface potentials', 'potenciales de superficie cardíaca'] as [string, string],
  },
  {
    id: 'flow4d',
    title: ['4D-flow pressure', 'Presión de flujo 4D'] as [string, string],
    physics: ['Navier-Stokes (fluid dynamics)', 'Navier-Stokes (dinámica de fluidos)'] as [string, string],
    recover: ['aortic pressure field', 'campo de presión aórtica'] as [string, string],
  },
];

export function Workbench() {
  const lang = useLang();
  const [caseId, setCaseId] = useState('ecgi');

  const active = CASES.find((c) => c.id === caseId) ?? CASES[0];
  const selector: ReactNode = (
    <div className="cp-side-block">
      <label className="cp-field">
        <span>{pick(lang, 'Research case', 'Caso de investigación')}</span>
        <select className="cp-select" value={caseId} onChange={(e) => setCaseId(e.target.value)}>
          {CASES.map((c) => <option key={c.id} value={c.id}>{pick(lang, c.title[0], c.title[1])}</option>)}
        </select>
      </label>
      <div className="cp-case-meta">
        <div>{pick(lang, active.physics[0], active.physics[1])}</div>
        <div className="muted">{pick(lang, 'recover: ', 'recuperar: ')}{pick(lang, active.recover[0], active.recover[1])}</div>
      </div>
    </div>
  );

  return caseId === 'ecgi' ? <RealEcgi selector={selector} /> : <Flow4d selector={selector} />;
}
