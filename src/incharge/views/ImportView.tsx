import { useRef, useState } from 'react';
import type { Dict } from '../lib/i18n';
import { imp, importAdd, importAddData, importLoadFiles, importRemove, importTarget } from '../lib/teamio';
import { emit } from '../lib/state';
import { Summary } from '../../shared/Summary';

function Review({ i, t }: { i: number; t: Dict }) {
  const f = imp.files[i], d = f.d, T = f.T, hs: any[] = d.houses || [];
  const tg = importTarget(d);
  const when = d.sentAt ? new Date(d.sentAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const stat = !tg ? <span className="badge red">No row in F2A</span> : imp.done[d.team + '|' + d.day] ? <span className="badge ok">Added to F2A</span> : null;
  const blocks: any[] = [];
  for (let s = 0; s < hs.length; s += 30) {
    const rows: any[] = []; let a = 0, b = 0, g = 0, fo = 0;
    for (let k = s; k < Math.min(s + 30, hs.length); k++) {
      const h = hs[k]; if (!h) continue;
      a += h[0]; b += h[1]; g += h[2]; fo += h[5] || 0;
      rows.push(<tr key={k}><td><b>{k + 1}</b></td><td className="num">{h[0]}</td><td className="num">{h[1]}</td><td className="num">{h[2]}</td><td className="num">{h[5] || ''}</td><td><b style={{ color: 'var(--warn-ink)' }}>{h[3] ? 'L' : ''}{h[4] ? 'M' : ''}</b></td></tr>);
    }
    if (rows.length) blocks.push(
      <div className="card flat" style={{ padding: 0, overflow: 'hidden' }} key={s}>
        <table className="simple">
          <thead><tr><th>#</th><th className="num">Total</th><th className="num">Vacc</th><th className="num">Guest</th><th className="num">Revisit</th><th /></tr></thead>
          <tbody>{rows}<tr className="tot"><td>{s + 1}–{Math.min(s + 30, hs.length)}</td><td className="num">{a}</td><td className="num">{b}</td><td className="num">{g}</td><td className="num">{fo}</td><td /></tr></tbody>
        </table>
      </div>);
  }
  const acts = (
    <div className="row">
      <button className="btn grow danger" onClick={() => importRemove(i)}>{t.remove}</button>
      <button className="btn grow primary" style={{ flex: 2 }} onClick={() => importAdd(i)}>{t.addF2a}</button>
    </div>
  );
  return (
    <div className="review">
      <div className="row between"><b style={{ fontSize: 17 }}>{d.team} · {t.day} {d.day}</b><span className="small muted">{when}</span></div>
      {stat}{acts}
      <Summary T={T} L={{ still: t.still, lA: t.lA, lB: t.lB, lC: t.lC, lD: t.lD, lS: t.lS, lO: t.lO, totalVacc: t.vacc, mmp: t.mmpRatio, zero: t.zero, locked: t.locked }} />
      {blocks}
      {(d.school || []).length > 0 && (
        <div className="card flat">{d.school.map((s: any, k: number) => <div className="listrow" key={k}><span>{s.name || t.lS}</span><b>{s.u5} / {s.vac}</b></div>)}</div>
      )}
      {acts}
    </div>
  );
}

export function ImportView({ t }: { t: Dict }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [paste, setPaste] = useState<string | null>(null);
  const teams = Array.from(new Set(imp.files.map((f) => f.d.team)));
  const shown = imp.files.map((f, i) => ({ f, i })).filter(({ f }) => (imp.team === 'All' || f.d.team === imp.team) && (!imp.day || f.d.day === imp.day));
  const cids = new Set(imp.files.map((f) => f.d.campaignId));
  return (
    <>
      <h1 className="h1">{t.importTitle}</h1>
      <input ref={fileRef} type="file" accept=".txt,.json,text/plain,application/json" multiple className="hidden-input"
        onChange={(e) => { if (e.target.files) importLoadFiles(e.target.files); e.target.value = ''; }} />
      <div className="row">
        <button className="btn primary grow big" onClick={() => fileRef.current?.click()}>{t.loadFile}</button>
        <button className="btn grow big" onClick={() => setPaste(paste === null ? '' : null)}>{t.pasteText}</button>
      </div>
      {paste !== null && (
        <div className="card">
          <textarea className="input" rows={5} placeholder={t.pasteHint} value={paste} onChange={(e) => setPaste(e.target.value)} />
          <button className="btn primary" onClick={() => { if (importAddData(paste, 'pasted text')) setPaste(null); }}>{t.add}</button>
        </div>
      )}
      {cids.size > 1 && <div className="notice">Loaded files come from different campaigns ({Array.from(cids).join(', ')}).</div>}
      {imp.files.length > 0 && (
        <>
          <div className="chips">
            {[0, 1, 2, 3].map((d) => <button key={d} className={'chip' + (imp.day === d ? ' on' : '')} onClick={() => { imp.day = d; emit(); }}>{d ? t.day + ' ' + d : t.allDays}</button>)}
          </div>
          <div className="chips">
            {['All', ...teams].map((x) => <button key={x} className={'chip' + (imp.team === x ? ' on' : '')} onClick={() => { imp.team = x; emit(); }}>{x === 'All' ? t.all : x}</button>)}
          </div>
        </>
      )}
      {imp.files.length === 0 && <div className="muted">{t.noImports}</div>}
      {shown.map(({ i }) => <div className="card" key={i}><Review i={i} t={t} /></div>)}
    </>
  );
}
