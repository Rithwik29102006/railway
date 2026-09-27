import React from 'react';
import { useRailOpt } from '../context/RailOptContext';
import { ListChecks, Combine, Lock, CircleSlash, Zap } from 'lucide-react';

const prioColor: Record<string, string> = {
  EMERGENCY: 'bg-rose-50 text-rose-700 border-rose-200',
  HIGH: 'bg-amber-50 text-amber-800 border-amber-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
  LOW: 'bg-slate-50 text-slate-600 border-slate-200',
};

/** The generated block plan with a plain-language justification for every block. */
export const BlockPlanTable: React.FC = () => {
  const { result, selectedBlockId, setSelectedBlockId } = useRailOpt();
  if (!result) return null;
  const ibIndex: Record<string, number> = {};
  result.integrated_blocks.forEach((ib, i) => (ibIndex[ib.id] = i + 1));

  return (
    <div className="control-card rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-200"><ListChecks className="w-4 h-4 text-indigo-600" /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Generated Block Plan — with reasons</h3>
            <p className="text-[10.5px] text-slate-500">Every placement is explained: window used, trains cleared or regulated, what went wrong at the requested slot.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {result.integrated_blocks.map((ib, i) => (
            <span key={ib.id} className="text-[10.5px] font-mono px-2 py-1 rounded-md border bg-purple-50 border-purple-200 text-purple-800 flex items-center gap-1">
              <Combine className="w-3 h-3" /> IB-{i + 1}: {ib.departments.join(' + ')} · {ib.section_name} {ib.line} · saves {ib.minutes_saved}m
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead className="bg-slate-50 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-4 py-2">Request</th>
              <th className="text-left px-2 py-2">Section · Line</th>
              <th className="text-left px-2 py-2">Block</th>
              <th className="text-left px-2 py-2">Dept · Gang</th>
              <th className="text-left px-2 py-2 w-[44%]">Why this slot</th>
              <th className="text-right px-4 py-2">Robustness</th>
            </tr>
          </thead>
          <tbody>
            {result.scheduled_blocks.map(b => {
              const reasons = b.reason_for_window.split(' • ');
              const sel = selectedBlockId === b.block_id;
              return (
                <tr
                  key={b.block_id}
                  onClick={() => setSelectedBlockId(sel ? null : b.block_id)}
                  className={`border-t border-slate-100 align-top cursor-pointer transition ${sel ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-4 py-2.5">
                    <div className="font-mono font-bold text-slate-900 flex items-center gap-1">
                      {b.request_id}{b.locked && <Lock className="w-3 h-3 text-amber-600" />}
                    </div>
                    <div className="text-slate-600 max-w-[200px] truncate" title={b.asset_name}>{b.asset_name}</div>
                    <span className={`inline-block mt-1 text-[9.5px] font-mono px-1.5 py-0.5 rounded border ${prioColor[b.priority]}`}>{b.priority}</span>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="text-slate-800 font-medium">{b.section_name}</div>
                    <div className="font-mono text-[10.5px] text-slate-500">{b.section_id} · {b.line} line</div>
                    {b.integrated_block_id && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[9.5px] font-mono px-1.5 py-0.5 rounded border bg-purple-50 border-purple-200 text-purple-800">
                        <Combine className="w-3 h-3" /> IB-{ibIndex[b.integrated_block_id]}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 font-mono">
                    <div className="font-bold text-slate-900">{b.start_time}–{b.end_time}</div>
                    <div className="text-[10.5px] text-slate-500">{b.duration_minutes} min{b.power_block ? ' · power block' : ''}</div>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="text-slate-800">{b.department}</div>
                    <div className="font-mono text-[10.5px] text-slate-500">{b.assigned_crew}</div>
                  </td>
                  <td className="px-2 py-2.5">
                    <ul className="space-y-0.5">
                      {reasons.map((r, i) => (
                        <li key={i} className={`leading-snug ${r.startsWith('Moved') ? 'text-blue-800 font-semibold' : r.startsWith('Integrated') ? 'text-purple-800' : r.includes('SLW') || r.includes('held') ? 'text-amber-800' : 'text-slate-600'}`}>
                          • {r}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="font-mono font-bold text-slate-900">{Math.round(b.confidence_score * 100)}%</div>
                    <div className="h-1.5 w-16 ml-auto mt-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${b.confidence_score > 0.8 ? 'bg-emerald-500' : b.confidence_score > 0.7 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${b.confidence_score * 100}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {result.deferred_requests.length > 0 && (
        <div className="p-4 border-t border-amber-200 bg-amber-50/60">
          <div className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1.5"><CircleSlash className="w-3.5 h-3.5" /> Deferred — and why</div>
          <div className="grid md:grid-cols-2 gap-2">
            {result.deferred_requests.map(d => (
              <div key={d.id} className="text-xs bg-white border border-amber-200 rounded-lg p-2.5">
                <span className="font-mono font-bold text-slate-900">{d.id}</span>
                <span className={`ml-2 text-[9.5px] font-mono px-1.5 py-0.5 rounded border ${prioColor[d.priority]}`}>{d.priority}</span>
                <div className="text-slate-600 mt-0.5">{d.asset_name}</div>
                <div className="text-amber-900 mt-1 flex gap-1"><Zap className="w-3 h-3 mt-0.5 shrink-0" />{d.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="px-4 py-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
        Robustness = spare minutes between the block (+15 min buffer) and the nearest train path / window edge. Click a row to highlight it on the timeline.
      </div>
    </div>
  );
};
