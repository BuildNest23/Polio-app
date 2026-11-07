import { useState } from 'react';
import type { Dict } from '../lib/i18n';
import { genDownload, genDownloadAll, genInfo, genShare, setGenField } from '../lib/teamio';
import { teamCodes } from '../lib/workbook';

export function TeamsView({ t }: { t: Dict }) {
  const [day, setDay] = useState(1);
  const [open, setOpen] = useState('');
  const codes = teamCodes().filter(Boolean);
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <h1 className="h1">{t.teamApps}</h1>
        <span className="muted small">{t.teamHint}</span>
      </div>
      <div className="chips">
        {[1, 2, 3].map((d) => <button key={d} className={'chip' + (d === day ? ' on' : '')} onClick={() => setDay(d)}>{t.day} {d}</button>)}
      </div>
      {codes.map((code) => {
        const i = genInfo(code);
        const editing = open === code;
        return (
          <div className="card" key={code}>
            <div className="row">
              <div className="logo" style={{ width: 48, height: 48, background: 'var(--pri-soft)', color: 'var(--pri)' }}>{code}</div>
              <div className="grow" style={{ display: 'flex', flexDirection: 'column' }}>
                <b style={{ fontSize: 14 }}>{i.area || t.area + ' —'}</b>
                <span className="small muted">{i.vac || t.vaccinator + ' —'}</span>
              </div>
              <button className="btn primary" style={{ minHeight: 44 }} onClick={() => genShare(code, day)}>{t.share}</button>
            </div>
            <div className="row">
              <button className="btn grow" style={{ minHeight: 40, fontSize: 13 }} onClick={() => genDownload(code, day)}>{t.downloadOne}</button>
              <button className="btn grow" style={{ minHeight: 40, fontSize: 13 }} onClick={() => setOpen(editing ? '' : code)}>{editing ? t.done : t.edit}</button>
            </div>
            {editing && (['area', 'uc', 'vac'] as const).map((k) => (
              <label className="field" key={k}>{k === 'area' ? t.area : k === 'uc' ? t.uc : t.vaccinator}
                <input className="input" defaultValue={i[k]} onChange={(e) => setGenField(code, k, e.target.value)} />
              </label>
            ))}
          </div>
        );
      })}
      <button className="btn outline big" onClick={() => genDownloadAll(day)}>{t.downloadAll}</button>
    </>
  );
}
