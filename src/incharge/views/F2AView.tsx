import { useState } from 'react';
import { S, useStore, isDirty } from '../lib/state';
import type { Section } from '../lib/core';
import { sectionTitleText } from '../lib/core';
import { cellDisplayValue, formulaDisplay } from '../lib/engine';
import {
  getSheet, getMerge, shownLastCol, setCellFromInput, sectionDateFull, discardChanges, downloadWorkbook, startNewCampaign,
} from '../lib/workbook';
import { useT } from '../strings';

/* ---------- one editable number cell ---------- */
function CellInput({ row, col, initial }: { row: number; col: number; initial: string }) {
  const [v, setV] = useState(initial);
  return (
    <input
      type="text" inputMode="decimal" value={v} aria-label={'row ' + row + ' column ' + col}
      onChange={(e) => { setV(e.target.value); setCellFromInput(row, col, e.target.value); }}
      onFocus={(e) => e.target.select()}
      onBlur={() => { const r = v.trim(); if (r !== '' && !isNaN(Number(r))) setV(String(Number(r))); }}
    />
  );
}

/* ---------- the F2A table for one section (also used for printing) ---------- */
export function SectionTable({ section, print = false }: { section: Section; print?: boolean }) {
  const sheet = getSheet();
  if (!sheet) return null;
  const lastCol = shownLastCol(sheet, section);
  const skip: Record<string, boolean> = {};
  const isNextGray = (c: number) => /^next[123]$/.test(section.key) && c === 3;
  const allRows = [...section.headerRows, ...section.teamRows, ...(section.totalRow ? [section.totalRow] : [])];
  const minR = Math.min(...allRows), maxR = Math.max(...allRows);

  const renderRow = (r: number, kind: 'header' | 'team' | 'total', hIdx = 0) => {
    const cells: any[] = [];
    let c = 1;
    while (c <= lastCol) {
      const key = r + ',' + c;
      if (skip[key]) { c++; continue; }
      const merge = getMerge(r, c);
      const cell = sheet.getCell(r, c);
      const v = cellDisplayValue(cell);
      let colspan = 1, rowspan = 1;
      if (merge) {
        if (!merge.isMaster) { skip[key] = true; c++; continue; }
        const effR2 = Math.min(merge.r2, maxR), effC2 = Math.min(merge.c2, lastCol), effC1 = Math.max(merge.c1, 1);
        colspan = effC2 - c + 1; rowspan = effR2 - r + 1;
        for (let cc = c + 1; cc <= effC2; cc++) skip[r + ',' + cc] = true;
        for (let rr = r + 1; rr <= effR2; rr++) for (let cc = effC1; cc <= effC2; cc++) skip[rr + ',' + cc] = true;
      }
      const isFirst = c === 1;
      const isFormula = !!cell.formula;
      if (kind === 'header') {
        let cls = '';
        if (isFirst) cls = 'teamh';
        if (isNextGray(c) && colspan === 1) cls += ' grayh';
        if (colspan === 1 && !isFirst && hIdx === 1) cls += ' leaf';
        cells.push(<th key={c} colSpan={colspan} rowSpan={rowspan} className={cls}>{String(v)}</th>);
      } else if (kind === 'team') {
        if (isFirst) cells.push(<td key={c} className="team">{String(v)}</td>);
        else if (isNextGray(c)) cells.push(<td key={c} className="gray">—</td>);
        else if (isFormula) {
          const d = formulaDisplay(sheet, cell);
          const isText = typeof d === 'string' && !/^-?\d/.test(d);
          cells.push(<td key={c} className={isText ? 'txt' : 'calc'}>{String(d)}</td>);
        } else if (merge && (colspan > 1 || rowspan > 1)) cells.push(<td key={c} colSpan={colspan} rowSpan={rowspan} className="merged">{String(v)}</td>);
        else if (print) cells.push(<td key={c}>{String(v)}</td>);
        else {
          const changed = S.edited.has(key);
          const val = cell.value === null || cell.value === undefined ? '' : String(cellDisplayValue(cell));
          cells.push(<td key={c} className={changed ? 'changed' : ''}><CellInput key={S.epoch + ':' + key} row={r} col={c} initial={val} /></td>);
        }
      } else {
        if (isFirst) cells.push(<td key={c} className="team totalname">{String(v)}</td>);
        else if (isFormula) {
          const d = formulaDisplay(sheet, cell);
          const isText = typeof d === 'string' && !/^-?\d/.test(d);
          cells.push(<td key={c} className={isText ? 'txt' : 'calc'}>{String(d)}</td>);
        } else cells.push(<td key={c}>{String(v)}</td>);
      }
      c += colspan;
    }
    return cells;
  };
  void minR;
  return (
    <table className="f2a">
      <thead>
        {section.headerRows.map((r, i) => <tr key={r} className={i === 0 ? 'h1r' : 'h2r'}>{renderRow(r, 'header', i)}</tr>)}
      </thead>
      <tbody>
        {section.teamRows.map((r) => <tr key={r}>{renderRow(r, 'team')}</tr>)}
        {section.totalRow ? <tr key="tot" className="total">{renderRow(section.totalRow, 'total')}</tr> : null}
      </tbody>
    </table>
  );
}

/* ---------- zoom level (cell size), remembered ---------- */
const LEVELS: [number, number][] = [[32, 12], [38, 13.5], [44, 15], [50, 16.5], [58, 18]];
function getLvl() { try { const n = parseInt(localStorage.getItem('pcCell2') || '1', 10); return n >= 0 && n < 5 ? n : 1; } catch { return 1; } }

async function printSection(section: Section) {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const tableHtml = renderToStaticMarkup(<SectionTable section={section} print />);
  const full = sectionDateFull(section);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${section.label}</title><style>
    @page{size:A4 landscape;margin:8mm}body{font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff}
    h1{font-size:14pt;text-align:center;margin:0 0 2mm}table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #000;padding:1.5mm 1mm;font-size:7pt;text-align:center;vertical-align:middle}
    th{background:#e5e7eb;font-weight:800}tr.total td{background:#e5e7eb;font-weight:800}</style></head><body>
    <h1>${sectionTitleText(section)} — F2A Field Report</h1>${full ? `<div style="text-align:center;font-weight:700;margin-bottom:4mm">${full}</div>` : ''}
    ${tableHtml}</body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html); w.document.close(); w.onload = () => { w.focus(); w.print(); };
}

export function F2AView() {
  useStore();
  const t = useT();
  const [key, setKey] = useState('day1');
  const [lvl, setLvl] = useState(getLvl());
  const all = [...S.main, ...S.next];
  const section = all.find((s) => s.key === key) || all[0];
  const sheet = getSheet();
  if (!sheet || !section) return null;
  const [cw, fs] = LEVELS[lvl];
  const zoom = (d: number) => { const n = Math.max(0, Math.min(4, lvl + d)); setLvl(n); try { localStorage.setItem('pcCell2', String(n)); } catch { /* ignore */ } };
  const label = (s: Section) => /^day/.test(s.key) ? t.day + ' ' + s.key.slice(-1) : /^catch/.test(s.key) ? t.catchDay + ' ' + s.key.slice(-1) : s.label;
  const dirty = isDirty();
  const full = sectionDateFull(section);
  const isNext = section.group === 'next';
  return (
    <div className="content fill">
      <div className="card row" style={{ flex: 'none', flexDirection: 'row', padding: '8px 12px', borderRadius: 14 }}>
        <div className="grow" style={{ display: 'flex', flexDirection: 'column' }}>
          <b dir="ltr" style={{ fontSize: 13, textAlign: 'start', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{S.fileName}</b>
          <span className="small muted"><span className={'dot' + (dirty ? ' dirty' : '')} />{S.edited.size ? S.edited.size + ' ' + t.changed : S.bulk ? t.bulk : t.noChange}</span>
        </div>
        <button className="btn danger" style={{ minHeight: 40, padding: '0 14px', fontSize: 13 }} onClick={() => discardChanges()}>{t.discard}</button>
      </div>
      <div className="chips">
        {all.map((s) => <button key={s.key} className={'chip' + (s.key === section.key ? ' on' : '')} onClick={() => setKey(s.key)}>{label(s)}</button>)}
      </div>
      <div className="row between" style={{ flex: 'none' }}>
        <b style={{ fontSize: 15 }}>{sectionTitleText(section)}</b>
        <span dir="ltr" className="small muted">{full}</span>
      </div>
      {isNext && (
        <div className="notice" style={{ flex: 'none' }}>
          {t.nextNote}{' '}
          <button className="btn outline" style={{ minHeight: 36, padding: '0 12px', marginTop: 6 }} onClick={() => startNewCampaign()}>{t.startNew}</button>
        </div>
      )}
      <div className="f2a-wrap">
        <div style={{ ['--cw' as any]: cw + 'px', ['--fs' as any]: fs + 'px' }}>
          <SectionTable key={S.epoch + ':' + section.key} section={section} />
        </div>
      </div>
      <div className="legend">
        <span><i style={{ background: 'var(--card)' }} />{t.lgEdit}</span>
        <span><i style={{ background: 'var(--calc)' }} />{t.lgCalc}</span>
        <span><i style={{ background: 'var(--chg)' }} />{t.lgChg}</span>
      </div>
      <div className="row" style={{ flex: 'none', paddingBottom: 10 }}>
        <button className="btn" style={{ width: 48, padding: 0 }} aria-label="Smaller cells" onClick={() => zoom(-1)}>A−</button>
        <button className="btn" style={{ width: 48, padding: 0 }} aria-label="Bigger cells" onClick={() => zoom(1)}>A+</button>
        <button className="btn" onClick={() => printSection(section)}>{t.print}</button>
        <button className="btn primary grow" onClick={() => downloadWorkbook()}>{t.download}</button>
      </div>
    </div>
  );
}
