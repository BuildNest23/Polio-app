import { totals, type Config, type State } from '../model';
import { UR, type Dict } from '../i18n';
import { Summary } from '../../shared/Summary';
import { HouseTables } from '../../shared/HouseTables';

interface P { t: Dict; ur: boolean; s: State; c: Config; set: (f: (s: State) => State) => void; send: () => void; copy: () => void }

export function Review({ t, ur, s, send, copy }: P) {
  const T = totals(s);
  const rows = s.houses.map((h, i) => ({ n: i + 1, t: h.t, v: h.v, g: h.g, f: h.f, l: h.l, m: h.m, done: h.done })).filter((r) => r.done);
  const L = { house: t.house, total: t.colTotal, vacc: t.colVacc, guest: t.colGuest, revisit: t.foundRevisit, sum: t.sum, range: t.housesRange, lock: t.lockShort, mmp: t.mmpShort };
  return (
    <>
      <Summary T={T} U={ur ? UR : undefined} L={{ still: t.still, lA: t.lA, lB: t.lB, lC: t.lC, lD: t.lD, lS: t.lS, lO: t.lO, totalVacc: t.totalVacc, mmp: t.mmpRatio, zero: t.zero, locked: t.lockedH }} />
      <HouseTables rows={rows} L={L} />
      <button className="btn primary big block" onClick={send}>{t.send}</button>
      <button className="btn big block" onClick={copy}>{t.copy}</button>
    </>
  );
}
