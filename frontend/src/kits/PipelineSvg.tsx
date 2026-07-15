// One theme-aware horizontal method-pipeline diagram for CardioPINN. Stages render as rounded SVG boxes
// left-to-right joined by arrows; each box is Tab-focusable, hover/focus reveals its detail in a side caption,
// Enter/Space selects (onSelect). Box stroke colour keys off `kind` via the shell CSS vars so it repaints
// light/dark. Flow animation is reader-triggered (a button), single-pass, never autoplays. A text list under
// the figure is the screen-reader alternative. All chrome colours are CSS variables, no hardcoded hex.
import { useId, useMemo, useRef, useState, type JSX, type ReactNode, type KeyboardEvent } from 'react';

export type PipeKind = 'in' | 'proc' | 'out' | 'gate';

export interface PipeStage {
  id: string;
  label: ReactNode;
  sub?: ReactNode;
  detail?: ReactNode;
  kind?: PipeKind;
}

const STROKE_VAR: Record<PipeKind, string> = {
  in: 'var(--accent-2)',
  proc: 'var(--border)',
  out: 'var(--good)',
  gate: 'var(--warn)',
};

// geometry in viewBox units; the SVG scales to the container width via preserveAspectRatio
const BOX_W = 150;
const BOX_H = 84;
const GAP = 54;   // horizontal space between boxes reserved for the arrow
const PAD = 12;   // outer padding around the row
const VB_H = BOX_H + PAD * 2;

export function PipelineSvg({
  stages,
  animate = false,
  onSelect,
  selected = null,
  playLabel = 'Play flow',
  captionEmpty = 'Hover or focus a stage to inspect it.',
  ariaLabel = 'Method pipeline',
}: {
  stages: PipeStage[];
  animate?: boolean;
  onSelect?: (id: string) => void;
  selected?: string | null;
  playLabel?: ReactNode;
  captionEmpty?: ReactNode;
  ariaLabel?: string;
}): JSX.Element {
  const uid = useId().replace(/[:]/g, '');
  const [hovered, setHovered] = useState<string | null>(null);
  const [flowing, setFlowing] = useState(false);
  const flowTimer = useRef<number | null>(null);

  const n = stages.length;
  const vbW = PAD * 2 + n * BOX_W + Math.max(0, n - 1) * GAP;

  const active = hovered ?? selected ?? null;
  const activeStage = useMemo(
    () => stages.find((s) => s.id === active) ?? null,
    [stages, active],
  );

  const xOf = (i: number) => PAD + i * (BOX_W + GAP);

  const triggerFlow = () => {
    if (flowTimer.current != null) window.clearTimeout(flowTimer.current);
    // restart the one-pass animation cleanly
    setFlowing(false);
    window.requestAnimationFrame(() => {
      setFlowing(true);
      // single pass: arrows animate for ~1.1s then settle
      flowTimer.current = window.setTimeout(() => setFlowing(false), 1200 + n * 120);
    });
  };

  const onBoxKey = (e: KeyboardEvent<SVGGElement>, id: string) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      onSelect?.(id);
    }
  };

  return (
    <div className={`pipe-root pipe-${uid}`}>
      <style>{`
        .pipe-${uid} { width: 100%; }
        .pipe-${uid} .pipe-controls { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .pipe-${uid} .pipe-play {
          display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 8px;
          border: 1px solid var(--border); background: var(--panel-2); color: var(--fg);
          font-family: var(--sans, inherit); font-size: 13px; font-weight: 500; cursor: pointer;
        }
        .pipe-${uid} .pipe-play:hover { border-color: var(--accent); }
        .pipe-${uid} .pipe-play:disabled { opacity: 0.55; cursor: default; }
        .pipe-${uid} .pipe-svg { width: 100%; height: auto; display: block; overflow: visible; }
        .pipe-${uid} .pipe-box { cursor: pointer; }
        .pipe-${uid} .pipe-box:focus { outline: none; }
        .pipe-${uid} .pipe-box-rect {
          fill: var(--panel); stroke-width: 1.6; transition: fill 0.14s, stroke-width 0.14s, filter 0.14s;
        }
        .pipe-${uid} .pipe-box:hover .pipe-box-rect,
        .pipe-${uid} .pipe-box:focus .pipe-box-rect { fill: var(--panel-2); }
        .pipe-${uid} .pipe-box.on .pipe-box-rect { stroke-width: 2.6; }
        .pipe-${uid} .pipe-box:focus-visible .pipe-box-rect { stroke: var(--accent); stroke-width: 2.6; }
        .pipe-${uid} .pipe-lbl { fill: var(--fg); font-size: 14px; font-weight: 600; font-family: var(--sans, inherit); }
        .pipe-${uid} .pipe-sub { fill: var(--muted); font-size: 11px; font-family: var(--sans, inherit); }
        .pipe-${uid} .pipe-arrow { stroke: var(--muted); stroke-width: 1.8; fill: none; }
        .pipe-${uid} .pipe-arrow-flow {
          stroke: var(--accent); stroke-width: 2.4; fill: none; stroke-dasharray: 8 10;
        }
        .pipe-${uid} .pipe-arrow-flow.run {
          animation: pipe-dash-${uid} 1.05s linear 1 both;
        }
        @keyframes pipe-dash-${uid} { from { stroke-dashoffset: 36; } to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .pipe-${uid} .pipe-arrow-flow.run { animation: none; }
        }
        .pipe-${uid} .pipe-caption {
          margin-top: 10px; border: 1px solid var(--border); border-radius: 10px; background: var(--panel);
          padding: 10px 12px; font-size: 0.86rem; color: var(--fg); min-height: 1.2em; line-height: 1.5;
        }
        .pipe-${uid} .pipe-caption .cap-empty { color: var(--muted); }
        .pipe-${uid} .pipe-caption .cap-sub { color: var(--accent-2); margin-left: 6px; font-size: 0.82rem; }
        .pipe-${uid} .pipe-caption .cap-detail { display: block; margin-top: 5px; color: var(--muted); }
        .pipe-${uid} .pipe-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
      `}</style>

      {animate ? (
        <div className="pipe-controls">
          <button
            type="button"
            className="pipe-play"
            onClick={triggerFlow}
            disabled={flowing}
            aria-label={typeof playLabel === 'string' ? playLabel : undefined}
          >
            {playLabel}
          </button>
        </div>
      ) : null}

      <svg
        className="pipe-svg"
        viewBox={`0 0 ${vbW} ${VB_H}`}
        preserveAspectRatio="xMinYMid meet"
        role="group"
        aria-label={typeof ariaLabel === 'string' ? ariaLabel : undefined}
      >
        {/* arrows between consecutive boxes */}
        {stages.slice(0, -1).map((s, i) => {
          const x1 = xOf(i) + BOX_W;
          const x2 = xOf(i + 1);
          const y = PAD + BOX_H / 2;
          const head = x2 - 2;
          return (
            <g key={`arr-${s.id}`} aria-hidden="true">
              <line className="pipe-arrow" x1={x1 + 2} y1={y} x2={x2 - 8} y2={y} />
              <path
                className="pipe-arrow"
                d={`M ${head - 8} ${y - 5} L ${head} ${y} L ${head - 8} ${y + 5}`}
              />
              {flowing ? (
                <line
                  className="pipe-arrow-flow run"
                  x1={x1 + 2}
                  y1={y}
                  x2={x2 - 8}
                  y2={y}
                  style={{ animationDelay: `${i * 0.12}s` }}
                />
              ) : null}
            </g>
          );
        })}

        {/* stage boxes */}
        {stages.map((s, i) => {
          const x = xOf(i);
          const y = PAD;
          const kind: PipeKind = s.kind ?? 'proc';
          const isOn = s.id === selected;
          return (
            <g
              key={s.id}
              className={`pipe-box${isOn ? ' on' : ''}`}
              tabIndex={0}
              role="button"
              aria-pressed={isOn}
              aria-label={typeof s.label === 'string' ? s.label : `stage ${i + 1}`}
              onClick={() => onSelect?.(s.id)}
              onKeyDown={(e) => onBoxKey(e, s.id)}
              onMouseEnter={() => setHovered(s.id)}
              onMouseLeave={() => setHovered((h) => (h === s.id ? null : h))}
              onFocus={() => setHovered(s.id)}
              onBlur={() => setHovered((h) => (h === s.id ? null : h))}
            >
              <rect
                className="pipe-box-rect"
                x={x}
                y={y}
                width={BOX_W}
                height={BOX_H}
                rx={12}
                ry={12}
                style={{ stroke: STROKE_VAR[kind] }}
              />
              <text className="pipe-lbl" x={x + BOX_W / 2} y={y + BOX_H / 2 - (s.sub ? 4 : -4)} textAnchor="middle">
                {typeof s.label === 'string' ? s.label : `Stage ${i + 1}`}
              </text>
              {s.sub && typeof s.sub === 'string' ? (
                <text className="pipe-sub" x={x + BOX_W / 2} y={y + BOX_H / 2 + 16} textAnchor="middle">
                  {s.sub}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <div className="pipe-caption" aria-live="polite">
        {activeStage ? (
          <span>
            <b>{activeStage.label}</b>
            {activeStage.sub ? <span className="cap-sub">{activeStage.sub}</span> : null}
            {activeStage.detail ? <span className="cap-detail">{activeStage.detail}</span> : null}
          </span>
        ) : (
          <span className="cap-empty">{captionEmpty}</span>
        )}
      </div>

      {/* screen-reader / no-SVG text alternative */}
      <ol className="pipe-sr">
        {stages.map((s, i) => (
          <li key={`sr-${s.id}`}>
            {i + 1}. {s.label}
            {s.sub ? <>: {s.sub}</> : null}
            {s.detail ? <> ({s.detail})</> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
