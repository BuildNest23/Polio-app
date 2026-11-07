import { useEffect, useRef, useState } from 'react';
import { useLang, useTheme } from '../shared/prefs';
import { Dialogs } from './Dialogs';
import { Icon } from './Icon';
import { I18N } from './lib/i18n';
import { S, useStore } from './lib/state';
import { loadGenStore, loadImports } from './lib/teamio';
import { openFile, promptNewTemplate, restoreSaved } from './lib/workbook';
import { ChildrenView } from './views/ChildrenView';
import { F2AView } from './views/F2AView';
import { ImportView } from './views/ImportView';
import { MoreView } from './views/MoreView';
import { TeamsView } from './views/TeamsView';

const TABS = ['f2a', 'gen', 'imp', 'kids', 'more'] as const;

export default function App() {
  useStore();
  const [lang] = useLang();
  const [theme, setTheme] = useTheme();
  const t = I18N[lang];
  const [tab, setTab] = useState<(typeof TABS)[number]>('f2a');
  const [ready, setReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { (async () => { await loadGenStore(); await loadImports(); await restoreSaved(); setReady(true); })(); }, []);

  const hasFile = !!S.workbook;
  return (
    <div className="app">
      <div className="topbar">
        <div className="logo">P</div>
        <div className="tb-title"><b>{t.app}</b><small dir="ltr" style={{ textAlign: 'start' }}>{hasFile ? S.fileName : t.noFile}</small></div>
        <button className="iconbtn" aria-label="Theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} /></button>
      </div>

      {!hasFile ? (
        <div className="content">
          {ready ? (
            <div className="card">
              <h1 className="h1">{t.welcomeTitle}</h1>
              <span className="muted">{t.welcomeText}</span>
              <input ref={fileRef} type="file" accept=".xlsx" className="hidden-input" onChange={(e) => { const f = e.target.files?.[0]; if (f) openFile(f); e.target.value = ''; }} />
              <button className="btn primary big block" onClick={() => fileRef.current?.click()}>{t.chooseFile}</button>
              <button className="btn big block" onClick={promptNewTemplate}>{t.createTpl}</button>
            </div>
          ) : <span className="muted">…</span>}
        </div>
      ) : (
        <>
          <div className={'content' + (tab === 'f2a' ? ' fill' : '')}>
            {tab === 'f2a' && <F2AView t={t} />}
            {tab === 'gen' && <TeamsView t={t} />}
            {tab === 'imp' && <ImportView t={t} />}
            {tab === 'kids' && <ChildrenView t={t} />}
            {tab === 'more' && <MoreView t={t} />}
          </div>
          <nav className="tabbar">
            {TABS.map((id) => (
              <button key={id} className={'tab' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}>
                <span className="pill"><Icon name={id} /></span><span className="lbl">{t[id]}</span>
              </button>
            ))}
          </nav>
        </>
      )}
      <Dialogs />
    </div>
  );
}
