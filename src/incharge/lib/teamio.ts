// Team App generator (incharge -> team html) and Import (team file -> F2A).
import { IMPORT_MAP, colLetterToNum } from './core';
import { cellDisplayValue, importParse, importTotals } from './engine';
import { S, emit, idbGet, idbSet, mainSections, toast, uiConfirm } from './state';
import { getSheet, scheduleAutosave, teamCodes } from './workbook';

/* ---------- generator ---------- */
let genStore: Record<string, Record<string, Record<string, string>>> = {};
export async function loadGenStore() { try { const g = await idbGet('polioGen'); if (g) genStore = g; } catch { /* ignore */ } }
const genKey = () => S.startDate || 'default';
export const genCid = () => 'C-' + (S.startDate || String(S.fileName || '').replace(/\.xlsx$/i, ''));

export function genInfo(code: string, day = 1) {
  const norm = (v: any) => String(v || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const txt = (c: any) => String(cellDisplayValue(c) || '').trim();
  let area = '', vac = '', uc = '';
  try {
    const ws = S.workbook.worksheets.find((w: any) => norm(w.name) === norm(code));
    if (ws) {
      // Area: column T, rows 6 / 9 / 12 (one per campaign day). Members: W6 and W10.
      area = txt(ws.getCell(6 + 3 * (day - 1), 20));
      vac = [txt(ws.getCell(6, 23)), txt(ws.getCell(10, 23))].filter(Boolean).join(', ');
    }
    const ss = S.workbook.getWorksheet('SS');
    if (ss) { const p = String(cellDisplayValue(ss.getCell(3, 1)) || '').split(':'); uc = (p[1] || '').trim(); }
  } catch { /* ignore */ }
  // Typed by the incharge in this app (kept only on this phone, never written into the Excel file).
  const o = (genStore[genKey()] || {})[code] || {};
  const ak = 'area' + day;
  return { area: o[ak] !== undefined ? o[ak] : area, uc: o.uc !== undefined ? o.uc : uc, vac: o.vac !== undefined ? o.vac : vac };
}
export async function setGenField(code: string, k: 'area' | 'uc' | 'vac', v: string, day = 1) {
  const key = k === 'area' ? 'area' + day : k;
  const c = genKey(); genStore[c] = genStore[c] || {}; genStore[c][code] = genStore[c][code] || {}; genStore[c][code][key] = v;
  try { await idbSet('polioGen', genStore); } catch { /* ignore */ }
  emit();
}

async function fetchTemplate(): Promise<string> {
  const url = (import.meta as any).env.BASE_URL + 'team-template.html';
  const r = await fetch(url);
  if (!r.ok) throw new Error('Team app file not found. Run "npm run build" (it builds the team app first).');
  return await r.text();
}
export async function genBuild(code: string, day: number): Promise<string> {
  const i = genInfo(code, day);
  const cfg = { campaignId: genCid(), team: code, day, area: i.area, uc: i.uc, vaccinator: i.vac, incharge: '' };
  const json = JSON.stringify(cfg).replace(/</g, '\\u003c');
  const tpl = await fetchTemplate();
  const tag = '<script id="polio-config" type="application/json">' + json + '</' + 'script>';
  const re = /<script[^>]*id="polio-config"[^>]*>[\s\S]*?<\/script>/;
  if (!re.test(tpl)) throw new Error('Team app file has no config tag.');
  return tpl.replace(re, () => tag);
}
function saveBlob(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
export async function genDownload(code: string, day: number) {
  try { saveBlob(new Blob([await genBuild(code, day)], { type: 'text/html' }), `${code}_Day${day}.html`); }
  catch (e: any) { toast(e.message, 'error'); }
}
/** Share sheet when the browser supports sharing files (https), otherwise download. */
export async function genShare(code: string, day: number) {
  try {
    const html = await genBuild(code, day);
    const file = new File([html], `${code}_Day${day}.html`, { type: 'text/html' });
    const nav: any = navigator;
    if (nav.canShare && nav.canShare({ files: [file] })) { await nav.share({ files: [file], title: `${code} Day ${day}` }); return; }
    saveBlob(file, file.name);
    toast('Downloaded. Attach it from Downloads in WhatsApp (send as ZIP if WhatsApp refuses .html).', 'info');
  } catch (e: any) { if (e && e.name !== 'AbortError') toast(e.message, 'error'); }
}
export function genDownloadAll(day: number) {
  teamCodes().filter(Boolean).forEach((c, i) => setTimeout(() => genDownload(c, day), i * 600));
  toast('Downloading all teams. Allow multiple downloads if your browser asks.', 'info');
}

/* ---------- import ---------- */
export interface ImportFile { d: any; T: any; src: string }
export const imp = { files: [] as ImportFile[], done: {} as Record<string, number>, review: -1, team: 'All', day: 0 };
export async function loadImports() {
  try {
    const r = await idbGet('polioImports');
    if (r && r.files) { imp.files = r.files.map((x: any) => ({ d: x.d, T: importTotals(x.d), src: x.src })); imp.done = r.done || {}; }
  } catch { /* ignore */ }
}
async function saveImports() { try { await idbSet('polioImports', { files: imp.files.map((f) => ({ d: f.d, src: f.src })), done: imp.done }); } catch { /* ignore */ } }
export function importAddData(txt: string, src: string): boolean {
  let d: any;
  try { d = importParse(txt); } catch (e: any) { toast('Could not read ' + src + ': ' + e.message, 'error'); return false; }
  const i = imp.files.findIndex((f) => f.d.team === d.team && f.d.day === d.day);
  const item = { d, T: importTotals(d), src };
  if (i >= 0) imp.files[i] = item; else imp.files.push(item);
  imp.review = i >= 0 ? i : imp.files.length - 1;
  saveImports(); emit();
  return true;
}
export async function importLoadFiles(list: FileList | File[]) {
  let n = 0;
  for (const f of Array.from(list)) { try { if (importAddData(await f.text(), f.name)) n++; } catch { toast('Could not read ' + f.name, 'error'); } }
  if (n) toast(n + ' file(s) loaded.', 'success');
}
export async function importRemove(i: number) {
  const f = imp.files[i]; if (!f) return;
  if (!(await uiConfirm(`Remove the ${f.d.team} Day ${f.d.day} file from this app? Data already added to F2A stays.`, { title: 'Remove file', yesText: 'Remove', danger: true }))) return;
  imp.files.splice(i, 1); imp.review = -1; saveImports(); emit();
}
export function importTarget(d: any) {
  const sheet = getSheet(); if (!sheet) return null;
  const sec = mainSections().find((s) => s.key === 'day' + d.day); if (!sec) return null;
  const norm = (v: any) => String(v || '').replace(/\s/g, '').toUpperCase();
  const row = sec.teamRows.find((r) => norm(cellDisplayValue(sheet.getCell(r, 1))) === norm(d.team));
  return row ? { sheet, sec, row } : null;
}
export async function importAdd(i: number) {
  const f = imp.files[i], tg = importTarget(f.d);
  if (!tg) { toast(`No row found for ${f.d.team} Day ${f.d.day}. Catch days are entered manually.`, 'error'); return; }
  const key = f.d.team + '|' + f.d.day, lines: string[] = [], over: string[] = [];
  IMPORT_MAP.forEach(([c, n, fn]) => {
    const cell = tg.sheet.getCell(tg.row, colLetterToNum(c)), v = fn(f.T);
    lines.push(`${c} ${n} = ${v}`);
    const old = cell.value;
    if (old !== null && old !== undefined && old !== '' && old !== v && typeof old !== 'object') over.push(`${c}: ${old} → ${v}`);
  });
  const mis = f.d.campaignId !== genCid() ? `WARNING: campaign ID in file (${f.d.campaignId}) does not match this file (${genCid()})\n\n` : '';
  const msg = mis + `${f.d.team} · ${tg.sec.label} · row ${tg.row}\n\n` + lines.join('\n') + (over.length ? '\n\nWill replace: ' + over.join(', ') : '') + (imp.done[key] ? '\n\nAlready added earlier; it will be replaced.' : '');
  if (!(await uiConfirm(msg, { title: 'Add to F2A', yesText: 'Add' }))) return;
  IMPORT_MAP.forEach(([c, , fn]) => {
    const col = colLetterToNum(c), cell = tg.sheet.getCell(tg.row, col);
    if (cell.formula) return;
    cell.value = fn(f.T); S.edited.add(tg.row + ',' + col);
  });
  imp.done[key] = Date.now(); saveImports(); scheduleAutosave(); S.epoch++; emit();
  toast(`${f.d.team} ${tg.sec.label} added to F2A`);
}
