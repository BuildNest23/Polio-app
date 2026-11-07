import { useRef } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useT } from '../strings';
import { handleFile, promptNewTemplate } from '../lib/workbook';

export function Welcome() {
  const t = useT();
  const inp = useRef<HTMLInputElement>(null);
  return (
    <div className="content">
      <div className="card" style={{ alignItems: 'center', textAlign: 'center', padding: 24 }}>
        <FileSpreadsheet size={44} color="var(--pri)" />
        <h2 className="h1">{t.welcomeTitle}</h2>
        <span className="muted">{t.welcomeText}</span>
        <input ref={inp} type="file" accept=".xlsx" className="hidden-input" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        <button className="btn primary big block" onClick={() => inp.current?.click()}>{t.chooseFile}</button>
        <button className="btn outline big block" onClick={() => promptNewTemplate()}>{t.createTpl}</button>
      </div>
    </div>
  );
}
