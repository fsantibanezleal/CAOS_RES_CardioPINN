// A horizontal, shared-scale strip of small panels (phase snapshots, lambda regimes, method-ladder rungs)
// for CardioPINN. Each panel is a bordered card holding an arbitrary render node plus a small label; clicking
// or pressing Enter/Space selects it (the caller drives a hero view off `selected`). Theme-aware via the shell
// CSS variables, keyboard-operable (role="listbox"/option, Left/Right/Home/End), no autoplay. Generic: all copy
// is passed in already localized. Overflow scrolls horizontally, never overflowing the page.
import { useCallback, useId, useRef, type ReactNode, type KeyboardEvent, type JSX } from 'react';

export interface SmallMult {
  key: string;
  label: ReactNode;
  caption?: ReactNode;
  render: ReactNode;
}

export function SmallMultipleStrip({
  items,
  selected,
  onSelect,
  title,
}: {
  items: SmallMult[];
  selected?: string;
  onSelect?: (key: string) => void;
  title?: ReactNode;
}): JSX.Element {
  const groupId = useId();
  const optRefs = useRef<Array<HTMLDivElement | null>>([]);

  const selectAt = useCallback(
    (i: number) => {
      const it = items[i];
      if (!it) return;
      optRefs.current[i]?.focus();
      onSelect?.(it.key);
    },
    [items, onSelect],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, i: number) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          selectAt(Math.min(items.length - 1, i + 1));
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          selectAt(Math.max(0, i - 1));
          break;
        case 'Home':
          e.preventDefault();
          selectAt(0);
          break;
        case 'End':
          e.preventDefault();
          selectAt(items.length - 1);
          break;
        case 'Enter':
        case ' ':
        case 'Spacebar': {
          e.preventDefault();
          const k = items[i]?.key;
          if (k != null) onSelect?.(k);
          break;
        }
        default:
          break;
      }
    },
    [items, onSelect, selectAt],
  );

  const activeIndex = items.findIndex((it) => it.key === selected);

  return (
    <div className="sms-wrap">
      <style>{STYLE}</style>
      {title != null && <div className="sms-title">{title}</div>}
      <div
        className="sms-strip"
        role="listbox"
        aria-orientation="horizontal"
        aria-label={typeof title === 'string' ? title : 'Small multiples'}
      >
        {items.map((it, i) => {
          const on = it.key === selected;
          return (
            <div
              key={it.key}
              ref={(el) => {
                optRefs.current[i] = el;
              }}
              id={`${groupId}-opt-${i}`}
              className={`sms-card${on ? ' on' : ''}`}
              role="option"
              aria-selected={on}
              tabIndex={on || (activeIndex < 0 && i === 0) ? 0 : -1}
              onClick={() => onSelect?.(it.key)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              <div className="sms-render">{it.render}</div>
              <div className="sms-label">{it.label}</div>
              {it.caption != null && <div className="sms-caption">{it.caption}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STYLE = `
.sms-wrap { width: 100%; }
.sms-title { font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.sms-strip { display: flex; gap: 10px; overflow-x: auto; overflow-y: hidden; padding: 2px 2px 8px; scrollbar-width: thin; max-width: 100%; }
.sms-card { flex: 0 0 auto; display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid var(--border); border-radius: 10px; background: var(--panel); color: var(--fg); cursor: pointer; transition: border-color 0.15s, background 0.15s; outline: none; }
.sms-card:hover { border-color: var(--accent-2); }
.sms-card:focus-visible { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 40%, transparent); }
.sms-card.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, var(--panel)); }
.sms-render { display: flex; align-items: center; justify-content: center; }
.sms-label { font-size: 0.78rem; font-weight: 600; text-align: center; color: var(--fg); }
.sms-caption { font-size: 0.68rem; text-align: center; color: var(--muted); line-height: 1.3; }
`;
