// The single routes source of truth (ADR-0016 §1): the router and the header nav both consume this, so they
// can never drift. `/` is the App (the tool itself, ADR-0016 §4), the doc pages follow.
export interface RouteDef { to: string; key: string; end?: boolean }

export const ROUTES: RouteDef[] = [
  { to: '/', key: 'nav.app', end: true },
  { to: '/introduction', key: 'nav.intro' },
  { to: '/methodology', key: 'nav.method' },
  { to: '/implementation', key: 'nav.impl' },
  { to: '/experiments', key: 'nav.exp' },
  { to: '/benchmark', key: 'nav.bench' },
];
