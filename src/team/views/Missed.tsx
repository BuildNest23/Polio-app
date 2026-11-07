import { missed, setFound, type State } from '../model';
import type { Dict } from '../i18n';
import { Stepper } from '../ui';

interface P { t: Dict; s: State; set: (f: (s: State) => State) => void }

/** Saved houses that still have missed children. Numbers here use buttons only (not typed). */
export function Missed({ t, s, set }: P) {
  const rows = s.houses.map((h, i) => ({ h, i })).filter(({ h }) => h.done && !h.l && missed(h) > 0);
  if (!rows.length) return <div className="card"><span className="muted">{t.noMissed}</span></div>;
  return (
    <div className="card">
      {rows.map(({ h, i }) => (
        <div key={i} className="listrow" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>{t.house} {i + 1}</b>
            <span className="badge">{t.missedWord}: {missed(h)}</span>
          </div>
          <span className="muted">{t.foundRevisit}</span>
          <Stepper value={h.f} label={t.foundRevisit} editable={false} max={missed(h)} onChange={(n) => set((x) => setFound(x, i, n))} />
        </div>
      ))}
    </div>
  );
}
