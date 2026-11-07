import { addSchool, removeSchool, setOutside, setSchool, totals, type Config, type State } from '../model';
import type { Dict } from '../i18n';
import { Stepper } from '../ui';

interface P { t: Dict; s: State; c: Config; set: (f: (s: State) => State) => void; send: () => void; copy: () => void }

export function Review({ t, s, set, send, copy }: P) {
  const T = totals(s);
  const rows: [string, number][] = [
    [t.lA, T.A], [t.lB, T.B], [t.lC, T.C], [t.lD, T.D], [t.lS, T.S], [t.lO, T.O],
    [t.mmpKids, T.mmpKids], [t.mmpVacc, T.mmpv], [t.zero, T.z], [t.lockedH, T.lock], [t.houses, T.houses],
  ];
  return (
    <>
      <div className="redcard"><span>{t.still}</span><b>{T.still}</b></div>
      <div className="softrow"><span>{t.totalVacc}</span><b>{T.totalVacc}</b></div>
      <div className="card">
        {rows.map(([l, n]) => <div key={l} className="listrow"><span>{l}</span><b>{n}</b></div>)}
      </div>

      <div className="card">
        <b>{t.outside}</b>
        <Stepper value={s.outside} label={t.outside} editable onChange={(n) => set((x) => setOutside(x, n))} />
      </div>

      <div className="card">
        <b>{t.school}</b>
        {!s.school.length && <span className="muted">{t.schoolEmpty}</span>}
        {s.school.map((x, i) => (
          <div key={i} className="card" style={{ background: 'var(--bg)' }}>
            <label className="field">{t.schoolName}
              <input className="input" value={x.name} onChange={(e) => set((st) => setSchool(st, i, { name: e.target.value }))} />
            </label>
            <span className="muted">{t.u5}</span>
            <Stepper value={x.u5} label={t.u5} editable small onChange={(n) => set((st) => setSchool(st, i, { u5: n, vac: Math.min(x.vac, n) }))} />
            <span className="muted">{t.schoolVac}</span>
            <Stepper value={x.vac} label={t.schoolVac} editable small max={x.u5} onChange={(n) => set((st) => setSchool(st, i, { vac: n }))} />
            <button className="btn danger" onClick={() => set((st) => removeSchool(st, i))}>{t.remove}</button>
          </div>
        ))}
        <button className="btn block" onClick={() => set(addSchool)}>{t.addSchool}</button>
      </div>

      <button className="btn primary big block" onClick={send}>{t.send}</button>
      <button className="btn big block" onClick={copy}>{t.copy}</button>
    </>
  );
}
