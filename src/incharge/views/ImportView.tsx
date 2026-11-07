import { useRef, useState } from 'react';
import { S, useStore } from '../lib/state';
import { importAddData, importAdd, importRemove, importTarget, genCid } from '../lib/workbook';
import { useT } from '../strings';

function Review({ i }: { i: number }) {
  const t = useT();
  const f = S.imports[i]; const d = f.d, T = f.T, hs: any[] = d.houses || [];
  let mmp = 0; hs.forEach((h) => { if (h && !h[3] && h[4]) mmp += h[0]; });
  const still = T.A - T.B - T.C;
  const tg = importTarget(d);
  const done = S.importDone[d.team + '|' + d.day];
  const cards: [string, number, string][] = [['A', T.A, t.lA], ['B', T.B, t.lB], ['C', T.C, t.lC], ['D', T.D, t.lD], ['S', T.S, t.lS], ['O', T.O, t.lO]];
  const blocks: any[] = [];
  for (let s = 0; s < hs.length; s += 30) {
    let a = 0, b = 0, g = 0, fo = 0; const rows: any[] = [];
    for (let k = s; k < Math.min(s + 30, hs.length); k++) {
      const h = hs[k]; if (!h) continue;
      a += h[0]; b += h[1]; g += h[2]; fo += h[5] || 0;
      rows.push(<tr key={k}><td>{k + 1}</td><td>{h[0]}</td><td>{h[1]}</td><td>{h[2]}</td><td>{h[5] || ''}</td><td className="mark">{h[3] ? 'L' : ''}{h[4] ? 'M' : ''}</td></tr>);
    }
    if (rows.length) blocks.push(
      <div key={s} style={{ overflowX: 'auto' }}>
        <table className="blocktbl"><thead><tr><th>{t.hHouse}</th><th>{t.hTotal}</th><th>{t.hVacc}</th><th>{t.hGuest}</th><th>{t.hRevisit}</th><th /></tr></thead>
          <tbody>{rows}<tr className="sum"><th>{t.sum}</th><th>{a}</th><th>{b}</th><th>{g}</th><th>{fo || ''}</th><th /></tr></tbody></table>
      </div>);
  }
  const actions = (
    <div className="row">
      <button className="btn danger grow" onClick={() => importRemove(i)}>{t.remove}</button>
      <button className="btn primary" style={{ flex: 2 }} onClick={() => importAdd(i)}>{t.addF2a}</button>
    </div>
  );
  return (
    <div className="card">
      <div className="row between">
        <b>{d.team} · {t.day} {d.day}</b>
        <span className="small muted" dir="ltr">{d.sentAt ? new Date(d.sentAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
      </div>
      {!tg && <span className="badge red">{t.noRow}</span>}
      {done && <span className="badge ok">{t.added}</span>}
      {actions}
      <div className="redcard"><span>{t.stillMissed}</span><b>{still}</b></div>
      <div className="stats">{cards.map(([k, n, l]) => <div className="stat" key={k}><i>{k}</i><b>{n}</b><small>{l}</small></div>)}</div>
      <div className="softrow"><span>{t.totalVacc}</span><b>{T.B + T.C + T.D + T.S + T.O}</b></div>
      <div className="stats">
        <div className="stat"><i>MMP</i><b>{mmp}</b><small>{t.mmpKids} / {t.mmpVacc} {T.mmpv}</small></div>
        <div className="stat"><i>0/0</i><b>{T.z}</b><small>{t.zero}</small></div>
        <div className="stat"><i>L</i><b>{T.lock}</b><small>{t.locked}</small></div>
      </div>
      {blocks}
      {(d.school || []).length > 0 && <div><b>{t.schools}</b>{d.school.map((x: any, k: number) => <div className="listrow" key={k}><span>{x.name || 'School'}</span><span>{x.u5} / {x.vac}</span></div>)}</div>}
      {actions}
    </div>
  );
}

export function ImportView() {
  useStore();
  const t = useT();
  const inp = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [fTeam, setFTeam] = useState('');
  const [fDay, setFDay] = useState(0);
  const teams = Array.from(new Set(S.imports.map((f) => f.d.team))).sort();
  const ids = new Set(S.imports.map((f) => f.d.campaignId));
  const load = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) importAddData(await f.text(), f.name);
  };
  return (
    <div className="content">
      <h2 className="h1">{t.importTitle}</h2>
      <div className="row">
        <input ref={inp} type="file" multiple accept=".txt,.json,text/plain,application/json" className="hidden-input" onChange={(e) => { load(e.target.files); e.target.value = ''; }} />
        <button className="btn primary big grow" onClick={() => inp.current?.click()}>{t.loadFile}</button>
      </div>
      <div className="card">
        <textarea className="input" rows={3} placeholder={t.pasteHere} value={text} onChange={(e) => setText(e.target.value)} dir="ltr" />
        <button className="btn block" disabled={!text.trim()} onClick={() => { if (importAddData(text, 'Pasted text')) setText(''); }}>{t.loadText}</button>
      </div>
      {ids.size > 1 && <div className="notice red">{t.mismatch}</div>}
      {S.imports.length > 0 && (
        <>
          <div className="chips" style={{ overflow: 'auto' }}>
            {[0, 1, 2, 3].map((d) => <button key={d} className={'chip' + (fDay === d ? ' on' : '')} onClick={() => setFDay(d)}>{d === 0 ? t.allDays : t.day + ' ' + d}</button>)}
          </div>
          <div className="chips">
            <button className={'chip' + (fTeam === '' ? ' on' : '')} onClick={() => setFTeam('')}>{t.all}</button>
            {teams.map((x) => <button key={x} className={'chip' + (fTeam === x ? ' on' : '')} onClick={() => setFTeam(x)}>{x}</button>)}
          </div>
        </>
      )}
      {S.imports.length === 0 && <span className="muted">{t.nothing}</span>}
      {S.imports.map((f, i) => ((!fTeam || f.d.team === fTeam) && (!fDay || f.d.day === fDay)) ? <Review key={f.d.team + f.d.day} i={i} /> : null)}
      <span className="small muted" dir="ltr">{genCid()}</span>
    </div>
  );
}
