import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../shared/theme.css';
import '../shared/prefs';

// STAGE 1 placeholder. The real app (App.tsx + views/) is added in stage 2.
function Stage1() {
  return (
    <div className="app">
      <div className="topbar"><div className="logo">P</div><div className="tb-title"><b>Polio Incharge</b><small>Stage 1: project and F2A engine</small></div></div>
      <div className="content"><div className="card"><b>Project is set up.</b><span className="muted">Screens come in the next stage.</span></div></div>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<StrictMode><Stage1 /></StrictMode>);
