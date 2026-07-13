// Global UI state (zustand): language, theme, the selected vertical + field + workbench controls. Theme and
// language persist to localStorage so a reload keeps the user's choice.
import { create } from 'zustand';

export type Lang = 'en' | 'es';
export type Theme = 'light' | 'dark';

const ls = (k: string): string | null => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const save = (k: string, v: string): void => {
  try { localStorage.setItem(k, v); } catch { /* ignore */ }
};

interface State {
  lang: Lang;
  theme: Theme;
  caseId: string | null;
  field: string;
  timeCursor: number;   // 0..1 fraction of the activation-time range (wavefront reveal)
  showSensors: boolean;
  liveMode: boolean;    // onnxruntime-web re-inference vs baked replay
  setLang: (l: Lang) => void;
  toggleTheme: () => void;
  setCase: (id: string) => void;
  setField: (f: string) => void;
  setTimeCursor: (t: number) => void;
  setShowSensors: (b: boolean) => void;
  setLiveMode: (b: boolean) => void;
}

const initialTheme = (ls('cardiopinn.theme') as Theme) || 'dark';
const initialLang = (ls('cardiopinn.lang') as Lang) || 'en';

export const useStore = create<State>((set) => ({
  lang: initialLang,
  theme: initialTheme,
  caseId: null,
  field: 'T_pinn',
  timeCursor: 1,
  showSensors: true,
  liveMode: false,
  setLang: (l) => { save('cardiopinn.lang', l); set({ lang: l }); },
  toggleTheme: () => set((s) => {
    const theme = s.theme === 'dark' ? 'light' : 'dark';
    save('cardiopinn.theme', theme);
    return { theme };
  }),
  setCase: (id) => set({ caseId: id, field: 'T_pinn', timeCursor: 1, liveMode: false }),
  setField: (f) => set({ field: f }),
  setTimeCursor: (t) => set({ timeCursor: t }),
  setShowSensors: (b) => set({ showSensors: b }),
  setLiveMode: (b) => set({ liveMode: b }),
}));

// tiny bilingual helper: pick(en, es)
export const useLang = (): Lang => useStore((s) => s.lang);
export const pick = (lang: Lang, en: string, es: string): string => (lang === 'es' ? es : en);
