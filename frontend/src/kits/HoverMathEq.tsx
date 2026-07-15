// A self-documenting display equation: the KaTeX equation plus a row of focusable symbol chips; hovering or
// focusing a chip reveals that symbol's meaning + units in a caption line (distill-style colorized-math idea,
// made robust + accessible: the chips carry the interaction, not fragile spans inside the KaTeX output).
// Theme-aware (all colours from CSS vars); keyboard operable; no em-dash, no emoji.
import { useState, type ReactNode } from 'react';
import katex from 'katex';

export interface MathTerm { tex: string; meaning: ReactNode; }

export function HoverMathEq({ tex, terms, caption }: { tex: string; terms: MathTerm[]; caption?: ReactNode }) {
  const [active, setActive] = useState<number | null>(null);
  const eqHtml = katex.renderToString(tex, { displayMode: true, throwOnError: false });
  return (
    <div className="hovermath">
      <style>{`
        .hovermath { border: 1px solid var(--border); border-radius: 10px; background: var(--panel); padding: 14px 12px 10px; margin: 12px 0; }
        .hovermath .hm-eq { overflow-x: auto; }
        .hovermath .hm-terms { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .hovermath .hm-chip { border: 1px solid var(--border); background: var(--panel-2); color: var(--fg); border-radius: 999px; padding: 3px 10px; font-size: 12px; cursor: help; font-family: var(--mono, monospace); }
        .hovermath .hm-chip:hover, .hovermath .hm-chip:focus, .hovermath .hm-chip.on { border-color: var(--accent); color: var(--accent); outline: none; }
        .hovermath .hm-cap { margin-top: 8px; min-height: 1.4em; font-size: 0.86rem; color: var(--muted); line-height: 1.45; }
      `}</style>
      <div className="hm-eq" dangerouslySetInnerHTML={{ __html: eqHtml }} />
      <div className="hm-terms" role="list" aria-label="symbols">
        {terms.map((t, i) => (
          <button key={i} type="button" role="listitem" className={`hm-chip ${active === i ? 'on' : ''}`}
            onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive((a) => (a === i ? null : a))}
            onFocus={() => setActive(i)} onBlur={() => setActive((a) => (a === i ? null : a))}
            dangerouslySetInnerHTML={{ __html: katex.renderToString(t.tex, { throwOnError: false }) }} />
        ))}
      </div>
      <div className="hm-cap" aria-live="polite">
        {active != null ? terms[active].meaning : (caption ?? '')}
      </div>
    </div>
  );
}
