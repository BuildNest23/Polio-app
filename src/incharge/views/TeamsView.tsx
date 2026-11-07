import { useState } from 'react';
import { S, useStore, toast } from '../lib/state';
import { teamCodes, genInfo, genField, genCid, genShareOrDownload } from '../lib/workbook';
import { useT } from '../strings';

export function TeamsView() {
  useStore();
  const t = useT();
  const [day, setDay] = useState(1);
  const [open, setOpen] = useState('');
  const [, bump] = useState(0);
  const teams = teamCodes();
  const downloadAll = () => {
    teams.forEach((c, i) => setTimeout(() => genShareOrDownload(c, day, false), i * 600));
    toast('Downloading all teams. Allow multiple downloads if your browser asks.', 'info');
  };
  return (
    <div className="content">
      <div><h2 className="h1">{t.teamApps}</h2><span className="muted small">{t.teamHint}</span></div>
      <div className="chips" style={{ overflow: 'visible' }}>
        {[1, 2, 3].map((d) => <button key={d} className={'chip' + (d === day ? ' on' : '')} onClick={() => setDay(d)}>{t.day} {d}</button>)}
      </div>
      {teams.map((code) => {
        const info = genInfo(code);
        const isOpen = open === code;
        const field = (k: 'area' | 'uc' | 'vac', label: string) => (
          <label className="field">{label}
            <input className="input" defaultValue={(info as any)[k]} onChange={(e) => { genField(code, k, e.target.value); bump((n) => n + 1); }} />
          </label>
        );
        return (
          <div className="card" key={code}>
            <div className="row">
              <div className="logo" style={{ width: 48, height: 48, background: 'var(--pri-soft)', color: 'var(--pri)' }}>{code}</div>
              <div className="grow" style={{ display: 'flex', flexDirection: 'column' }}>
                <b style={{ fontSize: 14 }}>{info.area || t.area + ' —'}</b>
                <span className="small muted">{info.vac || t.vaccinator + ' —'}</span>
              </div>
              <button className="btn primary" style={{ minHeight: 44 }} onClick={() => genShareOrDownload(code, day, true)}>{t.share}</button>
            </div>
            <div className="row">
              <button className="btn grow" style={{ minHeight: 40, fontSize: 13 }} onClick={() => genShareOrDownload(code, day, false)}>{t.downloadOne}</button>
              <button className="btn grow" style={{ minHeight: 40, fontSize: 13 }} onClick={() => setOpen(isOpen ? '' : code)}>{isOpen ? t.done : t.edit}</button>
            </div>
            {isOpen && <>{field('area', t.area)}{field('uc', t.uc)}{field('vac', t.vaccinator)}</>}
          </div>
        );
      })}
      <button className="btn outline big block" onClick={downloadAll}>{t.downloadAll} ({t.day} {day})</button>
      <span className="small muted">{t.campaignId}: <b dir="ltr">{genCid()}</b></span>
    </div>
  );
}
