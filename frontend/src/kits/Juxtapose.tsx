// One theme-aware before/after slider for CardioPINN (e.g. measured vs recovered field). The right panel is
// overlaid on the left and clipped by a draggable vertical divider (clip-path inset), so one side shows `left`
// and the other shows `right`. The handle is a role="slider" (mouse + touch + Left/Right arrow keys when focused,
// Home/End to jump to the edges) with aria-valuenow tracking the split percentage. Chrome colours come from the
// shell CSS variables so it repaints with light/dark. The caller passes already-localized label strings.
import { useCallback, useId, useRef, useState } from 'react';
import type { JSX, ReactNode } from 'react';

const CSS = `
.jux-root { position: relative; width: 100%; overflow: hidden; border: 1px solid var(--border);
  border-radius: 8px; background: var(--panel); touch-action: none; user-select: none; }
.jux-layer { position: absolute; inset: 0; width: 100%; height: 100%; }
.jux-layer > * { width: 100%; height: 100%; }
.jux-right { will-change: clip-path; }
.jux-label { position: absolute; top: 8px; z-index: 3; font-size: 12px; font-weight: 600; line-height: 1;
  padding: 4px 8px; border-radius: 6px; background: var(--panel-2); color: var(--fg);
  border: 1px solid var(--border); pointer-events: none; }
.jux-label-left { left: 8px; }
.jux-label-right { right: 8px; }
.jux-divider { position: absolute; top: 0; bottom: 0; z-index: 4; width: 2px; margin-left: -1px;
  background: var(--accent); pointer-events: none; }
.jux-handle { position: absolute; top: 50%; z-index: 5; width: 34px; height: 34px; margin: -17px 0 0 -17px;
  border-radius: 50%; background: var(--panel-2); border: 2px solid var(--accent); color: var(--fg);
  display: flex; align-items: center; justify-content: center; cursor: ew-resize; box-sizing: border-box; }
.jux-handle:focus-visible { outline: 2px solid var(--accent-2); outline-offset: 2px; }
.jux-handle svg { display: block; }
.jux-handle svg path { stroke: var(--accent); }
`;

export function Juxtapose({
  left,
  right,
  leftLabel,
  rightLabel,
  height = 360,
}: {
  left: ReactNode;
  right: ReactNode;
  leftLabel?: ReactNode;
  rightLabel?: ReactNode;
  height?: number | string;
}): JSX.Element {
  const [pct, setPct] = useState<number>(50);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<boolean>(false);
  const uid = useId();

  const clamp = (v: number): number => (v < 0 ? 0 : v > 100 ? 100 : v);

  const setFromClientX = useCallback((clientX: number): void => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    setPct(clamp(((clientX - rect.left) / rect.width) * 100));
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent): void => {
      draggingRef.current = true;
      // capture on the root, the same element whose pointerup/cancel handlers release it
      rootRef.current?.setPointerCapture?.(e.pointerId);
      setFromClientX(e.clientX);
    },
    [setFromClientX],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent): void => {
      if (!draggingRef.current) return;
      setFromClientX(e.clientX);
    },
    [setFromClientX],
  );

  const onPointerUp = useCallback((e: React.PointerEvent): void => {
    draggingRef.current = false;
    // release on the root, the same element that captured in onPointerDown
    rootRef.current?.releasePointerCapture?.(e.pointerId);
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent): void => {
    const step = e.shiftKey ? 10 : 2;
    let next: number | null = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = pct - step;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = pct + step;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 100;
    if (next !== null) {
      e.preventDefault();
      setPct(clamp(next));
    }
  }, [pct]);

  const rounded = Math.round(pct);
  const heightStyle = typeof height === 'number' ? `${height}px` : height;
  // right panel is visible from the divider to the right edge: clip everything left of `pct`
  const clip = `inset(0 0 0 ${pct}%)`;

  return (
    <div
      ref={rootRef}
      className="jux-root"
      style={{ height: heightStyle }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <style>{CSS}</style>

      <div className="jux-layer" aria-hidden={false}>{left}</div>
      <div id={`${uid}-right`} className="jux-layer jux-right" style={{ clipPath: clip, WebkitClipPath: clip }}>{right}</div>

      {leftLabel != null && <div className="jux-label jux-label-left">{leftLabel}</div>}
      {rightLabel != null && <div className="jux-label jux-label-right">{rightLabel}</div>}

      <div className="jux-divider" style={{ left: `${pct}%` }} aria-hidden={true} />

      <button
        type="button"
        className="jux-handle"
        style={{ left: `${pct}%` }}
        role="slider"
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-valuetext={`${rounded}%`}
        aria-label={`Before after divider, ${rounded}% split`}
        aria-controls={`${uid}-right`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M7 4 L3 9 L7 14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11 4 L15 9 L11 14" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
