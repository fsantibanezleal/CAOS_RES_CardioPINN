import { useState } from 'react';
import { pick, useLang } from '../store';
import { RealEcgi } from './RealEcgi';
import { Flow4d } from './Flow4d';

// The App is a catalogue of real applied cases across DIFFERENT physics domains, each recovering an
// unmeasurable clinical field from a measurable one on real data. A top-level selector picks the case; each
// case is a full per-case workbench with the same ADR tab structure (problem / target / how the PDE arises /
// traditional approach / physics-informed proposal / result).
const CASES = [
  {
    id: 'ecgi',
    title: ['ECG imaging', 'Imagen de ECG'] as [string, string],
    physics: ['volume conduction (Laplace)', 'conduccion de volumen (Laplace)'] as [string, string],
    recover: ['heart-surface potentials', 'potenciales de superficie cardiaca'] as [string, string],
  },
  {
    id: 'flow4d',
    title: ['4D-flow pressure', 'Presion de flujo 4D'] as [string, string],
    physics: ['Navier-Stokes (fluid dynamics)', 'Navier-Stokes (dinamica de fluidos)'] as [string, string],
    recover: ['aortic pressure field', 'campo de presion aortica'] as [string, string],
  },
];

export function Workbench() {
  const lang = useLang();
  const [caseId, setCaseId] = useState('ecgi');

  return (
    <div>
      <div className="case-switch">
        <span className="case-switch-label">{pick(lang, 'Research case', 'Caso de investigacion')}</span>
        <div className="case-switch-row">
          {CASES.map((c) => (
            <button key={c.id} className={`case-tile ${caseId === c.id ? 'on' : ''}`} onClick={() => setCaseId(c.id)}>
              <span className="case-tile-title">{pick(lang, c.title[0], c.title[1])}</span>
              <span className="case-tile-sub">{pick(lang, c.physics[0], c.physics[1])}</span>
              <span className="case-tile-rec">{pick(lang, 'recover: ', 'recuperar: ')}{pick(lang, c.recover[0], c.recover[1])}</span>
            </button>
          ))}
        </div>
      </div>
      {caseId === 'ecgi' ? <RealEcgi /> : <Flow4d />}
    </div>
  );
}
