import { useEffect, useState } from 'react';
import { Table2, Users, Download, BarChart3, Menu, Sun, Moon } from 'lucide-react';
import { S, useStore } from './lib/state';
import { restoreSession } from './lib/workbook';
import { useTheme } from '../shared/prefs';
import { useT } from './strings';
import { Dialogs } from './views/Dialogs';
import { Welcome } from './views/Welcome';
import { F2AView } from './views/F2AView';
import { TeamsView } from './views/TeamsView';
import { ImportView } from './views/ImportView';
import { ChildrenView } from './views/ChildrenView';
import { MoreView } from './views/MoreView';

type Tab = 'f2a' | 'gen' | 'imp' | 'kids' | 'more';
const TABS: [Tab, any][] = [['f2a', Table2], ['gen', Users], ['imp', Download], ['kids', BarChart3], ['more', Menu]];

export default function App() {
  useStore();
  const t = useT();
  const [tab, setTab] = useState<Tab>('f2a');
  const [theme, setTheme] = useTheme();
  const [ready, setReady] = useState(false);
  useEffect(() => { restoreSession().finally(() => setReady(true)); }, []);
  const hasFile = !!S.workbook;
  let body;
  if (!ready) body = <div className="content"><span className="muted">…</span></div>;
  else if (tab === 'more') body = <MoreView />;
  else if (!hasFile) body = <Welcome />;
  else if (tab === 'f2a') body = <F2AView />;
  else if (tab === 'gen') body = <TeamsView />;
  else if (tab === 'imp') body = <ImportView />;
  else body = <ChildrenView />;
  return (
    <div className="app">
      <div className="topbar">
        <div className="logo">P</div>
        <div className="tb-title"><b>{t.title}</b><small dir="ltr">{hasFile ? S.fileName : t.noFile}</small></div>
        <button className="iconbtn" aria-label="Theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
      {body}
      <div className="tabbar">
        {TABS.map(([id, Icon]) => (
          <button key={id} className={'tab' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}>
            <span className="pill"><Icon size={22} /></span><span className="lbl">{t[id]}</span>
          </button>
        ))}
      </div>
      <Dialogs />
    </div>
  );
}
