// Formula engine and cell helpers. No UI and no ExcelJS import: it only needs a "sheet"
// object with getCell(row, col) -> { value, formula, result }, so it can be tested in Node.
import { colLetterToNum } from './core';

export function cellDisplayValue(cell: any): any {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' || typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (v instanceof Date) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((x: any) => x.text).join('');
    if (v.text !== undefined) return v.text;
    if (v.result !== undefined) return v.result;
    if (v.formula) return '=' + v.formula;
  }
  return String(v);
}

export function getCellNumericValue(sheet: any, row: number, col: number, depth = 0): number | null {
  if (depth > 10) return null;
  const cell = sheet.getCell(row, col);
  const raw = cell.value;
  if (typeof raw === 'number') return raw;
  if (raw && typeof raw === 'object' && typeof raw.result === 'number') return raw.result;
  if (cell.formula) return evaluateFormula(sheet, cell.formula, depth + 1);
  if (typeof raw === 'string') { const n = Number(raw); if (!isNaN(n) && raw.trim() !== '') return n; }
  return null;
}
export function getRefNumeric(sheet: any, ref: string, depth: number): number | null {
  const m = String(ref).match(/^([A-Z]+)(\d+)$/i);
  if (!m) return null;
  return getCellNumericValue(sheet, parseInt(m[2]), colLetterToNum(m[1].toUpperCase()), depth);
}

export function evaluateFormula(sheet: any, f: string, depth = 0): number | null {
  if (depth > 10 || !f) return null;
  f = String(f).replace(/^=/, '').trim();
  let m = f.match(/^(SUM\([^()]*\))\s*-\s*(SUM\([^()]*\))$/i);
  if (m) {
    const a = evaluateFormula(sheet, m[1], depth + 1), b = evaluateFormula(sheet, m[2], depth + 1);
    return typeof a === 'number' && typeof b === 'number' ? a - b : null;
  }
  m = f.match(/^SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/i);
  if (m) {
    const c1 = colLetterToNum(m[1].toUpperCase()), r1 = parseInt(m[2]);
    const c2 = colLetterToNum(m[3].toUpperCase()), r2 = parseInt(m[4]);
    let sum = 0;
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
      const v = getCellNumericValue(sheet, r, c, depth + 1);
      if (typeof v === 'number') sum += v;
    }
    return sum;
  }
  m = f.match(/^SUM\((.+)\)$/i);
  if (m) {
    let sum = 0;
    for (const p of m[1].split(',')) {
      const t = p.trim();
      const mm = t.match(/^([A-Z]+)(\d+)$/i);
      if (mm) {
        const v = getCellNumericValue(sheet, parseInt(mm[2]), colLetterToNum(mm[1].toUpperCase()), depth + 1);
        if (typeof v === 'number') sum += v;
      } else { const n = Number(t); if (!isNaN(n)) sum += n; }
    }
    return sum;
  }
  // MINUS(a,b) is how your real file stores "Returned" and "Still missed" (Google Sheets / WPS style)
  m = f.match(/^MINUS\(\s*([A-Z]+\d+)\s*,\s*([A-Z]+\d+)\s*\)$/i);
  if (m) {
    const a = getRefNumeric(sheet, m[1], depth + 1), b = getRefNumeric(sheet, m[2], depth + 1);
    if (a === null && b === null) return null;
    return (a || 0) - (b || 0);
  }
  m = f.match(/^([A-Z]+)(\d+)$/i);
  if (m) return getCellNumericValue(sheet, parseInt(m[2]), colLetterToNum(m[1].toUpperCase()), depth + 1);
  m = f.match(/^([A-Z]+\d+)\s*\+\s*([A-Z]+\d+)$/i);
  if (m) {
    const a = getRefNumeric(sheet, m[1], depth + 1), b = getRefNumeric(sheet, m[2], depth + 1);
    return typeof a === 'number' && typeof b === 'number' ? a + b : null;
  }
  m = f.match(/^([A-Z]+\d+)\s*-\s*([A-Z]+\d+)$/i);
  if (m) {
    const a = getRefNumeric(sheet, m[1], depth + 1), b = getRefNumeric(sheet, m[2], depth + 1);
    return typeof a === 'number' && typeof b === 'number' ? a - b : null;
  }
  m = f.match(/^ROUNDUP\((.+),\s*(\d+)\)$/i);
  if (m) {
    const inner = evaluateFormula(sheet, m[1], depth + 1);
    const digits = parseInt(m[2], 10);
    if (typeof inner === 'number' && isFinite(inner)) return Math.ceil(inner * Math.pow(10, digits)) / Math.pow(10, digits);
    return null;
  }
  return null;
}

/** "Increased by N" / "Decreased by N" / "No change" text formula (children count Difference). */
export function evalIncDec(sheet: any, f: string): string | null {
  const R = '([A-Z]+\\d+)', S = '\\s*';
  const re = new RegExp('^IF\\(' + S + R + S + '<' + S + R + S + ',\\s*"Increased by "' + S + '&' + S + '\\(' + S + R + S + '-' + S + R + S + '\\)' + S + ',\\s*IF\\(' + S + R + S + '>' + S + R + S + ',\\s*"Decreased by "' + S + '&' + S + '\\(' + S + R + S + '-' + S + R + S + '\\)' + S + ',\\s*"No change"' + S + '\\)' + S + '\\)$', 'i');
  const m = String(f).replace(/^=/, '').trim().match(re);
  if (!m) return null;
  const a = getRefNumeric(sheet, m[1], 1), b = getRefNumeric(sheet, m[2], 1);
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  return a < b ? 'Increased by ' + (b - a) : a > b ? 'Decreased by ' + (a - b) : 'No change';
}

/** What to show in a formula cell. */
export function formulaDisplay(sheet: any, cell: any): string | number {
  const cv = evaluateFormula(sheet, cell.formula, 0);
  if (cv !== null && isFinite(cv)) return Math.round(cv * 100) / 100;
  const t = evalIncDec(sheet, cell.formula);
  if (t !== null) return t;
  const raw = cellDisplayValue(cell);
  return typeof raw === 'string' && raw.startsWith('=') ? '—' : raw;
}

/* ---------- team file (version 1) ---------- */
export function importParse(txt: string) {
  txt = String(txt || '').trim();
  const a = txt.indexOf('{'), b = txt.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('No data found');
  const d = JSON.parse(txt.slice(a, b + 1));
  if (d.app !== 'polio-team' || !d.team) throw new Error('Not a team file');
  return d;
}
export function importTotals(d: any) {
  const T: any = { A: 0, B: 0, O: 0, C: 0, mmpv: 0, z: 0, lock: 0, houses: 0 };
  (d.houses || []).forEach((h: any) => {
    if (!h) return;
    T.houses++;
    if (h[3]) { T.lock++; return; }
    T.A += h[0]; T.B += h[1]; T.O += h[2]; T.C += h[5] || 0;
    if (h[4]) T.mmpv += h[1];
    if (h[0] == 0) T.z++;
  });
  T.D = +d.outside || 0;
  T.S = (d.school || []).reduce((a: number, s: any) => a + (+s.vac || 0), 0);
  return T;
}
