import { useLang, pick } from '../store';

export function AfRotorContext() {
  const lang = useLang();
  return (
    <div className="grid" style={{ gap: 14 }}>
      <div className="panel">
        <h3>{pick(lang, 'The problem: rotors in fibrillation', 'El problema: rotores en la fibrilacion')}</h3>
        <p>{pick(lang,
          'During atrial fibrillation the excitation organizes into rotating spiral waves whose cores are phase singularities (rotors), the targets of ablation. The classical Hilbert-phase + phase-singularity pipeline is noise-sensitive and returns a single point; from sparse noisy electrodes the rotor location is genuinely uncertain.',
          'Durante la fibrilacion auricular la excitacion se organiza en ondas espirales rotantes cuyos nucleos son singularidades de fase (rotores), los objetivos de la ablacion. El pipeline clasico de fase de Hilbert + singularidad de fase es sensible al ruido y devuelve un solo punto; desde electrodos dispersos y ruidosos la ubicacion del rotor es genuinamente incierta.')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Beyond SOTA: an uncertainty-aware rotor map', 'Mas alla del SOTA: un mapa de rotor consciente de la incertidumbre')}</h3>
        <p className="small">{pick(lang,
          'The excitation is a real Aliev-Panfilov reaction-diffusion spiral. From sparse noisy electrodes the complex phasor is interpolated (respecting the cyclic phase), and an ensemble over noise draws produces a probabilistic rotor-location heatmap plus a confidence radius, instead of a single point. In this build the rotor is localized to about 1 mm with a tight confidence radius from about 3.4% electrode coverage.',
          'La excitacion es una espiral de reaccion-difusion Aliev-Panfilov real. Desde electrodos dispersos y ruidosos se interpola el fasor complejo (respetando la fase ciclica), y un ensemble sobre realizaciones de ruido produce un mapa de calor probabilistico de la ubicacion del rotor mas un radio de confianza, en vez de un solo punto. En esta version el rotor se localiza a ~1 mm con un radio de confianza estrecho desde ~3.4% de cobertura de electrodos.')}</p>
      </div>
      <div className="panel">
        <h3>{pick(lang, 'Honesty', 'Honestidad')}</h3>
        <p className="small">{pick(lang,
          'Synthetic reaction-diffusion spiral on a clean sheet. Real optical-mapping and clinical AF electrode data are noisier and more irregular, which would widen the confidence radius. Not clinically validated. The confirmed physics-informed EP work here is EP-PINNs and the confirmed learned rotor mapping is a CNN; this vertical combines a reaction-diffusion phase field with an explicit rotor-location uncertainty and does not claim to be a published PINN phase-mapping method.',
          'Espiral de reaccion-difusion sintetica en una lamina limpia. Los datos reales de mapeo optico y de electrodos clinicos de FA son mas ruidosos e irregulares, lo que ampliaria el radio de confianza. No validado clinicamente. El trabajo informado por fisica confirmado aqui es EP-PINNs y el mapeo de rotor aprendido confirmado es una CNN; este vertical combina un campo de fase de reaccion-difusion con una incertidumbre explicita de ubicacion del rotor y no afirma ser un metodo PINN de mapeo de fase publicado.')}</p>
      </div>
    </div>
  );
}
