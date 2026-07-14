// Vertical sub-tab rail (ADR-0016 §6): a left rail on wide screens + a content pane, for deep multi-topic
// content (one sub-tab per method family). Accessible roving-tabindex tablist (arrow-key nav, aria-selected).
export function SubTabs({ tabs, active, onChange }:
  { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  const idx = Math.max(0, tabs.findIndex((t) => t.id === active));
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const d = e.key === 'ArrowDown' ? 1 : -1;
      onChange(tabs[(idx + d + tabs.length) % tabs.length].id);
    }
  };
  return (
    <div className="subtabs-vertical" role="tablist" aria-orientation="vertical">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          tabIndex={active === t.id ? 0 : -1}
          className={`subtab ${active === t.id ? 'on' : ''}`}
          onClick={() => onChange(t.id)}
          onKeyDown={onKey}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
