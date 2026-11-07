// App state (one global object + a tiny subscribe/emit store), IndexedDB helpers and the dialog/toast bus.
import { useSyncExternalStore } from 'react';
import type { Section } from './core';
import { buildSectionMap } from './core';

export const S = {
  workbook: null as any,
  fileName: '',
  originalBuffer: null as ArrayBuffer | null,
  edited: new Set<string>(),
  bulk: false,
  mergeMap: null as Record<string, any> | null,
  meta: { startDate: '' },
  params: { nTeams: 5, nCatch: 1 },
  all: [] as Section[],
  main: [] as Section[],
  next: [] as Section[],
  epoch: 0, // bumps when the whole sheet is replaced (load, discard, import) so inputs re-read their value
  rev: 0,
  // team files kept in memory + IndexedDB
  imports: [] as { d: any; T: any; src: string }[],
  importDone: {} as Record<string, number>,
  genStore: {} as Record<string, any>,
};

export function applySectionMap(nTeams: number, nCatch: number) {
  const b = buildSectionMap(nTeams, nCatch);
  S.all = b.sections;
  S.main = b.sections.filter((s) => s.group === 'main');
  S.next = b.sections.filter((s) => s.group === 'next');
  S.params = { nTeams, nCatch };
}
applySectionMap(5, 1);

const subs = new Set<() => void>();
export function emit() { S.rev++; subs.forEach((f) => f()); }
export function useStore() {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => { subs.delete(cb); }; }, () => S.rev);
}
export const isDirty = () => S.edited.size > 0 || S.bulk;

/* ---------- IndexedDB (same db and store names as the original app) ---------- */
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

/* ---------- dialogs and toasts ---------- */
export interface Dlg { kind: 'confirm' | 'prompt'; title: string; msg: string; def?: string; yes: string; no: string; danger?: boolean; resolve: (v: any) => void }
export interface Toast { id: number; msg: string; type: string }
const ui = { dlg: null as Dlg | null, toasts: [] as Toast[] };
const uiSubs = new Set<() => void>();
let uiRev = 0;
const uiEmit = () => { uiRev++; uiSubs.forEach((f) => f()); };
export function useUi() {
  useSyncExternalStore((cb) => { uiSubs.add(cb); return () => { uiSubs.delete(cb); }; }, () => uiRev);
  return ui;
}
export function toast(msg: string, type = 'success') {
  const t = { id: Date.now() + Math.random(), msg: String(msg || ''), type };
  ui.toasts = [...ui.toasts, t]; uiEmit();
  setTimeout(() => { ui.toasts = ui.toasts.filter((x) => x.id !== t.id); uiEmit(); }, 2800);
}
export function uiConfirm(msg: string, o: { title?: string; yesText?: string; noText?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    ui.dlg = { kind: 'confirm', title: o.title || 'Confirm', msg, yes: o.yesText || 'Confirm', no: o.noText || 'Cancel', danger: o.danger, resolve: (v) => { ui.dlg = null; uiEmit(); resolve(!!v); } };
    uiEmit();
  });
}
export function uiPrompt(msg: string, def = '', o: { title?: string; yesText?: string } = {}): Promise<string | null> {
  return new Promise((resolve) => {
    ui.dlg = { kind: 'prompt', title: o.title || 'Input', msg, def, yes: o.yesText || 'OK', no: 'Cancel', resolve: (v) => { ui.dlg = null; uiEmit(); resolve(v); } };
    uiEmit();
  });
}
