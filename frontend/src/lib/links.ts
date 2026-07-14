// The external links that appear in the header (ADR-0016 §1). Single source of truth so header and footer
// never drift. Personal + portfolio live in the HEADER only; the footer keeps at most one GitHub link.
export const EXTERNAL_LINKS = {
  github: 'https://github.com/fsantibanezleal/CAOS_RES_CardioPINN',
  personal: 'https://fsantibanezleal.github.io',
  portfolio: 'https://fasl-work.com',
} as const;
