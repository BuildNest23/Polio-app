import { useState } from 'react';
import { addSchool, canDelete, deleteLast, go, missed, removeSchool, saveNext, setNum, setOutside, setSchool, toggle, type State } from '../model';
import { UR, type Dict } from '../i18n';
import { confirmSheet, Stepper, toast, Ur } from '../ui';

interface P { t: Dict; ur: boolean; s: State; set: (f: (s: State) => State) => void; finish: () => void }

export function Entry({ t, ur, s, set, finish }: P) {
  const [listOpen, setListOpen] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(false);
  const h = s.houses[s.cur];
  const savedCount = s.houses.filter((x) => x.done).length;
  const num = (k: 't' | 'v' | 'g', label: string, urText: string) => (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="lbl" style={{ display: 'flex', flexDirection: 'column' }}><b>{label}</b><Ur on={ur}>{urText}</Ur></span>
        {/* always the same height: shows the missed count next to Vaccinated, so nothing below jumps */}
        {k === 'v' && <span className="missedtag">{h.t > h.v ? <span className="badge">{t.missedWord}: {missed(h)}</span> : null}</span>}
      </div>
      <Stepper
        value={h[k]} label={label} editable
        onChange={(n) => {
          if (k === 'v' && n > h.t) { toast(t.vaccMax, true); return; }
          set((x) => setNum(x, x.cur, k, n));
        }}
      />
    </div>
  );
  function save() {
    const from = s.cur + 1;
    set(saveNext);
    toast(`✓ ${t.house} ${from} ${t.savedWord} → ${t.house} ${from + 1}`);
    document.querySelector('.content')?.scrollTo(0, 0);
  }
  return (
    <>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button className="housebtn" onClick={() => setListOpen(true)} aria-label={t.jump}>
            {t.house} {s.cur + 1} <Ur on={ur}>{UR.house}</Ur> <span className="caret">▾</span>
          </button>
          <span className="badge">{t.saved}: {savedCount}</span>
        </div>
        <div className="row">
          <button className={'togbtn mmp grow' + (h.m ? ' on' : '')} aria-pressed={h.m} onClick={() => set((x) => toggle(x, x.cur, 'm'))}>{t.mmp}<Ur on={ur}>{UR.mmp}</Ur></button>
          <button className={'togbtn lock grow' + (h.l ? ' on' : '')} aria-pressed={h.l} onClick={() => set((x) => toggle(x, x.cur, 'l'))}>{t.locked}<Ur on={ur}>{UR.locked}</Ur></button>
        </div>
      </div>

      {h.l ? <div className="notice">{t.lockedNote}</div> : (
        <>
          {num('t', t.total, UR.total)}
          {num('v', t.vacc, UR.vacc)}
          {num('g', t.guest, UR.guest)}
        </>
      )}

      <div className="savebar">
        <button className="btn primary big block" onClick={save}>{t.saveNext}</button>
      </div>
      <div className="row">
        {canDelete(s) && (
          <button className="btn danger grow" onClick={async () => { if ((await confirmSheet(t.delAsk, t.del, t.cancel)) === 'yes') set(deleteLast); }}>{t.del}</button>
        )}
      </div>

      <div className="card">
        <span style={{ display: 'flex', flexDirection: 'column' }}><b>{t.outside}</b><Ur on={ur}>{UR.outside}</Ur></span>
        <Stepper value={s.outside} label={t.outside} editable onChange={(n) => set((x) => setOutside(x, n))} />
      </div>

      <div className="card">
        <button className="housebtn" style={{ fontSize: 14, justifyContent: 'space-between', width: '100%' }} onClick={() => setSchoolOpen(!schoolOpen)}>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}><span>{t.school} ({s.school.length})</span><Ur on={ur}>{UR.school}</Ur></span><span className="caret">{schoolOpen ? '▴' : '▾'}</span>
        </button>
        {schoolOpen && (
          <>
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
          </>
        )}
      </div>

      <button className="btn outline block" style={{ marginTop: 14 }} onClick={finish}>{t.finish}</button>

      {listOpen && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setListOpen(false); }}>
          <div className="sheet" role="dialog" aria-modal="true">
            <b>{t.jump}</b>
            <div className="housegrid">
              {s.houses.map((x, i) => (
                <button key={i} className={'house' + (x.done ? ' done' : '') + (i === s.cur ? ' cur' : '')} onClick={() => { set((st) => go(st, i)); setListOpen(false); }}>
                  {i + 1}{x.done && x.l ? <small>L</small> : null}{x.done && !x.l && x.t > x.v ? <small>●</small> : null}
                </button>
              ))}
            </div>
            <button className="btn block" onClick={() => setListOpen(false)}>{t.cancel}</button>
          </div>
        </div>
      )}
    </>
  );
}
