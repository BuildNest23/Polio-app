import { useState } from 'react';
import { useStore } from '../lib/state';
import { childrenData, childDiff, sectionDateFull } from '../lib/workbook';
import { useT } from '../strings';

export function ChildrenView() {
  useStore();
  const t = useT();
  const [key, setKey] = useState('day1');
  const d0: any = childrenData('day1');
  if (d0.error) return <div className="content"><div className="card">{d0.error}</div></div>;
  const tabs: [string, string][] = d0.days.map((s: any) => [s.key, t.day + ' ' + s.key.slice(-1)]).concat([['total', t.total]]);
  const isTotal = key === 'total';
  const D: any = childrenData(key);
  const show = (x: number | null) => (x === null ? '—' : Math.round(x * 100) / 100);
  const td = childDiff(D.tp, D.tn);
  return (
    <div className="content">
      <div><h2 className="h1">{t.kidsTitle}</h2><span className="muted small">{t.kidsHint}</span></div>
      <div className="chips">{tabs.map(([k, l]) => <button key={k} className={'chip' + (k === key ? ' on' : '')} onClick={() => setKey(k)}>{l}</button>)}</div>
      {!isTotal && <span dir="ltr" className="small muted">{sectionDateFull(D.list[0])}</span>}
      <div className="card flat" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="simple">
          <thead><tr><th>{t.cTeam}</th><th className="num">{t.cPrev}</th><th className="num">{t.cNow}</th><th>{t.cDiff}</th></tr></thead>
          <tbody>
            {D.rows.map((r: any) => { const d = childDiff(r.p, r.w); return <tr key={r.team}><td><b>{r.team}</b></td><td className="num">{show(r.p)}</td><td className="num">{show(r.w)}</td><td dir="ltr" style={{ textAlign: 'start', color: d.c === 'up' ? 'var(--ok)' : d.c === 'down' ? 'var(--red)' : 'var(--mute)' }}>{d.t}</td></tr>; })}
            <tr className="tot"><td>{isTotal ? t.allTeams : t.total}</td><td className="num">{show(D.tp)}</td><td className="num">{show(D.tn)}</td><td dir="ltr" style={{ textAlign: 'start' }}>{td.t}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
