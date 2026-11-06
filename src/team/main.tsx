import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../shared/theme.css';
import '../shared/prefs';

// STAGE 1 placeholder. The real team app is added in stage 3.
const cfg = JSON.parse(document.getElementById('polio-config')!.textContent || '{}');
function Stage1() {
  return (
    <div className="app">
      <div className="topbar"><div className="logo">{cfg.team}</div><div className="tb-title"><b>Team {cfg.team} · Day {cfg.day}</b><small>Stage 1 placeholder</small></div></div>
      <div className="content"><div className="card"><b>Team app placeholder.</b></div></div>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<StrictMode><Stage1 /></StrictMode>);
