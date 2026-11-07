import { useEffect, useState } from 'react';
import { useLang } from '../shared/prefs';
import { Icon } from '../incharge/Icon';
import { I18N } from './i18n';
import { buildFile, initial, currentHasData, load, readConfig, save, saveHere, totals, type State } from './model';
import { confirmSheet, Overlays, toast } from './ui';
import { Entry } from './views/Entry';
import { Missed } from './views/Missed';
import { Review } from './views/Review';
import { Settings } from './views/Settings';

const TABS = ['entry', 'missed', 'review', 'settings'] as const;
type Tab = (typeof TABS)[number];
const cfg = readConfig();

export default function App() {
  const [lang] = useLang();
  const t = I18N[lang];
  const [tab, setTab] = useState<Tab>('entry');
  const [s, setS] = useState<State>(() => load(cfg));
  useEffect(() => { save(cfg, s); }, [s]);
  const set = (f: (x: State) => State) => setS((x) => f(x));
  const T = totals(s);

  /** If the open house has numbers but is not saved, ask whether to include it. Returns the state to use. */
  async function askCurrent(): Promise<State> {
    if (!currentHasData(s)) return s;
    const r = await confirmSheet(t.includeAsk.replace('{n}', String(s.cur + 1)), t.include, t.skip);
    if (r === 'yes') { const n = saveHere(s); setS(n); return n; }
    return s;
  }
  async function wipe() {
    if ((await confirmSheet(t.wipeAsk, t.wipeYes, t.cancel)) !== 'yes') return;
    if ((await confirmSheet(t.wipeAsk2, t.wipeYes, t.cancel)) !== 'yes') return;
    setS(initial()); setTab('entry'); toast(t.wipeDone);
  }
  async function finish() { await askCurrent(); setTab('review'); }
  const text = (st: State) => JSON.stringify(buildFile(cfg, st));
  const fname = `${cfg.team}_Day${cfg.day}.txt`;

  async function send() {
    const st = await askCurrent();
    const data = text(st);
    try {
      const file = new File([data], fname, { type: 'text/plain' });
      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) { await nav.share({ files: [file], title: fname }); return; }
    } catch (e: any) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'text/plain' }));
    a.download = fname; document.body.appendChild(a); a.click(); a.remove();
    toast(t.downloaded);
  }
  async function copy() {
    const st = await askCurrent();
    const data = text(st);
    try { await navigator.clipboard.writeText(data); toast(t.copied); }
    catch { window.prompt('Copy:', data); }
  }

  return (
    <div className="app team">
      <div className="topbar">
        <div className="logo" dir="ltr">{cfg.team}</div>
        <div className="tb-title"><b>{t.team} {cfg.team} · {t.day} {cfg.day}</b><small>{[cfg.area, cfg.uc].filter(Boolean).join(' · ')}</small></div>
      </div>
      <div className="strip">
        <div><small>{t.sA}</small><b>{T.A}</b></div>
        <div><small>{t.sB}</small><b>{T.totalVacc}</b></div>
        <div className="red"><small>{t.stillShort}</small><b>{T.still}</b></div>
      </div>
      <div className="content">
        {tab === 'entry' && <Entry t={t} s={s} set={set} finish={finish} />}
        {tab === 'missed' && <Missed t={t} s={s} set={set} />}
        {tab === 'review' && <Review t={t} s={s} c={cfg} set={set} send={send} copy={copy} />}
        {tab === 'settings' && <Settings t={t} c={cfg} onWipe={wipe} />}
      </div>
      <nav className="tabbar">
        {TABS.map((id) => (
          <button key={id} className={'tab' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}>
            <span className="pill"><Icon name={id} /></span><span className="lbl">{t[id]}</span>
          </button>
        ))}
      </nav>
      <Overlays />
    </div>
  );
}
