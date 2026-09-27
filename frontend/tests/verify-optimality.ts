/**
 * Verifies the branch-and-bound engine against exhaustive enumeration on
 * random what-if scenarios. Run: npx tsx tests/verify-optimality.ts
 */
import data from '../src/data/corridor.json';
import { planCorridor, buildScenario, __internals as I } from '../src/engine/planner';

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function brute(params: any): number {
  const sc = buildScenario(data as any, params);
  const idx = I.buildIndex(sc.trains);
  const reqs = sc.requests;
  const opts = reqs.map(r => I.optionsFor(r, sc, idx));
  const gangs: Record<string, number> = {};
  sc.crews.forEach(c => (gangs[c.department] = (gangs[c.department] || 0) + 1));
  let best = Infinity;
  const cur: any[] = [], def: any[] = [];
  const rec = (i: number) => {
    if (i === reqs.length) {
      const byDept: Record<string, Array<[number, number]>> = {};
      for (const p of cur) {
        const l = (byDept[p.req.department] ||= []);
        if (!I.capacityOk(l, [p.start, p.end], gangs[p.req.department] || 0)) return;
        l.push([p.start, p.end]);
      }
      best = Math.min(best, I.objective(cur, def, sc, idx));
      return;
    }
    for (const o of opts[i]) { cur.push({ req: reqs[i], start: o.start, end: o.end, crew: '' }); rec(i + 1); cur.pop(); }
    def.push(reqs[i]); rec(i + 1); def.pop();
  };
  rec(0);
  return best;
}

let bad = 0;
const N = 30;
for (let t = 0; t < N; t++) {
  const params: any = {
    available_block_window_multiplier: [0.8, 0.9, 1, 1.1, 1.2][Math.floor(rnd() * 5)],
    train_traffic_level_pct: [80, 100, 120, 150][Math.floor(rnd() * 4)],
    maintenance_requests_count: 4 + Math.floor(rnd() * 5),
    maintenance_duration_multiplier: [0.9, 1, 1.1][Math.floor(rnd() * 3)],
    crew_availability_count: 3 + Math.floor(rnd() * 6),
    emergency_request_priority: rnd() < 0.3 ? 'EMERGENCY' : undefined,
  };
  const r = planCorridor(data as any, params);
  const ref = brute(params);
  if (Math.abs(ref - r.solver.objective) > 1e-3) { bad++; console.log('MISMATCH', JSON.stringify(params), r.solver.objective, ref); }
}
console.log(`${N - bad}/${N} scenarios: branch-and-bound objective equals exhaustive optimum`);
process.exit(bad ? 1 : 0);
