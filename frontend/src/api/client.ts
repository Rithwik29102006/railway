/**
 * Data + planning adapter.
 *
 * The planning engine (src/engine/planner.ts) runs entirely in the browser, so
 * the hosted prototype works with no server. The same corridor dataset is
 * served by the FastAPI backend (backend/app/data_store.py), which runs the
 * identical algorithm (backend/app/planner.py) for integration with other
 * systems.
 */
import type { MaintenanceRequest, WhatIfParameters } from '../types';
import corridor from '../data/corridor.json';
import { planCorridor, type ExtendedResult, type PlanningData, toHHMM } from '../engine/planner';

const store: PlanningData = JSON.parse(JSON.stringify(corridor));
let lastParams: WhatIfParameters | undefined;
let lastResult: ExtendedResult | null = null;

export const DEFAULT_PARAMS: WhatIfParameters = {
  available_block_window_multiplier: 1.0,
  train_traffic_level_pct: 100,
  maintenance_requests_count: store.requests.length,
  maintenance_duration_multiplier: 1.0,
  crew_availability_count: store.crews.length,
  scenario_preset: 'A',
};

export async function fetchRailwayData() {
  return {
    sections: store.sections,
    assets: store.assets,
    requests: store.requests,
    trains: store.trains,
    crews: store.crews,
    metadata: {
      corridor_name: 'New Delhi (NDLS) – Varanasi (BSB) double-line corridor',
      data_source: 'Simulated working timetable & asset registers',
    },
  };
}

export async function runOptimizationAPI(params?: WhatIfParameters): Promise<ExtendedResult> {
  lastParams = { ...DEFAULT_PARAMS, ...(params || {}) };
  // let the browser paint the progress animation before the solver blocks the thread
  await new Promise(r => setTimeout(r, 0));
  lastResult = planCorridor(store, lastParams);
  return lastResult;
}

export async function runSimulationAPI(params: WhatIfParameters) {
  return { scenario_parameters: params, result: await runOptimizationAPI(params) };
}

/**
 * Live disruption: a block overruns by `additional_minutes`. The overrunning block
 * is locked (work is in progress – it cannot move) and every other block is
 * re-optimised around it.
 */
export async function triggerDisruptionReplanAPI(payload: { block_id: string; additional_minutes: number; reason: string }) {
  const params = lastParams || DEFAULT_PARAMS;
  const prev = lastResult || planCorridor(store, params);
  const blk = prev.scheduled_blocks.find(b => b.block_id === payload.block_id) || prev.scheduled_blocks[0];
  if (!blk) return null;
  const locked = { [blk.request_id]: { start: blk.start_minute, end: blk.end_minute + payload.additional_minutes, crew: blk.assigned_crew } };
  const next = planCorridor(store, params, locked);

  const shifts = next.scheduled_blocks.map(nb => {
    const ob = prev.scheduled_blocks.find(b => b.request_id === nb.request_id);
    if (nb.request_id === blk.request_id) {
      return { block_id: nb.block_id, action: 'DURATION_EXTENDED', old_slot: `${ob?.start_time}–${ob?.end_time}`, new_slot: `${nb.start_time}–${nb.end_time}`, change: `+${payload.additional_minutes} min overrun (locked)` };
    }
    if (!ob) return { block_id: nb.block_id, action: 'NEWLY_SCHEDULED', old_slot: '—', new_slot: `${nb.start_time}–${nb.end_time}`, change: 'Added' };
    if (ob.start_minute !== nb.start_minute || ob.assigned_crew !== nb.assigned_crew) {
      const d = nb.start_minute - ob.start_minute;
      return { block_id: nb.block_id, action: 'SLOT_RESCHEDULED', old_slot: `${ob.start_time}–${ob.end_time}`, new_slot: `${nb.start_time}–${nb.end_time}`, change: d ? `Shifted ${d > 0 ? '+' : ''}${d} min` : `Crew ${ob.assigned_crew} → ${nb.assigned_crew}` };
    }
    return null;
  }).filter(Boolean) as Array<Record<string, string>>;
  const dropped = prev.scheduled_blocks.filter(ob => !next.scheduled_blocks.some(nb => nb.request_id === ob.request_id))
    .map(ob => ({ block_id: ob.block_id, action: 'DEFERRED', old_slot: `${ob.start_time}–${ob.end_time}`, new_slot: 'next night', change: 'Carried over' }));

  const premiumSafe = next.validation.find(v => v.id === 'P1')?.pass;
  const trainChanges = next.affected_trains
    .map(t => ({ t, old: prev.affected_trains.find(o => o.train_id === t.train_id) }))
    .filter(({ t, old }) => !old || old.delay_minutes !== t.delay_minutes)
    .map(({ t, old }) => ({ block_id: t.train_id, action: 'TRAIN', old_slot: old ? `+${old.delay_minutes} min` : 'on time', new_slot: `+${t.delay_minutes} min`, change: t.reason }));
  const moved = shifts.length - 1 + dropped.length;
  lastResult = next;
  return {
    disruption_event: { block_id: blk.block_id, additional_minutes: payload.additional_minutes, reason: payload.reason, severity: 'OPERATIONAL_ALERT' },
    re_optimization_summary: {
      status: 'RE_OPTIMIZED',
      message: `${blk.request_id} held until ${toHHMM(blk.end_minute + payload.additional_minutes)}. ${moved ? `${moved} other block(s) re-planned` : 'No other block needs to move'}; ${trainChanges.length ? `${trainChanges.length} train(s) newly regulated` : 'no additional train regulation'}. Re-solved in ${next.solver.ms.toFixed(1)} ms. ${premiumSafe ? 'No Vande Bharat / Rajdhani impact.' : 'Premium path affected — escalate to Chief Controller.'}`,
      shifts_applied: [...shifts, ...dropped, ...trainChanges],
    },
    result: next,
    updated_blocks: next.scheduled_blocks,
    new_availability_pct: next.after_metrics.overall_asset_availability_pct,
    new_delay_minutes: next.after_metrics.average_train_delay_minutes,
  };
}

export async function createMaintenanceRequestAPI(req: MaintenanceRequest) {
  store.requests = [req, ...store.requests.filter(r => r.id !== req.id)];
  return { message: 'Created', request: req };
}

export function getStore() {
  return store;
}
