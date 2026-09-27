import React, { useEffect, useState } from 'react';
import { useRailOpt } from '../context/RailOptContext';
import { WhatIfParameters } from '../types';
import { 
  SlidersHorizontal, Play, Sparkles, AlertTriangle, 
  RefreshCw, CheckCircle2, TrendingUp, Layers, Zap, Clock, Users, Train 
} from 'lucide-react';

export const WhatIfSimulatorView: React.FC = () => {
  const { 
    whatIfParams, 
    setWhatIfParams, 
    triggerOptimization, 
    triggerPresetScenario, 
    setDisruptionModalOpen, 
    isOptimizing, 
    result,
    requests,
    crews
  } = useRailOpt();

  const [localParams, setLocalParams] = useState<WhatIfParameters>(whatIfParams);
  useEffect(() => setLocalParams(whatIfParams), [whatIfParams]);

  const presets = [
    { id: 'A', name: 'Scenario A: Normal night', desc: `Working timetable, ${requests.length} requests, all ${crews.length} gangs`, badge: 'Baseline' },
    { id: 'B', name: 'Scenario B: Traffic surge', desc: '+50% additional express & freight paths', badge: 'Stress test' },
    { id: 'C', name: 'Scenario C: Emergency defect', desc: 'USFD finds a tongue-rail crack at Meerut — must be fixed tonight', badge: 'Emergency' },
    { id: 'D', name: 'Scenario D: Shorter windows', desc: 'Traffic asks for sanctioned windows 15% shorter', badge: 'Tight windows' },
    { id: 'E', name: 'Scenario E: Larger work scope', desc: 'Every job takes 25% longer than estimated', badge: '+25% duration' },
  ];

  const handleRunSimulation = async () => {
    const p = { ...localParams, scenario_preset: undefined };
    setWhatIfParams(p);
    await triggerOptimization(p);
  };

  const handleSelectPreset = async (presetId: 'A' | 'B' | 'C' | 'D' | 'E') => {
    await triggerPresetScenario(presetId);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="control-card rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-purple-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-purple-600" />
            What-If Scenario Simulator & Dynamic Disruption Engine
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Simulate parametric boundary conditions, traffic spikes, emergency track failures, and live overruns
          </p>
        </div>

        <button
          onClick={() => setDisruptionModalOpen(true)}
          className="py-1.5 px-3 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition flex items-center gap-1.5 self-start md:self-auto shadow-sm"
        >
          <Zap className="w-3.5 h-3.5 text-amber-600" />
          Live disruption: block overruns +90 min
        </button>
      </div>

      {/* Preset Scenarios Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {presets.map(p => {
          const isSelected = localParams.scenario_preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p.id as any)}
              disabled={isOptimizing}
              className={`control-card rounded-xl p-3 text-left transition-all duration-200 hover:border-purple-400 hover:shadow-md ${
                isSelected ? 'border-purple-500 bg-purple-50/70 ring-2 ring-purple-400/30' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-900">{p.name.split(':')[0]}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white text-purple-700 border border-purple-200 font-semibold shadow-xs">
                  {p.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug line-clamp-2 font-medium">
                {p.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Sliders & Simulation Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Parametric Slider Controls */}
        <div className="lg:col-span-2 control-card rounded-xl p-5 border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
            <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-900">
              Parametric Sensitivity Controls
            </h3>
            <span className="text-[10px] font-mono text-slate-500 font-semibold">
              Adjust variables to test constraint solver resilience
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Slider 1: Traffic Level */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-800 font-bold flex items-center gap-1.5">
                  <Train className="w-3.5 h-3.5 text-blue-600" />
                  Train Traffic Level
                </span>
                <span className="font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {localParams.train_traffic_level_pct}%
                </span>
              </div>
              <input
                type="range"
                min="60"
                max="160"
                step="10"
                value={localParams.train_traffic_level_pct}
                onChange={e => setLocalParams({ ...localParams, train_traffic_level_pct: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>60% (Low density)</span>
                <span>100%</span>
                <span>160% (Congested)</span>
              </div>
            </div>

            {/* Slider 2: Available Window Multiplier */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-800 font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  Available Possession Window
                </span>
                <span className="font-mono text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {localParams.available_block_window_multiplier}x
                </span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.4"
                step="0.05"
                value={localParams.available_block_window_multiplier}
                onChange={e => setLocalParams({ ...localParams, available_block_window_multiplier: Number(e.target.value) })}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.6x (Tight slots)</span>
                <span>1.0x</span>
                <span>1.4x (Wide slots)</span>
              </div>
            </div>

            {/* Slider 3: Maintenance Requests Count */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-800 font-bold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  Maintenance Requests Count
                </span>
                <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {localParams.maintenance_requests_count} requests
                </span>
              </div>
              <input
                type="range"
                min="1"
                max={requests.length}
                step="1"
                value={localParams.maintenance_requests_count}
                onChange={e => setLocalParams({ ...localParams, maintenance_requests_count: Number(e.target.value) })}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>1</span>
                <span>{Math.ceil(requests.length / 2)}</span>
                <span>{requests.length} (all)</span>
              </div>
            </div>

            {/* Slider 4: Maintenance Duration Multiplier */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-800 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Duration Multiplier / Worksite Scope
                </span>
                <span className="font-mono text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {localParams.maintenance_duration_multiplier}x
                </span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.5"
                step="0.05"
                value={localParams.maintenance_duration_multiplier}
                onChange={e => setLocalParams({ ...localParams, maintenance_duration_multiplier: Number(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.8x (Fast)</span>
                <span>1.0x</span>
                <span>1.5x (+50%)</span>
              </div>
            </div>
            {/* Slider 5: Gangs on duty */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-800 font-bold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  Maintenance gangs on duty
                </span>
                <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {localParams.crew_availability_count} of {crews.length}
                </span>
              </div>
              <input
                type="range"
                min="3"
                max={crews.length}
                step="1"
                value={localParams.crew_availability_count}
                onChange={e => setLocalParams({ ...localParams, crew_availability_count: Number(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>3 (one per department)</span>
                <span>{crews.length} (full strength)</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleRunSimulation}
            disabled={isOptimizing}
            className="w-full py-3 rounded-xl font-extrabold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/20 transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>RECALCULATING CONSTRAINTS...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white text-white" />
                <span>RUN WHAT-IF SIMULATION</span>
              </>
            )}
          </button>
        </div>

        {/* Right Col: Recalculated Impact Card */}
        <div className="control-card rounded-xl p-5 border border-purple-200 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2 mb-3">
              <div className="p-1.5 rounded-lg bg-purple-50 border border-purple-200">
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-900">
                  Simulated Scenario Outcome
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  Re-solved from scratch for these inputs
                </p>
              </div>
            </div>

            {result && (
              <div className="space-y-2 text-xs">
                {[
                  ['Work scheduled', `${result.scheduled_blocks.length}/${result.solver.requests}`, result.deferred_requests.length === 0],
                  ['Conflicts remaining', `${result.after_metrics.total_schedule_conflicts}`, result.after_metrics.total_schedule_conflicts === 0],
                  ['Trains regulated', `${result.after_metrics.affected_trains_count} (+${result.kpi.after.total_train_delay_minutes} min)`, true],
                  ['Line availability 00–06h', `${result.after_metrics.overall_asset_availability_pct}%`, true],
                  ['Asset risk addressed', `${result.kpi.after.risk_addressed_pct}%`, result.kpi.after.risk_addressed_pct >= 90],
                  ['Safety checks', `${result.validation.filter(v => v.pass).length}/${result.validation.length} pass`, result.validation.every(v => v.pass)],
                ].map(([k, v, ok]) => (
                  <div key={k as string} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">{k}</span>
                    <span className={`font-mono font-bold ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {result && (
            <div className={`p-3 rounded-xl border text-[11px] mt-4 font-medium ${result.deferred_requests.length ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-purple-50 border-purple-200 text-purple-900'}`}>
              {result.deferred_requests.length
                ? <><strong>Deferred:</strong> {result.deferred_requests.map(d => `${d.id} — ${d.reason}`).join(' · ')}</>
                : <>✓ {result.ai_insights[2]}</>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
