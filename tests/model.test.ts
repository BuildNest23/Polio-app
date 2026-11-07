// Builds each F2A section from the real file's cells/merges and checks the table model.
import { readFileSync } from 'node:fs';
import { buildSectionMap } from '../src/incharge/lib/core';
import { S, applySectionMap } from '../src/incharge/lib/state';
import { buildSectionModel } from '../src/incharge/lib/workbook';
import { colLetterToNum } from '../src/incharge/lib/core';

const data = JSON.parse(readFileSync(process.argv[2] || 'tests/f2a-sample.json', 'utf8'));
const merges: string[] = JSON.parse(readFileSync(process.argv[3] || 'tests/f2a-merges.json', 'utf8'));
const sheet: any = {
  model: { merges },
  getCell(r: number, c: number) {
    const d = data[r + ',' + c];
    if (!d) return { value: null, formula: undefined };
    if (d.f !== undefined) return { value: { formula: d.f, result: d.r }, formula: d.f, result: d.r };
    return { value: d.v, formula: undefined };
  },
};
S.workbook = { getWorksheet: (n: string) => (n === 'F2A' ? sheet : null) };
const map: Record<string, any> = {};
for (const range of merges) {
  const [a, b] = range.split(':'); const m1 = a.match(/^([A-Z]+)(\d+)$/)!, m2 = b.match(/^([A-Z]+)(\d+)$/)!;
  const c1 = colLetterToNum(m1[1]), r1 = +m1[2], c2 = colLetterToNum(m2[1]), r2 = +m2[2];
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) map[r + ',' + c] = { r1, c1, r2, c2, isMaster: r === r1 && c === c1 };
}
S.mergeMap = map;
applySectionMap(5, 1);
let fail = 0;
for (const s of S.built.sections) {
  const rows = buildSectionModel(s);
  // every row must cover the same number of columns once rowspans are counted
  const cover: Record<number, number> = {}; const hdrRows = s.headerRows;
  const widths = rows.map((r, ri) => {
    let w = r.cells.reduce((a, c) => a + c.colspan, 0);
    // add columns covered by rowspans from the header's first row
    if (r.kind === 'header' && r.idx === 1) w += rows[0].cells.filter((c) => c.rowspan > 1).reduce((a, c) => a + c.colspan, 0);
    return w;
  });
  const uniq = Array.from(new Set(widths));
  const inputs = rows.reduce((a, r) => a + r.cells.filter((c) => c.input).length, 0);
  const calcs = rows.reduce((a, r) => a + r.cells.filter((c) => c.cls === 'calc' || c.cls === 'txt').length, 0);
  const ok = uniq.length === 1;
  if (!ok) fail++;
  console.log((ok ? 'ok  ' : 'BAD ') + s.key.padEnd(10), 'rows', rows.length, 'cols', uniq.join('/'), 'inputs', inputs, 'formula cells', calcs);
}
// spot check displayed values against Excel's stored results (Day 1 team rows, col S Returned and col Z)
const d1 = buildSectionModel(S.built.sections[0]);
console.log('Day1 T-row1 cells:', d1.find((r) => r.kind === 'team')!.cells.slice(0, 8).map((c) => c.display).join(' | '));
process.exit(fail ? 1 : 0);
