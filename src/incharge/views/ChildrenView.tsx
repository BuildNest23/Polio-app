import { useState } from 'react';
import type { Dict } from '../lib/i18n';
import { childDiff, childrenData } from '../lib/workbook';

export function ChildrenView({ t }: { t: Dict }) {
  const [key, setKey] = useState('day1');
  const d0 = childrenData('day1');
  if (d0.error) return <div className="notice red">{d0.error}</div>;
  const tabs: [string, string][] = d0.days.map((s: any) => [s.key, s.label]).concat([['total', 'Total']]);
  const k = tabs.some((x) => x[0] === key) ? key : tabs[0][0];
  const D = childrenData(k);
  const show = (x: number | null) => (x === null ? '—' : Math.round(x * 100) / 100);
  const td = childDiff(D.tp, D.tn);
  return (
    <>
      <div><h1 className="h1">{t.kidsTitle}</h1><span className="muted small">{t.kidsHint}</span></div>
      <div className="chips">{tabs.map(([id, lab]) => <button key={id} className={'chip' + (id === k ? ' on' : '')} onClick={() => setKey(id)}>{lab}</button>)}</div>
      <div className="card flat" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="simple">
          <thead><tr><th>{t.team}</th><th className="num">{t.prev}</th><th className="num">{t.now}</th><th>{t.diff}</th></tr></thead>
          <tbody>
            {D.rows.map((r: any) => { const d = childDiff(r.p, r.w); return (
              <tr key={r.team}><td><b>{r.team}</b></td><td className="num">{show(r.p)}</td><td className="num">{show(r.w)}</td><td dir="ltr" className={d.c}>{d.t}</td></tr>
            ); })}
            <tr className="tot"><td>{k === 'total' ? t.allTeams : t.total}</td><td className="num">{show(D.tp)}</td><td className="num">{show(D.tn)}</td><td dir="ltr" className={td.c}>{td.t}</td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
