// Everything that reads or changes the Excel file. Ported from the original Polio.html.
import {
  COLS, LAST_COL, MAX_COLS, COL_WIDTHS, CATCH_MAP, IMPORT_MAP, IFTXT, buildSectionMap, colLetter, colLetterToNum,
  groupsFor, sectionKind, sectionTitleText, bodyLastCol, todayISO, type Section,
} from './core';
import { cellDisplayValue, evaluateFormula, evalIncDec, importParse, importTotals } from './engine';
import { S, emit, idbGet, idbSet, isDirty, toast, uiConfirm, uiPrompt, applySectionMap } from './state';

const META_SHEET = '_F2A_Meta';
let autosaveTimer: any = null;

async function xl() { return (await import('exceljs')).default; }
export const getSheet = () => S.workbook?.getWorksheet('F2A');

/* ---------- merges ---------- */
export function buildMergeMap(sheet: any) {
  const map: Record<string, any> = {};
  const merges = (sheet.model && sheet.model.merges) || [];
  for (const range of merges) {
    const parts = String(range).split(':');
    if (parts.length !== 2) continue;
    const m1 = parts[0].match(/^([A-Z]+)(\d+)$/i), m2 = parts[1].match(/^([A-Z]+)(\d+)$/i);
    if (!m1 || !m2) continue;
    const c1 = colLetterToNum(m1[1].toUpperCase()), r1 = parseInt(m1[2], 10);
    const c2 = colLetterToNum(m2[1].toUpperCase()), r2 = parseInt(m2[2], 10);
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) map[r + ',' + c] = { r1, c1, r2, c2, isMaster: r === r1 && c === c1 };
  }
  return map;
}
export const getMerge = (r: number, c: number) => (S.mergeMap ? S.mergeMap[r + ',' + c] : null);

export function detectLastUsedColumn(sheet: any, rows: number[]) {
  let maxCol = 0;
  for (const r of rows) for (let c = 1; c <= MAX_COLS; c++) {
    const v = sheet.getCell(r, c).value;
    if (v !== null && v !== undefined && v !== '') maxCol = Math.max(maxCol, c);
  }
  for (const range of (sheet.model && sheet.model.merges) || []) {
    const parts = String(range).split(':'); if (parts.length !== 2) continue;
    const m1 = parts[0].match(/^([A-Z]+)(\d+)$/i), m2 = parts[1].match(/^([A-Z]+)(\d+)$/i);
    if (!m1 || !m2) continue;
    const r1 = parseInt(m1[2], 10), r2 = parseInt(m2[2], 10);
    if (rows.some((r) => r >= r1 && r <= r2)) maxCol = Math.max(maxCol, colLetterToNum(m2[1].toUpperCase()));
  }
  return maxCol || LAST_COL;
}

/** Last column to show for a section (Children Count columns are hidden here; see Children tab). */
export function shownLastCol(sheet: any, s: Section) {
  const rows = [...s.headerRows, ...s.teamRows, ...(s.totalRow ? [s.totalRow] : [])];
  let last = detectLastUsedColumn(sheet, rows);
  if (/^(day[123]|catch\d+)$/.test(s.key)) { const cc = childCols(sheet, s); if (cc && cc <= last) last = cc - 1; }
  return last;
}

/* ---------- campaign meta + template params ---------- */
const metaKey = () => 'polioMeta:' + (S.fileName || '_default_');
function loadMeta() { try { const r = localStorage.getItem(metaKey()); return r ? JSON.parse(r) : { startDate: '' }; } catch { return { startDate: '' }; } }
export function saveMeta() {
  try { localStorage.setItem(metaKey(), JSON.stringify(S.meta)); } catch { /* ignore */ }
  if (S.workbook) { writeSheetMeta({ nTeams: S.params.nTeams, nCatch: S.params.nCatch, startDate: S.meta.startDate || '' }); scheduleAutosave(); }
}
export function setStartDate(v: string) { S.meta.startDate = v; saveMeta(); emit(); }
function readSheetMeta(): any {
  try { const s = S.workbook.getWorksheet(META_SHEET); if (!s) return null; const o: any = {}; s.eachRow((r: any) => { const k = r.getCell(1).value; if (k) o[k] = r.getCell(2).value; }); return o; } catch { return null; }
}
function writeSheetMeta(obj: any) {
  try {
    let s = S.workbook.getWorksheet(META_SHEET);
    if (!s) { s = S.workbook.addWorksheet(META_SHEET); s.state = 'hidden'; }
    Object.keys(obj).forEach((k, i) => { s.getCell(i + 1, 1).value = k; s.getCell(i + 1, 2).value = obj[k]; });
  } catch { /* ignore */ }
}
const tplKey = (f: string) => 'polioTemplateParams:' + f;
const saveTplParams = (f: string, p: any) => { try { localStorage.setItem(tplKey(f), JSON.stringify(p)); } catch { /* ignore */ } };
function loadTplParams(f: string) { try { const r = localStorage.getItem(tplKey(f)); return r ? JSON.parse(r) : null; } catch { return null; } }
const paramsFromName = (name: string) => loadTplParams(name) || loadTplParams(String(name || '').replace(/( - (Updated|Backup).*)?\.xlsx$/i, '') + '.xlsx');

/* ---------- section dates ---------- */
function parseLocalDate(str: string) {
  const m = String(str || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]); return isNaN(d.getTime()) ? null : d;
}
export function sectionDateFull(s: Section) {
  if (s.dayOffset === undefined || !S.meta.startDate) return '';
  const base = parseLocalDate(S.meta.startDate); if (!base) return '';
  const d = new Date(base); d.setDate(d.getDate() + s.dayOffset);
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/* ---------- load / discard / change file ---------- */
export async function handleFile(file: File) {
  if (!file) return;
  if (!/\.xlsx$/i.test(file.name)) { toast('Please choose an .xlsx file', 'error'); return; }
  try {
    toast('Opening ' + file.name + '…', 'info');
    const buf = await file.arrayBuffer();
    await loadWorkbookFromBuffer(buf, file.name);
    try { await idbSet('polioCurrentFile', { name: file.name, buffer: buf }); await idbSet('polioOriginalFile', { name: file.name, buffer: buf }); } catch { /* ignore */ }
  } catch (err: any) { console.error(err); toast('Could not load file: ' + err.message, 'error'); }
}

export async function loadWorkbookFromBuffer(buffer: ArrayBuffer, name: string) {
  const ExcelJS = await xl();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  S.workbook = wb; S.originalBuffer = buffer; S.fileName = name || 'workbook.xlsx';
  S.edited = new Set(); S.bulk = false;
  const sheet = wb.getWorksheet('F2A');
  if (!sheet) { toast("No 'F2A' sheet found.", 'error'); S.workbook = null; emit(); return; }
  S.mergeMap = buildMergeMap(sheet);
  try { wb.calcProperties.fullCalcOnLoad = true; } catch { /* ignore */ }
  const sm = readSheetMeta();
  let params = sm && sm.nTeams ? sm : paramsFromName(S.fileName);
  if (!(params && params.nTeams)) {
    let n = parseInt((await uiPrompt('How many teams are in this file?', '5', { title: 'File layout', yesText: 'Next' })) as any, 10);
    if (!(n >= 1 && n <= 20)) n = 5;
    let k = parseInt((await uiPrompt('How many catch-up days (0, 1 or 2)?', '1', { title: 'File layout', yesText: 'OK' })) as any, 10);
    if (!(k >= 0 && k <= 2)) k = 1;
    params = { nTeams: n, nCatch: k };
  }
  applySectionMap(Number(params.nTeams), Number(params.nCatch) || 0);
  S.meta = loadMeta();
  if (sm && sm.startDate) S.meta.startDate = String(sm.startDate);
  writeSheetMeta({ nTeams: S.params.nTeams, nCatch: S.params.nCatch, startDate: S.meta.startDate || '' });
  S.epoch++; emit();
  toast('Loaded: ' + S.fileName, 'success');
}
export async function discardChanges() {
  if (!S.originalBuffer) return;
  if (!(await uiConfirm('Discard all unsaved changes and reload the original file?', { title: 'Discard changes', yesText: 'Discard', danger: true }))) return;
  await loadWorkbookFromBuffer(S.originalBuffer, S.fileName);
  toast('Changes discarded.', 'info');
}
export async function changeFile() {
  if (!(await uiConfirm('Load a different file?\n\nUnsaved changes will be lost.', { title: 'Change file', yesText: 'Change', danger: true }))) return;
  S.workbook = null; S.originalBuffer = null; S.fileName = ''; S.mergeMap = null; S.edited = new Set(); S.bulk = false; S.meta = { startDate: '' };
  applySectionMap(5, 1); S.epoch++; emit();
}

/* ---------- save / download / autosave ---------- */
export function fillCachedResults() {
  const sheet = getSheet(); if (!sheet) return;
  sheet.eachRow({ includeEmpty: false }, (row: any) => row.eachCell({ includeEmpty: false }, (cell: any) => {
    const f = cell.formula; if (!f) return;
    try {
      let res: any = evaluateFormula(sheet, f, 0);
      if (res === null || res === undefined || (typeof res === 'number' && !isFinite(res))) res = evalIncDec(sheet, f);
      if (res !== null && res !== undefined) cell.value = { formula: f, result: res };
    } catch { /* ignore */ }
  }));
}
export async function serializeWorkbook() {
  try { S.workbook.calcProperties.fullCalcOnLoad = true; } catch { /* ignore */ }
  fillCachedResults();
  return await S.workbook.xlsx.writeBuffer();
}
export function scheduleAutosave() { clearTimeout(autosaveTimer); autosaveTimer = setTimeout(autosaveNow, 1500); }
export async function autosaveNow() {
  if (!S.workbook || !isDirty()) return;
  try { const buf = await serializeWorkbook(); await idbSet('polioCurrentFile', { name: S.fileName, buffer: buf, dirty: true }); } catch (e) { console.warn('Autosave failed', e); }
}
export async function downloadWorkbook(suffix?: string) {
  if (!S.workbook) { toast('No workbook loaded', 'error'); return; }
  try {
    toast('Preparing file…', 'info');
    const buf = await serializeWorkbook();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${S.fileName.replace(/\.xlsx$/i, '')} - ${suffix || 'Updated'}.xlsx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    if (suffix) { toast('Backup downloaded.', 'success'); return; }
    S.originalBuffer = buf;
    try { await idbSet('polioCurrentFile', { name: S.fileName, buffer: buf, dirty: false }); await idbSet('polioOriginalFile', { name: S.fileName, buffer: buf }); } catch { /* ignore */ }
    S.edited = new Set(); S.bulk = false; S.epoch++; emit();
    toast('Downloaded. Open it to see recalculated totals.', 'success');
  } catch (err: any) { console.error(err); toast('Could not generate file: ' + err.message, 'error'); }
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') autosaveNow(); });
  window.addEventListener('pagehide', () => { autosaveNow(); });
}

/** Restore the last file, team files and generator info when the app opens. */
export async function restoreSession() {
  try {
    const ri = await idbGet('polioImports');
    if (ri && ri.files) { S.imports = ri.files.map((x: any) => ({ d: x.d, T: importTotals(x.d), src: x.src })); S.importDone = ri.done || {}; }
    const rg = await idbGet('polioGen'); if (rg) S.genStore = rg;
    const saved = await idbGet('polioCurrentFile');
    if (saved && saved.buffer) {
      await loadWorkbookFromBuffer(saved.buffer, saved.name);
      if (saved.dirty) {
        const o = await idbGet('polioOriginalFile');
        if (o && o.buffer && o.name === saved.name) S.originalBuffer = o.buffer;
        S.bulk = true; emit(); toast('Restored your unsaved work', 'info');
      }
    }
  } catch (e) { console.warn('Could not restore:', e); }
  emit();
}

/* ---------- cell editing ---------- */
export function setCellFromInput(row: number, col: number, raw: string) {
  const sheet = getSheet(); if (!sheet) return;
  const cell = sheet.getCell(row, col);
  if (cell.formula) return;
  if (raw === '') cell.value = null;
  else { const n = Number(raw); cell.value = !isNaN(n) && raw.trim() !== '' ? n : raw; }
  S.edited.add(row + ',' + col);
  scheduleAutosave(); emit();
}

/* ---------- team codes ---------- */
export function teamCodes(): string[] {
  const sheet = getSheet(); if (!sheet || !S.main[0]) return [];
  return S.main[0].teamRows.map((r) => String(cellDisplayValue(sheet.getCell(r, 1)) || '').trim()).filter(Boolean);
}
export function renameTeam(idx: number, raw: string) {
  const sheet = getSheet(); if (!sheet) return;
  const code = String(raw || '').trim();
  const ref = S.main[0].teamRows;
  if (code) for (let i = 0; i < ref.length; i++) {
    if (i === idx) continue;
    const other = String(cellDisplayValue(sheet.getCell(ref[i], 1)) || '').trim();
    if (other && other.toLowerCase() === code.toLowerCase()) { toast('Another team already has that code.', 'error'); emit(); return; }
  }
  for (const sec of S.all.filter((s) => s.key !== 'finalDay')) {
    const row = sec.teamRows[idx]; if (row === undefined) continue;
    const cell = sheet.getCell(row, 1); if (cell.formula) continue;
    cell.value = code || null; S.edited.add(row + ',1');
  }
  S.bulk = true; scheduleAutosave(); emit(); toast('Team code updated across all sections.', 'success');
}
export async function resetTeamCodes() {
  if (!(await uiConfirm('Reset team codes back to T-11, T-12, T-13, T-14, T-15 across all sections?', { title: 'Reset team codes', yesText: 'Reset', danger: true }))) return;
  const sheet = getSheet(); if (!sheet) return;
  const def = ['T-11', 'T-12', 'T-13', 'T-14', 'T-15'];
  for (const sec of S.all.filter((s) => s.key !== 'finalDay')) sec.teamRows.forEach((row, i) => {
    const cell = sheet.getCell(row, 1); if (cell.formula) return; cell.value = def[i] || null; S.edited.add(row + ',1');
  });
  S.bulk = true; scheduleAutosave(); emit(); toast('Team codes reset.', 'success');
}

/* ---------- template writing (new blank file) ---------- */
const THIN = { style: 'thin', color: { argb: 'FFDAD3C3' } };
const BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const fill = (argb: string) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

function writeSectionTitle(sheet: any, s: Section) {
  const cell = sheet.getCell(s.titleRow, 1);
  cell.value = sectionTitleText(s); cell.font = { bold: true, size: 12 };
  sheet.mergeCells(s.titleRow, 1, s.titleRow, sectionKind(s) === 'next' ? 4 : 24);
}
function writeSectionHeaders(sheet: any, s: Section) {
  const [r1, r2] = s.headerRows;
  const put = (r: number, c: number, text: string) => {
    const cell = sheet.getCell(r, c);
    cell.value = text; cell.font = { bold: true, size: 9 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; cell.fill = fill('FFEFEBE2'); cell.border = BORDER;
  };
  groupsFor(s).forEach(([label, a, e, subs]) => {
    put(r1, a, label);
    if (e > a) sheet.mergeCells(r1, a, r1, e); else if (!subs.length) sheet.mergeCells(r1, a, r2, a);
    subs.forEach((sub, i) => put(r2, a + i, sub));
  });
}
function writeSectionTeams(sheet: any, s: Section, codes: string[], all: Section[]) {
  const kind = sectionKind(s);
  const days = all.filter((x) => /^day[123]$/.test(x.key));
  const catches = all.filter((x) => /^catch\d+$/.test(x.key));
  const lastC = bodyLastCol(s);
  const style = (cell: any, argb?: string | null) => { cell.border = BORDER; cell.alignment = { horizontal: 'center', vertical: 'middle' }; if (argb) cell.fill = fill(argb); };
  const calc = (cell: any, f: string) => { cell.value = { formula: f }; cell.fill = fill('FFF1F5F9'); };
  const calcText = (cell: any, f: string) => { cell.value = { formula: f }; cell.fill = fill('FFFBF0D9'); };
  const L = colLetter;
  s.teamRows.forEach((row, i) => {
    const lab = sheet.getCell(row, COLS.TEAM);
    lab.value = kind === 'finalDay' ? (['Day 1', 'Day 2', 'Day 3'].concat(catches.map((_, j) => 'Catch Day ' + (j + 1)))[i] || null) : (codes[i] || 'T-' + (11 + i));
    lab.font = { bold: true, size: 9 }; lab.alignment = { horizontal: 'left', vertical: 'middle' }; lab.border = BORDER;
    for (let c = 2; c <= lastC; c++) style(sheet.getCell(row, c));
    if (kind === 'day') {
      calc(sheet.getCell(row, 19), 'Q' + row + '-R' + row);
      calc(sheet.getCell(row, 25), 'D' + row);
      calc(sheet.getCell(row, 26), 'SUM(E' + row + ',F' + row + ')');
      calcText(sheet.getCell(row, 27), IFTXT('Y' + row, 'Z' + row));
      [25, 26, 27].forEach((c) => style(sheet.getCell(row, c), null));
    } else if (kind === 'catch') {
      const d = days.map((x) => x.teamRows[i]);
      if (d.length === 3) {
        calc(sheet.getCell(row, 2), 'SUM(F' + d[0] + ',F' + d[1] + ',F' + d[2] + ')-SUM(H' + d[0] + ',H' + d[1] + ',H' + d[2] + ')');
        calc(sheet.getCell(row, 3), 'SUM(G' + d[0] + ',G' + d[1] + ',G' + d[2] + ')-SUM(I' + d[0] + ',I' + d[1] + ',I' + d[2] + ')');
      }
      calc(sheet.getCell(row, 6), 'B' + row + '-D' + row);
      calc(sheet.getCell(row, 7), 'C' + row + '-E' + row);
      calc(sheet.getCell(row, 15), 'M' + row + '-N' + row);
      if (i === 0 && s.key === 'catch1' && days.length === 3) {
        const t = days.map((x) => x.totalRow);
        [25, 26].forEach((c) => { style(sheet.getCell(row, c)); calc(sheet.getCell(row, c), 'SUM(' + L(c) + t[0] + ',' + L(c) + t[1] + ',' + L(c) + t[2] + ')'); });
        style(sheet.getCell(row, 27)); calcText(sheet.getCell(row, 27), IFTXT('Y' + row, 'Z' + row));
      }
    } else if (kind === 'finalTeam') {
      for (let c = 2; c <= 24; c++) {
        const parts = days.map((x) => L(c) + x.teamRows[i]);
        if (CATCH_MAP[c]) catches.forEach((cs) => parts.push(L(CATCH_MAP[c]) + cs.teamRows[i]));
        calc(sheet.getCell(row, c), 'SUM(' + parts.join(',') + ')');
      }
    } else if (kind === 'finalDay') {
      if (i < days.length) for (let c = 2; c <= 24; c++) calc(sheet.getCell(row, c), L(c) + days[i].totalRow);
      else if (catches[i - days.length]) {
        const cs = catches[i - days.length];
        const fm: Record<number, number> = Object.assign({}, CATCH_MAP, { 20: 16 });
        Object.keys(fm).forEach((c) => calc(sheet.getCell(row, Number(c)), L(fm[Number(c)]) + cs.totalRow));
      }
    } else if (kind === 'next') {
      const day = all.find((x) => x.key === 'day' + s.key.slice(-1));
      if (day) { calc(sheet.getCell(row, 2), 'C' + day.teamRows[i]); calc(sheet.getCell(row, 4), 'E' + day.teamRows[i] + '+F' + day.teamRows[i]); }
    }
  });
}
function writeSectionTotal(sheet: any, s: Section) {
  const row = s.totalRow, kind = sectionKind(s);
  const lab = sheet.getCell(row, COLS.TEAM);
  lab.value = 'Total'; lab.font = { bold: true, size: 9 }; lab.fill = fill('FFDAD3C3'); lab.alignment = { horizontal: 'left', vertical: 'middle' }; lab.border = BORDER;
  const first = s.teamRows[0], last = s.teamRows[s.teamRows.length - 1];
  const lastC = kind === 'day' ? 26 : bodyLastCol(s);
  for (let c = 2; c <= lastC; c++) {
    const cell = sheet.getCell(row, c);
    cell.font = { bold: true, size: 9 }; cell.fill = fill('FFEFEBE2'); cell.alignment = { horizontal: 'center', vertical: 'middle' }; cell.border = BORDER;
    cell.value = { formula: 'SUM(' + colLetter(c) + first + ':' + colLetter(c) + last + ')' };
  }
  if (kind === 'day') {
    const cell = sheet.getCell(row, 27);
    cell.font = { bold: true, size: 9 }; cell.fill = fill('FFFBF0D9'); cell.alignment = { horizontal: 'center', vertical: 'middle' }; cell.border = BORDER;
    cell.value = { formula: IFTXT('Y' + row, 'Z' + row) };
  }
}

export async function promptNewTemplate() {
  const a = await uiPrompt('How many teams?', '5', { title: 'New template 1/4', yesText: 'Next' }); if (a === null) return;
  const nTeams = Math.max(1, Math.min(20, parseInt(a, 10) || 5));
  const b = await uiPrompt('Starting team code (e.g. T-11, T-21, Team-A):', 'T-11', { title: 'New template 2/4', yesText: 'Next' }); if (b === null) return;
  const code = String(b).trim() || 'T-11';
  const c = await uiPrompt('Catch-up days?\n0 = none, 1 = one, 2 = two', '1', { title: 'New template 3/4', yesText: 'Next' }); if (c === null) return;
  const nCatch = Math.max(0, Math.min(2, parseInt(c, 10) || 0));
  const d = await uiPrompt('Campaign start date (YYYY-MM-DD)?', todayISO(), { title: 'New template 4/4', yesText: 'Create' }); if (d === null) return;
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(String(d).trim()) ? String(d).trim() : todayISO();
  await createBlankTemplate(nTeams, code, nCatch, startDate);
}
export async function createBlankTemplate(nTeams: number, startCode: string, nCatch: number, startDate: string) {
  try {
    toast('Building template…', 'info');
    const ExcelJS = await xl();
    const wb = new ExcelJS.Workbook(); wb.creator = 'Polio F2A'; wb.created = new Date();
    const sheet = wb.addWorksheet('F2A');
    const all = buildSectionMap(nTeams, nCatch).sections;
    const codes: string[] = [];
    for (let i = 0; i < nTeams; i++) {
      const m = startCode.match(/^(.*?)(\d+)$/);
      codes.push(m ? m[1] + (parseInt(m[2], 10) + i) : startCode + (i > 0 ? '-' + (i + 1) : ''));
    }
    all.forEach((s) => { writeSectionTitle(sheet, s); writeSectionHeaders(sheet, s); writeSectionTeams(sheet, s, codes, all); writeSectionTotal(sheet, s); });
    for (let c = 1; c <= LAST_COL; c++) sheet.getColumn(c).width = COL_WIDTHS[c] || 9;
    try { wb.calcProperties = { fullCalcOnLoad: true } as any; } catch { /* ignore */ }
    const buf = await wb.xlsx.writeBuffer();
    const d = new Date();
    const fname = `Polio Form 2A Template - Created ${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}.xlsx`;
    saveTplParams(fname, { nTeams, startCode, nCatch, startDate });
    await loadWorkbookFromBuffer(buf as ArrayBuffer, fname);
    S.meta.startDate = startDate; saveMeta(); emit();
    try { await idbSet('polioCurrentFile', { name: fname, buffer: buf }); } catch { /* ignore */ }
    toast('Template created. Start filling in your campaign data.', 'success');
  } catch (err: any) { console.error(err); toast('Could not create template: ' + err.message, 'error'); }
}

/* ---------- start new campaign ---------- */
export async function startNewCampaign() {
  const sheet = getSheet(); if (!sheet) { toast('No workbook loaded.', 'error'); return; }
  const daySections = S.main.filter((s) => /^day[123]$/.test(s.key));
  const catchSections = S.main.filter((s) => /^catch\d+$/.test(s.key));
  if (S.next.length < 3 || daySections.length < 3) { toast('Template structure not recognized.', 'error'); return; }
  const pairs = S.next.slice(0, 3).map((ns, i) => ({ next: ns, target: daySections[i] }));
  const readCarry = (cell: any): { ok: boolean; val?: number | null } => {
    const v = cell.value;
    if (cell.formula) {
      let n: any = evaluateFormula(sheet, cell.formula, 0);
      if (n === null || !isFinite(n)) n = typeof cell.result === 'number' ? cell.result : null;
      return n === null ? { ok: false } : { ok: true, val: n };
    }
    if (v === null || v === undefined || v === '') return { ok: true, val: null };
    if (typeof v === 'number') return { ok: true, val: v };
    if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return { ok: true, val: Number(v) };
    return { ok: false };
  };
  const captures: any[][] = [], problems: string[] = [];
  for (const pair of pairs) {
    const batch: any[] = [];
    for (let i = 0; i < Math.min(pair.next.teamRows.length, pair.target.teamRows.length); i++) {
      const nRow = pair.next.teamRows[i];
      const t = readCarry(sheet.getCell(nRow, COLS.TARGET)), c = readCarry(sheet.getCell(nRow, COLS.CHILDREN_MP));
      if (!t.ok || !c.ok) problems.push(`${pair.next.label}, team ${i + 1}`);
      batch.push({ targetRow: pair.target.teamRows[i], target: t.val ?? null, children: c.val ?? null });
    }
    captures.push(batch);
  }
  if (problems.length) {
    await uiConfirm('Cannot start: these Next Campaign values are not plain numbers:\n\n' + problems.slice(0, 8).join('\n') + '\n\nNothing was changed.', { title: 'Cannot start', yesText: 'OK', noText: 'Close' });
    return;
  }
  const lines = pairs.map((p) => `• ${p.next.label} → ${p.target.label}`).join('\n');
  if (!(await uiConfirm('Start a new campaign?\n\n' + lines + '\n\nOnly Target Micro Plan and Total Children Micro Plan are carried over. All other field data in Day 1/2/3 and Catch days is cleared. Final tabs recalculate.', { title: 'Start new campaign', yesText: 'Continue', danger: true }))) return;
  if (!(await uiConfirm('LAST WARNING\n\nAll field data of the current campaign will be deleted. A backup file is downloaded first.', { title: 'Confirm deletion', yesText: 'Yes, start new campaign', danger: true }))) return;
  try {
    try { await downloadWorkbook('Backup before new campaign'); } catch { /* ignore */ }
    for (const sec of [...daySections, ...catchSections]) for (const r of sec.teamRows) for (let c = 1; c <= MAX_COLS; c++) {
      if (c === COLS.TEAM) continue;
      const cell = sheet.getCell(r, c);
      if (cell.formula) continue;
      const mrg = getMerge(r, c); if (mrg && !mrg.isMaster) continue;
      cell.value = null;
    }
    for (const batch of captures) for (const it of batch) {
      if (it.target !== null && isFinite(it.target) && !sheet.getCell(it.targetRow, COLS.TARGET).formula) sheet.getCell(it.targetRow, COLS.TARGET).value = it.target;
      if (it.children !== null && isFinite(it.children) && !sheet.getCell(it.targetRow, COLS.CHILDREN_MP).formula) sheet.getCell(it.targetRow, COLS.CHILDREN_MP).value = it.children;
    }
    S.bulk = true; S.edited = new Set(); S.epoch++; scheduleAutosave(); emit();
    toast('New campaign started. Old data cleared.', 'success');
  } catch (err: any) { console.error(err); toast('Failed to start new campaign: ' + err.message, 'error'); }
}

/* ---------- children count ---------- */
export function childCols(sheet: any, s: Section): number | null {
  const r = s.headerRows[0];
  for (let c = 1; c <= 45; c++) {
    let v = sheet.getCell(r, c).value;
    if (v && typeof v === 'object') v = v.richText ? v.richText.map((x: any) => x.text).join('') : v.result != null ? v.result : '';
    if (String(v == null ? '' : v).trim().toLowerCase() === 'children count') return c;
  }
  return null;
}
function childVal(sheet: any, row: number, col: number) {
  const cell = sheet.getCell(row, col);
  if (cell.formula) { const v = evaluateFormula(sheet, cell.formula, 0); if (v !== null && isFinite(v)) return v; }
  const raw = cell.value;
  const v = typeof raw === 'number' ? raw : raw && typeof raw === 'object' && typeof raw.result === 'number' ? raw.result : null;
  return v !== null && isFinite(v) ? v : null;
}
export function childDiff(p: number | null, n: number | null) {
  if (p === null || n === null) return { t: '—', c: '' };
  const d = Math.round((n - p) * 100) / 100;
  return d > 0 ? { t: 'Increased by ' + d, c: 'up' } : d < 0 ? { t: 'Decreased by ' + -d, c: 'down' } : { t: 'No change', c: '' };
}
export function childrenData(key: string) {
  const sheet = getSheet();
  const days = S.main.filter((s) => /^day[123]$/.test(s.key));
  if (!sheet || !days.length) return { error: 'Day sections not found.' } as any;
  const cc = childCols(sheet, days[0]);
  if (!cc) return { error: "Could not find the 'Children Count' columns in this file." } as any;
  const list = key === 'total' ? days : days.filter((d) => d.key === key);
  const rows: any[] = []; let tp: number | null = null, tn: number | null = null;
  for (let i = 0; i < days[0].teamRows.length; i++) {
    let p: number | null = null, w: number | null = null;
    list.forEach((d) => {
      const a = childVal(sheet, d.teamRows[i], cc), b = childVal(sheet, d.teamRows[i], cc + 1);
      if (a !== null) p = (p || 0) + a;
      if (b !== null) w = (w || 0) + b;
    });
    if (p !== null) tp = (tp || 0) + p;
    if (w !== null) tn = (tn || 0) + w;
    rows.push({ team: String(cellDisplayValue(sheet.getCell(days[0].teamRows[i], 1))), p, w });
  }
  return { days, list, rows, tp, tn };
}

/* ---------- team app generator ---------- */
export const genKey = () => S.meta.startDate || 'default';
export const genCid = () => 'C-' + (S.meta.startDate || String(S.fileName || '').replace(/\.xlsx$/i, ''));
export async function genSave() { try { await idbSet('polioGen', S.genStore); } catch { /* ignore */ } }
export function genInfo(code: string) {
  const norm = (v: any) => String(v || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  let area = '', vac = '', uc = '';
  try {
    const ws = S.workbook.worksheets.find((w: any) => norm(w.name) === norm(code));
    if (ws) { area = String(cellDisplayValue(ws.getCell(6, 21)) || '').trim(); vac = String(cellDisplayValue(ws.getCell(6, 9)) || '').trim(); }
    const ss = S.workbook.getWorksheet('SS');
    if (ss) { const p = String(cellDisplayValue(ss.getCell(3, 1)) || '').split(':'); uc = (p[1] || '').trim(); }
  } catch { /* ignore */ }
  const o = (S.genStore[genKey()] || {})[code] || {};
  return { area: o.area !== undefined ? o.area : area, uc: o.uc !== undefined ? o.uc : uc, vac: o.vac !== undefined ? o.vac : vac };
}
export function genField(code: string, k: string, v: string) {
  const c = genKey(); S.genStore[c] = S.genStore[c] || {}; S.genStore[c][code] = S.genStore[c][code] || {}; S.genStore[c][code][k] = v; genSave();
}
let templateCache: string | null = null;
export async function loadTeamTemplate(): Promise<string> {
  if (templateCache) return templateCache;
  const res = await fetch(new URL('team-template.html', document.baseURI).toString());
  if (!res.ok) throw new Error('Team app file not found (team-template.html)');
  templateCache = await res.text();
  return templateCache;
}
/** Builds one team's html: the team template with its config (team, day, area...) written in. */
export async function genBuild(code: string, day: number): Promise<string> {
  const i = genInfo(code);
  const cfg = { campaignId: genCid(), team: code, day, area: i.area, uc: i.uc, vaccinator: i.vac, incharge: '' };
  const tpl = await loadTeamTemplate();
  const json = JSON.stringify(cfg).replace(/</g, '\\u003c');
  const re = /(<script id="polio-config" type="application\/json">)[\s\S]*?(<\/script>)/;
  if (!re.test(tpl)) throw new Error('Team template has no config tag');
  return tpl.replace(re, (_m, a, b) => a + json + b);
}
export async function genShareOrDownload(code: string, day: number, share: boolean) {
  try {
    const html = await genBuild(code, day);
    const name = `${code}_Day${day}.html`;
    const file = new File([html], name, { type: 'text/html' });
    const nav: any = navigator;
    if (share && nav.canShare && nav.canShare({ files: [file] })) {
      try { await nav.share({ files: [file], title: name }); return; } catch (e: any) { if (e && e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    if (share) toast('Sharing is not available here. The file was downloaded instead.', 'info');
  } catch (e: any) { toast(e.message || 'Could not build team file', 'error'); }
}

/* ---------- import ---------- */
export async function importSave() { try { await idbSet('polioImports', { files: S.imports.map((f) => ({ d: f.d, src: f.src })), done: S.importDone }); } catch { /* ignore */ } }
export function importAddData(txt: string, src: string) {
  try {
    const d = importParse(txt);
    S.imports = S.imports.filter((f) => !(f.d.team === d.team && f.d.day === d.day));
    S.imports.push({ d, T: importTotals(d), src }); importSave(); emit();
    return true;
  } catch (e: any) { toast((src || 'Data') + ': ' + e.message, 'error'); return false; }
}
export async function importRemove(i: number) {
  const f = S.imports[i]; if (!f) return;
  if (!(await uiConfirm('Remove the ' + f.d.team + ' Day ' + f.d.day + ' file from this app? Data already added to F2A stays.', { title: 'Remove file', yesText: 'Remove', danger: true }))) return;
  S.imports.splice(i, 1); importSave(); emit();
}
export function importTarget(d: any) {
  const sheet = getSheet(); const sec = S.main.find((s) => s.key === 'day' + d.day);
  if (!sheet || !sec) return null;
  const norm = (v: any) => String(v || '').replace(/\s/g, '').toUpperCase();
  const row = sec.teamRows.find((r) => norm(cellDisplayValue(sheet.getCell(r, 1))) === norm(d.team));
  return row ? { sheet, sec, row } : null;
}
export async function importAdd(i: number) {
  const f = S.imports[i]; if (!f) return;
  const tg = importTarget(f.d);
  if (!tg) { toast('No row found for ' + f.d.team + ' Day ' + f.d.day + '. Catch days are entered manually.', 'error'); return; }
  const key = f.d.team + '|' + f.d.day, lines: string[] = [], over: string[] = [];
  IMPORT_MAP.forEach(([c, n, fn]) => {
    const cell = tg.sheet.getCell(tg.row, colLetterToNum(c)), v = fn(f.T);
    lines.push(c + ' ' + n + ' = ' + v);
    const old = cell.value;
    if (old !== null && old !== undefined && old !== '' && old !== v && typeof old !== 'object') over.push(c + ': ' + old + ' → ' + v);
  });
  const warn = f.d.campaignId !== genCid() ? `WARNING: campaign ID in the file (${f.d.campaignId}) does not match this file (${genCid()}).\n\n` : '';
  const msg = warn + f.d.team + ' · ' + tg.sec.label + ' · row ' + tg.row + '\n\n' + lines.join('\n') + (over.length ? '\n\nWill replace: ' + over.join(', ') : '') + (S.importDone[key] ? '\n\nAlready added earlier; it will be replaced.' : '');
  if (!(await uiConfirm(msg, { title: 'Add to F2A', yesText: 'Add' }))) return;
  IMPORT_MAP.forEach(([c, , fn]) => {
    const col = colLetterToNum(c), cell = tg.sheet.getCell(tg.row, col);
    if (cell.formula) return;
    cell.value = fn(f.T); S.edited.add(tg.row + ',' + col);
  });
  S.importDone[key] = Date.now(); importSave(); scheduleAutosave(); S.epoch++; emit();
  toast(f.d.team + ' ' + tg.sec.label + ' added to F2A');
}
