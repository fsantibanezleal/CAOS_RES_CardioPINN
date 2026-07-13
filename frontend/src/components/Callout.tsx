import type { ReactNode } from 'react';

// A labeled callout box (honest / note / warning), per the ADR content-depth recipe (an explicit
// assumptions / honest-scope block in every deep section).
export function Callout({ variant = 'honest', title, children }:
  { variant?: 'honest' | 'note' | 'warn'; title?: string; children: ReactNode }) {
  const label = title ?? (variant === 'honest' ? 'Assumptions and honest scope' : variant === 'warn' ? 'Caution' : 'Note');
  return (
    <div className={`callout callout-${variant}`}>
      <div className="callout-h">{label}</div>
      <div className="small">{children}</div>
    </div>
  );
}
