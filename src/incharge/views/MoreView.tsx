import { useState } from 'react';
import { useLang, useTheme } from '../../shared/prefs';
import { Icon } from '../Icon';
import type { Dict } from '../lib/i18n';
import { S } from '../lib/state';
import { changeFile, downloadWorkbook, promptNewTemplate, setStartDate, setTeamCode, teamCodes } from '../lib/workbook';

function Codes({ t, back }: { t: Dict; back: () => void }) {
  const codes = teamCodes();
  return (
    <>
      <div className="row"><button className="btn" onClick={back}>‹ {t.back}</button><h1 className="h1">{t.codes}</h1></div>
      <span className="muted small">{t.codesHint}</span>
      <div className="card">
        {codes.map((c, i) => (
          <label className="field" key={i + '-' + S.epoch}>#{i + 1}
            <input className="input" defaultValue={c} onBlur={(e) => { if (e.target.value.trim() !== c) { if (!setTeamCode(i, e.target.value)) e.target.value = c; } }} />
          </label>
        ))}
      </div>
    </>
  );
}

export function MoreView({ t }: { t: Dict }) {
  const [lang, setLang] = useLang();
  const [theme, setTheme] = useTheme();
  const [sub, setSub] = useState('');
  if (sub === 'codes') return <Codes t={t} back={() => setSub('')} />;
  const rows: [string, () => void][] = [
    [t.codes, () => setSub('codes')],
    [t.backup, () => downloadWorkbook('Backup')],
    [t.changeFile, changeFile],
    [t.createTpl, promptNewTemplate],
  ];
  return (
    <>
      <h1 className="h1">{t.moreTitle}</h1>
      <div className="card">
        <span className="small muted"><b>{t.language}</b></span>
        <div className="seg">
          <button className={'btn' + (lang === 'en' ? ' on' : '')} onClick={() => setLang('en')}>English</button>
          <button className={'btn' + (lang === 'ur' ? ' on' : '')} onClick={() => setLang('ur')}>اردو</button>
        </div>
      </div>
      <div className="card">
        <span className="small muted"><b>{t.theme}</b></span>
        <div className="seg">
          <button className={'btn' + (theme === 'light' ? ' on' : '')} onClick={() => setTheme('light')}>{t.light}</button>
          <button className={'btn' + (theme === 'dark' ? ' on' : '')} onClick={() => setTheme('dark')}>{t.dark}</button>
        </div>
      </div>
      <div className="card">
        <label className="field">{t.startDate}
          <input className="input" type="date" value={S.startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
      </div>
      {rows.map(([label, fn]) => (
        <button key={label} className="btn" style={{ justifyContent: 'space-between', minHeight: 56, textAlign: 'start' }} onClick={fn}>
          <span>{label}</span><Icon name="chev" size={18} />
        </button>
      ))}
    </>
  );
}
