// F2A layout constants and section map. Ported 1:1 from the original Polio.html.
export const COLS = { TEAM: 1, TARGET: 2, VISITED: 3, CHILDREN_MP: 4, CHILDREN_TEAM: 5 } as const;
export const LAST_COL = 27;
export const MAX_COLS = 40;

export type Group = [string, number, number, string[]];

export const DAY_GROUPS: Group[] = [
  ['Team No', 1, 1, []],
  ['Number of House Holds', 2, 3, ['Target Micro Plan', 'Visited by Team']],
  ['Total Childred Micro Plan', 4, 4, ['0-59 M']],
  ['Total Children Team', 5, 5, ['0-59 M']],
  ['Record Missed Children', 6, 7, ['NA | 0-58M', 'R | 0-59M']],
  ['Covered Missed Children', 8, 9, ['NA | 0-58M', 'R | 0-59M']],
  ['School', 10, 10, []],
  ['Guest', 11, 11, []],
  ['Street', 12, 12, []],
  ['Total MMP', 13, 14, ['Registered', 'Vaccinated']],
  ['0/0 Total Houses ', 15, 15, []],
  ['Total Lock Houses', 16, 16, []],
  ['Vaccine Record Doses', 17, 19, ['Received', 'Used', 'Returned']],
  ['Finger Markers', 20, 20, ['Received ']],
  ['AFP Cases', 21, 21, []],
  ['Zero Dose', 22, 22, []],
  ['Vitamin A', 23, 24, ['Red', 'Blue']],
  ['Children Count', 25, 27, ['Previous', 'Now', 'Difference']],
];
export const FINAL_GROUPS: Group[] = DAY_GROUPS.slice(0, -1);
export const CATCH_GROUPS: Group[] = [
  ['Team No', 1, 1, []],
  ['Target for Catchup Day 1 / Day 2', 2, 3, ['NA |0-59 M', 'R |0-59 M']],
  ['Covered Missed Children Catchup Day', 4, 5, ['NA |0-59 M', 'R |0-59 M']],
  ['Still Missed Children', 6, 7, ['NA |0-59 M', 'R |0-59 M']],
  ['Guest Vaccinated', 8, 8, []],
  ['Street', 9, 9, []],
  ['Persistently Missed', 10, 10, []],
  ['0/0 Total Houses', 11, 11, []],
  ['Total Lock Houses', 12, 12, []],
  ['Vaccine Record Doses', 13, 15, ['Received', 'Used', 'Returned']],
  ['Finger Marker', 16, 18, ['Received', 'Returned', 'Missing']],
  ['AFP Cases', 19, 19, []],
  ['Zero Dose', 20, 20, []],
  ['Vitamin A', 21, 22, ['Red', 'Blue']],
  ['Children Count', 25, 27, ['Previous', 'Now', 'Difference']],
];
export const NEXT_GROUPS: Group[] = [
  ['Team No', 1, 1, []],
  ['Number of House Holds', 2, 3, ['Target Micro Plan', 'Visited by Team']],
  ['Total Childred Micro Plan', 4, 4, ['0-59 M']],
];
// final-column -> catch-column (Final Team Wise adds Catch Day values for these)
export const CATCH_MAP: Record<number, number> = { 8: 4, 9: 5, 11: 8, 12: 9, 15: 11, 16: 12, 17: 13, 18: 14, 19: 15, 21: 19, 22: 20, 23: 21, 24: 22 };
export const COL_WIDTHS: Record<number, number> = { 1: 10, 4: 20.8, 5: 19.6, 8: 15, 10: 16.8, 11: 16.6, 12: 17, 15: 15, 16: 14.6, 26: 10.1 };

export interface Section {
  key: string;
  label: string;
  titleRow: number;
  headerRows: number[];
  teamRows: number[];
  totalRow: number;
  dayOffset?: number;
  group: 'main' | 'next';
}

export function buildSectionMap(nTeams: number, nCatch: number) {
  const step = nTeams + 4 + 1;
  const sections: Section[] = [];
  let row = 1;
  const teamRows = (start: number) => Array.from({ length: nTeams }, (_, j) => start + 3 + j);
  const make = (key: string, label: string, group: 'main' | 'next', dayOffset?: number): Section => ({
    key, label, titleRow: row, headerRows: [row + 1, row + 2], teamRows: teamRows(row),
    totalRow: row + 3 + nTeams, group, ...(dayOffset !== undefined ? { dayOffset } : {}),
  });
  for (let i = 0; i < 3; i++) { sections.push(make('day' + (i + 1), 'Day ' + (i + 1), 'main', i)); row += step; }
  for (let i = 0; i < nCatch; i++) { sections.push(make('catch' + (i + 1), 'Catch Day ' + (i + 1), 'main', 3 + i)); row += step; }
  sections.push(make('finalTeam', 'Final — Team Wise', 'main')); row += step;
  sections.push(make('finalDay', 'Final — Day Wise', 'main')); row += step;
  for (let i = 0; i < 3; i++) { sections.push(make('next' + (i + 1), 'Next Camp Day ' + (i + 1), 'next')); row += step; }
  return { sections, nTeams, nCatch };
}

export type Kind = 'day' | 'catch' | 'finalTeam' | 'finalDay' | 'next';
export function sectionKind(s: Section): Kind {
  const k = s.key;
  if (/^day[123]$/.test(k)) return 'day';
  if (/^catch\d+$/.test(k)) return 'catch';
  if (k === 'finalTeam') return 'finalTeam';
  if (k === 'finalDay') return 'finalDay';
  return 'next';
}
export function groupsFor(s: Section): Group[] {
  const kind = sectionKind(s);
  return kind === 'catch' ? CATCH_GROUPS : kind === 'next' ? NEXT_GROUPS : kind === 'finalTeam' || kind === 'finalDay' ? FINAL_GROUPS : DAY_GROUPS;
}
export function bodyLastCol(s: Section): number {
  const kind = sectionKind(s);
  return kind === 'next' ? 4 : kind === 'catch' ? 22 : kind === 'finalTeam' || kind === 'finalDay' ? 24 : 27;
}
export function sectionTitleText(s: Section): string {
  const k = s.key; let m: RegExpMatchArray | null;
  if ((m = k.match(/^day(\d)$/))) return 'DAY ' + m[1];
  if ((m = k.match(/^catch(\d)$/))) return 'Catch Day ' + m[1];
  if (k === 'finalTeam') return 'Final Report Team Wise';
  if (k === 'finalDay') return 'Final Report Day Wise';
  if ((m = k.match(/^next(\d)$/))) return 'Next Campaign Day ' + m[1];
  return s.label;
}

export function colLetterToNum(l: string): number { let n = 0; for (let i = 0; i < l.length; i++) n = n * 26 + (l.charCodeAt(i) - 64); return n; }
export function colLetter(n: number): string {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Text formula used for the Children Count "Difference" column. */
export const IFTXT = (a: string, b: string) =>
  'IF(' + a + '<' + b + ',"Increased by "&(' + b + '-' + a + '),IF(' + a + '>' + b + ',"Decreased by "&(' + a + '-' + b + '),"No change"))';

/** Which F2A columns the team "Add to F2A" writes (agreed mapping, never touch anything else). */
export const IMPORT_MAP: [string, string, (t: any) => number][] = [
  ['C', 'Visited by Team', (t) => t.houses], ['E', 'Total Children Team', (t) => t.B], ['F', 'Record Missed (NA)', (t) => t.A - t.B],
  ['H', 'Covered Missed (NA)', (t) => t.C], ['J', 'School', (t) => t.S], ['K', 'Guest', (t) => t.O], ['L', 'Street', (t) => t.D],
  ['N', 'MMP Vaccinated', (t) => t.mmpv], ['O', '0/0 Houses', (t) => t.z], ['P', 'Lock Houses', (t) => t.lock],
];
