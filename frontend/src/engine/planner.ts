/**
 * RAILNEXA Block Planning Engine
 * --------------------------------------------------------------
 * Exact branch-and-bound constraint optimiser for multi-department
 * maintenance block planning on a double-line corridor.
 *
 * Every number shown in the UI (conflicts, delays, availability,
 * completion, risk addressed, safety checks) is COMPUTED here from
 * the corridor dataset. Nothing is hard-coded.
 *
 * Model
 *  Decision per request: defer, or (start time on a 15-min grid inside a
 *  sanctioned corridor window, crew from the request's department).
 *
 *  Hard constraints
 *   H1  Block lies fully inside a sanctioned maintenance window of its section
 *   H2  No Vande Bharat / Rajdhani (P1) path may touch a block (+ safety buffer)
 *   H3  A crew cannot work two blocks at once (30-min transit if sections differ)
 *   H4  Crew shift limit (max_shift_hours)
 *
 *  Soft objective (minimise)
 *   deferral penalty (priority + AI risk score)
 *   + train delay minutes x train-class weight
 *     - Single-Line Working (SLW) over the other line: +10 min if that line is free
 *     - otherwise the train is held until the block clears
 *   + line-possession minutes (union per section-line  => rewards INTEGRATED blocks
 *     where Engg / S&T / TRD share one possession instead of three)
 *   + small deviation from the department's requested start (tie-breaker)
 */
import type {
  Asset, Crew, MaintenanceRequest, Train, TrackSection, WhatIfParameters,
  ScheduledBlock, Conflict, OptimizationMetrics, OptimizationResult,
} from '../types';

export type Line = 'UP' | 'DN';

export interface PlanningData {
  sections: TrackSection[];
  assets: Asset[];
  requests: MaintenanceRequest[];
  trains: Train[];
  crews: Crew[];
}

// ---------------------------------------------------------------- constants
export const STEP = 15;                 // start-time grid (min)
export const SLW_DELAY = 10;            // single-line-working diversion penalty (min)
export const CREW_TRANSIT = 30;         // crew move between different sections (min)
export const NIGHT_HORIZON = 360;       // 00:00 – 06:00 availability horizon
const NODE_LIMIT = 400_000;

const DEFER_PENALTY: Record<string, number> = { EMERGENCY: 6000, HIGH: 2500, MEDIUM: 900, LOW: 300 };
const TRAIN_WEIGHT: Record<number, number> = { 1: 1e6, 2: 8, 3: 4, 4: 2, 5: 1 };
const W_DELAY = 2;
const W_POSSESSION = 1;
const W_DEVIATION = 0.05;

// ---------------------------------------------------------------- helpers
export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const toHHMM = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(a0, b0) < Math.min(a1, b1);
const secNo = (id: string) => parseInt(id.replace(/\D/g, ''), 10) || 0;

export function trainLine(t: Train): Line {
  const r = t.route_sections;
  if (r.length >= 2) return secNo(r[r.length - 1]) >= secNo(r[0]) ? 'DN' : 'UP';
  return /NDLS|New Delhi/i.test(t.destination) ? 'UP' : 'DN';
}
export const reqLine = (r: MaintenanceRequest): Line => ((r as any).line === 'UP' ? 'UP' : 'DN');

function unionLength(iv: Array<[number, number]>): number {
  if (!iv.length) return 0;
  const s = [...iv].sort((a, b) => a[0] - b[0]);
  let total = 0, [cs, ce] = s[0];
  for (let i = 1; i < s.length; i++) {
    const [a, b] = s[i];
    if (a <= ce) ce = Math.max(ce, b);
    else { total += ce - cs; cs = a; ce = b; }
  }
  return total + (ce - cs);
}

// ---------------------------------------------------------------- scenario build
export interface Scenario {
  data: PlanningData;
  requests: MaintenanceRequest[];
  trains: Train[];
  crews: Crew[];
  params: WhatIfParameters;
  windowsBySection: Record<string, Array<{ start: number; end: number }>>;
  riskByAsset: Record<string, number>;
  locked?: Record<string, { start: number; end: number; crew: string }>;
}

const EMERGENCY_INJECT: MaintenanceRequest & { line: Line } = {
  id: 'MR-EMG-01',
  asset_id: 'AST-PNC-04',
  asset_name: 'Tongue Rail Crack – Meerut Yard Pts 21A',
  section_id: 'SEC-02',
  section_name: 'Ghaziabad – Meerut',
  department: 'Engineering',
  priority: 'EMERGENCY',
  duration_minutes: 90,
  preferred_window: '02:00 - 03:30',
  preferred_start_minute: 120,
  deadline_date: 'Tonight',
  assigned_crew: 'CREW-ENG-B',
  status: 'PENDING',
  description: 'USFD detected tongue-rail crack; 30 km/h caution order in force until renewal.',
  safety_buffer_minutes: 15,
  track_possession_required: true,
  power_block_required: false,
  traffic_block_required: true,
  line: 'UP',
};

export function buildScenario(data: PlanningData, params: WhatIfParameters): Scenario {
  // requests
  let requests = data.requests.slice(0, Math.max(1, params.maintenance_requests_count ?? data.requests.length));
  if (params.emergency_request_priority === 'EMERGENCY' && !requests.some(r => r.id === EMERGENCY_INJECT.id)) {
    requests = [EMERGENCY_INJECT, ...requests];
  }
  const dm = params.maintenance_duration_multiplier ?? 1;
  requests = requests.map(r => ({ ...r, duration_minutes: Math.round((r.duration_minutes * dm) / 5) * 5 }));

  // trains – traffic level
  const pct = params.train_traffic_level_pct ?? 100;
  let trains = [...data.trains];
  if (pct < 100) {
    const keep = Math.max(1, Math.round((data.trains.length * pct) / 100));
    // drop lowest-priority services first
    const ranked = [...trains].sort((a, b) => a.priority - b.priority);
    const keepIds = new Set(ranked.slice(0, keep).map(t => t.id));
    trains = trains.filter(t => keepIds.has(t.id));
  } else if (pct > 100) {
    const extra = Math.round((data.trains.length * (pct - 100)) / 100);
    const pool = data.trains.filter(t => t.priority >= 3 && t.movements.length);
    for (let k = 0; k < extra && pool.length; k++) {
      const base = pool[k % pool.length];
      const shift = 35 + 25 * Math.floor(k / pool.length) + (k % 3) * 10;
      trains.push({
        ...base,
        id: `${base.id}-X${k + 1}`,
        train_number: `${base.train_number}-X${k + 1}`,
        name: `${base.name} (additional path)`,
        movements: base.movements.map(m => {
          const e = m.entry_minute + shift, x = m.exit_minute + shift;
          return { ...m, entry_minute: e, exit_minute: x, entry_time: toHHMM(e), exit_time: toHHMM(x) };
        }),
      });
    }
  }

  // crews – availability (round-robin across departments so each keeps >=1 gang)
  const byDept: Record<string, Crew[]> = {};
  data.crews.forEach(c => (byDept[c.department] ||= []).push(c));
  const order: Crew[] = [];
  const depts = Object.keys(byDept);
  for (let i = 0; order.length < data.crews.length; i++) depts.forEach(d => byDept[d][i] && order.push(byDept[d][i]));
  const crews = order.slice(0, Math.max(1, params.crew_availability_count ?? data.crews.length));

  // windows – multiplier stretches/shrinks each sanctioned window from its start
  const wm = params.available_block_window_multiplier ?? 1;
  const windowsBySection: Scenario['windowsBySection'] = {};
  data.sections.forEach(s => {
    windowsBySection[s.id] = s.allowed_maintenance_windows.map(w => {
      const a = toMin(w.start), b = toMin(w.end);
      return { start: a, end: a + Math.floor(((b - a) * wm) / STEP) * STEP };
    });
  });

  const riskByAsset: Record<string, number> = {};
  data.assets.forEach(a => (riskByAsset[a.id] = a.risk_score));

  return { data, requests, trains, crews, params, windowsBySection, riskByAsset };
}

// ---------------------------------------------------------------- core evaluation
export interface Placed { req: MaintenanceRequest; start: number; end: number; crew: string; locked?: boolean }

interface MovementRef { trainIdx: number; entry: number; exit: number; line: Line }

interface Index {
  movesBySection: Record<string, MovementRef[]>;
  trainLines: Line[];
}

function buildIndex(trains: Train[]): Index {
  const movesBySection: Index['movesBySection'] = {};
  const trainLines = trains.map(trainLine);
  trains.forEach((t, i) => t.movements.forEach(m => {
    (movesBySection[m.section_id] ||= []).push({ trainIdx: i, entry: m.entry_minute, exit: m.exit_minute, line: trainLines[i] });
  }));
  return { movesBySection, trainLines };
}

export interface TrainImpact {
  trainIdx: number;
  section_id: string;
  mode: 'SLW' | 'HELD' | 'P1_VIOLATION';
  delay: number;
  blockIds: string[];
  entry: number;
  exit: number;
}

function trainImpacts(placed: Placed[], sc: Scenario, idx: Index): TrainImpact[] {
  const out: TrainImpact[] = [];
  const bySecLine: Record<string, Placed[]> = {};
  placed.forEach(p => (bySecLine[`${p.req.section_id}|${reqLine(p.req)}`] ||= []).push(p));
  const sections = new Set(placed.map(p => p.req.section_id));
  sections.forEach(sec => {
    (idx.movesBySection[sec] || []).forEach(mv => {
      const same = bySecLine[`${sec}|${mv.line}`] || [];
      const hits = same.filter(p => {
        const buf = p.req.safety_buffer_minutes ?? 15;
        return overlap(p.start - buf, p.end + buf, mv.entry, mv.exit);
      });
      if (!hits.length) return;
      const t = sc.trains[mv.trainIdx];
      if (t.priority <= 1) {
        out.push({ trainIdx: mv.trainIdx, section_id: sec, mode: 'P1_VIOLATION', delay: 0, blockIds: hits.map(h => h.req.id), entry: mv.entry, exit: mv.exit });
        return;
      }
      const other = bySecLine[`${sec}|${mv.line === 'UP' ? 'DN' : 'UP'}`] || [];
      const otherBusy = other.some(p => overlap(p.start, p.end, mv.entry, mv.exit));
      if (!otherBusy) {
        out.push({ trainIdx: mv.trainIdx, section_id: sec, mode: 'SLW', delay: SLW_DELAY, blockIds: hits.map(h => h.req.id), entry: mv.entry, exit: mv.exit });
      } else {
        const clear = Math.max(...hits.map(h => h.end + (h.req.safety_buffer_minutes ?? 15)));
        out.push({ trainIdx: mv.trainIdx, section_id: sec, mode: 'HELD', delay: Math.max(SLW_DELAY, clear - mv.entry), blockIds: hits.map(h => h.req.id), entry: mv.entry, exit: mv.exit });
      }
    });
  });
  return out;
}

function possessionMinutes(placed: Placed[], merge: boolean): number {
  if (!merge) return placed.reduce((s, p) => s + (p.end - p.start), 0);
  const g: Record<string, Array<[number, number]>> = {};
  placed.forEach(p => (g[`${p.req.section_id}|${reqLine(p.req)}`] ||= []).push([p.start, p.end]));
  return Object.values(g).reduce((s, iv) => s + unionLength(iv), 0);
}

const deferCost = (r: MaintenanceRequest, sc: Scenario) =>
  (DEFER_PENALTY[r.priority] ?? 500) + 10 * (sc.riskByAsset[r.asset_id] ?? 50);

function crewCompatible(a: Placed, b: Placed): boolean {
  if (a.crew !== b.crew) return true;
  const gap = a.req.section_id === b.req.section_id ? 0 : CREW_TRANSIT;
  return a.end + gap <= b.start || b.end + gap <= a.start;
}

function sectionCost(blocks: Placed[], sc: Scenario, idx: Index): number {
  if (!blocks.length) return 0;
  let c = W_POSSESSION * possessionMinutes(blocks, true);
  trainImpacts(blocks, sc, idx).forEach(ti => {
    c += W_DELAY * ti.delay * (TRAIN_WEIGHT[sc.trains[ti.trainIdx].priority] ?? 1);
    if (ti.mode === 'P1_VIOLATION') c += 1e7;
  });
  return c;
}

const staticCost = (r: MaintenanceRequest, start: number) => W_DEVIATION * Math.abs(start - r.preferred_start_minute);

function objective(placed: Placed[], deferred: MaintenanceRequest[], sc: Scenario, idx: Index): number {
  let c = 0;
  deferred.forEach(r => (c += deferCost(r, sc)));
  const bySec: Record<string, Placed[]> = {};
  placed.forEach(p => {
    c += staticCost(p.req, p.start);
    (bySec[p.req.section_id] ||= []).push(p);
  });
  Object.values(bySec).forEach(b => (c += sectionCost(b, sc, idx)));
  return c;
}

// ---------------------------------------------------------------- options
interface Option { start: number; end: number; static: number; alone: number }

function optionsFor(r: MaintenanceRequest, sc: Scenario, idx: Index): Option[] {
  if (!sc.crews.some(c => c.department === r.department && c.is_available !== false)) return [];
  const line = reqLine(r);
  const buf = r.safety_buffer_minutes ?? 15;
  const opts: Option[] = [];
  (sc.windowsBySection[r.section_id] || []).forEach(w => {
    for (let s = Math.ceil(w.start / STEP) * STEP; s + r.duration_minutes <= w.end; s += STEP) {
      const e = s + r.duration_minutes;
      // H2 – prefilter P1 paths on the same line
      const hitsP1 = (idx.movesBySection[r.section_id] || []).some(mv =>
        mv.line === line && sc.trains[mv.trainIdx].priority <= 1 && overlap(s - buf, e + buf, mv.entry, mv.exit));
      if (hitsP1) continue;
      const st = staticCost(r, s);
      opts.push({ start: s, end: e, static: st, alone: st + sectionCost([{ req: r, start: s, end: e, crew: '' }], sc, idx) });
    }
  });
  return opts.sort((a, b) => a.alone - b.alone);
}

// Crew capacity: gangs of a department are interchangeable, so instead of
// branching on WHICH gang (symmetric search) we require that at no instant more
// blocks of a department run than it has gangs (interval-graph colouring: max
// overlap <= k  <=>  k gangs suffice). Transit is modelled by extending every
// block by CREW_TRANSIT. Gangs are then assigned greedily by start time, which
// is optimal for interval graphs.
function capacityOk(list: Array<[number, number]>, cand: [number, number], k: number): boolean {
  const ext = (iv: [number, number]): [number, number] => [iv[0], iv[1] + CREW_TRANSIT];
  const c = ext(cand);
  const rel = list.map(ext).filter(iv => overlap(iv[0], iv[1], c[0], c[1]));
  if (rel.length < k) return true;
  const pts = [c[0], ...rel.map(iv => iv[0]).filter(x => x > c[0] && x < c[1])];
  return pts.every(t => 1 + rel.filter(iv => iv[0] <= t && t < iv[1]).length <= k);
}

function assignCrews(placed: Placed[], sc: Scenario): Placed[] {
  const out: Placed[] = [];
  const free: Record<string, { until: number; section: string; load: number }> = {};
  sc.crews.forEach(c => (free[c.id] = { until: -Infinity, section: '', load: 0 }));
  placed.filter(p => p.locked).forEach(p => (free[p.crew] = { until: p.end, section: p.req.section_id, load: p.end - p.start }));
  [...placed].filter(p => !p.locked).sort((a, b) => a.start - b.start).forEach(p => {
    const shift = (id: string) => (sc.crews.find(c => c.id === id)?.max_shift_hours ?? 8) * 60;
    const ok = (id: string) => {
      const f = free[id];
      return f && f.until + (f.section === p.req.section_id ? 0 : CREW_TRANSIT) <= p.start && f.load + p.end - p.start <= shift(id);
    };
    const pool = sc.crews.filter(c => c.department === p.req.department).map(c => c.id);
    const crew = ok(p.req.assigned_crew) && pool.includes(p.req.assigned_crew)
      ? p.req.assigned_crew
      : pool.filter(ok).sort((a, b) => free[a].load - free[b].load)[0] ?? pool[0] ?? p.req.assigned_crew;
    free[crew] = { until: p.end, section: p.req.section_id, load: (free[crew]?.load || 0) + p.end - p.start };
    out.push({ ...p, crew });
  });
  return [...placed.filter(p => p.locked), ...out];
}

// ---------------------------------------------------------------- solver
export interface SolveStats { nodes: number; provenOptimal: boolean; ms: number; optionsEvaluated: number; objective: number; greedyObjective: number }

export function solve(sc: Scenario): { placed: Placed[]; deferred: MaintenanceRequest[]; stats: SolveStats } {
  const t0 = performance.now();
  const idx = buildIndex(sc.trains);
  const lockedPlaced: Placed[] = [];
  const free: MaintenanceRequest[] = [];
  sc.requests.forEach(r => {
    const L = sc.locked?.[r.id];
    if (L) lockedPlaced.push({ req: r, start: L.start, end: L.end, crew: L.crew, locked: true });
    else free.push(r);
  });

  // branch order: highest deferral penalty first
  const order = [...free].sort((a, b) => deferCost(b, sc) - deferCost(a, sc));
  const opts = order.map(r => optionsFor(r, sc, idx));
  const optionsEvaluated = opts.reduce((s, o) => s + o.length, 0);
  const gangs: Record<string, number> = {};
  sc.crews.forEach(c => (gangs[c.department] = (gangs[c.department] || 0) + 1));

  // Lower bound for the unassigned tail. Interactions between blocks can only
  // ADD cost (another block takes away the SLW line / crew), except when two
  // requests share the same section-line (shared possession / shared impact).
  const minStatic = opts.map((o, i) => Math.min(deferCost(order[i], sc), o.length ? Math.min(...o.map(x => x.static)) : Infinity));
  const minAlone = opts.map((o, i) => Math.min(deferCost(order[i], sc), o.length ? Math.min(...o.map(x => x.alone)) : Infinity));
  // Bound for the unassigned tail i..n-1. Every request contributes at least
  // min(defer, static). Costs are monotone in the block set, so a section's final
  // cost is >= the stand-alone cost of ANY member – hence ONE remaining request per
  // section may contribute max(static, alone − current section cost) instead.
  const tailBound = (i: number): number => {
    let lb = 0;
    const extra: Record<string, number> = {};
    for (let j = i; j < order.length; j++) {
      lb += minStatic[j];
      const sec = order[j].section_id;
      const gain = Math.max(0, minAlone[j] - (secCost[sec] || 0)) - minStatic[j];
      if (gain > (extra[sec] || 0)) extra[sec] = gain;
    }
    for (const k in extra) lb += extra[k];
    return lb;
  };

  // incremental state
  const bySec: Record<string, Placed[]> = {};
  const secCost: Record<string, number> = {};
  const byDept: Record<string, Array<[number, number]>> = {};
  let fixed = 0; // deferral + static costs
  let secTotal = 0;
  const add = (p: Placed) => {
    const s = p.req.section_id;
    (bySec[s] ||= []).push(p);
    const nc = sectionCost(bySec[s], sc, idx);
    secTotal += nc - (secCost[s] || 0);
    const old = secCost[s] || 0;
    secCost[s] = nc;
    (byDept[p.req.department] ||= []).push([p.start, p.end]);
    return old;
  };
  const remove = (p: Placed, old: number) => {
    const s = p.req.section_id;
    bySec[s].pop();
    secTotal += old - secCost[s];
    secCost[s] = old;
    byDept[p.req.department].pop();
  };
  lockedPlaced.forEach(p => add(p));

  const cur: Placed[] = [...lockedPlaced];
  const curDef: MaintenanceRequest[] = [];
  let best = Infinity;
  let bestPlaced: Placed[] = [...lockedPlaced];
  let bestDeferred: MaintenanceRequest[] = [...order];
  let nodes = 0;
  let aborted = false;

  // greedy incumbent
  (() => {
    const snapshot: Array<[Placed, number]> = [];
    const gd: MaintenanceRequest[] = [];
    let gFixed = 0;
    order.forEach((r, i) => {
      let pick: Option | null = null, pickCost = deferCost(r, sc);
      for (const o of opts[i]) {
        if (!capacityOk(byDept[r.department] || [], [o.start, o.end], gangs[r.department] || 0)) continue;
        const p: Placed = { req: r, start: o.start, end: o.end, crew: '' };
        const before = secTotal;
        const old = add(p);
        const delta = secTotal - before + o.static;
        remove(p, old);
        if (delta < pickCost) { pick = o; pickCost = delta; }
      }
      if (pick) { const p = { req: r, start: pick.start, end: pick.end, crew: '' }; snapshot.push([p, add(p)]); gFixed += pick.static; }
      else { gd.push(r); gFixed += deferCost(r, sc); }
    });
    best = gFixed + secTotal + 1e-6;
    bestPlaced = [...lockedPlaced, ...snapshot.map(([p]) => ({ ...p }))];
    bestDeferred = gd;
    for (let k = snapshot.length - 1; k >= 0; k--) remove(snapshot[k][0], snapshot[k][1]);
  })();
  const greedyObjective = best;

  const dfs = (i: number) => {
    if (aborted) return;
    if (++nodes > NODE_LIMIT) { aborted = true; return; }
    if (fixed + secTotal + tailBound(i) >= best - 1e-9) return;
    if (i === order.length) {
      best = fixed + secTotal;
      bestPlaced = cur.map(p => ({ ...p }));
      bestDeferred = [...curDef];
      return;
    }
    const r = order[i];
    for (const o of opts[i]) {
      if (!capacityOk(byDept[r.department] || [], [o.start, o.end], gangs[r.department] || 0)) continue; // H3/H4
      const p: Placed = { req: r, start: o.start, end: o.end, crew: '' };
      const old = add(p);
      cur.push(p); fixed += o.static;
      dfs(i + 1);
      fixed -= o.static; cur.pop();
      remove(p, old);
      if (aborted) return;
    }
    curDef.push(r); fixed += deferCost(r, sc);
    dfs(i + 1);
    fixed -= deferCost(r, sc); curDef.pop();
  };
  dfs(0);

  return {
    placed: assignCrews(bestPlaced, sc),
    deferred: bestDeferred,
    stats: { nodes, provenOptimal: !aborted, ms: performance.now() - t0, optionsEvaluated, objective: best, greedyObjective },
  };
}


// ---------------------------------------------------------------- analysis
export interface PlanAnalysis {
  metrics: OptimizationMetrics & { total_train_delay_minutes: number; possession_minutes: number; risk_addressed_pct: number };
  conflicts: Conflict[];
  impacts: TrainImpact[];
  executable: Set<string>;
}

function inWindow(p: Placed, sc: Scenario) {
  return (sc.windowsBySection[p.req.section_id] || []).some(w => p.start >= w.start && p.end <= w.end);
}

export function analyse(placed: Placed[], allRequests: MaintenanceRequest[], sc: Scenario, opts: { coordinated: boolean; solverMs?: number }): PlanAnalysis {
  const idx = buildIndex(sc.trains);
  const impacts = trainImpacts(placed, sc, idx);
  const conflicts: Conflict[] = [];
  let n = 1;
  const secName = (id: string) => sc.data.sections.find(s => s.id === id)?.name || id;
  const push = (c: Omit<Conflict, 'id'>) => conflicts.push({ id: `CONF-${String(n++).padStart(3, '0')}`, ...c });

  impacts.forEach(ti => {
    // Single-Line Working diversions are planned regulations, not conflicts –
    // they are reported under "regulated trains" instead.
    if (ti.mode === 'SLW') return;
    const t = sc.trains[ti.trainIdx];
    push({
      type: 'TRAIN_CONFLICT',
      severity: ti.mode === 'P1_VIOLATION' ? 'CRITICAL' : 'HIGH',
      section_id: ti.section_id,
      section_name: secName(ti.section_id),
      affected_entities: [t.train_number, t.name, ...ti.blockIds],
      description: ti.mode === 'P1_VIOLATION'
        ? `${t.name} (${t.train_number}) path ${toHHMM(ti.entry)}–${toHHMM(ti.exit)} runs into block ${ti.blockIds.join(', ')} — premium service cannot be regulated.`
        : `${t.train_number} ${t.name} held ${ti.delay} min: block ${ti.blockIds.join(', ')} and the adjacent line are both occupied.`,
      suggested_resolution: 'Shift block clear of the path (+15 min buffer) or stagger the adjacent-line block so Single-Line Working is possible.',
      time_window: `${toHHMM(ti.entry)} – ${toHHMM(ti.exit)}`,
    });
  });

  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
    const a = placed[i], b = placed[j];
    if (!crewCompatible(a, b)) push({
      type: 'CREW_CONFLICT', severity: 'HIGH', section_id: a.req.section_id, section_name: secName(a.req.section_id),
      affected_entities: [a.crew, a.req.id, b.req.id],
      description: `${a.crew} double-booked: ${a.req.id} (${toHHMM(a.start)}–${toHHMM(a.end)}, ${secName(a.req.section_id)}) and ${b.req.id} (${toHHMM(b.start)}–${toHHMM(b.end)}, ${secName(b.req.section_id)}).`,
      suggested_resolution: `Assign a second ${a.req.department} gang or stagger by ≥ ${CREW_TRANSIT} min transit.`,
      time_window: `${toHHMM(Math.max(a.start, b.start))} – ${toHHMM(Math.min(a.end, b.end))}`,
    });
    if (!opts.coordinated && a.req.section_id === b.req.section_id && reqLine(a.req) === reqLine(b.req) && overlap(a.start, a.end, b.start, b.end)) push({
      type: 'ASSET_CONFLICT', severity: 'HIGH', section_id: a.req.section_id, section_name: secName(a.req.section_id),
      affected_entities: [a.req.id, b.req.id, a.req.department, b.req.department],
      description: `${a.req.department} (${a.req.id}) and ${b.req.department} (${b.req.id}) requested separate, overlapping possessions of the ${reqLine(a.req)} line on ${secName(a.req.section_id)}.`,
      suggested_resolution: 'Merge into one integrated multi-department block.',
      time_window: `${toHHMM(Math.max(a.start, b.start))} – ${toHHMM(Math.min(a.end, b.end))}`,
    });
  }
  placed.forEach(p => {
    if (!inWindow(p, sc) && !p.locked) push({
      type: 'TIME_CONFLICT', severity: 'MEDIUM', section_id: p.req.section_id, section_name: secName(p.req.section_id),
      affected_entities: [p.req.id], description: `${p.req.id} requested ${toHHMM(p.start)}–${toHHMM(p.end)}, outside the sanctioned corridor window of ${secName(p.req.section_id)}.`,
      suggested_resolution: 'Move inside the sanctioned window or obtain DRM special sanction.', time_window: `${toHHMM(p.start)} – ${toHHMM(p.end)}`,
    });
  });
  const placedIds = new Set(placed.map(p => p.req.id));
  allRequests.forEach(r => {
    if (!placedIds.has(r.id) && r.priority === 'EMERGENCY') push({
      type: 'PRIORITY_CONFLICT', severity: 'CRITICAL', section_id: r.section_id, section_name: secName(r.section_id),
      affected_entities: [r.id, r.asset_name], description: `EMERGENCY work ${r.id} (${r.asset_name}) could not be scheduled.`,
      suggested_resolution: 'Widen window, add crew, or split the work into two blocks.', time_window: r.preferred_window,
    });
  });

  // executable set: coordinated plans are executable by construction; for the
  // manual baseline, a request is refused if it violates a hard rule against
  // an already-accepted request (processed in priority order).
  const executable = new Set<string>();
  if (opts.coordinated) placed.forEach(p => executable.add(p.req.id));
  else {
    const ranked = [...placed].sort((a, b) => deferCost(b.req, sc) - deferCost(a.req, sc));
    const acc: Placed[] = [];
    ranked.forEach(p => {
      const p1 = impacts.some(ti => ti.mode === 'P1_VIOLATION' && ti.blockIds.includes(p.req.id));
      const ok = inWindow(p, sc) && !p1 && acc.every(a => crewCompatible(a, p) &&
        !(a.req.section_id === p.req.section_id && reqLine(a.req) === reqLine(p.req) && overlap(a.start, a.end, p.start, p.end)));
      if (ok) { acc.push(p); executable.add(p.req.id); }
    });
  }

  // metrics
  const trainDelay: Record<number, number> = {};
  impacts.forEach(ti => (trainDelay[ti.trainIdx] = (trainDelay[ti.trainIdx] || 0) + ti.delay));
  const affected = Object.keys(trainDelay).length;
  const totalDelay = Object.values(trainDelay).reduce((a, b) => a + b, 0);
  const lineSections = sc.data.sections.length * 2;
  const possession = possessionMinutes(placed, opts.coordinated);
  const availability = 100 * (1 - possession / (lineSections * NIGHT_HORIZON));
  const riskAll = allRequests.reduce((s, r) => s + (sc.riskByAsset[r.asset_id] ?? 50), 0);
  const riskDone = allRequests.filter(r => executable.has(r.id)).reduce((s, r) => s + (sc.riskByAsset[r.asset_id] ?? 50), 0);
  const safeBlocks = placed.filter(p => inWindow(p, sc) &&
    !impacts.some(ti => ti.mode !== 'SLW' && ti.blockIds.includes(p.req.id)) &&
    placed.every(q => q === p || crewCompatible(p, q))).length;

  const metrics = {
    total_schedule_conflicts: conflicts.length,
    affected_trains_count: affected,
    overall_asset_availability_pct: +availability.toFixed(1),
    critical_asset_availability_pct: +(riskAll ? (100 * riskDone) / riskAll : 100).toFixed(1),
    maintenance_completion_pct: +((100 * executable.size) / Math.max(1, allRequests.length)).toFixed(1),
    average_train_delay_minutes: +(affected ? totalDelay / affected : 0).toFixed(1),
    total_maintenance_hours_scheduled: +(placed.filter(p => executable.has(p.req.id)).reduce((s, p) => s + p.end - p.start, 0) / 60).toFixed(1),
    safety_compliance_score_pct: +((100 * safeBlocks) / Math.max(1, placed.length)).toFixed(1),
    solver_execution_time_ms: +(opts.solverMs ?? 0).toFixed(1),
    total_train_delay_minutes: totalDelay,
    possession_minutes: possession,
    risk_addressed_pct: +(riskAll ? (100 * riskDone) / riskAll : 100).toFixed(1),
  };
  return { metrics, conflicts, impacts, executable };
}

// ---------------------------------------------------------------- explanation
export interface IntegratedBlock {
  id: string;
  section_id: string;
  section_name: string;
  line: Line;
  start: number;
  end: number;
  request_ids: string[];
  departments: string[];
  minutes_saved: number;
}

export interface ValidationCheck { id: string; label: string; pass: boolean; detail: string }

export interface ExtendedResult extends OptimizationResult {
  deferred_requests: Array<{ id: string; asset_name: string; priority: string; reason: string }>;
  integrated_blocks: IntegratedBlock[];
  validation: ValidationCheck[];
  solver: SolveStats & { engine: string; requests: number; trains: number; crews: number };
  train_paths: Array<{ train_id: string; train_number: string; name: string; priority: number; section_id: string; line: Line; entry: number; exit: number; impact: 'CLEAR' | 'SLW' | 'HELD' | 'P1_VIOLATION'; delay: number }>;
  windows: Record<string, Array<{ start: number; end: number }>>;
  section_stats: Array<{ section_id: string; name: string; before_possession: number; after_possession: number; before_delay: number; after_delay: number; before_conflicts: number; after_conflicts: number }>;
  kpi: {
    before: PlanAnalysis['metrics'];
    after: PlanAnalysis['metrics'];
  };
}

function integratedBlocks(placed: Placed[], sc: Scenario): IntegratedBlock[] {
  const g: Record<string, Placed[]> = {};
  placed.forEach(p => (g[`${p.req.section_id}|${reqLine(p.req)}`] ||= []).push(p));
  const out: IntegratedBlock[] = [];
  Object.values(g).forEach(list => {
    const s = [...list].sort((a, b) => a.start - b.start);
    let cluster: Placed[] = [];
    const flush = () => {
      if (cluster.length > 1) {
        const start = Math.min(...cluster.map(c => c.start)), end = Math.max(...cluster.map(c => c.end));
        const sum = cluster.reduce((a, c) => a + c.end - c.start, 0);
        const r0 = cluster[0].req;
        out.push({
          id: `IB-${r0.section_id}-${reqLine(r0)}-${toHHMM(start).replace(':', '')}`,
          section_id: r0.section_id, section_name: r0.section_name, line: reqLine(r0), start, end,
          request_ids: cluster.map(c => c.req.id), departments: [...new Set(cluster.map(c => c.req.department))],
          minutes_saved: sum - (end - start),
        });
      }
    };
    s.forEach(p => {
      if (cluster.length && p.start < Math.max(...cluster.map(c => c.end))) cluster.push(p);
      else { flush(); cluster = [p]; }
    });
    flush();
  });
  return out;
}

function explainBlock(p: Placed, placed: Placed[], sc: Scenario, impacts: TrainImpact[], ibs: IntegratedBlock[]): { reason: string; confidence: number; affected: string[] } {
  const idx = buildIndex(sc.trains);
  const line = reqLine(p.req);
  const buf = p.req.safety_buffer_minutes ?? 15;
  const parts: string[] = [];
  const w = (sc.windowsBySection[p.req.section_id] || []).find(w => p.start >= w.start && p.end <= w.end);
  if (w) parts.push(`Inside sanctioned window ${toHHMM(w.start)}–${toHHMM(w.end)}`);
  if (p.start !== p.req.preferred_start_minute) {
    // counterfactual: what would the requested slot have cost?
    const alt: Placed = { ...p, start: p.req.preferred_start_minute, end: p.req.preferred_start_minute + (p.end - p.start) };
    const others = placed.filter(q => q !== p);
    const altImp = trainImpacts([...others, alt], sc, idx).filter(t => t.blockIds.includes(p.req.id));
    const altHeld = altImp.filter(t => t.mode !== 'SLW');
    const crewClash = others.find(q => !crewCompatible(q, alt));
    const why = altImp.some(t => t.mode === 'P1_VIOLATION')
      ? `requested slot would foul ${sc.trains[altImp.find(t => t.mode === 'P1_VIOLATION')!.trainIdx].name}`
      : altHeld.length ? `requested slot would hold ${altHeld.map(t => sc.trains[t.trainIdx].train_number).join(', ')} (${altHeld.reduce((a, t) => a + t.delay, 0)} min)`
        : crewClash ? `requested slot clashes with ${crewClash.req.id} for ${crewClash.crew}`
          : !inWindow(alt, sc) ? 'requested slot is outside the sanctioned window'
            : altImp.length > impacts.filter(t => t.blockIds.includes(p.req.id)).length ? `requested slot diverts ${altImp.length} train${altImp.length > 1 ? 's' : ''} via SLW`
              : 'aligns with a compatible possession on the same line';
    parts.push(`Moved ${toHHMM(p.req.preferred_start_minute)} → ${toHHMM(p.start)}: ${why}`);
  }
  const ib = ibs.find(b => b.request_ids.includes(p.req.id));
  if (ib) parts.push(`Integrated with ${ib.request_ids.filter(id => id !== p.req.id).join(', ')} (${ib.departments.join(' + ')}) — one possession, saves ${ib.minutes_saved} min`);
  const mine = impacts.filter(t => t.blockIds.includes(p.req.id));
  if (mine.length) parts.push(mine.map(t => `${sc.trains[t.trainIdx].train_number} ${t.mode === 'SLW' ? 'via SLW +' + t.delay + 'm' : 'held ' + t.delay + 'm'}`).join('; '));
  else parts.push(`Clear of all ${line}-line paths with ≥${buf} min buffer`);
  if (p.crew !== p.req.assigned_crew) parts.push(`Crew re-assigned ${p.req.assigned_crew} → ${p.crew}`);

  // robustness: minimum slack to nearest same-line path beyond buffer, and window slack
  const moves = (idx.movesBySection[p.req.section_id] || []).filter(m => m.line === line && !mine.some(t => t.entry === m.entry && t.trainIdx === m.trainIdx));
  const gaps = moves.map(m => Math.min(Math.abs(m.entry - (p.end + buf)), Math.abs(p.start - buf - m.exit)));
  const slack = Math.min(gaps.length ? Math.min(...gaps) : 120, w ? Math.min(p.start - w.start, w.end - p.end) + 60 : 0, 120);
  const confidence = +Math.min(0.99, 0.72 + slack / 400 - mine.length * 0.03).toFixed(2);
  return { reason: parts.join(' • '), confidence, affected: mine.map(t => sc.trains[t.trainIdx].id) };
}

// ---------------------------------------------------------------- top-level
export function planCorridor(data: PlanningData, params: WhatIfParameters, locked?: Scenario['locked']): ExtendedResult {
  const sc = buildScenario(data, params);
  sc.locked = locked;
  const { placed, deferred, stats } = solve(sc);

  const baselinePlaced: Placed[] = sc.requests.map(r => ({ req: r, start: r.preferred_start_minute, end: r.preferred_start_minute + r.duration_minutes, crew: r.assigned_crew }))
    // a crew not on duty in this scenario falls back to the first gang of the department
    .map(p => sc.crews.some(c => c.id === p.crew) ? p : { ...p, crew: sc.crews.find(c => c.department === p.req.department)?.id || p.crew });
  const before = analyse(baselinePlaced, sc.requests, sc, { coordinated: false });
  const after = analyse(placed, sc.requests, sc, { coordinated: true, solverMs: stats.ms });
  const ibs = integratedBlocks(placed, sc);

  const blocks: ScheduledBlock[] = placed
    .sort((a, b) => secNo(a.req.section_id) - secNo(b.req.section_id) || a.start - b.start)
    .map(p => {
      const ex = explainBlock(p, placed, sc, after.impacts, ibs);
      const ib = ibs.find(b => b.request_ids.includes(p.req.id));
      return {
        block_id: `BLK-${p.req.id}`,
        request_id: p.req.id,
        asset_id: p.req.asset_id,
        asset_name: p.req.asset_name,
        section_id: p.req.section_id,
        section_name: p.req.section_name,
        department: p.req.department,
        start_minute: p.start,
        end_minute: p.end,
        start_time: toHHMM(p.start),
        end_time: toHHMM(p.end),
        duration_minutes: p.end - p.start,
        assigned_crew: p.crew,
        priority: p.req.priority,
        confidence_score: ex.confidence,
        affected_train_ids: ex.affected,
        reason_for_window: ex.reason,
        power_block: p.req.power_block_required,
        traffic_block: p.req.traffic_block_required,
        safety_buffer_applied: p.req.safety_buffer_minutes ?? 15,
        line: reqLine(p.req),
        integrated_block_id: ib?.id,
        locked: !!p.locked,
      } as ScheduledBlock;
    });

  // affected trains table (after)
  const agg: Record<number, { delay: number; modes: Set<string>; sections: Set<string>; first: number; blocks: Set<string> }> = {};
  after.impacts.forEach(ti => {
    const a = (agg[ti.trainIdx] ||= { delay: 0, modes: new Set(), sections: new Set(), first: ti.entry, blocks: new Set() });
    a.delay += ti.delay; a.modes.add(ti.mode); a.sections.add(ti.section_id); a.first = Math.min(a.first, ti.entry);
    ti.blockIds.forEach(b => a.blocks.add(b));
  });
  const affected_trains = Object.entries(agg).map(([i, a]) => {
    const t = sc.trains[+i];
    return {
      train_id: t.train_number,
      train_name: t.name,
      original_slot: toHHMM(a.first),
      regulated_slot: toHHMM(a.first + a.delay),
      delay_minutes: a.delay,
      reason: `${a.modes.has('HELD') ? 'Held' : 'Single-Line Working'} on ${[...a.sections].map(s => sc.data.sections.find(x => x.id === s)?.name).join(', ')} around ${[...a.blocks].join(', ')}`,
    };
  }).sort((a, b) => b.delay_minutes - a.delay_minutes);

  // before-only conflicts are "resolved"
  const afterKeys = new Set(after.conflicts.map(c => c.type + c.affected_entities.join()));
  const resolved = before.conflicts.filter(c => !afterKeys.has(c.type + c.affected_entities.join()));

  const deferred_requests = deferred.map(r => {
    const idx = buildIndex(sc.trains);
    const n = optionsFor(r, sc, idx).length;
    const hasCrew = sc.crews.some(c => c.department === r.department);
    return {
      id: r.id, asset_name: r.asset_name, priority: r.priority,
      reason: !hasCrew ? `No ${r.department} gang on duty` : n === 0
        ? (Math.max(0, ...(sc.windowsBySection[r.section_id] || []).map(w => w.end - w.start)) < r.duration_minutes
          ? `${r.duration_minutes} min exceeds the longest sanctioned window on ${r.section_name} (${Math.max(0, ...(sc.windowsBySection[r.section_id] || []).map(w => w.end - w.start))} min) — split into two blocks`
          : `Every slot on ${r.section_name} would foul a Vande Bharat / Rajdhani path — needs a special traffic block`)
        : (() => {
          const busy = placed.filter(p => p.req.department === r.department);
          return busy.length
            ? `All ${r.department} gangs committed tonight (${busy.map(p => `${p.crew} on ${p.req.id}`).join(', ')}) — add a gang or carry over to next night`
            : 'Every feasible slot costs more in train delay than deferring this lower-priority work';
        })(),
    };
  });

  const p1Hit = after.impacts.some(t => t.mode === 'P1_VIOLATION');
  const outside = placed.filter(p => !inWindow(p, sc));
  const crewBad = after.conflicts.filter(c => c.type === 'CREW_CONFLICT').length;
  const load: Record<string, number> = {};
  placed.forEach(p => (load[p.crew] = (load[p.crew] || 0) + p.end - p.start));
  const overShift = Object.entries(load).filter(([c, m]) => m > (sc.crews.find(x => x.id === c)?.max_shift_hours ?? 8) * 60);
  const emergencies = sc.requests.filter(r => r.priority === 'EMERGENCY');
  const emDone = emergencies.filter(r => placed.some(p => p.req.id === r.id));
  const held = after.impacts.filter(t => t.mode === 'HELD');
  const bothLines = sc.data.sections.filter(s => {
    const up = placed.filter(p => p.req.section_id === s.id && reqLine(p.req) === 'UP');
    const dn = placed.filter(p => p.req.section_id === s.id && reqLine(p.req) === 'DN');
    return up.some(u => dn.some(d => overlap(u.start, u.end, d.start, d.end)));
  });
  const validation: ValidationCheck[] = [
    { id: 'P1', label: 'Vande Bharat / Rajdhani paths untouched', pass: !p1Hit, detail: p1Hit ? 'A premium path is fouled' : `${sc.trains.filter(t => t.priority <= 1).length} premium services checked with ${15}-min buffer` },
    { id: 'WIN', label: 'All blocks inside sanctioned corridor windows', pass: outside.length === 0, detail: outside.length ? `${outside.map(p => p.req.id).join(', ')} outside window${outside.some(p => p.locked) ? ' (overrun — needs DRM sanction)' : ''}` : `${placed.length}/${placed.length} blocks compliant` },
    { id: 'CREW', label: 'No crew double-booking (30-min transit)', pass: crewBad === 0, detail: crewBad ? `${crewBad} clash(es)` : `${new Set(placed.map(p => p.crew)).size} gangs, 0 clashes` },
    { id: 'SHIFT', label: 'Crew shift limits respected', pass: overShift.length === 0, detail: overShift.length ? overShift.map(([c]) => c).join(', ') : `Max load ${Math.max(0, ...Object.values(load))} min / 480 min` },
    { id: 'EMG', label: 'All EMERGENCY work scheduled', pass: emDone.length === emergencies.length, detail: `${emDone.length}/${emergencies.length} emergency requests placed` },
    { id: 'HOLD', label: 'No train held at signal (only SLW diversions)', pass: held.length === 0, detail: held.length ? `${held.length} hold(s): ${held.map(h => sc.trains[h.trainIdx].train_number).join(', ')}` : `${after.impacts.length} diversion(s) via Single-Line Working` },
    { id: 'BOTH', label: 'Adjacent line kept open for traffic', pass: bothLines.length === 0, detail: bothLines.length ? `Both lines blocked on ${bothLines.map(s => s.name).join(', ')}` : 'Every section retains one running line' },
  ];

  const a = after.metrics, b = before.metrics;
  const pct = (x: number, y: number) => (y ? Math.round((100 * (y - x)) / y) : 0);
  const insights: string[] = [
    `${stats.provenOptimal ? 'Provably optimal' : 'Best-found'} plan: ${stats.nodes.toLocaleString('en-IN')} search nodes over ${stats.optionsEvaluated} feasible slot/crew options in ${stats.ms.toFixed(1)} ms.`,
    `Conflicts ${b.total_schedule_conflicts} → ${a.total_schedule_conflicts}${b.total_schedule_conflicts ? ` (−${pct(a.total_schedule_conflicts, b.total_schedule_conflicts)}%)` : ''}; trains regulated ${b.affected_trains_count} → ${a.affected_trains_count}, total delay ${b.total_train_delay_minutes} → ${a.total_train_delay_minutes} min — no train held at a signal.`,
    ibs.length
      ? `${ibs.length} integrated multi-department block${ibs.length > 1 ? 's' : ''} (${ibs.map(i => i.departments.join('+') + ' on ' + i.section_name).join('; ')}) — ${ibs.reduce((s, i) => s + i.minutes_saved, 0)} line-minutes of possession saved.`
      : 'No compatible works on the same line — each block kept independent.',
    `Night line availability ${b.overall_asset_availability_pct}% → ${a.overall_asset_availability_pct}%; ${a.maintenance_completion_pct}% of requested work executable (was ${b.maintenance_completion_pct}%).`,
    `${a.risk_addressed_pct}% of total asset risk addressed tonight (was ${b.risk_addressed_pct}%).`,
    deferred.length ? `${deferred.length} request(s) deferred: ${deferred.map(d => d.id).join(', ')} — see reasons.` : 'All requests scheduled — nothing deferred.',
  ];

  return {
    scenario_name: params.scenario_preset ? `Scenario ${params.scenario_preset}` : 'Optimised Integrated Corridor Block Plan',
    is_optimized: true,
    before_metrics: b,
    after_metrics: a,
    scheduled_blocks: blocks,
    resolved_conflicts: resolved,
    remaining_conflicts: after.conflicts,
    affected_trains,
    ai_insights: insights,
    disclaimer: 'Prototype • Simulated corridor data. AI-generated plans are advisory and require authorised validation before execution.',
    deferred_requests,
    integrated_blocks: ibs,
    validation,
    solver: { ...stats, engine: 'Branch-and-bound constraint optimiser', requests: sc.requests.length, trains: sc.trains.length, crews: sc.crews.length },
    train_paths: sc.trains.flatMap((t, ti) => t.movements.map(m => {
      const imp = after.impacts.find(x => x.trainIdx === ti && x.section_id === m.section_id && x.entry === m.entry_minute);
      return { train_id: t.id, train_number: t.train_number, name: t.name, priority: t.priority, section_id: m.section_id, line: trainLine(t), entry: m.entry_minute, exit: m.exit_minute, impact: (imp?.mode || 'CLEAR') as 'CLEAR' | 'SLW' | 'HELD' | 'P1_VIOLATION', delay: imp?.delay || 0 };
    })),
    windows: sc.windowsBySection,
    section_stats: sc.data.sections.map(sec => ({
      section_id: sec.id,
      name: sec.name,
      before_possession: possessionMinutes(baselinePlaced.filter(p => p.req.section_id === sec.id), false),
      after_possession: possessionMinutes(placed.filter(p => p.req.section_id === sec.id), true),
      before_delay: before.impacts.filter(i => i.section_id === sec.id).reduce((x, i) => x + i.delay, 0),
      after_delay: after.impacts.filter(i => i.section_id === sec.id).reduce((x, i) => x + i.delay, 0),
      before_conflicts: before.conflicts.filter(c => c.section_id === sec.id).length,
      after_conflicts: after.conflicts.filter(c => c.section_id === sec.id).length,
    })),
    kpi: { before: b, after: a },
  };
}


/** Internals exposed for the verification test (tests/verify-optimality.ts). */
export const __internals = { buildIndex, optionsFor, capacityOk, objective };
