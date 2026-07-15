// Reader-controlled narrative stepper for CardioPINN: a Prev/Next control plus a dot progress indicator that
// shows one step's title and body at a time and calls onStep, so a coupled figure (3D field, chart marker,
// diagram highlight) can move in lockstep with the reader. NO autoplay: advancing is entirely reader-driven
// (buttons, dots, or Arrow keys). Controlled when both activeStep and onStep are passed, otherwise it keeps
// internal state. Theme-aware via the shell CSS variables; the caller supplies already-localized copy.
import { useCallback, useId, useRef, useState, type ReactNode, type KeyboardEvent } from 'react';

export interface StepDef { title: ReactNode; body: ReactNode; }

export function ClinicalStepper({
  steps, activeStep, onStep, prevLabel, nextLabel,
}: {
  steps: StepDef[];
  activeStep?: number;
  onStep?: (i: number) => void;
  prevLabel?: ReactNode;
  nextLabel?: ReactNode;
}) {
  const controlled = activeStep != null && onStep != null;
  const [internal, setInternal] = useState(0);
  const n = steps.length;
  const clamp = useCallback((i: number): number => (n === 0 ? 0 : Math.max(0, Math.min(n - 1, i))), [n]);
  const current = clamp(controlled ? (activeStep as number) : internal);
  const dotsRef = useRef<HTMLDivElement | null>(null);

  const go = useCallback((i: number): void => {
    const next = clamp(i);
    if (next === current) return;
    if (controlled) onStep?.(next);
    else setInternal(next);
  }, [clamp, current, controlled, onStep]);

  const onKey = useCallback((e: KeyboardEvent<HTMLDivElement>): void => {
    let handled = true;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown': go(current + 1); break;
      case 'ArrowLeft':
      case 'ArrowUp': go(current - 1); break;
      case 'Home': go(0); break;
      case 'End': go(n - 1); break;
      default: handled = false;
    }
    if (handled) { e.preventDefault(); dotsRef.current?.focus(); }
  }, [current, go, n]);

  const step = steps[current];
  const titleId = useId();
  const atStart = current <= 0;
  const atEnd = current >= n - 1;

  return (
    <div
      className="stepper-root"
      role="group"
      aria-label="Narrative walkthrough"
      aria-roledescription="stepper"
    >
      <style>{STEPPER_CSS}</style>

      <div className="stepper-head">
        <button
          type="button"
          className="stepper-btn"
          onClick={() => go(current - 1)}
          disabled={atStart || n === 0}
          aria-label={typeof prevLabel === 'string' ? prevLabel : 'Previous step'}
        >
          <svg className="stepper-caret" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M10.5 2.5 5 8l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{prevLabel ?? 'Prev'}</span>
        </button>

        <div
          ref={dotsRef}
          className="stepper-dots"
          role="tablist"
          aria-label="Steps"
          tabIndex={0}
          onKeyDown={onKey}
        >
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Step ${i + 1} of ${n}`}
              tabIndex={-1}
              className={`stepper-dot${i === current ? ' on' : ''}${i < current ? ' done' : ''}`}
              onClick={() => go(i)}
            />
          ))}
        </div>

        <button
          type="button"
          className="stepper-btn"
          onClick={() => go(current + 1)}
          disabled={atEnd || n === 0}
          aria-label={typeof nextLabel === 'string' ? nextLabel : 'Next step'}
        >
          <span>{nextLabel ?? 'Next'}</span>
          <svg className="stepper-caret" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M5.5 2.5 11 8l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.6"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div
        className="stepper-body"
        role="tabpanel"
        aria-labelledby={titleId}
        aria-live="polite"
      >
        {step ? (
          <>
            <div className="stepper-index" aria-hidden="true">{current + 1} / {n}</div>
            <h4 id={titleId} className="stepper-title">{step.title}</h4>
            <div className="stepper-text">{step.body}</div>
          </>
        ) : (
          <div className="stepper-empty" id={titleId}>No steps.</div>
        )}
      </div>
    </div>
  );
}

const STEPPER_CSS = `
.stepper-root { width: 100%; display: flex; flex-direction: column; gap: 12px; }
.stepper-head { display: flex; align-items: center; gap: 12px; }
.stepper-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 9px;
  border: 1px solid var(--border); background: var(--panel-2); color: var(--fg);
  font-family: inherit; font-size: 0.86rem; cursor: pointer; white-space: nowrap;
  transition: border-color 0.15s, background 0.15s, opacity 0.15s;
}
.stepper-btn:hover:not(:disabled) { border-color: var(--accent); }
.stepper-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.stepper-btn:disabled { opacity: 0.4; cursor: default; }
.stepper-caret { width: 14px; height: 14px; flex: none; }
.stepper-dots {
  display: flex; align-items: center; justify-content: center; gap: 9px; flex: 1;
  padding: 6px 4px; border-radius: 999px; min-width: 0;
}
.stepper-dots:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.stepper-dot {
  width: 11px; height: 11px; padding: 0; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--border); background: var(--panel); transition: all 0.15s;
}
.stepper-dot:hover { border-color: var(--accent-2); }
.stepper-dot.done { background: var(--accent-2); border-color: var(--accent-2); }
.stepper-dot.on {
  width: 26px; background: var(--accent); border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
}
.stepper-body {
  min-height: 168px; border: 1px solid var(--border); border-radius: 12px;
  background: var(--panel); padding: 16px 18px;
}
.stepper-index {
  font-family: var(--mono, monospace); font-size: 0.72rem; letter-spacing: 0.06em;
  color: var(--accent-2); margin-bottom: 6px;
}
.stepper-title { margin: 0 0 8px; font-size: 1.02rem; font-weight: 650; color: var(--fg); line-height: 1.3; }
.stepper-text { font-size: 0.92rem; color: var(--muted); line-height: 1.55; }
.stepper-text :is(p, ul, ol) { margin: 0 0 8px; }
.stepper-text :is(p, ul, ol):last-child { margin-bottom: 0; }
.stepper-empty { font-size: 0.9rem; color: var(--muted); }
`;
