import React, { useState } from 'react';
import { useRailOpt } from '../context/RailOptContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { TrendingUp, ShieldCheck, Clock, Gauge, ArrowDownRight, ArrowUpRight, TrainFront, Info } from 'lucide-react';
import { ValidationPanel } from '../components/ValidationPanel';

const BEFORE = '#94a3b8';
const AFTER = '#2563eb';
const tip = { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' };

export const OptimizationResultsView: React.FC = () => {
  const { result } = useRailOpt();
  const [filter, setFilter] = useState<string>('ALL');
  if (!result) return <div className="control-card rounded-xl p-8 text-center text-sm text-slate-500">Generating plan…</div>;

  const b = result.kpi.before, a = result.kpi.after;
  const delta = (x: number, y: number, unit = '', invert = false) => {
    const d = +(y - x).toFixed(1);
    const good = invert ? d <= 0 : d >= 0;
    return { text: `${d > 0 ? '+' : ''}${d}${unit}`, good };
  };
  const cards = [
    { t: 'CONFLICTS', b: b.total_schedule_conflicts, a: a.total_schedule_conflicts, d: delta(b.total_schedule_conflicts, a.total_schedule_conflicts, '', true) },
    { t: 'WORK EXECUTABLE', b: `${b.maintenance_completion_pct}%`, a: `${a.maintenance_completion_pct}%`, d: delta(b.maintenance_completion_pct, a.maintenance_completion_pct, ' pts') },
    { t: 'LINE AVAILABILITY 00–06h', b: `${b.overall_asset_availability_pct}%`, a: `${a.overall_asset_availability_pct}%`, d: delta(b.overall_asset_availability_pct, a.overall_asset_availability_pct, ' pts') },
    { t: 'ASSET RISK ADDRESSED', b: `${b.risk_addressed_pct}%`, a: `${a.risk_addressed_pct}%`, d: delta(b.risk_addressed_pct, a.risk_addressed_pct, ' pts') },
    { t: 'TOTAL TRAIN DELAY', b: `${b.total_train_delay_minutes}m`, a: `${a.total_train_delay_minutes}m`, d: delta(b.total_train_delay_minutes, a.total_train_delay_minutes, ' min', true) },
  ];

  const sectionData = result.section_stats
    .filter(s => s.before_possession || s.after_possession)
    .map(s => ({ name: s.name.replace(' – ', '–'), before: s.before_possession, after: s.after_possession }));
  const impactData = [
    { name: 'Conflicts', before: b.total_schedule_conflicts, after: a.total_schedule_conflicts },
    { name: 'Trains regulated', before: b.affected_trains_count, after: a.affected_trains_count },
    { name: 'Crew clashes', before: result.resolved_conflicts.filter(c => c.type === 'CREW_CONFLICT').length, after: result.remaining_conflicts.filter(c => c.type === 'CREW_CONFLICT').length },
    { name: 'Blocks outside window', before: result.resolved_conflicts.filter(c => c.type === 'TIME_CONFLICT').length, after: result.remaining_conflicts.filter(c => c.type === 'TIME_CONFLICT').length },
  ];
  const types = ['ALL', ...Array.from(new Set(result.resolved_conflicts.map(c => c.type)))];
  const ledger = result.resolved_conflicts.filter(c => filter === 'ALL' || c.type === filter);

  return (
    <div className="space-y-4">
      <div className="control-card rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-emerald-200 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Results: Departmental requests vs Optimised plan
          </h2>
          <p className="text-xs text-slate-500 font-medium flex items-start gap-1 mt-0.5">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            “Before” = each department's requested slot and gang exactly as submitted, evaluated by the same rules. “After” = the optimiser's plan. Nothing on this page is hard-coded.
          </p>
        </div>
        <span className="text-[10px] font-mono text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 font-semibold self-start md:self-auto whitespace-nowrap">
          {result.scenario_name} · simulated data
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map(c => (
          <div key={c.t} className="control-card rounded-xl p-3.5 border border-slate-200 shadow-sm">
            <span className="text-[10px] font-mono text-slate-500 font-bold block mb-1">{c.t}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-mono text-slate-400 line-through font-semibold">{c.b}</span>
              <span className="text-2xl font-bold font-mono text-slate-900">{c.a}</span>
            </div>
            <span className={`text-[10px] font-mono font-semibold flex items-center gap-0.5 mt-1 ${c.d.good ? 'text-emerald-700' : 'text-rose-700'}`}>
              {c.d.text.startsWith('-') ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />} {c.d.text}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="control-card rounded-xl p-4 border border-slate-200 shadow-sm lg:col-span-2">
          <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-blue-600" /> Line possession by section (minutes blocked)
          </h3>
          <p className="text-[11px] text-slate-500 mb-2">Lower is better. Drops come from integrated blocks — works that used to take the line separately now share one possession.</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} interval={0} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={tip} formatter={(v: number) => `${v} min`} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#475569' }} />
                <Bar dataKey="before" name="As requested" fill={BEFORE} radius={[4, 4, 0, 0]} />
                <Bar dataKey="after" name="Optimised" fill={AFTER} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <ValidationPanel />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="control-card rounded-xl p-4 border border-slate-200 shadow-sm">
          <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" /> Conflicts & disruption
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={impactData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={tip} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#475569' }} />
                <Bar dataKey="before" name="As requested" fill={BEFORE} radius={[4, 4, 0, 0]} />
                <Bar dataKey="after" name="Optimised" fill={AFTER} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="control-card rounded-xl p-4 border border-slate-200 shadow-sm">
          <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-900 mb-3 flex items-center gap-2">
            <TrainFront className="w-4 h-4 text-indigo-600" /> Trains regulated by the plan
          </h3>
          {result.affected_trains.length === 0 ? (
            <div className="text-xs text-emerald-700 font-semibold">No train is affected by tonight's blocks.</div>
          ) : (
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] font-mono uppercase text-slate-500 sticky top-0 bg-white">
                  <tr><th className="text-left py-1">Train</th><th className="text-left py-1">How</th><th className="text-right py-1">Delay</th></tr>
                </thead>
                <tbody>
                  {result.affected_trains.map(t => (
                    <tr key={t.train_id} className="border-t border-slate-100 align-top">
                      <td className="py-1.5 pr-2"><div className="font-mono font-bold text-slate-900">{t.train_id}</div><div className="text-slate-500 truncate max-w-[180px]">{t.train_name}</div></td>
                      <td className="py-1.5 pr-2 text-slate-600">{t.reason}</td>
                      <td className="py-1.5 text-right font-mono font-bold text-amber-700">+{t.delay_minutes}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-[10.5px] text-slate-500 border-t border-slate-100 pt-2">
            Single-Line Working (SLW): the train crosses over and runs on the adjacent open line past the block, a standard ~10 min regulation. Vande Bharat / Rajdhani paths are never touched.
          </p>
        </div>
      </div>

      <div className="control-card rounded-xl p-4 border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Conflicts in the submitted requests — resolved by the plan ({result.resolved_conflicts.length})
          </h3>
          <div className="flex flex-wrap gap-1">
            {types.map(t => (
              <button key={t} onClick={() => setFilter(t)} className={`text-[10px] font-mono px-2 py-0.5 rounded border ${filter === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                {t.replace('_CONFLICT', '').replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {ledger.map(conf => (
            <div key={conf.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-rose-700">{conf.id} · {conf.type.replace('_', ' ')}</span>
                <span className="text-[9px] font-mono px-1.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold">RESOLVED</span>
              </div>
              <div className="font-semibold text-slate-900 leading-snug">{conf.description}</div>
              <div className="text-[11px] text-emerald-700 font-medium pt-1 border-t border-slate-200">Fix: {conf.suggested_resolution}</div>
            </div>
          ))}
          {ledger.length === 0 && <div className="text-slate-500">No conflicts of this type.</div>}
        </div>
        {result.remaining_conflicts.length > 0 && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900">
            <strong>Still open ({result.remaining_conflicts.length}):</strong> {result.remaining_conflicts.map(c => c.description).join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
};
