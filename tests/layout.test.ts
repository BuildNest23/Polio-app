import { readFileSync } from 'node:fs';
import { buildSectionMap, sectionTitleText } from '../src/incharge/lib/core';
import { importParse, importTotals } from '../src/incharge/lib/engine';
const data = JSON.parse(readFileSync('tests/f2a-sample.json', 'utf8'));
const titles: [number, string][] = [];
for (const k of Object.keys(data)) { const [r, c] = k.split(',').map(Number); const v = data[k].v; if (c === 1 && typeof v === 'string' && /^(DAY|Catch|Final|Next)/i.test(v.trim()) && !data[r + ',2']) titles.push([r, v]); }
titles.sort((a, b) => a[0] - b[0]);
console.log('titles in your file :', titles.map((t) => t[0] + ':' + t[1]).join(' | '));
for (const nCatch of [0, 1, 2]) {
  const m = buildSectionMap(5, nCatch).sections.map((s) => s.titleRow + ':' + sectionTitleText(s));
  console.log('map nTeams=5 nCatch=' + nCatch + ' :', m.join(' | '));
}
// team file
const sample = { app: 'polio-team', version: 1, campaignId: 'C-2026-11-09', team: 'T-12', day: 1, houses: [[3, 3, 0, 0, 0, 0], [4, 3, 1, 0, 1, 1], [0, 0, 0, 0, 0, 0], [0, 0, 0, 1, 0, 0], null], school: [{ name: 'X', u5: 5, vac: 4 }], outside: 2 };
console.log('importTotals:', JSON.stringify(importTotals(importParse('junk ' + JSON.stringify(sample) + ' junk'))));
// generator regex
const tpl = '<head></head><script id="polio-config" type="application/json">{"team":"T-0"}</script><script type="module">const a=1;</script>';
const re = /(<script id="polio-config" type="application\/json">)[\s\S]*?(<\/script>)/;
const json = JSON.stringify({ team: 'T-12', area: 'A</script>b' }).replace(/</g, '\\u003c');
const out = tpl.replace(re, (_m, a, b) => a + json + b);
console.log('config replaced ok:', out.includes('"team":"T-12"') && !out.includes('A</script>b') && out.includes('const a=1;'));
