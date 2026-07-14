// App state (zustand): the selected case + field + workbench controls. Language and theme are owned by the
// shared shell (@fasl-work/caos-app-shell): the header toggles drive them and `useLang` re-exports the shell's
// language so every page and the shell chrome stay in lockstep. Only the workbench-specific state lives here.
import { create } from 'zustand';
import { useShellLang } from '@fasl-work/caos-app-shell';

export type Lang = 'en' | 'es';
export type Theme = 'light' | 'dark';

interface State {
  caseId: string | null;
  field: string;
  timeCursor: number;   // 0..1 fraction of the activation-time range (wavefront reveal)
  showSensors: boolean;
  liveMode: boolean;    // onnxruntime-web re-inference vs baked replay
  setCase: (id: string) => void;
  setField: (f: string) => void;
  setTimeCursor: (t: number) => void;
  setShowSensors: (b: boolean) => void;
  setLiveMode: (b: boolean) => void;
}

export const useStore = create<State>((set) => ({
  caseId: null,
  field: 'T_pinn',
  timeCursor: 1,
  showSensors: true,
  liveMode: false,
  setCase: (id) => set({ caseId: id, field: 'T_pinn', timeCursor: 1, liveMode: false }),
  setField: (f) => set({ field: f }),
  setTimeCursor: (t) => set({ timeCursor: t }),
  setShowSensors: (b) => set({ showSensors: b }),
  setLiveMode: (b) => set({ liveMode: b }),
}));

// The current language, sourced from the shell so the header language toggle drives every page.
export const useLang = (): Lang => useShellLang();
// tiny bilingual helper: pick(lang, en, es)
export const pick = (lang: Lang, en: string, es: string): string => (lang === 'es' ? es : en);
