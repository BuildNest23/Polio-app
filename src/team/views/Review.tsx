import type { ReactElement } from 'react';
import { totals, type Config, type State } from '../model';
import type { Dict } from '../i18n';
import { Summary } from '../../shared/Summary';

interface P { t: Dict; s: State; c: Config; set: (f: (s: State) => State) => void; send: () => void; copy: () => void }

export function Review({ t, s, send, copy }: P) {
  const T = totals(s);
  // tables of 30 houses, like the paper sheet; each ends with a Sum row
  const blocks: ReactElement[] = [];
  for (let st = 0; st < s.houses.length; st += 30) {
    let a = 0, b = 0, g = 0; const body: ReactElement[] = [];
    for (let i = st; i < Math.min(st + 30, s.houses.length); i++) {
      const h = s.houses[i]; if (!h.done) continue;
      if (!h.l) { a += h.t; b += h.v; g += h.g; }
      body.push(
        <tr key={i}>
          <td>{i + 1}</td><td>{h.l ? '–' : h.t}</td><td>{h.l ? '–' : h.v}</td><td>{h.l ? '–' : h.g}</td>
          <td className="mk">{h.l ? t.lockShort : ''}{h.m ? (h.l ? ' ' : '') + t.mmpShort : ''}</td>
        </tr>,
      );
    }
    if (body.length) blocks.push(
      <div className="card" key={st}>
        <b>{t.housesRange} {st + 1}–{st + 30}</b>
        <table className="rvtable">
          <thead><tr><th>{t.house}</th><th>{t.colTotal}</th><th>{t.colVacc}</th><th>{t.colGuest}</th><th></th></tr></thead>
          <tbody>{body}</tbody>
          <tfoot><tr><th>{t.sum}</th><th>{a}</th><th>{b}</th><th>{g}</th><th></th></tr></tfoot>
        </table>
      </div>,
    );
  }
  return (
    <>
      <Summary T={T} L={{ still: t.still, lA: t.lA, lB: t.lB, lC: t.lC, lD: t.lD, lS: t.lS, lO: t.lO, totalVacc: t.totalVacc, mmp: t.mmpRatio, zero: t.zero, locked: t.lockedH }} />
      {blocks}
      <button className="btn primary big block" onClick={send}>{t.send}</button>
      <button className="btn big block" onClick={copy}>{t.copy}</button>
    </>
  );
}
