import { CITATIONS } from '../data/citations';

function href(id: string): string | undefined {
  const c = CITATIONS[id];
  if (!c) return undefined;
  if (c.doi) return `https://doi.org/${c.doi}`;
  return c.url;
}

// Inline citation: a small superscript-style link to the source (ADR-0016 §7 / ADR-0017 §4).
export function Cite({ id }: { id: string }) {
  const c = CITATIONS[id];
  const h = href(id);
  if (!c) return null;
  return (
    <a className="cite" href={h} target="_blank" rel="noreferrer" title={c.citation}>[{c.label}]</a>
  );
}
