// The interactive 3D field host used by every 3D tab (ECGi heart mesh + 4D-flow lumen cloud). Orbit + zoom
// (OrbitControls). PICK a node by mouse click (raycast -> nearest vertex -> onPick); the viewport is also
// keyboard-focusable and Arrow/Home/End keys step the picked node index (onPick), so the pick works without a
// mouse. A pinned picked-node marker + an argmax marker, a perceptually-uniform colormap legend, a value
// readout, and an sr-summary text (the WebGL canvas itself is aria-hidden, so the sr-summary describes it).
// Colours come from the shared colormap kit; the field is signed (diverging) or unsigned (sequential). This
// replaces the static heart/cloud with a real, inspectable view (interactive-viz-rubric).
import { OrbitControls } from '@react-three/drei';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { useMemo, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import * as THREE from 'three';
import { div as _div, seq as _seq, divCss, seqCss } from './colormap';

export interface FieldView3DProps {
  vertices: number[][];
  triangles?: number[][];            // present -> mesh; absent -> point cloud
  values: number[];                  // one scalar per vertex
  signed: boolean;                   // signed -> diverging colormap centred at 0
  range: { lo: number; hi: number };
  pickedNode: number | null;
  argmaxNode?: number | null;
  onPick: (n: number) => void;
  camera?: [number, number, number];
  pointSize?: number;
  legendLabel: string;               // e.g. "Recovered (mV)"
  unit?: string;
  readout?: ReactNode;               // small overlay bottom-left
  srSummary: string;                 // screen-reader text (the canvas is aria-hidden)
}

function color(v: number, lo: number, hi: number, signed: boolean): [number, number, number] {
  const t = hi > lo ? Math.min(1, Math.max(0, (v - lo) / (hi - lo))) : 0.5;
  const c = signed ? divRGB(t) : seqRGB(t);
  return c;
}
// small RGB helpers (avoid importing the css versions for the vertex-color buffer)
function divRGB(t: number): [number, number, number] { return _div(t); }
function seqRGB(t: number): [number, number, number] { return _seq(t); }

function Geometry({ vertices, triangles, values, signed, range, renderPoints, pointSize, onPick, centre }:
  { vertices: number[][]; triangles?: number[][]; values: number[]; signed: boolean; range: { lo: number; hi: number };
    renderPoints: boolean; pointSize: number; onPick: (n: number) => void; centre: [number, number, number] }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = vertices.length;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = vertices[i][0] - centre[0]; pos[i * 3 + 1] = vertices[i][1] - centre[1]; pos[i * 3 + 2] = vertices[i][2] - centre[2];
      const c = color(values[i], range.lo, range.hi, signed);
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (triangles && !renderPoints) {
      const idx = new Uint32Array(triangles.length * 3);
      triangles.forEach((t, i) => { idx[i * 3] = t[0]; idx[i * 3 + 1] = t[1]; idx[i * 3 + 2] = t[2]; });
      g.setIndex(new THREE.BufferAttribute(idx, 1));
      g.computeVertexNormals();
    }
    g.computeBoundingSphere();
    return g;
  }, [vertices, triangles, values, signed, range.lo, range.hi, renderPoints, centre]);

  const nearestVertexOfFace = (e: ThreeEvent<MouseEvent>): number | null => {
    if (renderPoints) return e.index ?? null;
    const f = e.face; if (!f) return null;
    const p = e.point;
    const cand = [f.a, f.b, f.c];
    let best = cand[0], bd = Infinity;
    for (const c of cand) {
      const dx = (vertices[c][0] - centre[0]) - p.x, dy = (vertices[c][1] - centre[1]) - p.y, dz = (vertices[c][2] - centre[2]) - p.z;
      const d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = c; }
    }
    return best;
  };

  const handle = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); const idx = nearestVertexOfFace(e); if (idx != null) onPick(idx); };

  return renderPoints
    ? <points geometry={geom} onClick={handle}><pointsMaterial vertexColors size={pointSize} sizeAttenuation={false} /></points>
    : <mesh geometry={geom} onClick={handle}><meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.65} metalness={0.0} /></mesh>;
}

function Marker({ vertices, centre, node, color: c, size }: { vertices: number[][]; centre: [number, number, number]; node: number; color: string; size: number }) {
  const v = vertices[node]; if (!v) return null;
  return (
    <mesh position={[v[0] - centre[0], v[1] - centre[1], v[2] - centre[2]]}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshBasicMaterial color={c} />
    </mesh>
  );
}

export function FieldView3D(props: FieldView3DProps) {
  const { vertices, triangles, values, signed, range, pickedNode, argmaxNode, onPick,
    camera = [90, -70, 60], pointSize = 4.5, legendLabel, unit, readout, srSummary } = props;
  const renderPoints = !triangles || triangles.length === 0;
  const centre = useMemo<[number, number, number]>(() => {
    const c: [number, number, number] = [0, 0, 0];
    for (const v of vertices) { c[0] += v[0]; c[1] += v[1]; c[2] += v[2]; }
    const n = vertices.length || 1; return [c[0] / n, c[1] / n, c[2] / n];
  }, [vertices]);
  const bound = useMemo(() => {
    let r = 1; for (const v of vertices) { const d = Math.hypot(v[0] - centre[0], v[1] - centre[1], v[2] - centre[2]); if (d > r) r = d; } return r;
  }, [vertices, centre]);

  const grad = signed
    ? `linear-gradient(90deg, ${divCss(0)}, ${divCss(0.5)}, ${divCss(1)})`
    : `linear-gradient(90deg, ${seqCss(0)}, ${seqCss(0.5)}, ${seqCss(1)})`;
  const fmt = (x: number) => Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(2);

  // Keyboard pick: the WebGL canvas is aria-hidden, so the wrapper is focusable and Arrow/Home/End step the
  // picked node index and call onPick, giving keyboard-only users the same node selection as a mouse click.
  const nNodes = vertices.length;
  const stepPick = (delta: number) => {
    if (nNodes === 0) return;
    const cur = pickedNode == null ? -1 : pickedNode;
    const next = Math.min(nNodes - 1, Math.max(0, cur + delta));
    if (next !== pickedNode) onPick(next);
  };
  const onViewportKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': e.preventDefault(); stepPick(1); break;
      case 'ArrowLeft': case 'ArrowUp': e.preventDefault(); stepPick(-1); break;
      case 'Home': if (nNodes) { e.preventDefault(); onPick(0); } break;
      case 'End': if (nNodes) { e.preventDefault(); onPick(nNodes - 1); } break;
    }
  };

  return (
    // Both 3D viewports (heart mesh and lumen point cloud) render on a fixed neutral-dark data canvas: the
    // diverging colormap's midpoint is light grey, so a theme-following bg would hide it on a light page and
    // leave the two sibling views mismatched; the fixed background keeps every node visible and the mesh and
    // cloud viewports matched in both light and dark themes.
    <div className="canvas-wrap canvas-wrap--data" tabIndex={0} onKeyDown={onViewportKey} aria-label={legendLabel}>
      <Canvas camera={{ position: camera, fov: 42, up: [0, 0, 1], near: 0.1, far: bound * 20 }}
        onCreated={({ raycaster }) => { if (renderPoints) raycaster.params.Points.threshold = Math.max(0.6, bound * 0.02); }} aria-hidden="true">
        <ambientLight intensity={0.75} />
        <directionalLight position={[bound * 2, -bound * 2, bound * 3]} intensity={1.1} />
        <directionalLight position={[-bound * 2, bound, -bound]} intensity={0.35} />
        <Geometry vertices={vertices} triangles={triangles} values={values} signed={signed} range={range}
          renderPoints={renderPoints} pointSize={pointSize} onPick={onPick} centre={centre} />
        {pickedNode != null && <Marker vertices={vertices} centre={centre} node={pickedNode} color="#22d3ee" size={bound * 0.03} />}
        {argmaxNode != null && argmaxNode !== pickedNode && <Marker vertices={vertices} centre={centre} node={argmaxNode} color="#f59e0b" size={bound * 0.022} />}
        <OrbitControls target={[0, 0, 0]} enablePan={false} />
      </Canvas>
      <div className="legend">
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{legendLabel}{unit ? ` (${unit})` : ''}</div>
        <div className="bar" style={{ background: grad }} />
        <div className="legend-ticks"><span>{fmt(range.lo)}</span><span>{fmt((range.lo + range.hi) / 2)}</span><span>{fmt(range.hi)}</span></div>
      </div>
      {readout && <div className="readout">{readout}</div>}
      <p className="sr-only">{srSummary}</p>
    </div>
  );
}
