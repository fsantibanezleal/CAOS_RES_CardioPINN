# Frameworks

One card per real engine or library the CardioPINN pipeline actually uses. Each engine that appears here is
imported and executed somewhere in `data-pipeline/cardiopinnlab/` (offline bake) or shipped in the static
`frontend/` bundle (browser render), and is pinned in the matching `requirements-*.txt` or `package.json`. No
hand-rolled toy substitutes for a real engine, and nothing is listed here that the code does not import.

## The architecture the cards describe: bake-and-read, real-data-only

Every result is computed offline on a local machine and committed as a JSON trace; the static web app reads
those traces. No model runs in the browser. There is no ONNX / onnxruntime-web / Pyodide lane. The two physics
cases split cleanly across the stack:

- **ECGi (Case A, volume conduction).** Pure NumPy / SciPy, CPU. The forward operator, the regularized
  least-squares solves, the graph-Laplacian prior, the deep-ensemble uncertainty, and the boundary-element
  transfer matrix are all dense/sparse linear algebra. No GPU and no PyTorch are needed.
- **4D-flow pressure (Case B, incompressible Navier-Stokes).** PyTorch (GPU) for the physics-informed velocity
  networks, plus SciPy for the sparse pressure-Poisson direct solve and NumPy throughout. pydicom decodes the
  real Philips 4D-flow MRI series.
- **Browser render (both cases).** three.js via react-three-fiber draws the committed geometry: the ECGi
  heart-cage triangle mesh and the 4D-flow aortic point cloud, colored by perceptually-uniform colormaps.
  uPlot draws the linked 2D charts beside those views (the coupled per-point time series and the Bernoulli
  gradient curves) through one theme-aware wrapper, reading the same committed traces.

## Cards

- [01, NumPy / SciPy](frameworks/01_numpy-scipy.md) : the ECGi engine and the sparse pressure-Poisson solve
  (CPU linear algebra, no GPU).
- [02, PyTorch](frameworks/02_pytorch.md) : the 4D-flow divergence-free velocity PINNs and the shared
  Adam then L-BFGS training loop; why the momentum-residual PINN is kept as a documented failed baseline.
- [03, pydicom](frameworks/03_pydicom.md) : decoding the real Philips 4D-flow DICOM velocity series, the
  venc rescale, patient-frame voxel geometry, and phase-wrap anti-aliasing.
- [04, three.js / react-three-fiber](frameworks/04_three-js.md) : the browser render of the heart-cage mesh
  and the aortic point cloud, the magma and coolwarm colormaps, and the no-compute-bomb discipline.
- [05, uPlot](frameworks/05_uplot.md) : the theme-aware wrapper for every linked 2D chart, the synced cursor
  and pinned markers coupling the charts to the 3D scrubber, and the explicit data-extent ranging.

## Runtime versus reference

The persisted research dossier (`wip/cardiopinn/frameworks-and-tooling.md` in the management repo) surveyed a
wider stack: DeepXDE, NVIDIA PhysicsNeMo, openCARP, fim-python, robust-laplacian, and an ONNX to
onnxruntime-web export lane mirrored from PINN-Lab. The shipped real-data product uses none of those: it needs
only the four engines above. Those tools stay as documented references (SOTA anchors), not runtime
dependencies. Keeping the cards honest to what the code imports is the point of this folder.
