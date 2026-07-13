// Vertical sub-tab rail (ADR-0016 §6): a left rail on wide screens + a content pane, for deep multi-topic
// content (one sub-tab per method family). Keyboard-accessible tablist.
export function SubTabs({ tabs, active, onChange }:
  { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="subtabs-vertical" role="tablist" aria-orientation="vertical">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          className={`subtab ${active === t.id ? 'on' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
