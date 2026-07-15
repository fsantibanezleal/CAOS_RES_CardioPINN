// Reader-controlled KaTeX derivation for CardioPINN: reveals equation lines one at a time with Prev/Next
// (Arrow keys, Home/End), emphasises the newly revealed line (accent left-border), dims earlier ones, and
// shows the current step's caption plus a "step i of n" readout. No autoplay; every reveal is reader-triggered.
// Controlled (activeStep + onStep) or self-contained (internal state). Colours are shell CSS variables so the
// boxes repaint with light/dark. Caller passes already-localized ReactNode copy; this file hardcodes none.
import { useCallback, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import katex from 'katex';

export interface DerivStep {
  tex: string;
  caption: ReactNode;
}

export interface DerivationStepperProps {
  steps: DerivStep[];
  activeStep?: number;
  onStep?: (i: number) => void;
  /** Accessible name for the derivation region. */
  ariaLabel?: string;
  /** Localized "step {i} of {n}" builder; falls back to a bare "i / n" when omitted. */
  stepLabel?: (current: number, total: number) => ReactNode;
  /** Localized labels for the two buttons. */
  prevLabel?: ReactNode;
  nextLabel?: ReactNode;
}

const CSS = `
.derivstep-root { display: flex; flex-direction: column; gap: 12px; color: var(--fg); }
.derivstep-lines { display: flex; flex-direction: column; gap: 8px; margin: 0; }
.derivstep-line {
  border: 1px solid var(--border);
  border-left: 3px solid var(--border);
  background: var(--panel);
  border-radius: 6px;
  padding: 10px 14px;
  overflow-x: auto;
  transition: opacity 120ms ease, border-color 120ms ease, background 120ms ease;
}
.derivstep-line.is-past { opacity: 0.5; }
.derivstep-line.is-current {
  border-left-color: var(--accent);
  background: var(--panel-2);
  opacity: 1;
}
.derivstep-caption {
  color: var(--muted);
  font-size: 0.92em;
  line-height: 1.5;
  min-height: 1.4em;
}
.derivstep-caption .derivstep-caption-mark { color: var(--accent); font-weight: 600; margin-right: 6px; }
.derivstep-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.derivstep-btn {
  font: inherit;
  color: var(--fg);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 12px;
  cursor: pointer;
}
.derivstep-btn:hover:not(:disabled) { border-color: var(--accent); }
.derivstep-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.derivstep-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.derivstep-readout { color: var(--muted); font-variant-numeric: tabular-nums; font-size: 0.92em; }
.derivstep-root:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 6px; }
`;

function texToHtml(tex: string): string {
  return katex.renderToString(tex, { displayMode: true, throwOnError: false });
}

export function DerivationStepper({
  steps,
  activeStep,
  onStep,
  ariaLabel = 'Derivation',
  stepLabel,
  prevLabel = 'Prev',
  nextLabel = 'Next',
}: DerivationStepperProps) {
  const total = steps.length;
  const controlled = activeStep !== undefined;
  const [internal, setInternal] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const clamp = useCallback(
    (i: number) => Math.max(0, Math.min(total - 1, i)),
    [total],
  );

  const current = clamp(controlled ? (activeStep as number) : internal);

  const goTo = useCallback(
    (next: number) => {
      const c = clamp(next);
      if (!controlled) setInternal(c);
      onStep?.(c);
    },
    [clamp, controlled, onStep],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          goTo(current + 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          goTo(current - 1);
          break;
        case 'Home':
          e.preventDefault();
          goTo(0);
          break;
        case 'End':
          e.preventDefault();
          goTo(total - 1);
          break;
        default:
          break;
      }
    },
    [current, goTo, total],
  );

  // Pre-render KaTeX once per step set; only revealed lines (index <= current) are shown.
  const rendered = useMemo(() => steps.map((s) => texToHtml(s.tex)), [steps]);

  if (total === 0) {
    return <div className="derivstep-root" aria-label={ariaLabel} />;
  }

  const readout: ReactNode = stepLabel ? stepLabel(current + 1, total) : `${current + 1} / ${total}`;

  return (
    <div
      ref={rootRef}
      className="derivstep-root"
      role="group"
      aria-label={ariaLabel}
      aria-roledescription="derivation stepper"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <style>{CSS}</style>

      <ol className="derivstep-lines">
        {steps.slice(0, current + 1).map((_step, i) => {
          const isCurrent = i === current;
          return (
            <li
              key={i}
              className={`derivstep-line ${isCurrent ? 'is-current' : 'is-past'}`}
              aria-current={isCurrent ? 'step' : undefined}
              dangerouslySetInnerHTML={{ __html: rendered[i] }}
            />
          );
        })}
      </ol>

      <div className="derivstep-caption" aria-live="polite">
        <span className="derivstep-caption-mark" aria-hidden="true">
          ({current + 1})
        </span>
        {steps[current].caption}
      </div>

      <div className="derivstep-controls">
        <button
          type="button"
          className="derivstep-btn"
          onClick={() => goTo(current - 1)}
          disabled={current <= 0}
          aria-label={typeof prevLabel === 'string' ? prevLabel : undefined}
        >
          {prevLabel}
        </button>
        <button
          type="button"
          className="derivstep-btn"
          onClick={() => goTo(current + 1)}
          disabled={current >= total - 1}
          aria-label={typeof nextLabel === 'string' ? nextLabel : undefined}
        >
          {nextLabel}
        </button>
        <span className="derivstep-readout" aria-live="polite">
          {readout}
        </span>
      </div>
    </div>
  );
}
