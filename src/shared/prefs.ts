// Language and theme, remembered on the device. Shared by both apps.
import { useSyncExternalStore } from 'react';

export type Lang = 'en' | 'ur';
export type Theme = 'light' | 'dark';

function safeGet(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }

function pref<T extends string>(key: string, fallback: T, apply: (v: T) => void) {
  let value = ((safeGet(key) as T) || fallback) as T;
  const subs = new Set<() => void>();
  apply(value);
  return {
    get: () => value,
    set: (v: T) => { value = v; safeSet(key, v); apply(v); subs.forEach(f => f()); },
    subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
  };
}

const langPref = pref<Lang>('polio_lang', 'en', (v) => {
  document.documentElement.lang = v;
  document.documentElement.dir = v === 'ur' ? 'rtl' : 'ltr';
});
const themePref = pref<Theme>('polio_theme', 'light', (v) => {
  document.documentElement.setAttribute('data-theme', v);
});

export function useLang(): [Lang, (l: Lang) => void] {
  const l = useSyncExternalStore(langPref.subscribe, langPref.get);
  return [l, langPref.set];
}
export function useTheme(): [Theme, (t: Theme) => void] {
  const t = useSyncExternalStore(themePref.subscribe, themePref.get);
  return [t, themePref.set];
}
