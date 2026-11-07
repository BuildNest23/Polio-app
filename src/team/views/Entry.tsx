import { canDelete, deleteLast, missed, saveNext, setNum, toggle, go, type State } from '../model';
import type { Dict } from '../i18n';
import { confirmSheet, Stepper } from '../ui';

interface P { t: Dict; s: State; set: (f: (s: State) => State) => void; finish: () => void }

export function Entry({ t, s, set, finish }: P) {
  const h = s.houses[s.cur];
  const savedCount = s.houses.filter((x) => x.done).length;
  const num = (k: 't' | 'v' | 'g', label: string) => (
    <div className="card">
      <b>{label}</b>
      <Stepper value={h[k]} label={label} editable onChange={(n) => set((x) => setNum(x, x.cur, k, n))} />
    </div>
  );
  return (
    <>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b style={{ fontSize: 20 }}>{t.house} {s.cur + 1}</b>
          <span className="badge">{t.saved}: {savedCount}</span>
        </div>
        <div className="row">
          <button className={'togbtn mmp grow' + (h.m ? ' on' : '')} aria-pressed={h.m} onClick={() => set((x) => toggle(x, x.cur, 'm'))}>{t.mmp}</button>
          <button className={'togbtn lock grow' + (h.l ? ' on' : '')} aria-pressed={h.l} onClick={() => set((x) => toggle(x, x.cur, 'l'))}>{t.locked}</button>
        </div>
      </div>

      {h.l ? <div className="notice">{t.lockedNote}</div> : (
        <>
          {num('t', t.total)}
          {num('v', t.vacc)}
          {num('g', t.guest)}
          {h.t > h.v && <div className="notice red">{t.missedWord}: <b>{missed(h)}</b></div>}
        </>
      )}

      <button className="btn primary big block" onClick={() => set(saveNext)}>{t.saveNext}</button>
      <div className="row">
        <button className="btn grow" onClick={finish}>{t.finish}</button>
        {canDelete(s) && (
          <button className="btn danger grow" onClick={async () => { if ((await confirmSheet(t.delAsk, t.del, t.cancel)) === 'yes') set(deleteLast); }}>{t.del}</button>
        )}
      </div>

      <div className="card">
        <b>{t.jump}</b>
        <div className="housegrid">
          {s.houses.map((x, i) => (
            <button key={i} className={'house' + (x.done ? ' done' : '') + (i === s.cur ? ' cur' : '')} onClick={() => set((st) => go(st, i))}>
              {i + 1}{x.done && x.l ? <small>L</small> : null}{x.done && !x.l && x.t > x.v ? <small>●</small> : null}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
