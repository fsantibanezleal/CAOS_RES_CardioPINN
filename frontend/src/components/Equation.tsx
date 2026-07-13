import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';

// Display or inline equation. Display equations carry a bilingual caption (ADR-0017 §2: every <Equation> has
// a caption).
export function Equation({ tex, caption, block = true }: { tex: string; caption?: string; block?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: block, throwOnError: false }),
    [tex, block],
  );
  if (!block) return <span dangerouslySetInnerHTML={{ __html: html }} />;
  return (
    <figure className="equation">
      <div className="katex-block" dangerouslySetInnerHTML={{ __html: html }} />
      {caption ? <figcaption className="eq-caption">{caption}</figcaption> : null}
    </figure>
  );
}

export function InlineMath({ tex }: { tex: string }) {
  const html = useMemo(() => katex.renderToString(tex, { displayMode: false, throwOnError: false }), [tex]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
