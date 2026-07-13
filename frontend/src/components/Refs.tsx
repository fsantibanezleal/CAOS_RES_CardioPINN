import type { Reference } from '../lib/contract.types';

// Inline citation + a per-section reference list carrying real DOIs / arXiv ids (never a bare bibliography dump).
export function Refs({ items }: { items: Reference[] }) {
  if (!items?.length) return null;
  return (
    <div className="panel small" style={{ marginTop: 14 }}>
      <div className="muted" style={{ marginBottom: 6, fontWeight: 600 }}>References</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {items.map((r, i) => {
          const isDoi = /^10\./.test(r.doi_or_arxiv);
          const href = isDoi
            ? `https://doi.org/${r.doi_or_arxiv}`
            : `https://arxiv.org/abs/${r.doi_or_arxiv.replace(/^arXiv:/i, '')}`;
          return (
            <li key={i} style={{ marginBottom: 4 }}>
              {r.cite}. <a href={href} target="_blank" rel="noreferrer">{r.doi_or_arxiv}</a>
              {r.note ? <span className="muted"> ({r.note})</span> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
