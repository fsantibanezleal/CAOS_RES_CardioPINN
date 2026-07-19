// Minimal bilingual dictionary for the shell / navigation (deep case content is authored bilingually inline
// in the content modules). Keyed by a short id; use t(lang, key).
import type { Lang } from './store';

const DICT: Record<string, { en: string; es: string }> = {
  'nav.app': { en: 'App', es: 'App' },
  'nav.intro': { en: 'Introduction', es: 'Introducción' },
  'nav.method': { en: 'Methodology', es: 'Metodología' },
  'nav.impl': { en: 'Implementation', es: 'Implementación' },
  'nav.exp': { en: 'Experiments', es: 'Experimentos' },
  'nav.bench': { en: 'Benchmark', es: 'Benchmark' },
  'tab.field': { en: 'Field', es: 'Campo' },
  'tab.compare': { en: 'Compare', es: 'Comparar' },
  'tab.live': { en: 'Live (ONNX)', es: 'En vivo (ONNX)' },
  'tab.context': { en: 'Context', es: 'Contexto' },
  'ui.method': { en: 'Field', es: 'Campo' },
  'ui.sensors': { en: 'Sensors', es: 'Sensores' },
  'ui.wavefront': { en: 'Wavefront time', es: 'Tiempo de frente' },
  'ui.play': { en: 'Play once', es: 'Reproducir' },
  'ui.arch': { en: 'Architecture', es: 'Arquitectura' },
  'ui.live_run': { en: 'Run PINN in browser', es: 'Ejecutar PINN en el navegador' },
  'ui.select_case': { en: 'Select a research vertical', es: 'Seleccionar un tema de investigación' },
};

export const t = (lang: Lang, key: string): string => {
  const e = DICT[key];
  return e ? e[lang] : key;
};
