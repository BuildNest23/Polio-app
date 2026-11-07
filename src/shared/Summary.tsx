// The summary cards shown in BOTH apps (Incharge import review and Team review), so they look the same.
export interface SumLabels {
  still: string; lA: string; lB: string; lC: string; lD: string; lS: string; lO: string;
  totalVacc: string; mmp: string; zero: string; locked: string;
}
export interface SumTotals { A: number; B: number; C: number; D: number; S: number; O: number; mmpv: number; mmpKids: number; z: number; lock: number }

export function Summary({ T, L }: { T: SumTotals; L: SumLabels }) {
  const cards: [string, number, string][] = [['A', T.A, L.lA], ['B', T.B, L.lB], ['C', T.C, L.lC], ['D', T.D, L.lD], ['S', T.S, L.lS], ['O', T.O, L.lO]];
  return (
    <>
      <div className="redcard"><span>{L.still}</span><b>{T.A - T.B - T.C}</b></div>
      <div className="stats">{cards.map(([k, n, l]) => <div className="stat" key={k}><i>{k}</i><b>{n}</b><small>{l}</small></div>)}</div>
      <div className="softrow">
        <span>{L.totalVacc}<small className="sub">B+C+D+S+O</small></span>
        <b>{T.B + T.C + T.D + T.S + T.O}</b>
      </div>
      <div className="stats">
        <div className="stat"><b dir="ltr">{T.mmpv}/{T.mmpKids}</b><small>{L.mmp}</small></div>
        <div className="stat"><b>{T.z}</b><small>{L.zero}</small></div>
        <div className="stat"><b>{T.lock}</b><small>{L.locked}</small></div>
      </div>
    </>
  );
}
