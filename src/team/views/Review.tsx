import { totals, type Config, type State } from '../model';
import type { Dict } from '../i18n';

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

      <button className="btn primary big block" onClick={send}>{t.send}</button>
      <button className="btn big block" onClick={copy}>{t.copy}</button>
    </>
  );
}
