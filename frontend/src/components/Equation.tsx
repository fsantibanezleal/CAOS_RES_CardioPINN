import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';

export function Equation({ tex, block = true }: { tex: string; block?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: block, throwOnError: false }),
    [tex, block],
  );
  return <span className={block ? 'katex-block' : ''} dangerouslySetInnerHTML={{ __html: html }} />;
}
