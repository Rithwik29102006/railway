import React from 'react';
import { useRailOpt } from '../context/RailOptContext';
import { ClipboardCheck, ShieldAlert, Gauge, Activity, TrainFront, Combine, ArrowUpRight, ArrowDownRight } from 'lucide-react';

/** Headline KPIs — every value is computed by the planning engine (before = departmental requests as submitted). */
export const KPICards: React.FC = () => {
  const { result } = useRailOpt();
  if (!result) {
    return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="control-card rounded-xl h-[132px] animate-pulse" />)}</div>;
  }
  const a = result.kpi.after, b = result.kpi.before;
  const saved = b.possession_minutes - a.possession_minutes;
  const scheduled = result.scheduled_blocks.length;
  const total = result.solver.requests;

  const cards = [
    {
      title: 'WORK SCHEDULED',
      value: `${scheduled}/${total}`,
      unit: 'requests',
      sub: result.deferred_requests.length ? `${result.deferred_requests.length} deferred with reason` : 'Nothing deferred',
      icon: <ClipboardCheck className="w-5 h-5 text-blue-600" />,
      badge: `${b.maintenance_completion_pct}% → ${a.maintenance_completion_pct}% executable`,
      good: a.maintenance_completion_pct >= b.maintenance_completion_pct,
    },
    {
      title: 'CONFLICTS',
      value: a.total_schedule_conflicts,
      unit: 'remaining',
      sub: `${b.total_schedule_conflicts} in departmental requests`,
      icon: <ShieldAlert className="w-5 h-5 text-emerald-600" />,
      badge: `${b.total_schedule_conflicts - a.total_schedule_conflicts} resolved`,
      good: true,
      trend: 'down',
    },
    {
      title: 'LINE AVAILABILITY',
      value: `${a.overall_asset_availability_pct}%`,
      unit: '00–06h',
      sub: `was ${b.overall_asset_availability_pct}% · both lines, all sections`,
      icon: <Gauge className="w-5 h-5 text-emerald-600" />,
      badge: `${a.overall_asset_availability_pct - b.overall_asset_availability_pct >= 0 ? '+' : ''}${(a.overall_asset_availability_pct - b.overall_asset_availability_pct).toFixed(1)} pts`,
      good: a.overall_asset_availability_pct >= b.overall_asset_availability_pct,
      trend: 'up',
      glow: true,
    },
    {
      title: 'ASSET RISK ADDRESSED',
      value: `${a.risk_addressed_pct}%`,
      unit: 'tonight',
      sub: `was ${b.risk_addressed_pct}% · AI risk-weighted`,
      icon: <Activity className="w-5 h-5 text-amber-600" />,
      badge: `+${(a.risk_addressed_pct - b.risk_addressed_pct).toFixed(1)} pts`,
      good: a.risk_addressed_pct >= b.risk_addressed_pct,
      trend: 'up',
    },
    {
      title: 'TRAINS REGULATED',
      value: a.affected_trains_count,
      unit: `+${a.total_train_delay_minutes} min`,
      sub: `was ${b.affected_trains_count} trains, ${b.total_train_delay_minutes} min`,
      icon: <TrainFront className="w-5 h-5 text-indigo-600" />,
      badge: result.validation.find(v => v.id === 'P1')?.pass ? '0 premium trains touched' : 'Premium path affected',
      good: !!result.validation.find(v => v.id === 'P1')?.pass,
    },
    {
      title: 'POSSESSION SAVED',
      value: `${Math.floor(saved / 60)}h ${saved % 60}m`,
      unit: 'line-time',
      sub: `${result.integrated_blocks.length} integrated multi-dept block${result.integrated_blocks.length === 1 ? '' : 's'}`,
      icon: <Combine className="w-5 h-5 text-purple-600" />,
      badge: `${Math.round(b.possession_minutes / 60 * 10) / 10}h → ${Math.round(a.possession_minutes / 60 * 10) / 10}h blocked`,
      good: saved >= 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`control-card rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:border-blue-400 hover:shadow-md ${card.glow ? 'border-emerald-300 control-card-glow' : ''}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">{card.title}</span>
            <div className="p-1.5 rounded-lg border bg-slate-50 border-slate-200">{card.icon}</div>
          </div>
          <div className="my-1">
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-1.5">
              <span>{card.value}</span>
              <span className="text-xs text-slate-500 font-normal font-mono">{card.unit}</span>
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium" title={card.sub}>{card.sub}</div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100">
            <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border inline-flex items-center gap-0.5 ${card.good ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-rose-800 bg-rose-50 border-rose-200'}`}>
              {card.trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
              {card.trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
              {card.badge}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
