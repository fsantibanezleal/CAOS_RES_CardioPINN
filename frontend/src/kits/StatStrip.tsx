// A responsive row of "stat tiles" that replace adjective paragraphs with data: each tile is a bordered
// theme-aware panel showing a big mono value, a small label, and an optional muted source chip. Colours come
// from the shell CSS variables so it repaints light/dark; the strip is a role="list" of role="listitem" tiles
// so a screen reader announces the values as a group. Generic and bilingual: the caller passes localized nodes.
import type { ReactNode } from 'react';

export interface StatTile {
  value: string;
  label: ReactNode;
  source?: ReactNode;
}

const CSS = `
.statstrip { display: flex; flex-wrap: wrap; gap: 12px; width: 100%; }
.statstrip-tile {
  flex: 1 1 140px; min-width: 120px; display: flex; flex-direction: column; gap: 4px;
  border: 1px solid var(--border); border-radius: 12px; background: var(--panel); padding: 14px 16px;
}
.statstrip-value {
  font-family: var(--mono, ui-monospace, monospace); font-size: 1.55rem; font-weight: 650;
  line-height: 1.1; color: var(--fg); letter-spacing: -0.01em;
}
.statstrip-label { font-size: 0.78rem; line-height: 1.35; color: var(--muted); }
.statstrip-source {
  align-self: flex-start; margin-top: 4px; font-size: 0.66rem; line-height: 1.2; color: var(--muted);
  border: 1px solid var(--border); background: var(--panel-2); border-radius: 999px; padding: 2px 8px;
}
`;

export function StatStrip({ tiles }: { tiles: StatTile[] }) {
  return (
    <div className="statstrip" role="list">
      <style>{CSS}</style>
      {tiles.map((t, i) => (
        <div className="statstrip-tile" role="listitem" key={i}>
          <span className="statstrip-value">{t.value}</span>
          <span className="statstrip-label">{t.label}</span>
          {t.source != null && <span className="statstrip-source">{t.source}</span>}
        </div>
      ))}
    </div>
  );
}
