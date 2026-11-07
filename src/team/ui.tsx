import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { clamp, MAX } from './model';

/* ---- tiny confirm sheet + toast (own copy, so this file stays single and small) ---- */
interface Ask { msg: string; yes: string; no: string; third?: string; resolve: (v: 'yes' | 'no' | 'third') => void }
let ask: Ask | null = null; const askSubs = new Set<() => void>();
const setAsk = (a: Ask | null) => { ask = a; askSubs.forEach((f) => f()); };
export function confirmSheet(msg: string, yes: string, no: string, third?: string): Promise<'yes' | 'no' | 'third'> {
  return new Promise((res) => setAsk({ msg, yes, no, third, resolve: (v) => { setAsk(null); res(v); } }));
}
let toasts: { id: number; msg: string }[] = []; let tid = 1; const toastSubs = new Set<() => void>();
export function toast(msg: string) {
  const id = tid++; toasts = [...toasts, { id, msg }]; toastSubs.forEach((f) => f());
  setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); toastSubs.forEach((f) => f()); }, 3200);
}
export function Overlays() {
  const a = useSyncExternalStore((cb) => { askSubs.add(cb); return () => { askSubs.delete(cb); }; }, () => ask);
  const ts = useSyncExternalStore((cb) => { toastSubs.add(cb); return () => { toastSubs.delete(cb); }; }, () => toasts);
  return (
    <>
      {a && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) a.resolve('no'); }}>
          <div className="sheet" role="dialog" aria-modal="true">
            <p>{a.msg}</p>
            <div className="row">
              <button className="btn grow" onClick={() => a.resolve('no')}>{a.no}</button>
              {a.third && <button className="btn grow" onClick={() => a.resolve('third')}>{a.third}</button>}
              <button className="btn primary grow" onClick={() => a.resolve('yes')}>{a.yes}</button>
            </div>
          </div>
        </div>
      )}
      <div className="toasts">{ts.map((t) => <div key={t.id} className="toast">{t.msg}</div>)}</div>
    </>
  );
}

/** Typed number: tap the number to type it. Empty becomes 0. */
export function NumInput({ value, onChange, label, max = MAX }: { value: number; onChange: (n: number) => void; label: string; max?: number }) {
  return (
    <input
      type="text" inputMode="numeric" aria-label={label} value={String(value)}
      onFocus={(e) => e.target.select()}
      onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10); onChange(clamp(isNaN(n) ? 0 : n, 0, max)); }}
    />
  );
}
/** [-] number [+]. editable=true lets the number be typed (Entry tab); false = buttons only (Missed tab). */
export function Stepper({ value, onChange, label, max = MAX, editable = true, small = false }: { value: number; onChange: (n: number) => void; label: string; max?: number; editable?: boolean; small?: boolean }) {
  return (
    <div className={'stepper' + (small ? ' small' : '')}>
      <button className="sbtn" aria-label="Minus" onClick={() => onChange(clamp(value - 1, 0, max))}>−</button>
      {editable ? <NumInput value={value} onChange={onChange} label={label} max={max} /> : <div className="stepnum" style={{ flex: small ? 'none' : 1, minWidth: 40 }}>{value}</div>}
      <button className="sbtn plus" aria-label="Plus" onClick={() => onChange(clamp(value + 1, 0, max))}>+</button>
    </div>
  );
}
export function useAutoFocus<T extends HTMLElement>() { const r = useRef<T>(null); useEffect(() => { r.current?.focus(); }, []); return r; }
export const useBool = (init = false) => useState(init);
