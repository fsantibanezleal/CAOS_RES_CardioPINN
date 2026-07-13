import { Equation } from '../components/Equation';
import { Refs } from '../components/Refs';
import { useLang, pick } from '../store';

export function Methodology() {
  const lang = useLang();
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="panel">
        <h1 style={{ marginTop: 0 }}>{pick(lang, 'Methodology', 'Metodologia')}</h1>
        <p>{pick(lang,
          'The ECGi inverse recovers the heart-surface potential vector from the body-surface potential vector. The two are linked by a linear forward operator A set by the torso geometry and conductivities: the body-surface potentials are A times the heart-surface potentials. Recovering the heart-surface potentials by naively inverting A is unstable, because A is severely ill-conditioned, so small measurement noise is amplified into large error.',
          'El inverso de ECGi recupera el vector de potencial de superficie cardiaca desde el vector de potencial de superficie corporal. Ambos estan ligados por un operador directo lineal A fijado por la geometria del torso y las conductividades: los potenciales de superficie corporal son A por los potenciales de superficie cardiaca. Invertir A ingenuamente es inestable porque A esta severamente mal condicionado.')}</p>
        <Equation tex={String.raw`\phi_{\text{body}} = A\, \phi_{\text{heart}}, \qquad A \in \mathbb{R}^{192 \times 256}.`} />
      </div>
      <div className="panel">
        <h2>{pick(lang, 'The forward operator on real geometry', 'El operador directo sobre geometria real')}</h2>
        <p className="small">{pick(lang,
          'We build A from the REAL torso-electrode and heart-cage node positions using a single-layer (point-source) Green\'s function; a full boundary-element operator with the closed torso mesh and tissue conductivities would be more accurate and is the natural next improvement.',
          'Construimos A a partir de las posiciones reales de los electrodos del torso y los nodos de la jaula cardiaca usando una funcion de Green de capa simple; un operador de elementos de contorno completo seria mas preciso y es la siguiente mejora natural.')}</p>
        <Equation tex={String.raw`A_{ij} \propto \frac{1}{4\pi\,\lVert x^{\text{body}}_i - x^{\text{heart}}_j \rVert}.`} />
      </div>
      <div className="panel">
        <h2>{pick(lang, 'Regularized inverse + calibrated uncertainty', 'Inverso regularizado + incertidumbre calibrada')}</h2>
        <p className="small">{pick(lang,
          'We recover the heart-surface potentials by minimizing the misfit to the REAL measured body-surface data plus a spatial prior on the heart surface (a graph Laplacian of the cage mesh), and compare a classical zeroth-order Tikhonov baseline (at its oracle-best regularization) against this graph-regularized reconstruction. A deep ensemble over measurement-noise draws gives a per-node uncertainty, recalibrated so its two-sigma band matches the real error.',
          'Recuperamos los potenciales de superficie cardiaca minimizando el desajuste a los datos reales medidos de superficie corporal mas un prior espacial en la superficie cardiaca (un Laplaciano de grafo de la malla de la jaula), y comparamos un Tikhonov clasico de orden cero (en su mejor regularizacion) contra esta reconstruccion regularizada por grafo. Un ensemble profundo da una incertidumbre por nodo, recalibrada.')}</p>
        <Equation tex={String.raw`\hat{\phi}_{\text{heart}} = \arg\min_{\phi}\; \lVert A\phi - \phi_{\text{body}}^{\text{measured}}\rVert^2 + \lambda^2 \lVert L\phi \rVert^2.`} />
      </div>
      <div className="panel">
        <h2>{pick(lang, 'Validation', 'Validacion')}</h2>
        <p className="small">{pick(lang,
          'Because the torso tank recorded the true heart-surface potentials with a 256-electrode cage, we validate the recovered potentials against that REAL measurement, using the standard ECGi metrics: the relative error (RE) and the spatial correlation coefficient (CC), per time frame and overall.',
          'Como el tanque de torso registro los potenciales verdaderos de superficie cardiaca con una jaula de 256 electrodos, validamos los potenciales recuperados contra esa medicion REAL, usando las metricas estandar de ECGi: el error relativo (RE) y el coeficiente de correlacion espacial (CC).')}</p>
      </div>
      <Refs items={[
        { cite: 'Aras K, Good W, Tate J, et al. (2015). Experimental Data and Geometric Analysis Repository (EDGAR). J. Electrocardiol. 48(6):975', doi_or_arxiv: '10.1016/j.jelectrocard.2015.08.008', note: 'the real torso-tank data' },
        { cite: 'Cluitmans M, et al. (2018). Validation and opportunities of electrocardiographic imaging. Front. Physiol. 9:1305', doi_or_arxiv: '10.3389/fphys.2018.01305', note: 'ECGi validation and metrics' },
      ]} />
    </div>
  );
}
