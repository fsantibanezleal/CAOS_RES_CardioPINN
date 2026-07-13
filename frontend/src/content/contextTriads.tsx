import { useLang, pick } from '../store';

// For every vertical, three context layers so a viewer understands WHAT is shown and WHY it matters:
// medical (the clinical picture), biological (the underlying cardiac physiology), physical (the physics
// being modeled). Established physiology/physics; bilingual EN/ES. Rendered by <ContextTriad caseId=...>.
type Ctx = { en: string; es: string };
type Triad = { medical: Ctx; biological: Ctx; physical: Ctx };

const TRIADS: Record<string, Triad> = {
  'act-eikonal-mapping': {
    medical: {
      en: 'In an electrophysiology study for arrhythmia, a catheter records when each site of the chamber activates. The activation map tells the clinician whether the rhythm is a focal source or a reentrant circuit, and regions of slowed conduction mark the arrhythmogenic substrate that is targeted by ablation.',
      es: 'En un estudio electrofisiologico por arritmia, un cateter registra cuando se activa cada sitio de la camara. El mapa de activacion le dice al clinico si el ritmo es una fuente focal o un circuito reentrante, y las regiones de conduccion lenta marcan el sustrato arritmogenico que se ataca con la ablacion.',
    },
    biological: {
      en: 'The heartbeat is an electrical wave. Each cardiomyocyte depolarizes (a fast sodium influx) and passes the excitation to its neighbours through gap junctions, so a wavefront sweeps across the tissue. The local activation time is the moment that wavefront arrives; the conduction velocity depends on membrane excitability and cell-to-cell coupling.',
      es: 'El latido es una onda electrica. Cada cardiomiocito se despolariza (una entrada rapida de sodio) y pasa la excitacion a sus vecinos por las uniones gap, asi que un frente de onda recorre el tejido. El tiempo de activacion local es el momento en que llega ese frente; la velocidad de conduccion depende de la excitabilidad de la membrana y del acoplamiento celula a celula.',
    },
    physical: {
      en: 'In the front-arrival limit of the monodomain reaction-diffusion model, the activation time obeys the Eikonal equation: the magnitude of its spatial gradient equals the local slowness (one over the conduction velocity). The network solves this inverse problem from sparse measured arrival times.',
      es: 'En el limite de llegada de frente del modelo de reaccion-difusion monodominio, el tiempo de activacion obedece la ecuacion Eikonal: la magnitud de su gradiente espacial es igual a la lentitud local (uno sobre la velocidad de conduccion). La red resuelve este problema inverso desde tiempos de llegada medidos y dispersos.',
    },
  },
  'delta-pinn-geometry': {
    medical: {
      en: 'Cardiac chambers are geometrically complex, especially the atria with their appendages, pulmonary-vein junctions and thin folded walls. Mapping and modelling must respect that true surface; otherwise activation appears to jump between tissue that is close in space but far along the wall, corrupting the clinical picture.',
      es: 'Las camaras cardiacas son geometricamente complejas, sobre todo las auriculas con sus orejuelas, las uniones de las venas pulmonares y las paredes delgadas y plegadas. El mapeo y el modelado deben respetar esa superficie real; si no, la activacion parece saltar entre tejido cercano en el espacio pero lejano a lo largo de la pared, corrompiendo el cuadro clinico.',
    },
    biological: {
      en: 'The atrial wall is a thin, folded muscular sheet. Two points can be a few millimetres apart in space yet electrically far apart along the tissue (for example across a fold or the coronary sinus). Electrical propagation follows the tissue surface (geodesic distance), not straight-line 3D distance.',
      es: 'La pared auricular es una lamina muscular delgada y plegada. Dos puntos pueden estar a pocos milimetros en el espacio pero electricamente lejos a lo largo del tejido (por ejemplo a traves de un pliegue o del seno coronario). La propagacion electrica sigue la superficie del tejido (distancia geodesica), no la distancia 3D en linea recta.',
    },
    physical: {
      en: 'A network fed raw (x, y, z) cannot separate points that are close in space but far along the surface. Delta-PINNs replace the coordinate input with the Laplace-Beltrami eigenfunctions of the actual mesh, the natural harmonics of the surface, so the network respects the true geometry and the Eikonal equation is enforced intrinsically on the manifold.',
      es: 'Una red alimentada con (x, y, z) crudo no puede separar puntos cercanos en el espacio pero lejanos a lo largo de la superficie. Las Delta-PINN reemplazan la entrada de coordenadas por las autofunciones de Laplace-Beltrami de la malla real, los armonicos naturales de la superficie, para que la red respete la geometria real y la ecuacion Eikonal se imponga intrinsecamente en la variedad.',
    },
  },
  'fiber-conductivity-inverse': {
    medical: {
      en: 'Fibre orientation and conduction anisotropy shape how arrhythmias form and how ablation lesions behave. Patient-specific fibres improve simulation-guided therapy, but they cannot be measured directly in a living patient, so they must be inferred from the activation the clinician does measure.',
      es: 'La orientacion de las fibras y la anisotropia de conduccion determinan como se forman las arritmias y como se comportan las lesiones de ablacion. Las fibras especificas del paciente mejoran la terapia guiada por simulacion, pero no se pueden medir directamente en un paciente vivo, asi que deben inferirse de la activacion que el clinico si mide.',
    },
    biological: {
      en: 'Myocardium is built of aligned muscle fibres. Electrical conduction is two to three times faster along the fibre than across it, because the gap junctions that couple cells concentrate at the fibre ends. The fibre orientation also rotates smoothly through the wall thickness.',
      es: 'El miocardio esta hecho de fibras musculares alineadas. La conduccion electrica es dos a tres veces mas rapida a lo largo de la fibra que a traves de ella, porque las uniones gap que acoplan las celulas se concentran en los extremos de la fibra. La orientacion de las fibras tambien rota suavemente a traves del grosor de la pared.',
    },
    physical: {
      en: 'Anisotropic conduction is captured by a conductivity tensor in the Eikonal equation, built from the local fibre angle and the along and across conduction velocities. A single activation map underdetermines the fibres because the wavefront only probes some directions; several maps from different stimulus sites jointly constrain the shared fibre field.',
      es: 'La conduccion anisotropa se captura con un tensor de conductividad en la ecuacion Eikonal, construido a partir del angulo local de la fibra y las velocidades de conduccion a lo largo y a traves. Un solo mapa de activacion subdetermina las fibras porque el frente solo prueba algunas direcciones; varios mapas de distintos sitios de estimulo restringen en conjunto el campo de fibra compartido.',
    },
  },
  'joint-cv-scar-uq': {
    medical: {
      en: 'Scar and slow-conducting fibrosis are the substrate for reentrant ventricular tachycardia, a life-threatening arrhythmia. Localizing that substrate, and knowing where the map can be trusted, directs where the clinician ablates. Low-voltage, slow-conduction zones are the ablation targets.',
      es: 'La cicatriz y la fibrosis de conduccion lenta son el sustrato de la taquicardia ventricular por reentrada, una arritmia que amenaza la vida. Localizar ese sustrato, y saber donde se puede confiar en el mapa, dirige donde ablaciona el clinico. Las zonas de bajo voltaje y conduccion lenta son los objetivos de ablacion.',
    },
    biological: {
      en: 'After a myocardial infarction or in cardiomyopathy, dead myocytes are replaced by collagen (fibrosis). Surviving muscle strands weave through the scar and conduct slowly, forming the circuits that sustain arrhythmia. Conduction velocity drops sharply where the tissue is diseased.',
      es: 'Tras un infarto de miocardio o en una miocardiopatia, los miocitos muertos se reemplazan por colageno (fibrosis). Hebras de musculo sobreviviente se entrelazan por la cicatriz y conducen lento, formando los circuitos que sostienen la arritmia. La velocidad de conduccion cae bruscamente donde el tejido esta enfermo.',
    },
    physical: {
      en: 'The Eikonal PINN recovers the activation time and the conduction-velocity field jointly; the substrate appears as a depression in the recovered velocity. Because the inverse is ill-posed where data is sparse, a deep ensemble with a variance recalibration gives a per-node uncertainty, telling you where the recovered map is reliable.',
      es: 'La PINN Eikonal recupera el tiempo de activacion y el campo de velocidad de conduccion en conjunto; el sustrato aparece como una depresion en la velocidad recuperada. Como el inverso esta mal planteado donde los datos son escasos, un ensemble profundo con recalibracion de varianza da una incertidumbre por nodo, indicando donde el mapa recuperado es confiable.',
    },
  },
  'active-sensing': {
    medical: {
      en: 'A mapping procedure is long and points are taken one at a time, under X-ray and anaesthesia. Guiding the catheter to the most informative next site shortens the procedure and reduces radiation and anaesthetic exposure for the patient.',
      es: 'Un procedimiento de mapeo es largo y los puntos se toman de a uno, bajo rayos X y anestesia. Guiar el cateter al siguiente sitio mas informativo acorta el procedimiento y reduce la exposicion a radiacion y anestesia para el paciente.',
    },
    biological: {
      en: 'The heart-surface electrical field is smooth over healthy tissue but changes sharply at the borders of scar and slow-conduction zones. Those borders carry the most diagnostic information, and are exactly where an extra measurement most improves the reconstruction.',
      es: 'El campo electrico de la superficie cardiaca es suave sobre el tejido sano pero cambia bruscamente en los bordes de la cicatriz y las zonas de conduccion lenta. Esos bordes llevan la mayor informacion diagnostica, y son justo donde una medicion extra mas mejora la reconstruccion.',
    },
    physical: {
      en: 'The reconstruction posterior variance is highest where data is sparse or the field is complex. Greedily sampling the maximum-variance site (uncertainty sampling, a form of active learning) drives the error down fastest per acquired point, so the target accuracy is reached with fewer electrodes.',
      es: 'La varianza posterior de la reconstruccion es mayor donde los datos son escasos o el campo es complejo. Muestrear de forma voraz el sitio de maxima varianza (muestreo por incertidumbre, una forma de aprendizaje activo) baja el error mas rapido por punto adquirido, asi que la precision objetivo se alcanza con menos electrodos.',
    },
  },
  'af-phase-rotor': {
    medical: {
      en: 'In atrial fibrillation the atria quiver instead of contracting, raising stroke risk. Rotors (spiral-wave cores) may sustain the arrhythmia and could be ablation targets, but locating them from sparse noisy electrodes is uncertain, so a probability map is more honest than a single point.',
      es: 'En la fibrilacion auricular las auriculas tiemblan en vez de contraerse, elevando el riesgo de accidente cerebrovascular. Los rotores (nucleos de ondas espirales) podrian sostener la arritmia y ser objetivos de ablacion, pero ubicarlos desde electrodos dispersos y ruidosos es incierto, asi que un mapa de probabilidad es mas honesto que un solo punto.',
    },
    biological: {
      en: 'Fibrillation is disorganized electrical activity: wavefronts break up in the atrial tissue (an excitable medium) into self-sustaining spirals. At the core of each spiral, the phase singularity, all activation phases meet and the tissue never fully rests or fully excites.',
      es: 'La fibrilacion es actividad electrica desorganizada: los frentes de onda se rompen en el tejido auricular (un medio excitable) en espirales autosostenidas. En el nucleo de cada espiral, la singularidad de fase, se encuentran todas las fases de activacion y el tejido nunca reposa ni se excita del todo.',
    },
    physical: {
      en: 'The excitation is a reaction-diffusion spiral (Aliev-Panfilov). The activation phase winds by a full turn around the core (a topological charge). From sparse electrodes the complex phasor is interpolated to respect the cyclic phase, and an ensemble over noise draws yields a probabilistic core-location heatmap with a confidence radius.',
      es: 'La excitacion es una espiral de reaccion-difusion (Aliev-Panfilov). La fase de activacion gira una vuelta completa alrededor del nucleo (una carga topologica). Desde electrodos dispersos se interpola el fasor complejo para respetar la fase ciclica, y un ensemble sobre realizaciones de ruido da un mapa de calor probabilistico de la ubicacion del nucleo con un radio de confianza.',
    },
  },
  'flow4d-ns-pressure': {
    medical: {
      en: 'Pressure gradients across valves and vessels (aortic stenosis, coarctation) drive clinical decisions, but measuring pressure means passing an invasive catheter. 4D-flow MRI gives the blood velocity non-invasively, and the pressure can be recovered from it, avoiding the catheter.',
      es: 'Los gradientes de presion a traves de valvulas y vasos (estenosis aortica, coartacion) guian decisiones clinicas, pero medir la presion implica pasar un cateter invasivo. La RM de 4D-flow da la velocidad de la sangre de forma no invasiva, y la presion se puede recuperar de ella, evitando el cateter.',
    },
    biological: {
      en: 'Blood is not a simple fluid: it is a suspension of red cells, and its viscosity rises with the haematocrit (the red-cell fraction). That rheology changes the flow and the pressure field. Flow in the great vessels is pulsatile and often swirling rather than smooth.',
      es: 'La sangre no es un fluido simple: es una suspension de globulos rojos, y su viscosidad aumenta con el hematocrito (la fraccion de globulos rojos). Esa reologia cambia el flujo y el campo de presion. El flujo en los grandes vasos es pulsatil y a menudo en remolino en vez de suave.',
    },
    physical: {
      en: 'Incompressible Navier-Stokes couples velocity and pressure through conservation of mass and momentum. A network fits the measured (noisy) velocity and enforces those equations, recovering the pressure that was never measured; the viscosity term is haematocrit dependent.',
      es: 'Navier-Stokes incompresible acopla velocidad y presion por conservacion de masa y momento. Una red ajusta la velocidad medida (con ruido) e impone esas ecuaciones, recuperando la presion que nunca se midio; el termino de viscosidad depende del hematocrito.',
    },
  },
  'pa-pressure-1dns': {
    medical: {
      en: 'Pulmonary hypertension is diagnosed by right-heart catheterization, an invasive procedure, when the mean pulmonary-artery pressure exceeds 20 mmHg. A non-invasive estimate from imaging plus the measurable wedge pressure would screen and monitor patients without repeated catheterization.',
      es: 'La hipertension pulmonar se diagnostica por cateterismo cardiaco derecho, un procedimiento invasivo, cuando la presion media de la arteria pulmonar supera los 20 mmHg. Una estimacion no invasiva desde imagenes mas la presion de enclavamiento medible permitiria tamizar y monitorear pacientes sin cateterismo repetido.',
    },
    biological: {
      en: 'The pulmonary arteries carry blood from the right ventricle to the lungs at low pressure. In pulmonary hypertension the vessels remodel and stiffen and the vascular resistance rises, so the right ventricle must generate a higher pressure. The flow varies pulsatilely over the cardiac cycle.',
      es: 'Las arterias pulmonares llevan la sangre del ventriculo derecho a los pulmones a baja presion. En la hipertension pulmonar los vasos se remodelan y endurecen y la resistencia vascular sube, asi que el ventriculo derecho debe generar mayor presion. El flujo varia de forma pulsatil a lo largo del ciclo cardiaco.',
    },
    physical: {
      en: 'A one-dimensional reduced-order blood-flow model relates the pressure gradient along the vessel to the velocity (fluid inertia plus a resistance term). Integrating from the clinically measurable distal wedge pressure gives the pressure along the artery and hence the mean pulmonary-artery pressure.',
      es: 'Un modelo unidimensional de flujo sanguineo de orden reducido relaciona el gradiente de presion a lo largo del vaso con la velocidad (inercia del fluido mas un termino de resistencia). Integrando desde la presion de enclavamiento distal, medible clinicamente, se obtiene la presion a lo largo de la arteria y por tanto la presion media de la arteria pulmonar.',
    },
  },
  'inverse-ecgi': {
    medical: {
      en: 'ECG imaging reconstructs the heart-surface electrical activity from a vest of body-surface electrodes, non-invasively, to guide diagnosis and plan ablation. The reconstruction is unstable, so knowing where on the heart surface it can be trusted is as important as the map itself.',
      es: 'La imagen de ECG reconstruye la actividad electrica de la superficie cardiaca desde un chaleco de electrodos de superficie corporal, de forma no invasiva, para guiar el diagnostico y planificar la ablacion. La reconstruccion es inestable, asi que saber donde en la superficie cardiaca se puede confiar es tan importante como el mapa mismo.',
    },
    biological: {
      en: 'The heart is an electrical source inside the torso, which acts as a passive volume conductor. The heart-surface potentials spread through the body tissues and reach the skin attenuated and smeared, so the surface ECG is a blurred projection of the true cardiac potentials.',
      es: 'El corazon es una fuente electrica dentro del torso, que actua como un conductor de volumen pasivo. Los potenciales de la superficie cardiaca se propagan por los tejidos del cuerpo y llegan a la piel atenuados y difuminados, asi que el ECG de superficie es una proyeccion borrosa de los potenciales cardiacos reales.',
    },
    physical: {
      en: 'The forward map from heart-surface to body-surface potentials is a linear operator set by the torso geometry; its inverse is severely ill-posed (small noise produces large error). Tikhonov regularization stabilizes it, and a physics-constrained ensemble adds a calibrated per-node uncertainty.',
      es: 'El mapa directo de los potenciales de la superficie cardiaca a los de la superficie corporal es un operador lineal fijado por la geometria del torso; su inverso esta severamente mal planteado (un pequeno ruido produce gran error). La regularizacion de Tikhonov lo estabiliza, y un ensemble restringido por fisica agrega una incertidumbre por nodo calibrada.',
    },
  },
  'amortized-operator': {
    medical: {
      en: 'Building a patient-specific cardiac model (a digital twin) today needs a slow per-patient fit. An amortized operator lets a clinic personalize the model in near real time from routine sparse measurements, enabling same-visit, simulation-guided decisions.',
      es: 'Construir un modelo cardiaco especifico del paciente (un gemelo digital) hoy requiere un ajuste lento por paciente. Un operador amortizado permite a una clinica personalizar el modelo casi en tiempo real desde mediciones dispersas de rutina, habilitando decisiones guiadas por simulacion en la misma visita.',
    },
    biological: {
      en: 'Every patient heart differs in conduction velocity, fibre architecture and scar. These parameters determine how arrhythmias arise and respond to therapy, so a useful model must estimate them for each individual rather than assume population averages.',
      es: 'Cada corazon de paciente difiere en velocidad de conduccion, arquitectura de fibras y cicatriz. Estos parametros determinan como surgen las arritmias y responden a la terapia, asi que un modelo util debe estimarlos para cada individuo en vez de asumir promedios de poblacion.',
    },
    physical: {
      en: 'Instead of solving the inverse problem separately for every patient, an operator is trained once on a simulated population to map sparse data directly to a parameter posterior (amortized inference). At inference it returns the estimate and its uncertainty in a single forward pass.',
      es: 'En vez de resolver el problema inverso por separado para cada paciente, un operador se entrena una vez sobre una poblacion simulada para mapear datos dispersos directamente a una posterior de parametros (inferencia amortizada). En inferencia devuelve la estimacion y su incertidumbre en una sola pasada hacia adelante.',
    },
  },
};

export function ContextTriad({ caseId }: { caseId: string }) {
  const lang = useLang();
  const t = TRIADS[caseId];
  if (!t) return null;
  const items: Array<[string, string, string, Ctx]> = [
    ['Medical context', 'Contexto medico', 'med', t.medical],
    ['Biological context', 'Contexto biologico', 'bio', t.biological],
    ['Physical context', 'Contexto fisico', 'phy', t.physical],
  ];
  return (
    <div className="triad">
      {items.map(([en, es, cls, ctx]) => (
        <div className={`panel ctx ctx-${cls}`} key={cls}>
          <div className="ctx-h">{pick(lang, en, es)}</div>
          <p className="small" style={{ margin: 0 }}>{pick(lang, ctx.en, ctx.es)}</p>
        </div>
      ))}
    </div>
  );
}
