import { Equation } from '../components/Equation';
import { useLang, pick } from '../store';

export function DeltaGeometryContext() {
  const lang = useLang();
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="panel">
        <h3>{pick(lang, 'The problem: complex geometry', 'El problema: geometria compleja')}</h3>
        <p>{pick(lang,
          'Real cardiac chambers are curved surfaces where two regions can be close in 3D yet far apart along the tissue (a fold, an appendage). A PINN that reads the raw (x, y, z) coordinates cannot tell that two ambient-close points are electrically distant, so it leaks activation across the gap and the reconstruction collapses.',
          'Las camaras cardiacas reales son superficies curvas donde dos regiones pueden estar cerca en 3D pero lejos a lo largo del tejido (un pliegue, una orejuela). Una PINN que lee las coordenadas crudas (x, y, z) no puede saber que dos puntos cercanos en el ambiente estan electricamente distantes, asi que filtra activacion a traves del hueco y la reconstruccion colapsa.')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Delta-PINN: the eigenbasis input', 'Delta-PINN: la entrada por autobase')}</h3>
        <p>{pick(lang,
          'Delta-PINNs replace the coordinate input with the lowest eigenfunctions of the Laplace-Beltrami operator of the actual mesh: the natural, geometry-aware coordinates of the surface. Two geodesically distant points get distinct eigenfunction values even when their ambient coordinates nearly coincide.',
          'Las Delta-PINNs reemplazan la entrada de coordenadas por las autofunciones mas bajas del operador de Laplace-Beltrami de la malla real: las coordenadas naturales, conscientes de la geometria, de la superficie. Dos puntos geodesicamente distantes obtienen valores de autofuncion distintos aunque sus coordenadas ambientales casi coincidan.')}</p>
        <p className="small">{pick(lang, 'The Eikonal residual is enforced intrinsically on the surface:', 'El residuo Eikonal se impone intrinsecamente en la superficie:')}</p>
        <Equation tex={String.raw`\lVert \nabla_{\text{surface}} T \rVert \, c = 1`} />
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Result and honesty', 'Resultado y honestidad')}</h3>
        <p className="small">{pick(lang,
          'On a self-overlapping scroll surface (two sheets at nearly the same 3D point but far apart along the manifold), the vanilla (x, y, z) PINN and the 3D interpolation both collapse (rel-L2 ~0.48 and ~0.45), while the Delta-PINN reconstructs the field more than twice as accurately (rel-L2 ~0.20) under the same physics residual. Delta-PINN is not a universal accuracy win; it is the method that makes PINNs work where the ambient embedding is problematic. Replay-only: the input is the precomputed eigenbasis, not a browser-suppliable coordinate. Not clinically validated.',
          'En una superficie de rollo que se auto-superpone (dos capas en casi el mismo punto 3D pero lejos a lo largo de la variedad), la PINN vainilla (x, y, z) y la interpolacion 3D colapsan (rel-L2 ~0.48 y ~0.45), mientras la Delta-PINN reconstruye el campo mas del doble de preciso (rel-L2 ~0.20) bajo el mismo residuo fisico. Delta-PINN no es una victoria universal de precision; es el metodo que hace funcionar las PINNs donde el embedding ambiental es problematico. Solo replay: la entrada es la autobase precomputada, no una coordenada suministrable por el navegador. No validado clinicamente.')}</p>
      </div>
    </div>
  );
}
