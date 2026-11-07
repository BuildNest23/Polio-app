// Team file (version 1): read and total it. Used by both apps.
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
