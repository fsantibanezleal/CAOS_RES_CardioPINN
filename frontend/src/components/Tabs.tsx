// Top-level tabs (ADR-0016 §6): an accessible roving-tabindex tablist (arrow-key nav, aria-selected).
export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  const idx = Math.max(0, tabs.findIndex((t) => t.id === active));
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const d = e.key === 'ArrowRight' ? 1 : -1;
      onChange(tabs[(idx + d + tabs.length) % tabs.length].id);
    }
  };
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tb) => (
        <button
          key={tb.id}
          role="tab"
          aria-selected={active === tb.id}
          tabIndex={active === tb.id ? 0 : -1}
          className={`tab ${active === tb.id ? 'on' : ''}`}
          onClick={() => onChange(tb.id)}
          onKeyDown={onKey}
        >
          {tb.label}
        </button>
      ))}
    </div>
  );
}
