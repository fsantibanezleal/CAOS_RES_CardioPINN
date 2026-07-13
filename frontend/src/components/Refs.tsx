import { CITATIONS } from '../data/citations';

// Per-section reference list (ADR-0016 §7 / ADR-0017 §4): lists ONLY the sources cited in this section,
// each with a real DOI or URL. Never a bottom-of-page bibliography dump.
export function Refs({ ids }: { ids: string[] }) {
  const items = ids.map((id) => CITATIONS[id]).filter(Boolean);
  if (!items.length) return null;
  return (
    <div className="refs">
      <div className="refs-h">References</div>
      <ol>
        {items.map((c) => {
          const h = c.doi ? `https://doi.org/${c.doi}` : c.url;
          return (
            <li key={c.id}>
              {c.citation} {h ? <a href={h} target="_blank" rel="noreferrer">{c.doi ? `doi:${c.doi}` : c.url}</a> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
