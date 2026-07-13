import { Equation } from '../components/Equation';
import { useLang, pick } from '../store';

// Deep bilingual context for the activation-mapping vertical (transcribed from docs/cases + the research
// dossier). Problem, governing equation (KaTeX), method, scope + honesty.
export function ActEikonalContext() {
  const lang = useLang();
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="panel">
        <h3>{pick(lang, 'The problem', 'El problema')}</h3>
        <p>{pick(lang,
          'A mapping catheter records the local activation time (when the depolarization wavefront arrives) at a sparse, noisy set of endocardial sites. We want to reconstruct the full activation map T(x) and the conduction velocity V(x), whose slow regions mark arrhythmia substrate. Plain interpolation imposes only smoothness and recovers no conduction velocity.',
          'Un cateter de mapeo registra el tiempo de activacion local (cuando llega el frente de despolarizacion) en un conjunto disperso y ruidoso de sitios endocardicos. Queremos reconstruir el mapa de activacion completo T(x) y la velocidad de conduccion V(x), cuyas regiones lentas marcan el sustrato arritmogenico. La interpolacion simple solo impone suavidad y no recupera velocidad de conduccion.')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Governing physics: the Eikonal equation', 'Fisica gobernante: la ecuacion Eikonal')}</h3>
        <Equation tex={String.raw`\lVert \nabla T(x) \rVert \, V(x) = 1, \qquad T(x_{\text{stim}}) = 0`} />
        <p className="small">{pick(lang,
          'T is the activation time, V is the local conduction velocity, and the slowness 1/V equals the magnitude of the activation-time gradient. This is the front-arrival limit of the monodomain reaction-diffusion model, which is exactly what a local-activation-time map measures.',
          'T es el tiempo de activacion, V la velocidad de conduccion local, y la lentitud 1/V es la magnitud del gradiente del tiempo de activacion. Es el limite de llegada de frente del modelo de reaccion-difusion monodominio, que es justo lo que mide un mapa de tiempos de activacion local.')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'The physics-informed loss', 'La perdida informada por fisica')}</h3>
        <Equation tex={String.raw`\mathcal{L} = w_d \frac{1}{N_s}\sum_i (T_\theta(x_i)-T_i)^2 + w_r \frac{1}{N_c}\sum_j (\lVert \nabla T_\theta(x_j)\rVert V_\phi(x_j)-1)^2 + w_s T_\theta(x_{\text{stim}})^2 + w_{tv}\,\mathrm{TV}(V_\phi)`} />
        <p className="small">{pick(lang,
          'Two networks represent T and V. A total-variation prior on V lets it be piecewise-smooth (a sharp drop at a slow-region border), which an L2 prior cannot. A fixed-speed curriculum warm start resolves the T/V degeneracy: for any smooth T one could set V = 1/||grad T||, so V is pinned down first.',
          'Dos redes representan T y V. Un prior de variacion total en V permite que sea suave por partes (una caida brusca en el borde de una region lenta), lo que un prior L2 no puede. Un arranque en curriculum a velocidad fija resuelve la degeneracion T/V: para cualquier T suave se podria fijar V = 1/||grad T||, asi que V se ancla primero.')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Scope and honesty', 'Alcance y honestidad')}</h3>
        <p className="small">{pick(lang,
          'The geometry here is a synthetic tissue patch with a realistic conduction map; the physics (heterogeneous Eikonal) and the fast-marching ground truth are exact. Real curved cardiac surfaces and anisotropic fiber tensors enter later verticals. Not clinically validated: the value is methodological, physics-constrained reconstruction of both the activation map and the conduction velocity from sparse noisy measurements.',
          'La geometria aqui es un parche de tejido sintetico con un mapa de conduccion realista; la fisica (Eikonal heterogeneo) y la verdad de referencia por fast-marching son exactas. Las superficies cardiacas curvas reales y los tensores de fibra anisotropos entran en verticales posteriores. No validado clinicamente: el valor es metodologico, reconstruccion informada por fisica del mapa de activacion y de la velocidad de conduccion a partir de mediciones dispersas y ruidosas.')}</p>
      </div>
    </div>
  );
}
