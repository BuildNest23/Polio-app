import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { S, useStore } from '../lib/state';
import { useLang, useTheme } from '../../shared/prefs';
import { useT } from '../strings';
import { teamCodes, renameTeam, resetTeamCodes, setStartDate, downloadWorkbook, changeFile, promptNewTemplate, startNewCampaign } from '../lib/workbook';

function TeamCodes({ onBack }: { onBack: () => void }) {
  useStore();
  const t = useT();
  const codes = teamCodes();
  return (
    <div className="content">
      <div className="row"><button className="iconbtn" aria-label={t.back} onClick={onBack}><ChevronLeft size={20} /></button><h2 className="h1">{t.teamCodes}</h2></div>
      <span className="muted small">{t.teamCodesHint}</span>
      <div className="card">
        {codes.map((c, i) => (
          <label className="field" key={i + c}>{t.cTeam} {i + 1}
            <input className="input" dir="ltr" defaultValue={c} placeholder={'T-' + (11 + i)}
              onBlur={(e) => { if (e.target.value.trim() !== c) renameTeam(i, e.target.value); }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
          </label>
        ))}
      </div>
      <button className="btn danger block" onClick={() => resetTeamCodes()}>{t.reset}</button>
    </div>
  );
}

export function MoreView() {
  useStore();
  const t = useT();
  const [lang, setLang] = useLang();
  const [theme, setTheme] = useTheme();
  const [sub, setSub] = useState(false);
  if (sub) return <TeamCodes onBack={() => setSub(false)} />;
  const hasFile = !!S.workbook;
  const rows: [string, () => void][] = hasFile
    ? [[t.teamCodes, () => setSub(true)], [t.dlExcel, () => downloadWorkbook()], [t.backup, () => downloadWorkbook('Backup')], [t.changeFile, () => changeFile()], [t.newTpl, () => promptNewTemplate()], [t.startNewCamp, () => startNewCampaign()]]
    : [[t.newTpl, () => promptNewTemplate()]];
  return (
    <div className="content">
      <h2 className="h1">{t.moreTitle}</h2>
      <div className="card">
        <span className="field">{t.language}</span>
        <div className="seg">
          <button className={'btn' + (lang === 'en' ? ' on' : '')} onClick={() => setLang('en')}>English</button>
          <button className={'btn' + (lang === 'ur' ? ' on' : '')} onClick={() => setLang('ur')}>اردو</button>
        </div>
      </div>
      <div className="card">
        <span className="field">{t.theme}</span>
        <div className="seg">
          <button className={'btn' + (theme === 'light' ? ' on' : '')} onClick={() => setTheme('light')}>{t.light}</button>
          <button className={'btn' + (theme === 'dark' ? ' on' : '')} onClick={() => setTheme('dark')}>{t.dark}</button>
        </div>
      </div>
      {hasFile && (
        <div className="card">
          <label className="field">{t.startDate}
            <input className="input" type="date" dir="ltr" value={S.meta.startDate || ''} onChange={(e) => setStartDate(e.target.value)} />
          </label>
        </div>
      )}
      {rows.map(([label, fn]) => (
        <button key={label} className="btn block" style={{ justifyContent: 'space-between', minHeight: 56, borderRadius: 16, fontWeight: 500, textAlign: 'start' }} onClick={fn}>
          <span>{label}</span><ChevronRight size={18} color="var(--mute)" style={{ transform: lang === 'ur' ? 'scaleX(-1)' : undefined }} />
        </button>
      ))}
    </div>
  );
}
