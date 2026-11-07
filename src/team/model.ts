// Team app data model. The saved/sent file format is "polio-team" version 1 (same as the old team app).
export interface House { t: number; v: number; g: number; l: boolean; m: boolean; f: number; done: boolean }
export interface School { name: string; u5: number; vac: number }
export interface State { cur: number; houses: House[]; school: School[]; outside: number }
export interface Config { campaignId: string; team: string; day: number; area: string; uc: string; vaccinator: string; incharge: string }

export const blank = (): House => ({ t: 0, v: 0, g: 0, l: false, m: false, f: 0, done: false });
export const initial = (): State => ({ cur: 0, houses: [blank()], school: [], outside: 0 });
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const MAX = 999;

export function readConfig(): Config {
  const def: Config = { campaignId: 'DEMO', team: 'T-12', day: 1, area: '', uc: '', vaccinator: '', incharge: '' };
  try { return { ...def, ...JSON.parse(document.getElementById('polio-config')?.textContent || '{}') }; } catch { return def; }
}
export const storageKey = (c: Config) => `polio_${c.campaignId}_${c.team}_${c.day}`;
export function load(c: Config): State {
  try {
    const raw = localStorage.getItem(storageKey(c));
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.houses) && d.houses.length) return { cur: clamp(d.cur | 0, 0, d.houses.length - 1), houses: d.houses, school: d.school || [], outside: d.outside | 0 };
    }
  } catch { /* ignore */ }
  return initial();
}
export function save(c: Config, s: State) { try { localStorage.setItem(storageKey(c), JSON.stringify(s)); } catch { /* ignore */ } }

/** Missed in a house = children reported but not vaccinated at the first visit. */
export const missed = (h: House) => Math.max(0, h.t - h.v);

export function totals(s: State) {
  const T = { A: 0, B: 0, O: 0, C: 0, mmpKids: 0, mmpv: 0, z: 0, lock: 0, houses: 0, D: s.outside | 0, S: 0, still: 0, totalVacc: 0 };
  s.houses.forEach((h) => {
    if (!h.done) return;
    T.houses++;
    if (h.l) { T.lock++; return; }
    T.A += h.t; T.B += h.v; T.O += h.g; T.C += h.f;
    if (h.m) { T.mmpKids += h.t; T.mmpv += h.v; }
    if (h.t === 0) T.z++;
  });
  T.S = s.school.reduce((a, x) => a + (x.vac | 0), 0);
  T.still = T.A - T.B - T.C;
  T.totalVacc = T.B + T.C + T.D + T.S + T.O;
  return T;
}

/** The file the team sends back (incharge Import reads exactly this). */
export function buildFile(c: Config, s: State) {
  let last = -1;
  s.houses.forEach((h, i) => { if (h.done) last = i; });
  const houses = s.houses.slice(0, last + 1).map((h) => (h.done ? [h.t, h.v, h.g, h.l ? 1 : 0, h.m ? 1 : 0, h.f] : null));
  return {
    app: 'polio-team', version: 1, campaignId: c.campaignId, team: c.team, day: c.day, sentAt: new Date().toISOString(),
    lastHouse: last + 1, houses, school: s.school.map((x) => ({ name: x.name, u5: x.u5 | 0, vac: x.vac | 0 })), outside: s.outside | 0, totals: totals(s),
  };
}
/** Does the open house have numbers but is not saved yet? */
export const currentHasData = (s: State) => {
  const h = s.houses[s.cur];
  return !!h && !h.done && (h.t > 0 || h.v > 0 || h.g > 0 || h.l || h.m);
};

/* ---- actions (pure: take a state, return a new one) ---- */
const put = (s: State, i: number, h: House): State => ({ ...s, houses: s.houses.map((x, k) => (k === i ? h : x)) });
/** Change one number of the open house. Keeps vaccinated <= total. */
export function setNum(s: State, i: number, k: 't' | 'v' | 'g', n: number): State {
  const h = { ...s.houses[i] }; h[k] = clamp(n, 0, MAX);
  if (k === 't' && h.v > h.t) h.v = h.t;
  if (k === 'v' && h.v > h.t) h.v = h.t; // vaccinated can never be more than total
  return put(s, i, h);
}
export function toggle(s: State, i: number, k: 'm' | 'l'): State {
  const h = { ...s.houses[i] }; h[k] = !h[k];
  return put(s, i, h);
}
export function setFound(s: State, i: number, n: number): State {
  const h = s.houses[i]; return put(s, i, { ...h, f: clamp(n, 0, missed(h)) });
}
/** Mark the open house done and go to the next one (new blank house if this was the last). */
export function saveNext(s: State): State {
  const st = put(s, s.cur, { ...s.houses[s.cur], done: true });
  if (st.cur === st.houses.length - 1) return { ...st, houses: [...st.houses, blank()], cur: st.cur + 1 };
  return { ...st, cur: st.cur + 1 };
}
/** Mark the open house done but stay (used by Finish / Send). */
export function saveHere(s: State): State { return put(s, s.cur, { ...s.houses[s.cur], done: true }); }
/** Only the last house can be deleted. */
export function canDelete(s: State) { return s.houses.length > 1 && s.cur === s.houses.length - 1; }
export function deleteLast(s: State): State {
  const houses = s.houses.slice(0, -1);
  return { ...s, houses, cur: houses.length - 1 };
}
export const go = (s: State, i: number): State => ({ ...s, cur: clamp(i, 0, s.houses.length - 1) });
export const setOutside = (s: State, n: number): State => ({ ...s, outside: clamp(n, 0, MAX) });
export const setSchool = (s: State, i: number, p: Partial<School>): State => ({ ...s, school: s.school.map((x, k) => (k === i ? { ...x, ...p } : x)) });
export const addSchool = (s: State): State => ({ ...s, school: [...s.school, { name: '', u5: 0, vac: 0 }] });
export const removeSchool = (s: State, i: number): State => ({ ...s, school: s.school.filter((_, k) => k !== i) });
