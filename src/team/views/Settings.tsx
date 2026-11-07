import { useLang, useTheme } from '../../shared/prefs';
import type { Dict } from '../i18n';
import type { Config } from '../model';

export function Settings({ t, c, onWipe }: { t: Dict; c: Config; onWipe: () => void }) {
  const [lang, setLang] = useLang();
  const [theme, setTheme] = useTheme();
  return (
    <>
      <div className="card">
        <b>{t.language}</b>
        <div className="seg">
          <button className={'btn big' + (lang === 'en' ? ' on' : '')} onClick={() => setLang('en')}>English</button>
          <button className={'btn big' + (lang === 'ur' ? ' on' : '')} onClick={() => setLang('ur')}>اردو</button>
        </div>
      </div>
      <div className="card">
        <b>{t.theme}</b>
        <div className="seg">
          <button className={'btn big' + (theme === 'light' ? ' on' : '')} onClick={() => setTheme('light')}>{t.light}</button>
          <button className={'btn big' + (theme === 'dark' ? ' on' : '')} onClick={() => setTheme('dark')}>{t.dark}</button>
        </div>
      </div>
      <div className="card">
        <div className="listrow"><span>{t.team}</span><b dir="ltr">{c.team}</b></div>
        <div className="listrow"><span>{t.day}</span><b>{c.day}</b></div>
        {c.area && <div className="listrow"><span>Area</span><b>{c.area}</b></div>}
        {c.uc && <div className="listrow"><span>UC</span><b>{c.uc}</b></div>}
        {c.vaccinator && <div className="listrow"><span>{t.members}</span><b>{c.vaccinator}</b></div>}
        <span className="muted">{t.about}</span>
      </div>
      <button className="btn danger big block" onClick={onWipe}>{t.wipe}</button>
    </>
  );
}
