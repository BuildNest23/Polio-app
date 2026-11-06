import { readFileSync } from 'node:fs';
import { evaluateFormula, evalIncDec } from '../src/incharge/lib/engine';
const data = JSON.parse(readFileSync(process.argv[2] || 'tests/f2a-sample.json', 'utf8'));
const sheet = { getCell(r: number, c: number) {
  const d = data[r + ',' + c];
  if (!d) return { value: null, formula: undefined };
  if (d.f !== undefined) return { value: { formula: d.f, result: undefined }, formula: d.f };   // ignore cached results: force real evaluation
  return { value: d.v, formula: undefined };
} };
let ok = 0, bad: string[] = [], text = 0, unk: string[] = [];
for (const k of Object.keys(data)) {
  const d = data[k]; if (d.f === undefined) continue;
  const [r, c] = k.split(',').map(Number);
  let res: any = evaluateFormula(sheet, d.f, 0);
  if (res === null) { const t = evalIncDec(sheet, d.f); if (t !== null) { res = t; } }
  if (res === null) { unk.push(k + ' =' + d.f); continue; }
  const exp = d.r;
  const same = typeof res === 'string' ? res === exp : Math.abs(res - (exp ?? 0)) < 1e-6;
  if (same) ok++; else bad.push(`${k} =${d.f}  engine=${res} excel=${exp}`);
}
console.log('match:', ok, ' mismatch:', bad.length, ' not evaluated:', unk.length);
bad.slice(0, 15).forEach((x) => console.log(' MISMATCH', x));
unk.slice(0, 15).forEach((x) => console.log(' UNKNOWN ', x));
