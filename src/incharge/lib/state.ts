// Shared mutable app state + tiny stores (no external state library).
import { useSyncExternalStore } from 'react';
import { buildSectionMap, type Section } from './core';

/* ---------- main state ---------- */
export const S = {
  workbook: null as any,
  fileName: '',
  originalBuffer: null as ArrayBuffer | null,
  edited: new Set<string>(),     // "row,col" of cells changed since last download
  bulk: false,                   // bulk changes (team codes, imports, new campaign)
  mergeMap: null as Record<string, any> | null,
  startDate: '',
  params: { nTeams: 5, nCatch: 1 },
  built: buildSectionMap(5, 1),
  epoch: 0,                      // bumps when the sheet is replaced/bulk-edited so inputs reset
  rev: 0,                        // bumps on every change so views re-render
  section: 'day1',
};
const subs = new Set<() => void>();
export function emit() { S.rev++; subs.forEach((f) => f()); }
export function useStore() {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => S.rev);
}
export const isDirty = () => S.edited.size > 0 || S.bulk;
export const allSections = (): Section[] => S.built.sections;
export const mainSections = (): Section[] => S.built.sections.filter((s) => s.group === 'main');
export const nextSections = (): Section[] => S.built.sections.filter((s) => s.group === 'next');
export function applySectionMap(nTeams: number, nCatch: number) {
  S.built = buildSectionMap(nTeams, nCatch);
  S.params = { nTeams, nCatch };
}
export const getMerge = (r: number, c: number) => (S.mergeMap ? S.mergeMap[r + ',' + c] : null);

/* ---------- IndexedDB (same names as the original app so old saved work is found) ---------- */
function idbOpen(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open('polioApp', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function idbSet(k: string, v: any) {
  const db = await idbOpen();
  return new Promise<void>((res, rej) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}
export async function idbGet(k: string): Promise<any> {
  const db = await idbOpen();
  return new Promise((res, rej) => { const tx = db.transaction('files', 'readonly'); const g = tx.objectStore('files').get(k); g.onsuccess = () => res(g.result); g.onerror = () => rej(g.error); });
}
export async function idbDelete(k: string) {
  const db = await idbOpen();
  return new Promise<void>((res, rej) => { const tx = db.transaction('files', 'readwrite'); tx.objectStore('files').delete(k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}

/* ---------- dialogs + toasts ---------- */
export interface Dlg { kind: 'confirm' | 'prompt'; title: string; msg: string; yes: string; no: string; danger?: boolean; def?: string; resolve: (v: any) => void }
let dlg: Dlg | null = null;
const dlgSubs = new Set<() => void>();
const setDlg = (d: Dlg | null) => { dlg = d; dlgSubs.forEach((f) => f()); };
export function useDialog() { return useSyncExternalStore((cb) => { dlgSubs.add(cb); return () => { dlgSubs.delete(cb); }; }, () => dlg); }

export function uiConfirm(msg: string, opts: { title?: string; yesText?: string; noText?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => setDlg({ kind: 'confirm', title: opts.title || 'Confirm', msg, yes: opts.yesText || 'Confirm', no: opts.noText || 'Cancel', danger: opts.danger, resolve: (v) => { setDlg(null); resolve(!!v); } }));
}
export function uiPrompt(msg: string, def = '', opts: { title?: string; yesText?: string; noText?: string } = {}): Promise<string | null> {
  return new Promise((resolve) => setDlg({ kind: 'prompt', title: opts.title || 'Input', msg, def, yes: opts.yesText || 'OK', no: opts.noText || 'Cancel', resolve: (v) => { setDlg(null); resolve(v); } }));
}

export interface ToastItem { id: number; msg: string; type: string }
let toasts: ToastItem[] = [];
let toastId = 1;
const toastSubs = new Set<() => void>();
export function useToasts() { return useSyncExternalStore((cb) => { toastSubs.add(cb); return () => { toastSubs.delete(cb); }; }, () => toasts); }
export function toast(msg: string, type: 'success' | 'error' | 'info' = 'success') {
  const id = toastId++;
  toasts = [...toasts, { id, msg: String(msg || ''), type }];
  toastSubs.forEach((f) => f());
  setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); toastSubs.forEach((f) => f()); }, 2800);
}
