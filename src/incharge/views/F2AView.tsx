import { useState } from 'react';
import type { Dict } from '../lib/i18n';
import { S, emit, isDirty, mainSections, nextSections } from '../lib/state';
import { buildSectionModel, discardChanges, editCell, printSection, sectionDateFull, startNewCampaign, downloadWorkbook } from '../lib/workbook';

const LEVELS: [number, number][] = [[32, 12], [38, 13.5], [44, 15], [50, 16.5], [58, 18]];

function CellInput({ row, col, init }: { row: number; col: number; init: string }) {
  const [v, setV] = useState(String(init));
  return (
    <input
      type="text" inputMode="decimal" aria-label={'R' + row + ' C' + col} value={v}
      onFocus={(e) => e.target.select()}
      onChange={(e) => { const raw = e.target.value; if (editCell(row, col, raw)) setV(raw); }}
      onBlur={() => { const t = v.trim(); if (t !== '' && !isNaN(Number(t))) setV(String(Number(t))); }}
    />
  );
}

export function F2AView({ t }: { t: Dict }) {
  const [lvl, setLvl] = useState(() => { try { const n = parseInt(localStorage.getItem('pcCell2') || '1', 10); return n >= 0 && n < 5 ? n : 1; } catch { return 1; } });
  const zoom = (d: number) => { const n = Math.max(0, Math.min(4, lvl + d)); setLvl(n); try { localStorage.setItem('pcCell2', String(n)); } catch { /* ignore */ } };
  const main = mainSections(), next = nextSections();
  const all = [...main, ...next];
  const section = all.find((s) => s.key === S.section) || main[0];
  const rows = buildSectionModel(section);
  const dirty = isDirty();
  const label = S.edited.size ? S.edited.size + ' ' + t.unsaved : S.bulk ? t.bulk : t.clean;
  const date = sectionDateFull(section.key);
  const [w, f] = LEVELS[lvl];

  return (
    <>
      <div className="card" style={{ flex: 'none', flexDirection: 'row', alignItems: 'center', padding: '8px 12px', borderRadius: 14 }}>
        <div className="grow" style={{ display: 'flex', flexDirection: 'column' }}>
          <b dir="ltr" style={{ fontSize: 13, textAlign: 'start', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{S.fileName}</b>
          <span className="small muted"><span className={'dot' + (dirty ? ' dirty' : '')} />{label}</span>
        </div>
        <button className="btn danger" style={{ minHeight: 40, padding: '0 14px', fontSize: 13 }} disabled={!dirty} onClick={discardChanges}>{t.discard}</button>
      </div>
      <div className="chips">
        {all.map((s) => (
          <button key={s.key} className={'chip' + (s.key === section.key ? ' on' : '')} onClick={() => { S.section = s.key; emit(); }}>{s.label}</button>
        ))}
      </div>
      <div className="sectitle">
        <b style={{ fontSize: 15 }}>{section.label}</b>
        {date ? <span dir="ltr" className="small muted">{date}</span> : section.group === 'next' ? (
          <button className="btn danger" style={{ minHeight: 36, padding: '0 12px', fontSize: 12 }} onClick={startNewCampaign}>{t.startNew}</button>
        ) : null}
      </div>
      <div className="f2a-wrap" style={{ ['--cw' as any]: w + 'px', ['--fs' as any]: f + 'px' }}>
        <table className="f2a">
          <thead>
            {rows.filter((r) => r.kind === 'header').map((r) => (
              <tr key={'h' + r.idx} className={r.idx === 0 ? 'h1r' : 'h2r'}>
                {r.cells.map((c) => <th key={c.col} className={c.cls} colSpan={c.colspan} rowSpan={c.rowspan}>{String(c.display)}</th>)}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.filter((r) => r.kind !== 'header').map((r) => (
              <tr key={r.kind + r.idx} className={r.kind === 'total' ? 'total' : ''}>
                {r.cells.map((c) => (
                  <td key={c.col + '-' + S.epoch} className={c.cls} colSpan={c.colspan} rowSpan={c.rowspan}>
                    {c.input ? <CellInput row={c.row} col={c.col} init={String(c.display)} /> : String(c.display)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="legend">
        <span><i style={{ background: 'var(--card)' }} />{t.legEdit}</span>
        <span><i style={{ background: 'var(--calc)' }} />{t.legCalc}</span>
        <span><i style={{ background: 'var(--chg)' }} />{t.legChg}</span>
      </div>
      <div className="f2a-actions">
        <button className="btn" style={{ width: 48, padding: 0 }} onClick={() => zoom(-1)} aria-label="Smaller cells">A−</button>
        <button className="btn" style={{ width: 48, padding: 0, fontSize: 17 }} onClick={() => zoom(1)} aria-label="Bigger cells">A+</button>
        <button className="btn" onClick={() => printSection(section)}>{t.print}</button>
        <button className="btn primary grow" onClick={() => downloadWorkbook()}>{t.download}</button>
      </div>
    </>
  );
}
