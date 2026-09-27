import React from 'react';
import { useRailOpt } from '../context/RailOptContext';
import { ShieldCheck, ShieldX, CheckCircle2, XCircle, Cpu } from 'lucide-react';

/** Independent rule check of the generated plan — each line is re-computed from the plan, not asserted. */
export const ValidationPanel: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { result } = useRailOpt();
  if (!result) return null;
  const passed = result.validation.filter(v => v.pass).length;
  const all = passed === result.validation.length;
  return (
    <div className={`control-card rounded-xl p-4 border ${all ? 'border-emerald-200' : 'border-amber-300'} shadow-sm`}>
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${all ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            {all ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <ShieldX className="w-4 h-4 text-amber-600" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Plan Safety Validation</h3>
            <p className="text-[10px] text-slate-500 font-mono">Rule check re-run on the output plan</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${all ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-300'}`}>
          {passed}/{result.validation.length} PASS
        </span>
      </div>
      <ul className={compact ? 'space-y-1.5' : 'grid sm:grid-cols-2 gap-x-4 gap-y-1.5'}>
        {result.validation.map(v => (
          <li key={v.id} className="flex items-start gap-2 text-xs">
            {v.pass ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />}
            <div className="min-w-0">
              <span className="font-semibold text-slate-800">{v.label}</span>
              {!compact && <span className="block text-[10.5px] text-slate-500 font-mono truncate" title={v.detail}>{v.detail}</span>}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10.5px] font-mono text-slate-500">
        <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {result.solver.provenOptimal ? 'Proven optimal' : 'Best found (node limit)'}</span>
        <span>{result.solver.nodes.toLocaleString('en-IN')} nodes · {result.solver.ms.toFixed(1)} ms</span>
      </div>
    </div>
  );
};
