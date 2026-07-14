// Bilingual helpers. Language and theme are owned by the shared shell (@fasl-work/caos-app-shell): `useLang`
// re-exports the shell's language so every page and the shell chrome stay in lockstep. All per-view state (the
// selected case, dataset, beat, field, animation frame) is local component state inside the App pages, so the
// app needs no global store of its own.
import { useShellLang } from '@fasl-work/caos-app-shell';

export type Lang = 'en' | 'es';
export type Theme = 'light' | 'dark';

// The current language, sourced from the shell so the header language toggle drives every page.
export const useLang = (): Lang => useShellLang();
// tiny bilingual helper: pick(lang, en, es)
export const pick = (lang: Lang, en: string, es: string): string => (lang === 'es' ? es : en);
