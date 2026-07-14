# three.js / react-three-fiber: the browser render

## What it is

three.js is the WebGL 3D library for the browser; react-three-fiber (r3f) is its React renderer, letting a
three.js scene be written as React components, with `@react-three/drei` for camera and control helpers.
CardioPINN ships `three@^0.171`, `@react-three/fiber@^9`, and `@react-three/drei@^10` in the frontend bundle.
Their entire job is to draw the committed geometry of the two cases and color it by the recovered fields. They
run purely client-side on data the static app fetched as JSON; no model runs in the browser, and there is no
onnxruntime / Pyodide compute lane. (An `onnxruntime-web` dependency remains listed in `package.json` from an
earlier design and is not used; the architecture is bake-and-read.)

## How CardioPINN uses it

### The ECGi heart-cage mesh (`pages/RealEcgi.tsx`)

The committed ECGi trace carries the real heart-cage triangulation (`mesh.vertices`, `mesh.triangles`) and the
recovered/measured potential, absolute error, and per-node uncertainty over the beat. r3f renders it as a
`<mesh>` inside a `<Canvas>`: a `THREE.BufferGeometry` is built from the centred vertex positions and the
triangle index buffer, and a `meshStandardMaterial` with `vertexColors` and `side={THREE.DoubleSide}` shades
each vertex by the selected field. The camera is set with `up: [0, 0, 1]` so the anatomical axis is vertical,
and the user can orbit the heart, scrub the beat, and toggle which field colors the surface. This shows the
reconstruction ON the actual recorded heart geometry rather than a flattened proxy.

### The 4D-flow aortic point cloud (`pages/Flow4d.tsx`)

The committed 4D-flow trace is a decimated lumen point cloud (up to 9000 points, `points_mm`) with per-point
pressure and per-frame speed. Because it is a set of scattered voxel centres, not a surface, it is rendered as
a `<points>` primitive with a `pointsMaterial` (`vertexColors`, `sizeAttenuation`), each point colored by
pressure or by the pulsatile speed at the current frame. This is the honest geometry: the real segmented lumen
voxels, not a manufactured mesh.

### The perceptually-uniform colormaps (`kits/colormap.ts`)

Color is a data channel, so the maps are perceptually uniform (interactive-visualization-rubric: no
jet/rainbow/turbo on an intensity axis). Two are implemented as piecewise-linear interpolations over published
control points:

- **magma** (`seq`), a sequential map, for magnitude / positive fields: absolute error, uncertainty, pressure
  magnitude, speed.
- **coolwarm** (`div`, Kenneth Moreland's diverging map), for SIGNED fields centred at zero: the recovered and
  measured heart-surface potentials, which swing positive and negative around baseline.

`fieldRange` computes the data extent so the color scale is honest to the actual values, and the accompanying
figure caption states the numeric range, the metrics, and the largest-error node, so the render is auditable
rather than decorative.

### The no-autoplay, no-compute-bomb discipline

Both animated views (the ECGi beat, the 4D-flow pulsatile cycle) obey the standing rule that a web page must
never burn CPU unattended. The frame loop is a `requestAnimationFrame` step that advances the phase and then
re-schedules ONLY while it is still within the cycle and the tab is visible:

```
if (p < 1 && document.visibilityState === 'visible') raf.current = requestAnimationFrame(step);
```

So the animation runs once through the beat and stops, does not loop forever, and halts immediately when the
tab is hidden. There is no `setInterval`, no always-on render loop, and no live inference; the geometry and
fields are static committed data that r3f simply draws and re-colors as the user scrubs or plays once.

## Honest limits and substitutions

- The ECGi cage is rendered directly as the recorded triangulation with per-vertex flat interpolation; there is
  no smoothing shader or isochrone extraction beyond the vertex-color field. It is faithful to the committed
  mesh.
- The 4D-flow lumen is shown as a decimated point cloud (up to 9000 of the ~48000 lumen voxels) for browser
  performance; the full voxel set lives in the offline pipeline, and the metrics in the trace are computed on
  the full set, not the decimated cloud.
- The colormaps are anchor-point interpolations of magma and coolwarm, not the full 256-entry lookup tables; at
  the resolution of a shaded mesh or point cloud the difference is not visible, and the perceptual-uniformity
  property is preserved by using the published anchors.
- three.js here is a pure renderer of baked data. It does no physics, no inference, and no data transformation
  beyond centring, indexing, and colormapping; all quantitative results come from the offline NumPy/SciPy and
  PyTorch pipeline (cards 01 and 02).

## References

- Aras K, Good W, Tate J, et al. (2015). Experimental Data and Geometric Analysis Repository (EDGAR).
  Journal of Electrocardiology 48(6):975-981. DOI 10.1016/j.jelectrocard.2015.08.008.
- Moreland K (2009). Diverging color maps for scientific visualization. In: Advances in Visual Computing (ISVC),
  Lecture Notes in Computer Science 5876:92-103. DOI 10.1007/978-3-642-10520-3_9.
