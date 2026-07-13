export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tb) => (
        <div
          key={tb.id}
          role="tab"
          aria-selected={active === tb.id}
          className={`tab ${active === tb.id ? 'on' : ''}`}
          onClick={() => onChange(tb.id)}
        >
          {tb.label}
        </div>
      ))}
    </div>
  );
}
