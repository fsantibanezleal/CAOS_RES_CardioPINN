// One theme-aware uPlot wrapper for every linked 2D chart in CardioPINN (interactive-visualization-rubric:
// zoom/pan + value readout + theme-aware + keyboard/SR fallback). Axis/grid/label colours come from the shell
// CSS variables so it repaints with light/dark; an external `cursorX` draws a synced vertical marker so the 3D
// scrubber and the chart move in lockstep; `markers` pins named points (oracle/corner/identity). Never forked.
import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

export interface UPlotSeries { label: string; stroke: string; width?: number; fill?: string; dash?: number[]; }
export interface UPlotMarker { x: number; y: number; color?: string; label?: string; }

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function UPlotChart({
  data, series, xLabel, yLabel, height = 200, cursorX = null, markers = [], identity = false,
  ariaLabel, onHover, onClickX, logX = false,
}: {
  data: (number[] | Float64Array)[];
  series: UPlotSeries[];
  xLabel?: string; yLabel?: string; height?: number;
  cursorX?: number | null; markers?: UPlotMarker[]; identity?: boolean;
  ariaLabel: string; onHover?: (x: number | null) => void; onClickX?: (x: number) => void; logX?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const uref = useRef<uPlot | null>(null);
  // keep the latest overlay props for the draw hook without rebuilding the chart
  const overlay = useRef({ cursorX, markers, identity });
  overlay.current = { cursorX, markers, identity };

  useEffect(() => {
    const host = hostRef.current; if (!host) return;
    let u: uPlot | null = null;
    const build = () => {
      if (u) { u.destroy(); u = null; }
      const fg = cssVar('--color-fg', '#c9d1d9');
      const sub = cssVar('--color-fg-subtle', '#9aa6b2');
      const border = cssVar('--color-border', '#30363d');
      const grid = { stroke: border, width: 1 };
      const ax = { stroke: sub, grid, ticks: { stroke: border, width: 1 }, font: '11px ui-sans-serif, system-ui' };
      const opts: uPlot.Options = {
        width: host.clientWidth || 320, height,
        cursor: { drag: { x: true, y: false }, focus: { prox: 24 } },
        legend: { show: false },
        scales: { x: logX ? { distr: 3 } : {} },
        axes: [
          { ...ax, label: xLabel, labelSize: xLabel ? 22 : 8, labelFont: '11px ui-sans-serif, system-ui', values: undefined },
          { ...ax, label: yLabel, labelSize: yLabel ? 30 : 8, labelFont: '11px ui-sans-serif, system-ui', size: 46 },
        ],
        series: [
          { label: xLabel || 'x' },
          ...series.map((s) => ({ label: s.label, stroke: s.stroke, width: s.width ?? 1.8,
            fill: s.fill, dash: s.dash, points: { show: false } })),
        ],
        hooks: {
          setCursor: [(up) => { if (onHover) { const i = up.cursor.idx; onHover(i == null ? null : (up.data[0][i] as number)); } }],
          draw: [(up) => {
            const ctx = up.ctx; const { cursorX: cx, markers: mk, identity: idn } = overlay.current;
            ctx.save();
            const L = up.bbox.left, T = up.bbox.top, W = up.bbox.width, H = up.bbox.height;
            if (idn) {
              // y = x reference over the visible range
              const x0 = up.scales.x.min ?? 0, x1 = up.scales.x.max ?? 1;
              ctx.strokeStyle = sub; ctx.setLineDash([4, 3]); ctx.lineWidth = 1; ctx.beginPath();
              ctx.moveTo(up.valToPos(x0, 'x', true), up.valToPos(x0, 'y', true));
              ctx.lineTo(up.valToPos(x1, 'x', true), up.valToPos(x1, 'y', true));
              ctx.stroke(); ctx.setLineDash([]);
            }
            if (cx != null && isFinite(cx)) {
              const px = up.valToPos(cx, 'x', true);
              if (px >= L && px <= L + W) {
                ctx.strokeStyle = cssVar('--color-accent', '#58a6ff'); ctx.lineWidth = 1.4;
                ctx.beginPath(); ctx.moveTo(px, T); ctx.lineTo(px, T + H); ctx.stroke();
              }
            }
            for (const m of mk) {
              const px = up.valToPos(m.x, 'x', true), py = up.valToPos(m.y, 'y', true);
              ctx.fillStyle = m.color || cssVar('--color-good', '#3fb950');
              ctx.beginPath(); ctx.arc(px, py, 4, 0, 7); ctx.fill();
              if (m.label) { ctx.fillStyle = fg; ctx.font = '11px ui-sans-serif, system-ui';
                ctx.fillText(m.label, Math.min(px + 6, L + W - 60), Math.max(py - 6, T + 10)); }
            }
            ctx.restore();
          }],
        },
      };
      u = new uPlot(opts, data as uPlot.AlignedData, host);
      uref.current = u;
      if (onClickX) u.over.addEventListener('click', () => { const i = u!.cursor.idx; if (i != null) onClickX(u!.data[0][i] as number); });
    };
    build();
    const ro = new ResizeObserver(() => { if (u) u.setSize({ width: host.clientWidth || 320, height }); });
    ro.observe(host);
    const mo = new MutationObserver(build);   // rebuild on theme (data-theme attr) change so colours repaint
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { ro.disconnect(); mo.disconnect(); if (u) u.destroy(); uref.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, xLabel, yLabel, logX]);

  // update data without rebuilding
  useEffect(() => { if (uref.current) uref.current.setData(data as uPlot.AlignedData); }, [data]);
  // redraw overlay (cursor/markers) when they change
  useEffect(() => { if (uref.current) uref.current.redraw(); }, [cursorX, markers, identity]);

  return <div ref={hostRef} className="uplot-host" role="img" aria-label={ariaLabel} tabIndex={0} style={{ width: '100%' }} />;
}
