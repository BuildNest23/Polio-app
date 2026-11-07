import { useRef, useState } from 'react';
import type { Dict } from '../lib/i18n';
import { imp, importAdd, importAddData, importLoadFiles, importRemove, importTarget } from '../lib/teamio';
import { emit } from '../lib/state';
import { Summary } from '../../shared/Summary';
import { HouseTables } from '../../shared/HouseTables';

function Review({ i, t }: { i: number; t: Dict }) {
  const f = imp.files[i], d = f.d, T = f.T, hs: any[] = d.houses || [];
  const tg = importTarget(d);
  const when = d.sentAt ? new Date(d.sentAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const stat = !tg ? <span className="badge red">No row in F2A</span> : imp.done[d.team + '|' + d.day] ? <span className="badge ok">Added to F2A</span> : null;
  const rows = hs.map((h, k) => (h ? { n: k + 1, t: h[0], v: h[1], g: h[2], f: h[5] || 0, l: !!h[3], m: !!h[4] } : null)).filter(Boolean) as any[];
  const L = { house: t.colHouse, total: t.colTotal, vacc: t.colVacc, guest: t.colGuest, revisit: t.colRevisit, sum: t.colSum, range: t.colRange, lock: 'L', mmp: 'MMP' };
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
      <HouseTables rows={rows} L={L} showRevisit />
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
