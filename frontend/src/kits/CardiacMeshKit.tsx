import { OrbitControls } from '@react-three/drei';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Trace } from '../lib/contract.types';
import { turbo, turboCss, fieldRange } from './colormap';

interface Props {
  trace: Trace;
  field: string;
  timeCursor: number;      // 0..1: reveal the activation wavefront up to this fraction of the time range
  showSensors: boolean;
  liveValues?: Float32Array | null;  // optional onnxruntime-web field overriding the baked one
}

function centroid(verts: number[][]): [number, number, number] {
  const c = [0, 0, 0];
  for (const v of verts) { c[0] += v[0]; c[1] += v[1]; c[2] += v[2]; }
  const n = verts.length || 1;
  return [c[0] / n, c[1] / n, c[2] / n];
}

function MeshView({ trace, field, timeCursor, showSensors, liveValues, onHover }: Props & { onHover: (v: number | null) => void }) {
  const cen = useMemo(() => centroid(trace.mesh.vertices), [trace]);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(trace.mesh.vertices.length * 3);
    trace.mesh.vertices.forEach((v, i) => {
      pos[i * 3] = v[0] - cen[0];
      pos[i * 3 + 1] = v[1] - cen[1];
      pos[i * 3 + 2] = v[2] - cen[2];
    });
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const idx = new Uint32Array(trace.mesh.triangles.length * 3);
    trace.mesh.triangles.forEach((t, i) => { idx[i * 3] = t[0]; idx[i * 3 + 1] = t[1]; idx[i * 3 + 2] = t[2]; });
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(trace.mesh.vertices.length * 3), 3));
    g.computeVertexNormals();
    return g;
  }, [trace, cen]);

  const values = useMemo(() => {
    if (liveValues && liveValues.length === trace.mesh.vertices.length) return Array.from(liveValues);
    return trace.fields[field] || trace.fields[Object.keys(trace.fields)[0]];
  }, [trace, field, liveValues]);

  const [lo, hi] = useMemo(() => fieldRange(values), [values]);
  const isTime = field.startsWith('T_') || !!liveValues;

  useEffect(() => {
    const color = geom.getAttribute('color') as THREE.BufferAttribute;
    const threshold = lo + timeCursor * (hi - lo);
    for (let i = 0; i < values.length; i++) {
      const norm = (values[i] - lo) / (hi - lo);
      let [r, g, b] = turbo(norm);
      if (isTime && values[i] > threshold) { r *= 0.12; g *= 0.12; b *= 0.14; }  // wavefront not yet arrived
      color.setXYZ(i, r, g, b);
    }
    color.needsUpdate = true;
  }, [geom, values, lo, hi, timeCursor, isTime]);

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    if (e.faceIndex == null) return;
    const tri = trace.mesh.triangles[e.faceIndex];
    if (tri) onHover(values[tri[0]]);
  };

  return (
    <group>
      <mesh geometry={geom} onPointerMove={handleMove} onPointerOut={() => onHover(null)}>
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>
      {showSensors && trace.sensors.map((s, i) => (
        <mesh key={i} position={[s[0] - cen[0], s[1] - cen[1], (s[2] ?? 0) - cen[2] + 0.6]}>
          <sphereGeometry args={[0.5, 12, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

export function CardiacMeshKit(props: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const values = props.liveValues && props.liveValues.length === props.trace.mesh.vertices.length
    ? Array.from(props.liveValues)
    : (props.trace.fields[props.field] || []);
  const [lo, hi] = fieldRange(values);
  const units = props.trace.field_units[props.field] || '';
  const extent = useRef<[number, number, number]>([28, -34, 40]);

  return (
    <div className="canvas-wrap">
      <Canvas camera={{ position: extent.current, fov: 42, up: [0, 0, 1] }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[20, -20, 40]} intensity={0.5} />
        <MeshView {...props} onHover={setHover} />
        <OrbitControls enablePan target={[0, 0, 0]} />
      </Canvas>
      <div className="legend">
        <div>{props.liveValues ? 'live PINN' : props.field}{units ? ` (${units})` : ''}</div>
        <div className="bar" style={{ background: `linear-gradient(90deg, ${turboCss(0)}, ${turboCss(0.25)}, ${turboCss(0.5)}, ${turboCss(0.75)}, ${turboCss(1)})` }} />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="mono">{lo.toFixed(1)}</span><span className="mono">{hi.toFixed(1)}</span>
        </div>
      </div>
      <div className="readout">{hover == null ? 'hover the surface' : `${hover.toFixed(2)} ${units}`}</div>
    </div>
  );
}
