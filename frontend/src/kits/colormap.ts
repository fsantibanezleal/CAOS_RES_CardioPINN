// Perceptually-uniform colormaps (interactive-visualization-rubric §0 law 4: NO jet/rainbow/turbo on an
// intensity axis). Input t in [0,1] -> [r, g, b] in [0,1].
// - seq (magma): sequential PU, for magnitude/positive fields (abs error, uncertainty, pressure, speed).
// - div (coolwarm, Moreland): diverging PU, for SIGNED fields centred at 0 (recovered / measured potential).

type RGB = [number, number, number];

function interp(anchors: RGB[], t: number): RGB {
  const x = Math.min(1, Math.max(0, t));
  const n = anchors.length - 1;
  const p = x * n;
  const i = Math.min(n - 1, Math.floor(p));
  const f = p - i;
  const a = anchors[i], b = anchors[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

// magma control points (matplotlib), 9 anchors
const MAGMA: RGB[] = [
  [0.001, 0.000, 0.014], [0.078, 0.054, 0.211], [0.232, 0.059, 0.438], [0.417, 0.090, 0.433],
  [0.599, 0.164, 0.409], [0.781, 0.243, 0.350], [0.930, 0.412, 0.269], [0.988, 0.653, 0.401], [0.987, 0.991, 0.749],
];
// coolwarm (Kenneth Moreland) diverging, 5 anchors
const COOLWARM: RGB[] = [
  [0.2298, 0.2987, 0.7537], [0.5543, 0.6901, 0.9955], [0.8654, 0.8654, 0.8654], [0.9567, 0.5980, 0.4805], [0.7057, 0.0156, 0.1502],
];

export function seq(t: number): RGB { return interp(MAGMA, t); }
export function div(t: number): RGB { return interp(COOLWARM, t); }

const css = (c: RGB) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;
export function seqCss(t: number): string { return css(seq(t)); }
export function divCss(t: number): string { return css(div(t)); }

export function fieldRange(values: number[]): [number, number] {
  let lo = Infinity, hi = -Infinity;
  for (const v of values) { if (v < lo) lo = v; if (v > hi) hi = v; }
  if (!isFinite(lo)) return [0, 1];
  if (hi === lo) hi = lo + 1;
  return [lo, hi];
}
